import { z } from "zod";
import { ManagedMcpServiceSchema, type ManagedMcpService } from "@getpaseo/protocol/messages";

interface FormFields {
  name: string;
  type: "stdio" | "http" | "sse";
  command: string;
  args: string;
  env: string;
  url: string;
  headers: string;
}

function stringMap(value: string): Record<string, string> {
  return z.record(z.string(), z.string()).parse(JSON.parse(value || "{}"));
}

export function openMcpServiceForm(service?: ManagedMcpService) {
  const config = service?.config;
  let fields: FormFields = {
    name: service?.name ?? "",
    type: config?.type ?? "stdio",
    command: config?.type === "stdio" ? config.command : "",
    args: JSON.stringify(config?.type === "stdio" ? (config.args ?? []) : []),
    env: JSON.stringify(config?.type === "stdio" ? (config.env ?? {}) : {}),
    url: config && config.type !== "stdio" ? config.url : "",
    headers: JSON.stringify(config && config.type !== "stdio" ? (config.headers ?? {}) : {}),
  };
  const listeners = new Set<() => void>();
  function submission(): ManagedMcpService | null {
    try {
      const args: unknown = fields.type === "stdio" ? JSON.parse(fields.args || "[]") : [];
      const result = ManagedMcpServiceSchema.safeParse({
        name: fields.name.trim(),
        enabled: service?.enabled ?? true,
        config:
          fields.type === "stdio"
            ? { type: "stdio", command: fields.command.trim(), args, env: stringMap(fields.env) }
            : { type: fields.type, url: fields.url.trim(), headers: stringMap(fields.headers) },
      });
      return result.success ? result.data : null;
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) return null;
      throw error;
    }
  }
  let state = { ...fields, canSubmit: submission() !== null };
  return {
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
      fields = { ...fields, [field]: value };
      state = { ...fields, canSubmit: submission() !== null };
      for (const listener of listeners) listener();
    },
    getSubmission: submission,
  };
}
