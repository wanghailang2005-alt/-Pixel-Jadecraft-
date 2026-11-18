# P0-05 玉文化馆与鉴赏观察

日期：2026-11-18

## 对照来源

- 概念图：`docs/concept-art/05-jade-inspection.png`。
- 基线章节：`D:/DOWnload_EDge/pixel_jadecraft.html` 中玉文化馆与鉴赏观察规格。
- 运行实现：`src/museum-view.js`、`src/museum-art.js`、`src/museum.css`、`src/museum-content.js`。

## 验证结果

- 独立无头生产预览走查玉材、玉器、匠人三个分厅，共 28 件唯一馆藏；每件完成故事翻页、识玉看器、观察笔记和来源链接检查，像素画布均有可见内容，未出现横向溢出。
- 观察台支持 3 个真实观察点、放大细看和柔和照明；在有效旅程存档中点击观察点后可收藏灵感，记录写入 `museum.observations`，重复点击不会重复计数。
- 800×700 截图中观察圈注、侧光按钮、三条观察笔记、收藏灵感和来源折叠区均由 DOM 清晰渲染，Canvas 只承载玉器像素与放大镜视觉；640×700 下同样没有横向溢出。
- 本轮补强将 `museum-art.js` 的馆藏绘制升级为带稳定种子的材质纹理层：原石使用矿物颗粒，器物使用刻纹/浮雕颗粒；“提亮观察”现在在 Canvas 内叠加像素化侧光、高光碎片和内部散射，不依赖单一 CSS 亮度滤镜。
- 无新增外部图片。纹理与光学层均为仓库内确定性代码生成，正式素材来源仍见 `src/assets/README.md`。
- `npm test`：157/157 通过（含 432/432 加工组合矩阵）；`npm run build`：通过。

截图：`.tmp/validation/2026-11-18-final-polish/p005-museum-800.png`、`p005-inspection-800x700.png`、`p005-inspection-640x700.png`、`p005-inspection-1280.png`、`p005-inspection-1280-side.png`。

## 已知差距

馆藏像素图仍是 `museum-art.js` 的确定性像素绘制器，未引入来源不明的外部精灵图；与附件概念图的英文 HUD、人物插画和画幅不同，未宣称逐像素相似度。新增纹理和侧光层已在四尺寸生产预览中验证，但射灯锥形、人物插画和概念图构图仍保留为美术差距。

结论：完成 P0-05 的放大、侧光、观察、来源和灵感持久化验收。

## 2026-11-18 顶部年代铭牌优化

- 改动：`src/museum-view.js` 将观察页年代信息标记为“年代 · …”；`src/museum.css` 增加窄铭牌、截断和窄宽布局规则。
- 不变量：保留馆藏年代原值、返回分厅、观察点、侧光、收藏灵感和故事翻页逻辑。
- 验证：在 640×700、800×700、1024×768 生产预览中检查观察页，年代信息保持完整可读，长文本使用省略号，未出现孤立字符或横向溢出。
- 截图：`.tmp/validation/2026-11-18-final-polish/inspection-period-640x700.png`、`inspection-period-800x700.png`、`inspection-period-1024x768.png`。
