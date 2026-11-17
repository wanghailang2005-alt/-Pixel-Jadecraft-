# 拓展 4：雅致排版与分享仪式感

## 对照与实现

- 对照概念图 `06-pattern-customization.png`、`08-dialogs-and-menus.png`、`10-art-and-system-overview.png` 与设计基线 HTML 的夜窗、红木座、回纹、云纹、印章和落款章节。
- `src/collection-view.js` 的纪念卡加入回纹像素边框、印章和材质/工艺展签，沿用 24 字 Unicode 边界；导出通过 `src/export.js` 统一封装并捕获 Blob/URL 失败。
- `src/collection.css` 保留夜窗 DOM 烟丝动态和减弱动效静态降级；不新增正式位图资产。

## 验收证据

- 夜窗及导出入口：`p008-night-window-1280x720.png`、`p008-night-window-800x700.png`、`p008-night-window-640x700.png`。
- `p1-ambient-export-smoke.mjs` 使用 `p007-seal-fixture.json` 打开定制面板，读取导出按钮与印章入口；注入 `toBlob(null)` 后反馈为“图片未能生成，请重试。”。
- `npm test`：142/142；`npm run build`：通过。

## 结论

已完成。纪念卡导出失败可恢复，成功路径保留真实作品 ID、材质、工艺和落款；导出文件仍由浏览器下载策略决定。
