# P0-05 玉文化馆与鉴赏观察

日期：2026-11-18

## 对照来源

- 概念图：`docs/concept-art/05-jade-inspection.png`。
- 基线章节：`D:/DOWnload_EDge/pixel_jadecraft.html` 中玉文化馆与鉴赏观察规格。
- 运行实现：`src/museum-view.js`、`src/museum-art.js`、`src/museum.css`、`src/museum-content.js`。

## 验证结果

- 独立无头生产预览走查玉材、玉器、匠人三个分厅，共 28 件唯一馆藏；每件完成故事翻页、识玉看器、观察笔记和来源链接检查，像素画布均有可见内容，未出现横向溢出。
- 观察台支持 3 个真实观察点、放大细看和柔和照明；在有效旅程存档中点击观察点后可收藏灵感，记录写入 `museum.observations`，重复点击不会重复计数。
- 800×700 截图中观察圈注、侧光按钮、三条观察笔记、收藏灵感和来源折叠区均由 DOM 清晰渲染，Canvas 只承载玉器像素与放大镜视觉。
- `npm test`：137/137 通过；`npm run build`：通过。

截图：`.tmp/validation/2026-11-18-final-polish/p005-museum-800.png`、`p005-inspection-800.png`。

## 已知差距

馆藏像素图由现有 `museum-art.js` 的确定性像素绘制器生成，未引入来源不明的外部精灵图；与附件概念图的英文 HUD、人物插画和画幅不同，未宣称逐像素相似度。原石侧光和玩家作品页另有既有回归截图覆盖。

结论：完成 P0-05 的放大、侧光、观察、来源和灵感持久化验收。
