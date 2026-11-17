# 拓展 3：展厅光影氛围与玉质光学

## 对照与实现

- 对照概念图 `04-digital-exhibition.png`、`05-jade-inspection.png`、`10-art-and-system-overview.png` 与设计基线 HTML 的暖烛、天青、月白、侧光和内部纹理章节。
- `src/piece-renderer.js` 增加玉面边缘高光、内部散射和侧光梯度；`src/collection-view.js` 将展厅灯光主题映射为实际 displayLight；展签与属性仍由 DOM 铭牌渲染。
- `src/runtime.js` 的展厅射灯微粒仅作为环境层，不覆盖器物 Canvas。

## 验收证据

- 展厅四尺寸截图：`p1-gallery-ambient-1280x720.png`、`p1-gallery-ambient-1024x768.png`、`p1-gallery-ambient-800x700.png`、`p1-gallery-ambient-640x700.png`。
- 侧光、透光和放大观察证据：`p005-inspection-800.png`、`p005-museum-800.png`；真实光线状态和馆藏观察由 `inspection.test.js` 覆盖。
- `npm test`：142/142；`npm run build`：通过。

## 结论

已完成。三种灯光主题和观察侧光均复用真实作品状态；概念图级别的逐像素射灯锥形仍记录为美术差距。
