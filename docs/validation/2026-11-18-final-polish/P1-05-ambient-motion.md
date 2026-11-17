# P1-05 环境微动态与减弱动效（2026-11-18）

## 改动

- `src/runtime.js`：工坊场景加入 12 个低对比度方形窗隙尘埃微粒，沿固定轨迹缓慢上浮并自动回收；只在 `prefers-reduced-motion: no-preference` 下创建。
- `src/runtime.js`：展厅增加射灯区域的低对比方形微粒，沿固定轨迹回收；同样由 `prefers-reduced-motion` 关闭。射灯锥形与玻璃边缘反光由三组展位锚点绘制，四帧低幅度呼吸只改变环境层透明度。
- `src/mine-scene.js`：矿脉光晕和掉落物的轻微呼吸/上下帧动画在减弱动效偏好下固定为静态帧；采矿冲击仍保留可读的即时反馈，重镐镜头震动与轻触反馈已有减弱动效保护。
- `src/collection-view.js` / `src/collection.css`：纪念卡工作台补充稀疏香烟像素漂移；减弱动效时保留静态烟丝。

## 验证

- `npm test`：153/153 通过，432/432 加工组合通过；新增射灯锚点、DOM 铭牌数据与呼吸帧边界单测。
- `npm run build`：通过，应用入口约 326.00 kB，Phaser vendor 约 1.37 MB。
- 工坊、矿洞、展厅与纪念卡生产预览截图继续写入 `.tmp/validation/2026-11-18-final-polish/`；无头浏览器页面错误为空。展厅锥形四尺寸截图为 `exp03-gallery-lighting-*.png`，减弱动效截图为 `exp03-gallery-reduced-motion-800x700.png`，DOM 空展位铭牌走查为 `exp03-gallery-dom-empty-800x700.png`。
- `p1-ambient-export-smoke.mjs` 在 `1280×720`、`1024×768`、`800×700`、`640×700` 验证展厅三展位 DOM 铭牌、生产画布场景和滚动位置；`toBlob(null)` 故障注入得到“图片未能生成，请重试。”；减弱动效媒体查询命中并生成 `p1-gallery-reduced-motion-800x700.png`。
- 运行时未新增外部依赖、音频文件、存档字段或玩法系统。

## 已知差距

展厅射灯粒子、三展位阶梯锥形、夜窗香烟和玉质内部散射已补入代码生成层；概念图的英文 HUD、人物插画和完整逐帧重绘仍属于视觉差距，不影响当前测试与存档不变量。
