# Ticket 18 result

- Branch: feat/mcp-ticket18
- Worktree: /data/home/hulkzzhou/workspaces/paseo-mcp-ticket18
- Commit: 766a5b9b5cf2318fdd59600f091c5a784eb66cf3
- Based on integration 2311be5f5, merged #17 integration 9bfd5510c before final tests. Integration tip merge reports already up to date. Clean worktree.

## Contract

`mcpServers` is an optional host config record keyed by stable service id. Each value is `{name, enabled, config}`. Existing config patch RPC accepts full item replacement or null deletion. Add generates a new id, default enabled; edit preserves id and enabled. Name uniqueness is case/trim insensitive; reserved runtime namespace `paseo_manual_<id>` separates host services from plugin/platform services. Explicit Agent definitions cannot use this prefix. Imported snapshots strip this prefix even when the host service no longer exists, while retaining ordinary imported MCP entries. Injected runtime settings remain excluded from durable Agent metadata.

Server config loading, persistence/reload, per-item replacement, capability advertisement and provider startup callback extended. Existing plugin callback renamed runtimeMcpServers internally. No daemon MCP proxy or connection on save.

UI gates once on mcpServiceManagement. Combined host/client-generation/connection-epoch query displays manual/plugin sources. Existing event feed now includes daemon config changes. Fresh form instance per open; background data updates preserve inputs. All transports supported using existing form controls; JSON array for args and JSON string objects for env/headers, masked secrets. Safe localized duplicate-name error distinct from generic failure. Existing locales use English fallback for newly introduced management strings, Chinese localized.

#19 should extend ManualMcpRow and patch `{[id]: {...service,enabled}}` or `{[id]:null}`; no schema or new RPC needed. Root owns provider adapter test verification and owner docs.

## Evidence (all final commands exit 0)

Node v24.18.0; npm 11.16.0. Completed exec-session exit codes were observed via write_stdin; matching /tmp/mcp18-<log-stem>.exit sidecars record them (including build, final typecheck, lint, format/check, daemon, import and browser2/browser3).

- npm run build:server: /tmp/mcp18-final-build.log
- npm run typecheck: /tmp/mcp18-postreview-typecheck.log
- npm run lint: /tmp/mcp18-commit-lint.log (0 errors/warnings)
- npm run format; npm run format:check: /tmp/mcp18-commit-format.log and /tmp/mcp18-commit-format-check.log
- packages/server: npx vitest run src/server/plugins/mcp-services.e2e.test.ts --bail=1: /tmp/mcp18-final-daemon.log, 4/4 pass. Covers existing plugin lifecycle+RPC, actual fictional MCP example, manual three transports, replacement, duplicate names, invalid command/URL rejection, new runtime configs, unchanged existing runtimes, refreshed runtime configs, preserved personal MCP, restart persistence and host isolation.
- packages/server: npx vitest run src/server/agent/agent-manager.test.ts -t 'plugin MCP definitions follow' --bail=1: /tmp/mcp18-import-green.log, 1 pass, 213 intentionally filtered. Red /tmp/mcp18-import-red.log proves stale manual imported snapshot previously persisted.
- Browser targeted four tests: /tmp/mcp18-browser2.log, 4 pass: new capability old host gate, stale host response+reconnect including manual host definition, desktop add/edit stdio/http/sse + refresh preserving inputs + duplicate failure + keyboard save, compact touch save + overflow assertion.
- Final changed duplicate error mapping reverified desktop only: /tmp/mcp18-browser3.log, 1 pass. Browser invocation: env -u PASEO_PASSWORD -u PASEO_HOME -u E2E_FORK_PASEO_HOME_FROM -u E2E_PASEO_HOME -u E2E_FORK_SOURCE_PASEO_HOME -u E2E_FORK_TARGET_PASEO_HOME LD_LIBRARY_PATH=/tmp/paseo-mcp-browser-libs npm --workspace @getpaseo/app run test:e2e -- e2e/browser/plugin-management.spec.ts --grep 'manual MCP management saves' --workers=1
- Screenshots: /tmp/paseo-mcp-management-implementation/manual-mcp-desktop.png, manual-mcp-touch.png, manual-mcp-form.png. Desktop/touch reviewed visually; fixture values fictional.
- First daemon red /tmp/mcp18-red.log: saved mcpServers absent before implementation. Early missing declaration failures were resolved by building workspace dependencies. First browser failures were test-selector role and missing helper argument, fixed; no weakening of UI assertions.

## Limits

No full suite, real model calls, production operations, native/Electron UI validation or release performed. Existing browser dev console emits unrelated pre-existing component warnings. #19 not included (manual disable/delete backend support is schema groundwork; UI and its targeted acceptance follow). Provider transport support checks await root's existing adapter verification.
