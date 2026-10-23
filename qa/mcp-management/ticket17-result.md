# Ticket 17 implementation

- Worktree: `/data/home/hulkzzhou/workspaces/paseo-mcp-ticket17`
- Branch: `feat/mcp-ticket17`
- Confirmed initial integration base: `2311be5f5b268af78b4e579f97d2b7c72eba443e`
- Scope: remove main sidebar MCP row and customization option; reuse existing preference resolver to ignore retired entries without disturbing other items. Keep Settings route and plugin row ownership/configure behavior. Generalize empty copy in all 9 locales. Update existing browser navigation/helper expectations, add load-error/retry and offline checks. Update public plugin reference to Settings entry.
- No new dependencies or architecture. No MCP management backend or form changes in this ticket.

## Validation

- TDD at existing sidebar preference seam: `npx vitest run src/sidebar-nav/model.test.ts --bail=1` from app. `/tmp/ticket17-red.log` exit 1 (new retired preference assertion fails); `/tmp/ticket17-green.log` exit 0, 20 tests pass.
- `npm run build:server`: exit 0, `/tmp/ticket17-build.log`.
- `npm run typecheck`: clean final log `/tmp/ticket17-typecheck-final.log`; app recheck `/tmp/ticket17-typecheck-app-final.log`, exit file 0.
- `npm run lint`: `/tmp/ticket17-lint-last.log`, exit file 0, no warnings/errors.
- `npm run format` followed by `npm run format:check`: `/tmp/ticket17-format-final.log`, exit file 0.
- Targeted Playwright: `npm run test:e2e --workspace=@getpaseo/app -- e2e/browser/plugin-management.spec.ts e2e/browser/sidebar-nav-settings.spec.ts --grep 'MCP services|top-level|every one'`; 8 passed, exit 0; `/tmp/ticket17-browser-final.log`.
- Browser environment only: unset PASEO_PASSWORD/PASEO_HOME and E2E fork-home variables; `LD_LIBRARY_PATH=/tmp/paseo-mcp-browser-libs` reuses existing extracted libraries. First attempts exposed missing built workspace outputs, inherited test password, and missing libgbm; these are not product red evidence. No system installation, production state, or credentials accessed.
- Browser screenshots (desktop + 390px touch + tooltip) inspected and preserved in `/tmp/paseo-mcp-management-implementation/ticket17-evidence/`.

## Limits

No native iOS/Android/Electron execution; browser compact viewport is not native verification. No full suite, real models, production restart, release, or issue close. Existing `mcp-page.tsx` safe metadata and configure ownership code retained, avoiding collision with #18.

## Integration note

#18 switches the page capability gate to `mcpServiceManagement`; its merger/implementer must update the older-host test's masked feature from `pluginMcpServers` and run that changed test against the combined branch. The #17 gate test deliberately targets the existing #17 runtime gate.

Final changed host-switch test also covers daemon disconnect/offline distinct from empty after reconnect/late response. Focused rerun `/tmp/ticket17-browser-offline.log`: 1 passed, exit 0 (`/tmp/ticket17-browser-offline.exit`).

Commit: `9bfd5510c` (`Keep MCP service management in Settings only`). Merged integration tip before report: already up to date. Worktree clean.
