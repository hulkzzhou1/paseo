# Ticket 20 result

- Branch: feat/mcp-ticket20
- Worktree: /data/home/hulkzzhou/workspaces/paseo-mcp-ticket20
- Commit: ae625c02bdf8e9b884812f87021ce0f18e276569
- Started from integration 766a5b9b5; merged docs94be668f8 and lifecycle72fad2923 before commit. Final merge integration reports already up to date. Clean worktree.

## Delivered

Five current-host tools in the existing shared catalog: list_mcp_services, create_mcp_service, update_mcp_service, set_mcp_service_enabled, delete_mcp_service. Bootstrap provides existing config store and plugin metadata callback. Native providers and the MCP adapter share this catalog and existing provider tool policy; registration stays after voice-only early return. No remote host selection or proxy, no RPC auto-exposure, no auth changes.

Manual IDs are persisted stable mcp-UUID keys; plugin summary IDs use plugin:<pluginId>:<serviceId> and are explicitly write-protected. Full config replacement uses existing config.patch validation/persistence; omitted name/config preserved. Delete requires confirmed true. Safe results contain only metadata (no commands, args, env, URL, headers); persistence errors become generic actionable failures. MCP adapter now forwards optional SDK tool annotations (read-only list, destructive delete). Presentation catalog includes names and existing EN/ZH MCP reference documents tools, linking to root-owned configuration guide.

## Verification

Node24.18.0, npm11.16.0. All completion exit codes listed below were observed from exec/write_stdin.

- RED: /tmp/mcp20-red.log exit1: real MCP tools/list did not contain create_mcp_service before implementation.
- /tmp/mcp20-green1.log exit0: real isolated daemon and MCP client create service; existing UI config API reads the same definition and result excludes fictional secret/URL.
- /tmp/mcp20-green2.log exit0: lifecycle, replacement, safety, host isolation, plugin write rejection.
- /tmp/mcp20-green3.log exit0: added real scoped provider-policy exclusion/call rejection and UI-owned config change notification. 1 passed,194 intentionally filtered.
- /tmp/mcp20-mcp-suite.log exit0: npx vitest run src/server/agent/mcp-server.test.ts --bail=1, full CHANGED FILE only,195/195 pass. Existing MCP/catalog/voice tests included.
- /tmp/mcp20-build.log exit0: npm run build:server (owning cross-package declarations first).
- /tmp/mcp20-final-typecheck.log exit0: npm run typecheck; no TS errors. Earlier /tmp/mcp20-typecheck.log also exit0.
- /tmp/mcp20-final-lint.log exit0: npm run lint,0 errors/warnings.
- /tmp/mcp20-final-format.log and /tmp/mcp20-final-format-check.log: npm run format and format:check, both show successful completion/all matched files formatted.
- git diff --check exit0, clean status after commit.

Acceptance covers HTTP create, rename preserving credentials, SSE then stdio full replacements without connecting, enable/disable preserving config, unknown IDs, duplicate names, invalid URL, missing/false delete confirmation, final deletion, both read-only/destructive annotations, two daemon hosts, plugin registration/list/write protection, provider disabledTools list+call exclusion and UI config-change notification. First expanded test failures were missing test-plugin version requirements and unsubscribed owned event feed; corrected fixture/subscription to match production contracts. Initial lint found test nested ternaries/complexity; replaced with explicit operation cases.

## Limits

No new framework/dependency, full repository suite, real model calls, browser/native/Electron UI changes, production operation, release, push or issue close. Root-owned provider adapter verification and #19 browser validation were not repeated. Root final integrated code review/checks still apply, especially after #21.
