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
