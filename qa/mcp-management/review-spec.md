## Spec

审阅基线：`2311be5f5...ce4578325`；依据 GitHub #16、#17–#21 当前规格及展开稿。

- **P2（已修复）：合法 JSON 往返会丢配置。** #21 要求“合法配置跨模式往返一致”。`packages/app/src/screens/settings/mcp-service-form-model.ts:22` 的 `connectionFields` 和 `:44` 的 `connection` 均未保留 `alwaysLoad`，但管理 schema 明确接受它（`packages/protocol/src/messages.ts:201`、`:208`、`:215`）。输入 `{"type":"http","url":"https://example.invalid","alwaysLoad":true}` 后切表单再切 JSON，该字段消失；直接编辑已保存的此类服务也会在保存时删除它。Claude 适配器实际读取该字段，因此会改变工具加载行为。应让管理 schema 明确拒绝未支持选项，或完整保留已接受字段并补往返验证。

未发现代理、发现框架或 UI MCP 客户端等越界实现。已检查共享配置存储、当前 host 作用域、插件写保护、确认删除及手动快照前缀过滤。

未重跑测试、修改源码或验证原生／Electron；以上为源码审阅发现，最终验收由主 Agent 执行。

### Review adjudication

撤回原第二项“跨来源名称冲突”：此前把展示名称重复解释为运行标识冲突，证据不足。插件 SDK 分别定义 `id` 与 `label`；运行标识为 `plugin_<pluginId>_<id>`（`plugins/runtime.ts:534`），手动服务为 `paseo_manual_<id>`（`bootstrap.ts:986`），平台为 `paseo`。`agent-manager.ts:5324` 拒绝 Agent 自带定义占用手动前缀，`:5330` 拒绝与当前 runtime 的确切名称冲突。展示标签相同并不会覆盖定义；规格未明确要求新增全局展示标签唯一策略，因此不计入确定发现。最终 Spec 确认发现为 1 项：alwaysLoad 往返丢失（审阅时 HEAD ce4578325；修复后需由主 Agent 验证）。

### 修复复审（74b2e2a3c）

已只读审查 `/data/home/hulkzzhou/workspaces/paseo-mcp-management-fixes` 的修复 diff。`FormFields` 保存可选 `alwaysLoad`，`connectionFields` 在初始化和 JSON→表单时读取该值，stdio/HTTP/SSE 的 `connection` 仅在该值存在时序列化。因此 `true`、`false` 与缺省值均可保留，JSON 删除字段后也不会带回旧值。新增模型用例覆盖三种传输乘三种取值、直接编辑、双向往返以及 JSON 修改后转回表单。原确认发现判定已解决；**Spec 未决发现：0**。

采用修复 Agent 已报告的模型＋i18n 52 项通过及静态检查 exit 0；本轮未重复运行测试，未修改源码。展示名称冲突的撤回判定保持不变。
