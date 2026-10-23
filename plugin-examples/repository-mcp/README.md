# Fictional repository MCP

This example chooses an existing HTTP MCP service. Plugins may instead register a stdio command or
legacy SSE endpoint; they need not implement every transport. The UI keeps its ordinary RPC. Both paths call the same fictional business function.

From a built Paseo checkout, run `node plugin-examples/repository-mcp/server/demo.mjs` to start the
fictional service on port 7779. Install this plugin directory, open its settings, and save
`http://127.0.0.1:7779/mcp` on that host. List repositories, show an empty list, trigger a business
error, then retry. The service returns only orchard and harbor; it has no real platform credentials.

A newly created Agent receives the same service definition through its provider's native MCP
configuration. The provider connects directly. The plugin UI uses ordinary RPC;
Paseo does not offer a host-side MCP client, Agent gateway or shared stdio process. Configuration updates affect
future runtime construction. Existing Agent connections may remain active until their runtime ends.

The demo service is started separately so registration does not claim ownership of a remote server.
Stop it with Ctrl-C. Stopping/removing the plugin withdraws registration, not the HTTP service.

This API is unreleased. The checkout's beta version alone does not identify a published release
containing it; app, daemon and plugin SDK must all include this feature.
