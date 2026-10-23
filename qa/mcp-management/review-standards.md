## Standards

复审 `74b2e2a3c40ec6eb0e10f862a9b06db709391206`，原 2 项明确规范违反均已修复，**未决 0 项**。

1. **原 P1，已修复：`alwaysLoad` 丢失。** `packages/app/src/screens/settings/mcp-service-form-model.ts:24–25,49–62` 现在从快照保存 `alwaysLoad`，stdio/http/sse 提交均保留其值，并区分缺省与显式 `false`。JSON → 表单重新解析后也保存该字段。符合 `docs/forms.md`：“Edit mode seeds every value AND display from the snapshot”。新增模型用例覆盖三种传输 × 缺省/false/true 的直接提交、模式往返和 JSON 修改。

2. **原 P2，已修复：七种语言混入英文管理文案。** `packages/app/src/i18n/resources/mcp-services.ts:91–404` 的 ar/es/fr/ja/ko/pt-BR/ru 均已独立提供新增管理文案，不再展开英文 `management`；确认文案保留 `{{name}}` 插值。符合 `docs/i18n.md`：“Within a migrated surface, do not leave mixed-language neighboring labels when those labels are owned by the client.”

未发现需要新增抽象处理的启发式 smell。

本次仅静态复审修复 diff，未改代码、未重跑测试。沿用修复 Agent 报告：模型与 i18n 共 52 项、typecheck、lint、formatcheck 均 exit 0；浏览器复跑由主任务跟进。原生交互与各语言母语审校未验证。
