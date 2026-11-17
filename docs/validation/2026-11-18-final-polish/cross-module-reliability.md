# 跨模块可靠性门（2026-11-18）

## 验证

- 脚本：`.tmp/validation/2026-11-18-final-polish/cross-module-smoke.mjs`。
- 生产预览：`vite preview --host 127.0.0.1 --port 4173`，无头 Chromium。
- 每个尺寸均完成“工坊 → 矿洞 → 展厅 → 行囊弹窗 → 设置弹窗 → 关闭 → 刷新”；四尺寸为 `1280×720`、`1024×768`、`800×700`、`640×700`。
- 四尺寸场景截图写入 `.tmp/validation/2026-11-18-final-polish/cross-{scene}-{size}.png`，行囊与设置截图写入 `cross-inventory-{size}.png`。
- 弹窗检查：`dialog.open=true` 且 `#game[data-paused="true"]`；关闭后场景恢复，未出现滚动偏移。
- 刷新后从菜单点击“继续旅程”恢复到刷新前的 `gallery`，证据为 `cross-continue-640x700.png`；`pixel-jadecraft.save.v1` 仍存在。
- `errors=[]`，没有页面错误或未处理 Promise；所有热键与输入清理由 `PauseGate`、场景 `resetInput()` 和现有单测覆盖。

## 结果

跨模块可靠性门完成。异常存档、写入失败、导入/导出、输入释放、弹窗冻结、音频暂停与恢复的边界由 `state.test.js`、`pause.test.js`、`creative-integration.test.js` 和 `exhibition.test.js` 共 137 项回归锁定。
