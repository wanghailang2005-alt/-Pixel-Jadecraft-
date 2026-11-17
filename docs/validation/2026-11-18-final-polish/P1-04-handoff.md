# P1-04 证据与交接（2026-11-18）

- 当前任务书：`docs/FINAL_POLISH_TASKBOOK_2026-11-18.md`。
- P0 证据：`P0-00-baseline.md` 至 `P0-09-inventory-codex.md`；矿洞基础闭环见 `P0-02-mine-guide.md`。
- 跨模块证据：`cross-module-reliability.md`。
- P1 证据：`P1-01-resource-loading.md`、`P1-02-runtime-stability.md`、`P1-03-copy-consistency.md`、`P1-05-ambient-motion.md`。
- 五项概念级拓展证据：`EXP-01-ambient-polish.md`、`EXP-02-juice.md`、`EXP-03-gallery-optics.md`、`EXP-04-memorial-ritual.md`、`EXP-05-micro-interaction.md`。
- 追加素材补强：`scripts/generate-mine-atlas.mjs`、`src/asset-integrity.test.js` 与 P0-02 生产预览截图锁定 20 帧矿洞图集。
- 追加工坊姿态补强：`src/workshop-pose.js`、`src/workshop-pose.test.js` 锁定四相接触点与玉屑冲击相位。
- 追加玉文化馆视觉补强：`src/museum-art.js`、`src/museum-art.test.js` 锁定稳定种子材质纹理、像素化侧光与六槽展柜布局；无新增外部图片。
- 追加工坊接触补强：`WORKSHOP_CONTACT` 与 `workshop-pose.test.js` 锁定桌面 AO、桌沿高光、玉料和凿尖同一锚点；无新增外部图片。
- 追加工坊人物补强：`WORKSHOP_PORTRAIT` 与 `workshop-pose.test.js` 锁定放大、前倾和玉料底部锚点；无新增外部图片。
- 工坊人物四尺寸追加截图：`p001-workshop-portrait-1280x720.png`、`p001-workshop-portrait-1024x768.png`、`p001-workshop-portrait-800x700.png`、`p001-workshop-portrait-640x700.png`；最新测试为 154/154。
- 追加试印反馈补强：`creative-view.js` / `creative.css` 的朱砂印泥高光和按压反馈复用真实试印流，不新增素材或存档字段。
- 所有临时截图、走查脚本和浏览器用户目录位于 `.tmp/validation/2026-11-18-final-polish/`，由 `.gitignore` 排除；未把临时 PNG 纳入提交。
- 正式像素资产来源与许可记录见 `src/assets/README.md`；本轮新增的环境微动态、导出工具和光影均为代码生成，不增加外部素材。
- 收尾检查：`git diff --check`、`npm test`（153/153，432/432 加工矩阵）、`npm run build`；本轮展厅射灯锥形、玻璃边缘反光、DOM 铭牌单测和四尺寸生产预览已补入证据。
