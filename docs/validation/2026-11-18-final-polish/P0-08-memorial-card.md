# P0-08 夜窗落款与纪念卡验收

日期：2026-11-18  
状态：完成

## 对照基线

- 概念图：`docs/concept-art/08-dialogs-and-menus.png`，对照木铜边框、弹窗层级和中文锐利度。
- 设计基线：`D:/DOWnload_EDge/pixel_jadecraft.html` 第 08 节，要求夜窗、红木座、月色山峦、暖灯笼、轻烟和固定尺寸纪念卡。
- 实现：`src/collection-view.js`、`src/collection.css`。本项未新增正式图片素材，纪念卡图案全部由像素绘制函数生成。

## 走查证据

使用同一件已完成玉印 `piece-seal-proof` 验证落款、导出与作品引用。

| 尺寸 | 结果 | 截图 |
| --- | --- | --- |
| 1280×720 | 夜窗工作台与落款控件完整可见，横向无溢出 | `.tmp/validation/2026-11-18-final-polish/p008-night-window-1280x720.png` |
| 1024×768 | 夜窗、月山、暖灯和红木座保持比例，横向无溢出 | `.tmp/validation/2026-11-18-final-polish/p008-night-window-1024x768.png` |
| 800×700 | 纪念卡预览与落款动作可达，横向无溢出 | `.tmp/validation/2026-11-18-final-polish/p008-night-window-800x700.png` |
| 640×700 | 窄窗单列布局可滚动完成落款，横向无溢出 | `.tmp/validation/2026-11-18-final-polish/p008-night-window-640x700.png` |

自动走查：`.tmp/validation/2026-11-18-final-polish/p008-smoke.mjs`。

- 空落款：`0/24`，保存与导出可用。
- 24 字落款：`24/24`，保存与导出可用。
- 25 字落款：显示 `25/24`，保存与导出均禁用并标记无效。
- 保存后作品数量仍为 1，作品 ID 保持 `piece-seal-proof`，没有生成副本。
- PNG 导出固定为 `720×520`，通过 PNG IHDR 读取尺寸，内容由真实雕刻表面、材质、三阶段工艺、纹样、落款与展签构成。

## 自动测试与构建

- `npm test`：137/137 通过，包含 24 字 Unicode 边界与存档往返。
- `npm run build`：通过。

## 已对齐与差距

- 已对齐：夜窗、月山、红木台、暖灯、轻烟、固定尺寸纪念卡、落款边界、同一作品 ID 引用。
- 差距：概念图中的复杂装饰纹样以可控的像素回纹和云角重绘，未引入来源不明外部图片；640px 采用单列滚动以保持文字和预览可读。

## 关闭

本项证据齐全，标记为“完成”。
