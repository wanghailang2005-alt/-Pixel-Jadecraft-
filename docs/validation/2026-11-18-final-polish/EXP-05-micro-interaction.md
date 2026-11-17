# 拓展 5：微交互引导与快捷键体验

## 对照与实现

- 对照概念图 `02-inventory-codex.png`、`07-ui-components.png`、`09-workshop-interface.png` 与设计基线 HTML 的热键栏、工艺提示和可达性章节。
- `src/shortcuts.js` 集中解析全局快捷键与加工工具 `1/2` 快捷键；`src/ui.js` 在工坊导航中显示 `B/J/G` 微标并提供悬停标题；`src/creative-view.js` 在工具按钮显示工艺提示与 `1/2` 微标并支持键盘切换；`src/inspection-view.js` 在观玉台显示 `1/2/3` 光线切换提示并支持键盘切换。
- `src/shortcuts.test.js` 新增边界单测；未更改既有 B/J/G/M/F/E 热键语义或存档字段。

## 验收证据

- 工坊与加工截图：`cross-workshop-800x700.png`、`p004-creative-800x700.png`、`p005-inspection-800.png`、`p1-shortcuts-800x700.png`。
- 全局快捷键/工具边界由 `npm test` 的 `shortcuts.test.js` 覆盖（142/142）；`npm run build`：通过。
- `git diff --check`：通过；浏览器走查页面错误为空。

## 结论

已完成。提示仅占工具栏内部空间，640px/800px 高度下仍保留主要操作；新增提示在减弱动效下不依赖动画。
