import type { DaemonClient } from "@getpaseo/client/internal/daemon-client";
import type { PluginListItem, PluginMcpServiceSummary } from "@getpaseo/protocol/messages";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SettingsCard, SettingsRow, SettingsSection } from "@/components/settings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFetchQuery } from "@/data/query";
import { useInstalledPlugin } from "@/plugins/registry";
import { buildPluginSettingsRoute } from "@/plugins/settings/routes";
import { useHostFeature } from "@/runtime/host-features";
import { useHostRuntimeSnapshot, useHosts } from "@/runtime/host-runtime";

const TRANSPORT_LABELS = { stdio: "stdio", http: "HTTP", sse: "SSE" } as const;

function McpServiceRow({
  serverId,
  plugin,
  service,
}: {
  serverId: string;
  plugin: PluginListItem;
  service: PluginMcpServiceSummary;
}) {
  const { t } = useTranslation();
  const installation = useInstalledPlugin(serverId, plugin.id);
  const screen = installation?.settingsScreens.find((item) => item.id === service.settingsScreenId);
  const configure = useCallback(() => {
    if (screen) router.push(buildPluginSettingsRoute(serverId, plugin.id, screen.id));
  }, [plugin.id, screen, serverId]);
  const badge = useMemo(
    () => (
      <StatusBadge
        label={t(service.configured ? "mcp.registered" : "mcp.unconfigured")}
        variant={service.configured ? "success" : "muted"}
      />
    ),
    [service.configured, t],
  );
  return (
    <SettingsRow
      label={service.label}
      labelAccessory={badge}
      hint={`${plugin.name ?? plugin.id} · ${plugin.id}${service.transport ? ` · ${TRANSPORT_LABELS[service.transport]}` : ""}`}
      testID={`mcp-service-${plugin.id}`}
    >
      {screen ? (
        <Button variant="outline" size="sm" onPress={configure}>
          {t("mcp.configure")}
        </Button>
      ) : null}
    </SettingsRow>
  );
}

function McpServices({
  serverId,
  client,
  connectionEpoch,
  clientGeneration,
}: {
  serverId: string;
  client: DaemonClient;
  connectionEpoch: number;
  clientGeneration: number;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hostLabel = useHosts().find((host) => host.serverId === serverId)?.label ?? serverId;
  const queryKey = useMemo(
    () => ["plugin-mcp-services", serverId, clientGeneration, connectionEpoch] as const,
    [serverId, clientGeneration, connectionEpoch],
  );
  const services = useFetchQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const plugins = await client.listPlugins();
      signal.throwIfAborted();
      return { plugins };
    },
    dataShape: "value",
    staleTimeMs: 0,
  });
  const refresh = useCallback(async () => {
    // Cancel even the initial fetch before asking for the current worker's definition.
    await queryClient.cancelQueries({ queryKey, exact: true });
    await queryClient.invalidateQueries({ queryKey, exact: true });
  }, [queryClient, queryKey]);
  useEffect(() => {
    const observation = client.observeEvents(["status.plugin_catalog_changed"]);
    observation.subscribe({
      snapshot: () => {
        void refresh();
      },
      update: () => {
        void refresh();
      },
    });
    return () => {
      void observation
        .release()
        .catch((error) => console.warn("[MCP] Failed to release service feed", error));
    };
  }, [client, queryClient, queryKey, refresh]);
  const retry = useCallback(() => {
    void refresh();
  }, [refresh]);
  if (services.isError)
    return (
      <Alert variant="error" title={t("mcp.loadError")} description={services.error.message}>
        <Button variant="outline" size="sm" onPress={retry}>
          {t("common.actions.retry")}
        </Button>
      </Alert>
    );
  if (services.isPending || services.isFetching) return <Alert title={t("mcp.loading")} />;
  const plugins = services.data?.plugins.filter((plugin) => plugin.mcpServer) ?? [];
  return (
    <SettingsSection title={hostLabel} info={t("mcp.runtimeHint")} testID="mcp-services-section">
      <SettingsCard>
        {plugins.length ? (
          plugins.map((plugin) =>
            plugin.mcpServer ? (
              <McpServiceRow
                key={plugin.id}
                serverId={serverId}
                plugin={plugin}
                service={plugin.mcpServer}
              />
            ) : null,
          )
        ) : (
          <SettingsRow label={t("mcp.empty")} />
        )}
      </SettingsCard>
    </SettingsSection>
  );
}

export function HostMcpPage({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const host = useHostRuntimeSnapshot(serverId);
  const supported = useHostFeature(serverId, "pluginMcpServers");
  if (host?.connectionStatus !== "online" || !host.client)
    return <Alert variant="warning" title={t("mcp.offline")} />;
  if (!supported) return <Alert variant="warning" title={t("mcp.updateHost")} />;
  return (
    <View testID="mcp-services-page">
      <McpServices
        key={`${serverId}:${host.clientGeneration}:${host.connectionEpoch}`}
        serverId={serverId}
        client={host.client}
        clientGeneration={host.clientGeneration}
        connectionEpoch={host.connectionEpoch}
      />
    </View>
  );
}
