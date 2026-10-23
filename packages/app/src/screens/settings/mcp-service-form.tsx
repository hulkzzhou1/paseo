import type { ManagedMcpService } from "@getpaseo/protocol/messages";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FormTextInput } from "@/components/ui/form-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { useIsCompactFormFactor } from "@/constants/layout";
import { openMcpServiceForm } from "./mcp-service-form-model";

export function McpServiceForm({
  service,
  save,
  cancel,
}: {
  service?: ManagedMcpService;
  save: (service: ManagedMcpService) => Promise<void>;
  cancel: () => void;
}) {
  const { t } = useTranslation();
  const size = useIsCompactFormFactor() ? "md" : "sm";
  const [model] = useState(() => openMcpServiceForm(service));
  const state = useSyncExternalStore(model.subscribe, model.getState);
  useEffect(() => () => model.close(), [model]);
  const mutation = useMutation({ mutationFn: save });
  const submit = useCallback(() => {
    const value = model.getSubmission();
    if (value && !mutation.isPending) mutation.mutate(value);
  }, [model, mutation]);
  const display = useMemo(() => ({ label: state.type }), [state.type]);
  const handlers = useMemo(
    () => ({
      json: (value: string) => model.setField("json", value),
      name: (value: string) => model.setField("name", value),
      command: (value: string) => model.setField("command", value),
      args: (value: string) => model.setField("args", value),
      env: (value: string) => model.setField("env", value),
      url: (value: string) => model.setField("url", value),
      headers: (value: string) => model.setField("headers", value),
      type: (value: "stdio" | "http" | "sse") => model.setField("type", value),
    }),
    [model],
  );
  return (
    <View style={styles.form} testID="mcp-service-form">
      <Field label={t("mcp.name")}>
        <FormTextInput
          size={size}
          initialValue={state.name}
          onChangeText={handlers.name}
          accessibilityLabel={t("mcp.name")}
          testID="mcp-name"
          editable={!mutation.isPending}
        />
      </Field>
      <SegmentedControl
        size={size}
        value={state.mode}
        onValueChange={model.setMode}
        options={[
          {
            value: "form",
            label: t("mcp.formMode"),
            testID: "mcp-mode-form",
            disabled: mutation.isPending,
          },
          { value: "json", label: "JSON", testID: "mcp-mode-json", disabled: mutation.isPending },
        ]}
      />
      {state.mode === "json" ? (
        <Field label={t("mcp.jsonConfig")}>
          <FormTextInput
            size={size}
            initialValue={state.json}
            onChangeText={handlers.json}
            accessibilityLabel={t("mcp.jsonConfig")}
            testID="mcp-json"
            editable={!mutation.isPending}
            multiline
            numberOfLines={10}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Field>
      ) : (
        <>
          <SelectField
            label={t("mcp.transport")}
            value={state.type}
            selectedDisplay={display}
            options={TRANSPORT_OPTIONS}
            onChange={handlers.type}
            placeholder={t("mcp.transport")}
            emptyText=""
            size={size}
            disabled={mutation.isPending}
            testID="mcp-transport"
            triggerTestID="mcp-transport-trigger"
          />
          {state.type === "stdio" ? (
            <>
              <Field label={t("mcp.command")}>
                <FormTextInput
                  size={size}
                  initialValue={state.command}
                  onChangeText={handlers.command}
                  accessibilityLabel={t("mcp.command")}
                  testID="mcp-command"
                  editable={!mutation.isPending}
                />
              </Field>
              <Field label={t("mcp.args")}>
                <FormTextInput
                  size={size}
                  initialValue={state.args}
                  onChangeText={handlers.args}
                  accessibilityLabel={t("mcp.args")}
                  testID="mcp-args"
                  editable={!mutation.isPending}
                />
              </Field>
              <Field label={t("mcp.env")}>
                <FormTextInput
                  size={size}
                  initialValue={state.env}
                  onChangeText={handlers.env}
                  accessibilityLabel={t("mcp.env")}
                  testID="mcp-env"
                  editable={!mutation.isPending}
                  secureTextEntry
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="URL">
                <FormTextInput
                  size={size}
                  initialValue={state.url}
                  onChangeText={handlers.url}
                  accessibilityLabel="URL"
                  testID="mcp-url"
                  editable={!mutation.isPending}
                />
              </Field>
              <Field label={t("mcp.headers")}>
                <FormTextInput
                  size={size}
                  initialValue={state.headers}
                  onChangeText={handlers.headers}
                  accessibilityLabel={t("mcp.headers")}
                  testID="mcp-headers"
                  editable={!mutation.isPending}
                  secureTextEntry
                />
              </Field>
            </>
          )}
        </>
      )}
      {state.modeError ? <Alert title={t("mcp.modeError")} /> : null}
      {!state.canSubmit ? (
        <Alert title={t(state.mode === "json" ? "mcp.invalidJson" : "mcp.invalid")} />
      ) : null}
      {mutation.isError ? (
        <Alert
          variant="error"
          title={t(
            mutation.error.message.includes("MCP service name already exists")
              ? "mcp.nameExists"
              : "mcp.saveError",
          )}
        />
      ) : null}
      <View style={styles.actions}>
        <Button variant="outline" size={size} onPress={cancel} disabled={mutation.isPending}>
          {t("common.actions.cancel")}
        </Button>
        <Button
          size={size}
          onPress={submit}
          disabled={!state.canSubmit || mutation.isPending}
          testID="mcp-save"
        >
          {t(mutation.isPending ? "mcp.saving" : "common.actions.save")}
        </Button>
      </View>
    </View>
  );
}
const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.spacing[3], paddingVertical: theme.spacing[3] },
  actions: { flexDirection: "row", gap: theme.spacing[2], flexWrap: "wrap" },
}));

const TRANSPORT_OPTIONS = (["stdio", "http", "sse"] as const).map((type) => ({
  id: type,
  value: type,
  label: { stdio: "stdio", http: "HTTP", sse: "SSE" }[type],
}));
