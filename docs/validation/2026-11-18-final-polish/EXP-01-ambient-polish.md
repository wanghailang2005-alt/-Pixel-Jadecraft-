# 拓展 1：全场景环境动态生态与氛围特效

## 对照与实现

- 对照仓库概念图 `01-mine-exploration.png`、`03-jade-workshop.png`、`04-digital-exhibition.png`、`06-pattern-customization.png`、`08-dialogs-and-menus.png`、`09-workshop-interface.png` 与设计基线 HTML 的环境光、矿灯、射灯和夜窗章节。
- `src/runtime.js`：工坊窗隙尘埃、展厅射灯微粒；`src/mine-scene.js`：矿脉/掉落的动态与减弱动效分支；`src/collection-view.js`、`src/collection.css`：纪念卡香烟 DOM 微动态。
- 所有环境动态均为代码生成像素方块/DOM 层，无新增外部资产；`prefers-reduced-motion: reduce` 时固定为静态帧。

## 验收证据

- 四尺寸展厅截图：`p1-gallery-ambient-1280x720.png`、`p1-gallery-ambient-1024x768.png`、`p1-gallery-ambient-800x700.png`、`p1-gallery-ambient-640x700.png`。
- 减弱动效截图：`p1-gallery-reduced-motion-800x700.png`；脚本同时读取 `matchMedia` 为 `true`，并监听页面错误为空。
- `npm test`：142/142；`npm run build`：通过。

## 结论

已完成。动态层不遮挡 DOM UI，关闭动效后不影响操作；概念图中的逐像素素材差异保留为后续美术差距记录。
