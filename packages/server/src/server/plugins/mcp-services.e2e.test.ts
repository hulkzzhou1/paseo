import { spawn } from "node:child_process";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { DaemonClient } from "../test-utils/daemon-client.js";
import { createTestPaseoDaemon } from "../test-utils/paseo-daemon.js";
import { createTestAgentClient } from "../test-utils/fake-agent-client.js";
import type { AgentSessionConfig } from "../agent/agent-sdk-types.js";

test("plugin service registration updates direct provider config while ordinary RPC stays independent", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "paseo-mcp-services-"));
  const launches: AgentSessionConfig[] = [];
  const daemon = await createTestPaseoDaemon({
    daemonVersion: "0.13.0-beta.1",
    mcpEnabled: false,
    agentClients: {
      claude: createTestAgentClient("claude", { supportsMcpServers: false }),
      codex: createTestAgentClient("codex", {
        supportsMcpServers: true,
        beforeCreateSession: async (config) => {
          launches.push(config);
        },
      }),
    },
  });
  const client = new DaemonClient({
    url: `ws://127.0.0.1:${daemon.port}/ws`,
    appVersion: "0.13.0-beta.1",
  });
  try {
    await writeFile(
      path.join(directory, "paseo-plugin.json"),
      JSON.stringify({ id: "repository-service", requirements: { paseo: ">=0.13.0-beta.1" } }),
    );
    await writeFile(
      path.join(directory, "index.server.ts"),
      `
      import { z } from "zod";
      export default function contribute(server) {
        const service = server.registerMcpServer({ id: "repositories", label: "Fictional repositories", config: { type: "http", url: "https://first.example/mcp", headers: { authorization: "fictional-private-secret" } } });
        server.handle({ name: "configure", input: z.object({ url: z.string().nullable() }), output: z.null() }, ({ url }) => { service.update(url ? { type: "http", url } : null); return null; });
        server.handle({ name: "crash", input: z.object({}), output: z.null() }, () => process.exit(1));
        server.handle({ name: "remove", input: z.object({}), output: z.null() }, () => { service.remove(); return null; });
        server.handle({ name: "duplicate", input: z.object({}), output: z.null() }, () => { server.registerMcpServer({ id: "another", label: "Duplicate", config: null }); return null; });
        server.handle({ name: "repositories", input: z.object({}), output: z.array(z.string()) }, () => ["orchard", "harbor"]);
        return () => service.remove();
      }
    `,
    );
    await client.connect();
    await client.patchDaemonConfig({ pluginsEnabled: true });
    await client.installDirectoryPlugin(directory);
    const catalog = await client.listPlugins();
    expect(catalog.find((plugin) => plugin.id === "repository-service")?.mcpServer).toEqual({
      id: "repositories",
      label: "Fictional repositories",
      transport: "http",
      configured: true,
    });
    expect(JSON.stringify(catalog)).not.toContain("fictional-private-secret");
    await expect(client.invokePluginRpc("repository-service", "duplicate", {})).rejects.toThrow(
      "MCP_ALREADY_REGISTERED",
    );
    expect(await client.invokePluginRpc("repository-service", "repositories", {})).toEqual([
      "orchard",
      "harbor",
    ]);
    await client.fetchAgents({ subscribe: {} });
    const manual = { type: "http" as const, url: "https://manual.example/mcp" };
    const agent = await client.createAgent({
      provider: "codex",
      cwd: directory,
      mcpServers: { manual },
    });
    expect(launches[0].mcpServers).toEqual({
      manual,
      "plugin_repository-service_repositories": {
        type: "http",
        url: "https://first.example/mcp",
        headers: { authorization: "fictional-private-secret" },
      },
    });
    expect(JSON.stringify(agent)).not.toContain("fictional-private-secret");
    const managed = daemon.daemon.agentManager.getAgent(agent.id);
    expect(JSON.stringify(managed?.config)).not.toContain("fictional-private-secret");
    expect(JSON.stringify(managed?.persistence)).not.toContain("fictional-private-secret");
    await expect(client.createAgent({ provider: "claude", cwd: directory })).rejects.toThrow(
      "does not support MCP servers",
    );
    await expect(
      client.createAgent({
        provider: "codex",
        cwd: directory,
        mcpServers: { "plugin_repository-service_repositories": manual },
      }),
    ).rejects.toThrow("conflicts");
    const metadataEvents: unknown[] = [];
    const observation = client.observeEvents(["status.plugin_catalog_changed"]);
    await observation.ready;
    client.on("status", (message) => {
      if (message.payload.status === "plugin_catalog_changed") metadataEvents.push(message.payload);
    });
    await client.invokePluginRpc("repository-service", "configure", {
      url: "https://second.example/mcp",
    });
    await expect
      .poll(() => metadataEvents)
      .toContainEqual(
        expect.objectContaining({
          status: "plugin_catalog_changed",
          pluginId: "repository-service",
          reason: "mcp",
        }),
      );
    await observation.release();
    const second = await client.createAgent({ provider: "codex", cwd: directory });
    expect(launches[1].mcpServers?.["plugin_repository-service_repositories"]).toEqual({
      type: "http",
      url: "https://second.example/mcp",
    });
    await client.invokePluginRpc("repository-service", "configure", { url: null });
    expect(
      (await client.listPlugins()).find((plugin) => plugin.id === "repository-service")?.mcpServer,
    ).toMatchObject({ configured: false, transport: null });
    await client.invokePluginRpc("repository-service", "remove", {});
    const next = await client.createAgent({ provider: "codex", cwd: directory });
    expect(launches[2].mcpServers).toBeUndefined();
    expect(await client.invokePluginRpc("repository-service", "repositories", {})).toEqual([
      "orchard",
      "harbor",
    ]);
    await client.reloadPlugin("repository-service");
    expect(
      (await client.listPlugins()).find((plugin) => plugin.id === "repository-service")?.mcpServer,
    ).toMatchObject({ configured: true });
    await client.disablePlugin("repository-service");
    expect(
      (await client.listPlugins()).find((plugin) => plugin.id === "repository-service")?.mcpServer,
    ).toBeUndefined();
    const disabled = await client.createAgent({ provider: "codex", cwd: directory });
    expect(launches[3].mcpServers).toBeUndefined();
    await client.enablePlugin("repository-service");
    expect(
      (await client.listPlugins()).find((plugin) => plugin.id === "repository-service")?.mcpServer,
    ).toMatchObject({ configured: true });
    await expect(client.invokePluginRpc("repository-service", "crash", {})).rejects.toThrow();
    await expect
      .poll(
        async () =>
          (await client.listPlugins()).find((plugin) => plugin.id === "repository-service")?.status,
      )
      .toBe("failed");
    expect(
      (await client.listPlugins()).find((plugin) => plugin.id === "repository-service")?.mcpServer,
    ).toBeUndefined();
    await client.removePlugin("repository-service");
    expect(await client.listPlugins()).toEqual([]);
    await client.archiveAgent(disabled.id);
    await client.archiveAgent(agent.id);
    await client.archiveAgent(second.id);
    await client.archiveAgent(next.id);
  } finally {
    await client.close();
    await daemon.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

test("the formal example shares fictional business behavior between ordinary UI RPC and its MCP service", async () => {
  const demo = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../../../../../plugin-examples/repository-mcp/server/demo.mjs", import.meta.url),
      ),
      "0",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const exited = once(demo, "exit");
  const ready = new Promise<string>((resolve, reject) => {
    let output = "";
    demo.stdout.on("data", (chunk) => {
      output += String(chunk);
      const match = /Fictional MCP: (http:\/\/[^\s]+)/.exec(output);
      if (match) resolve(match[1]);
    });
    demo.on("error", reject);
    demo.on("exit", () => reject(new Error("Fictional MCP exited before ready")));
  });
  const launches: AgentSessionConfig[] = [];
  const daemon = await createTestPaseoDaemon({
    daemonVersion: "0.13.0-beta.1",
    mcpEnabled: false,
    agentClients: {
      codex: createTestAgentClient("codex", {
        supportsMcpServers: true,
        beforeCreateSession: async (config) => {
          launches.push(config);
        },
      }),
    },
  });
  const client = new DaemonClient({
    url: `ws://127.0.0.1:${daemon.port}/ws`,
    appVersion: "0.13.0-beta.1",
  });
  const mcp = new Client({ name: "provider-direct-acceptance", version: "1" });
  try {
    const url = await ready;
    await client.connect();
    await client.patchDaemonConfig({ pluginsEnabled: true });
    await client.installDirectoryPlugin(
      fileURLToPath(new URL("../../../../../plugin-examples/repository-mcp", import.meta.url)),
    );
    expect(
      await client.invokePluginRpc("repository-mcp", "settings.connection.write", {
        revision: "missing",
        values: { url },
      }),
    ).toMatchObject({ status: "saved" });
    await expect
      .poll(
        async () =>
          (await client.listPlugins()).find((plugin) => plugin.id === "repository-mcp")?.mcpServer
            ?.configured,
      )
      .toBe(true);
    await client.fetchAgents({ subscribe: {} });
    const agent = await client.createAgent({
      provider: "codex",
      cwd: fileURLToPath(new URL("../../../../../plugin-examples/repository-mcp", import.meta.url)),
    });
    const definition = launches[0].mcpServers?.["plugin_repository-mcp_repositories"];
    if (!definition || definition.type !== "http")
      throw new Error("Missing registered HTTP service in provider config");
    expect(definition.url).toBe(url);
    await mcp.connect(new StreamableHTTPClientTransport(new URL(definition.url)));
    expect(await mcp.listTools()).toMatchObject({ tools: [{ name: "list_repositories" }] });
    for (const mode of ["normal", "empty", "failure"] as const) {
      const rpc = await client.invokePluginRpc("repository-mcp", "repositories.list", { mode });
      const result = await mcp.callTool({ name: "list_repositories", arguments: { mode } });
      if (mode === "normal") {
        expect(rpc).toEqual({
          repositories: [
            { id: "orchard", path: "demo/orchard" },
            { id: "harbor", path: "demo/harbor" },
          ],
          error: null,
        });
        expect(result).toMatchObject({
          structuredContent: {
            repositories: [
              { id: "orchard", path: "demo/orchard" },
              { id: "harbor", path: "demo/harbor" },
            ],
          },
        });
      } else if (mode === "empty") {
        expect(rpc).toEqual({ repositories: [], error: null });
        expect(result).toMatchObject({
          structuredContent: { repositories: [] },
          content: [{ type: "text", text: "No repositories" }],
        });
      } else {
        expect(rpc).toMatchObject({
          repositories: [],
          error: "Fictional repository access failed; retry the normal request.",
        });
        expect(result).toMatchObject({
          isError: true,
          content: [
            { type: "text", text: "Fictional repository access failed; retry the normal request." },
          ],
        });
      }
    }
    expect(
      await client.invokePluginRpc("repository-mcp", "repositories.list", { mode: "normal" }),
    ).toMatchObject({ error: null });
    await client.archiveAgent(agent.id);
  } finally {
    await mcp.close();
    await client.close();
    await daemon.close();
    demo.kill();
    await exited;
  }
}, 60_000);
