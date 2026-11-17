# 拓展 3：展厅光影氛围与玉质光学

## 对照与实现

- 对照概念图 `04-digital-exhibition.png`、`05-jade-inspection.png`、`10-art-and-system-overview.png` 与设计基线 HTML 的暖烛、天青、月白、侧光和内部纹理章节。
- `src/piece-renderer.js` 增加玉面边缘高光、内部散射和侧光梯度；`src/collection-view.js` 将展厅灯光主题映射为实际 displayLight；`src/museum-art.js` 增加稳定种子的矿物/刻纹颗粒和 Canvas 内像素化侧光层；展签与属性仍由 DOM 铭牌渲染。
- `src/runtime.js` 的展厅射灯微粒仅作为环境层，不覆盖器物 Canvas；新增三组阶梯像素射灯锥形和玻璃边缘反光，分别锚定左、中、右展位，并以低对比度四帧呼吸调制氛围层。
- `src/gallery-lighting.js` 集中保存三展位锚点、DOM 铭牌数据与呼吸帧，`src/gallery-lighting.test.js` 锁定展位坐标、空/实物铭牌、锥形边界和帧循环；`prefers-reduced-motion: reduce` 时只绘制静态基线。
- `src/scenery.js` 展品层只保留器物像素；`src/ui.js` / `src/style.css` 将三展位名称、材质和工艺铭牌放在高清 DOM 层，避免中文进入 Phaser Canvas。

## 验收证据

- 展厅四尺寸截图：`p1-gallery-ambient-1280x720.png`、`p1-gallery-ambient-1024x768.png`、`p1-gallery-ambient-800x700.png`、`p1-gallery-ambient-640x700.png`。
- 射灯锥形四尺寸截图：`exp03-gallery-lighting-1280x720.png`、`exp03-gallery-lighting-1024x768.png`、`exp03-gallery-lighting-800x700.png`、`exp03-gallery-lighting-640x700.png`；减弱动效证据：`exp03-gallery-reduced-motion-800x700.png`。
- 侧光、透光和放大观察证据：`p005-inspection-800x700.png`、`p005-inspection-640x700.png`、`p005-inspection-1280.png`、`p005-inspection-1280-side.png`、`p005-museum-800.png`；侧光前后 Canvas 像素采样由生产预览验证，馆藏观察由 `inspection.test.js` 和 `museum-art.test.js` 覆盖。
- `npm test`：153/153（含 432/432 加工矩阵，包含射灯锚点、铭牌数据与呼吸帧单测）；`npm run build`：通过；`git diff --check`：通过。

## 结论

已完成。三种灯光主题和观察侧光均复用真实作品状态；三展位阶梯像素射灯锥形、四尺寸布局和减弱动效基线均已验证。概念图中的英文 HUD、人物插画和完整逐帧重绘仍记录为后续美术差距。
