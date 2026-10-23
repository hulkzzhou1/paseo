import { z } from "zod";
import { ManagedMcpServiceSchema, type ManagedMcpService } from "@getpaseo/protocol/messages";

interface FormFields {
  name: string;
  alwaysLoad?: boolean;
  type: "stdio" | "http" | "sse";
  command: string;
  args: string;
  env: string;
  url: string;
  headers: string;
  mode: "form" | "json";
  json: string;
}

// Reject unknown JSON keys rather than silently discarding pasted configuration.
const configSchema = z.union([
  ManagedMcpServiceSchema.shape.config.options[0].strict(),
  ManagedMcpServiceSchema.shape.config.options[1].strict(),
  ManagedMcpServiceSchema.shape.config.options[2].strict(),
]);
function connectionFields(config?: ManagedMcpService["config"]) {
  return {
    type: config?.type ?? "stdio",
    alwaysLoad: config?.alwaysLoad,
    command: config?.type === "stdio" ? config.command : "",
    args: config?.type === "stdio" ? (JSON.stringify(config.args) ?? "") : "",
    env: config?.type === "stdio" ? (JSON.stringify(config.env) ?? "") : "",
    url: config && config.type !== "stdio" ? config.url : "",
    headers: config && config.type !== "stdio" ? (JSON.stringify(config.headers) ?? "") : "",
  };
}
function parseOptional(value: string): unknown {
  return value.trim() ? JSON.parse(value) : undefined;
}

export function openMcpServiceForm(service?: ManagedMcpService) {
  let fields: FormFields = {
    name: service?.name ?? "",
    ...connectionFields(service?.config),
    mode: "form",
    json: "",
  };
  const listeners = new Set<() => void>();
  function connection() {
    if (fields.mode === "json") return JSON.parse(fields.json);
    if (fields.type === "stdio") {
      return {
        type: "stdio",
        ...(fields.alwaysLoad === undefined ? {} : { alwaysLoad: fields.alwaysLoad }),
        command: fields.command.trim(),
        args: parseOptional(fields.args),
        env: parseOptional(fields.env),
      };
    }
    return {
      type: fields.type,
      url: fields.url.trim(),
      headers: parseOptional(fields.headers),
      ...(fields.alwaysLoad === undefined ? {} : { alwaysLoad: fields.alwaysLoad }),
    };
  }
  function submission(): ManagedMcpService | null {
    try {
      return ManagedMcpServiceSchema.parse({
        name: fields.name.trim(),
        enabled: service?.enabled ?? true,
        config: configSchema.parse(connection()),
      });
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) return null;
      throw error;
    }
  }
  let state = { ...fields, canSubmit: submission() !== null, modeError: false };
  function publish(modeError = false) {
    state = { ...fields, canSubmit: submission() !== null, modeError };
    for (const listener of listeners) listener();
  }
  return {
    setMode(mode: "form" | "json") {
      if (mode === fields.mode) return;
      try {
        const config = connection();
        fields =
          mode === "json"
            ? { ...fields, mode, json: JSON.stringify(config, null, 2) }
            : { ...fields, mode, ...connectionFields(configSchema.parse(config)) };
        publish();
      } catch (error) {
        if (!(error instanceof SyntaxError || error instanceof z.ZodError)) throw error;
        publish(true);
      }
    },
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    close() {
      listeners.clear();
    },
    setField<K extends keyof FormFields>(field: K, value: FormFields[K]) {
      if (field === "type" && value !== fields.type) {
        fields =
          value === "stdio"
            ? { ...fields, url: "", headers: "" }
            : { ...fields, command: "", args: "", env: "" };
      }
      fields = { ...fields, [field]: value };
      publish();
    },
    getSubmission: submission,
  };
}
