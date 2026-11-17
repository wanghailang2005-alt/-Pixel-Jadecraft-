# 拓展 2：琢玉工艺全链路视听触反馈

## 对照与实现

- 对照概念图 `01-mine-exploration.png`、`07-ui-components.png`、`09-workshop-interface.png` 及设计基线 HTML 的敲击、崩玉、刮磨、抛光和试印反馈段落。
- `src/audio.js` 根据完成度调整采矿音效频率与时长；`src/mine-scene.js` 将完成度传入音效、同步青绿色粒子并在支持的设备上提供轻触反馈；加工/试印沿用现有阶段音效与真实表面矩阵。
- `src/creative-view.js` / `src/creative.css` 为“蘸朱试印”加入朱砂印泥像素高光与按压回弹，`prefers-reduced-motion` 时保留静态印泥状态；印迹仍由真实刀痕生成。
- 轻触反馈为可选 Web API，缺失或减弱动效时不会阻塞动作；没有引入外部音频资产。

## 验收证据

- 矿洞采击与粒子证据：`p002-c1-mining.png`、`p002-mine-800x700.png`、`p002-mine-reduced-motion-800x700.png`。
- 三阶段工艺证据：`p004-creative-1280x720.png`、`p004-creative-800x700.png`；真实表面与采矿反馈入口由 `creative-integration.test.js`、`mine-cavern.test.js` 覆盖。
- `npm test`：154/154（含 432/432 加工矩阵）；`npm run build`：通过。

## 结论

已完成。反馈参数随进度变化且不改变存档或加工矩阵；设备不支持振动时安全降级。
