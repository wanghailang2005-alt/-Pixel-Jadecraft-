# 拓展 4：雅致排版与分享仪式感

## 对照与实现

- 对照概念图 `06-pattern-customization.png`、`08-dialogs-and-menus.png`、`10-art-and-system-overview.png` 与设计基线 HTML 的夜窗、红木座、回纹、云纹、印章和落款章节。
- `src/collection-view.js` 的纪念卡加入回纹与云纹像素边框、按落款长度自适应的印章、材质/工艺展签和“温润柔光 / 凝光点睛”工艺雅称；落款按 Unicode 码点分成最多四行，沿用 24 字边界。导出通过 `src/export.js` 统一封装并捕获 Blob/URL 失败。
- `src/memorial-card.test.js` 锁定工艺雅称、24 码点截断、四行排版和印章尺寸适配。
- `src/collection.css` 保留夜窗 DOM 烟丝动态和减弱动效静态降级；不新增正式位图资产。

## 验收证据

- 夜窗及导出入口：`p008-memorial-ritual-1280x720.png`、`p008-memorial-ritual-1024x768.png`、`p008-memorial-ritual-800x700.png`、`p008-memorial-ritual-640x700.png`；640×700 控制栏滚动可达性补充 `p008-memorial-ritual-640x700-controls.png`。
- 四尺寸走查均无横向溢出；1280×720、1024×768、800×700 的控制栏在首屏可见，640×700 先展示夜窗主体，滚动后保存/导出操作可见。
- 24 字落款真实导出 PNG 走查：`p008-memorial-card-24char-export.png`；四行落款、34px 自适应印章与底部纪念标识均保持在固定 720×520 导出画布内。
- `p1-ambient-export-smoke.mjs` 使用 `p007-seal-fixture.json` 打开定制面板，读取导出按钮与印章入口；注入 `toBlob(null)` 后反馈为“图片未能生成，请重试。”。
- `npm test`：156/156（含 432/432 加工矩阵）；`npm run build`：通过；`git diff --check`：通过。

## 结论

已完成。纪念卡导出失败可恢复，成功路径保留真实作品 ID、材质、工艺雅称和落款；古典边框、印章自适应与四尺寸夜窗走查均已闭环，导出文件仍由浏览器下载策略决定。
