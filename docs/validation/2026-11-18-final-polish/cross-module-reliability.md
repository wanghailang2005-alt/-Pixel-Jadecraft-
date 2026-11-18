# 跨模块可靠性门（2026-11-18）

## 2026-11-19 生产预览验收与上线核查清单

生产预览使用 `npm run preview -- --port 4177 --strictPort`，在独立的无头 Chrome 会话运行 [jade-mainline-e2e.mjs](jade-mainline-e2e.mjs)。测试通过真实指针输入操作工坊与画布，通过浏览器文件选择导入旧档。路线 A 从清空站点存储后的主菜单开始。

| 核查项 | 800×700 | 640×700 |
| --- | --- | --- |
| A · 见面礼、翠玉白菜故事、观察点放大与侧光、创作灵感交接 | 通过 | 通过 |
| A · 琢形、雕纹、抛光、撤销、保存继续、返工保留刀痕 | 通过 | 通过 |
| A · 柔光与布轮点亮的实画对比，工具及操作按钮单行且可达 | 通过 | 通过 |
| A · 落款与 PNG 导出、翠青玉展签及天然色带记录、刷新继续 | 通过 | 通过 |
| A · 旧鱼佩读信、清洁 18 个积尘格、换绳、交付、回访 | 通过 | 通过 |
| B · 旧矿洞 JSON 导入后回工坊，保留成品、展位、故事和已收原石 | 通过 | 通过 |
| B · 清理未拾取掉落，补齐 12 格，沿用旧原石开始新稿 | 通过 | 通过 |
| 行囊 · 12 格原石、详情、图鉴与底栏间距，选料不扣库存 | 通过 | 通过 |

- [x] `npm test` 146/146 通过，覆盖存档校验、矿洞迁移、12 种配色及可重复选料、图鉴解锁和加工矩阵。
- [x] `npm run build` 通过。生产 Phaser 场景为 Boot、menu、workshop、gallery。发布资产清单与入口脚本未见旧矿洞、矿工图集和采矿入口。
- [x] 两种尺寸的 A、B 路线通过，浏览器运行时异常为 0。下载文件已核验 PNG 签名。
- [x] 截图、下载样本和机器检查结果归档至 `.tmp/validation/2026-11-18-final-polish/`。

关键证据以 `jade-{节点}-{800,640}x700.png` 命名。节点包括 `mentor`、`inventory-raw`、`inventory-codex`、`museum-side-zoom`、`shape`、`carve`、`polish-soft`、`polish-bright`、`signing`、`gallery-plaque`、`gallery-resume`、`heirloom-before`、`heirloom-after`、`migration` 和 `migration-craft`。机器检查数据见 `jade-e2e-800.json` 与 `jade-e2e-640.json`。

| GitHub 截图 | 查看 |
| --- | --- |
| 800×700 藏玉行囊 | [12 格原石](screenshots/jade-inventory-raw-800x700.png) · [待收录线稿](screenshots/jade-inventory-codex-800x700.png) · [玉琮彩色精绘](screenshots/jade-inventory-codex-unlocked-800x700.png) |
| 800×700 玉文化馆与旧玉来信 | [翠玉白菜放大与侧光](screenshots/jade-museum-side-zoom-800x700.png) · [旧鱼佩保养](screenshots/jade-heirloom-before-800x700.png) |
| 640×700 加工 | [细磨柔光](screenshots/jade-polish-soft-640x700.png) · [布轮点亮](screenshots/jade-polish-bright-640x700.png) |
| 640×700 展厅与迁移 | [真实作品展签](screenshots/jade-gallery-plaque-640x700.png) · [旧档保留与补位](screenshots/jade-migration-640x700.png) |

## 2026-11-18 历史基线

- 脚本：`.tmp/validation/2026-11-18-final-polish/cross-module-smoke.mjs`。
- 生产预览：`vite preview --host 127.0.0.1 --port 4173`，无头 Chromium。
- 每个尺寸均完成“工坊 → 矿洞 → 展厅 → 行囊弹窗 → 设置弹窗 → 关闭 → 刷新”；四尺寸为 `1280×720`、`1024×768`、`800×700`、`640×700`。
- 四尺寸场景截图写入 `.tmp/validation/2026-11-18-final-polish/cross-{scene}-{size}.png`，行囊与设置截图写入 `cross-inventory-{size}.png`。
- 弹窗检查：`dialog.open=true` 且 `#game[data-paused="true"]`；关闭后场景恢复，未出现滚动偏移。
- 刷新后从菜单点击“继续旅程”恢复到刷新前的 `gallery`，证据为 `cross-continue-640x700.png`；`pixel-jadecraft.save.v1` 仍存在。
- `errors=[]`，没有页面错误或未处理 Promise；所有热键与输入清理由 `PauseGate`、场景 `resetInput()` 和现有单测覆盖。

## 结果

跨模块可靠性门完成。异常存档、写入失败、导入/导出、输入释放、弹窗冻结、音频暂停与恢复的边界由 `state.test.js`、`pause.test.js`、`creative-integration.test.js` 和 `exhibition.test.js` 共 137 项回归锁定。
