# P0-03 展厅布展与文字清晰度

日期：2026-11-18

## 对照来源

- 基线章节：`D:/DOWnload_EDge/pixel_jadecraft.html` 中“展厅布展弹窗：玻璃展柜独立渲染与铭牌文字分离”。
- 运行实现：`src/collection-view.js`、`src/collection.css`、`src/piece-renderer.js`。
- 概念图对照：附件 03 的展柜层次；本轮没有新增正式图片。

## 改动

- 展柜 Canvas 继续只绘制真实器物像素；名称、材质、工艺、纹样和落款改为 DOM 木铜铭牌，避免中文进入 480×480 Canvas 后被缩放成色块。
- 铭牌在空展位显示真实的“待选/尚未加工”状态；有作品时显示对应玉材、真实抛光意图（柔光抛磨/局部亮面）和真实纹样来源。
- 保留三展位、唯一作品引用、灯光主题、陈列/撤展流程和原有存档兼容。

## 验证

- `npm test`：137/137 通过，432 种加工组合矩阵通过。
- `npm run build`：通过。
- 生产预览通过独立无头 CDP：导入现有有效作品存档，进入“我的展厅 → 布置你的玉展”，在 1280×720、800×700、640×700 截图；三种尺寸均检测到三个 180×180 展柜 Canvas、DOM 展签和陈列/撤展按钮，`document.documentElement.scrollWidth <= innerWidth`。
- 截图：`.tmp/validation/2026-11-18-final-polish/p003-exhibit-1280x720.png`、`p003-exhibit-800x700.png`、`p003-exhibit-640x700.png`。

## 已知差距

640px 窄宽下三展位按单列排列，需要在弹窗内部滚动查看后续展位的铭牌；这是响应式布局的可达性取舍，不会把中文压进 Canvas。附件概念图的英文标签被当前中文信息架构替换，未宣称逐像素相似度。

结论：完成 P0-03 的展柜/铭牌分层与多窗口清晰度验收。

## 2026-11-18 追加收尾

- `src/scenery.js` 的 Phaser 展厅层只保留器物像素；`src/ui.js` 将三展位名称、材质和工艺铭牌放到 DOM，`src/style.css` 维持 800×700 与 640×700 的锐利排版。
- `src/runtime.js` 增加玻璃边缘反光和低对比度射灯锥形；空展位 DOM 铭牌走查截图为 `.tmp/validation/2026-11-18-final-polish/exp03-gallery-dom-empty-800x700.png`。
- 追加验证：`npm test` 153/153，432/432 加工矩阵；`npm run build` 通过；`git diff --check` 通过。`gallery-lighting.test.js` 覆盖三展位坐标与铭牌数据。
