import { describe, expect, it } from "vitest";
import { openMcpServiceForm } from "./mcp-service-form-model";

describe("MCP connection JSON draft", () => {
  it("round trips a connection without adding optional fields or changing ownership", () => {
    const service = {
      name: "Remote",
      enabled: false,
      config: { type: "http" as const, url: "https://example.invalid/mcp" },
    };
    const model = openMcpServiceForm(service);
    model.setMode("json");
    expect(JSON.parse(model.getState().json)).toEqual(service.config);
    model.setMode("form");
    expect(model.getSubmission()).toEqual(service);
  });
});

it("keeps malformed drafts, rejects unknown fields and can switch before entering a name", () => {
  const model = openMcpServiceForm();
  model.setField("command", "fictional-mcp");
  model.setField("args", "broken-array");
  model.setMode("json");
  expect(model.getState().mode).toBe("form");
  expect(model.getState().args).toBe("broken-array");
  model.setField("args", '["--safe"]');
  model.setMode("json");
  expect(JSON.parse(model.getState().json).args).toEqual(["--safe"]);
  model.setField("json", '{"type":"http","url":"https://example.invalid","enabled":true}');
  model.setMode("form");
  expect(model.getState().mode).toBe("json");
  expect(model.getSubmission()).toBeNull();
  model.setField("json", '{"type":"sse","url":"https://example.invalid"}');
  model.setMode("form");
  expect(model.getState().type).toBe("sse");
  expect(model.getState().command).toBe("");
  model.setField("name", "Events");
  expect(model.getSubmission()?.config).toEqual({ type: "sse", url: "https://example.invalid" });
});

it("drops fields from the previous transport when changing form transport", () => {
  const model = openMcpServiceForm({
    name: "Tools",
    enabled: true,
    config: { type: "stdio", command: "fictional", env: { TOKEN: "fictional" } },
  });
  model.setField("type", "http");
  model.setField("url", "https://example.invalid");
  model.setField("headers", '{"Authorization":"fictional"}');
  model.setField("type", "stdio");
  expect(model.getState().env).toBe("");
  model.setField("command", "next");
  model.setMode("json");
  expect(JSON.parse(model.getState().json)).toEqual({ type: "stdio", command: "next" });
});

for (const config of [
  { type: "stdio" as const, command: "fictional-mcp" },
  { type: "http" as const, url: "https://example.invalid/mcp" },
  { type: "sse" as const, url: "https://example.invalid/events" },
]) {
  it.each([undefined, false, true])(
    `preserves alwaysLoad=%s when editing ${config.type} and switching modes`,
    (alwaysLoad) => {
      const connection = { ...config, ...(alwaysLoad === undefined ? {} : { alwaysLoad }) };
      const service = { name: "Tools", enabled: true, config: connection };
      const model = openMcpServiceForm(service);
      expect(model.getSubmission()).toEqual(service);
      model.setMode("json");
      expect(JSON.parse(model.getState().json)).toEqual(connection);
      model.setMode("form");
      expect(model.getSubmission()).toEqual(service);
      model.setMode("json");
      expect(JSON.parse(model.getState().json)).toEqual(connection);
      model.setField("json", JSON.stringify({ ...connection, alwaysLoad: !alwaysLoad }));
      model.setMode("form");
      expect(model.getSubmission()?.config.alwaysLoad).toBe(!alwaysLoad);
    },
  );
}
