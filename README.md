# Pixel Jadecraft（像素琢玉）

基于 Phaser 的 2D 像素玉文化游戏。从行囊选一块玉，在玉文化馆寻找灵感，亲手琢形、雕纹、抛光，再为作品落款和布展。

## 试玩

1. 开启旅程，与工坊师傅对话。行囊初始有 12 种样石，创作可反复使用其中的原石。
2. 在玉文化馆从翠玉白菜开始，读故事、放大观察并切换侧光。选择「带着灵感创作」，将当前展品带回工坊。
3. 选玉璧、玉鱼佩或玉印，布置纹样纸稿，依次琢形、雕纹、抛光。每阶段可撤销、重做或保存继续。
4. 为作品落款并导出纪念卡 PNG，在「我的展厅」安排三个展位、调整灯光。也可以读阿宁的旧玉来信，保养鱼佩或另作伴佩。
5. 刷新后从菜单继续旅程。可在「设置 → 管理备份」导入或导出 JSON。旧矿洞档会回到工坊，保留已收藏原石、草稿、作品、展位和故事进度，未拾取掉落会清理。

快捷键：B 行囊、J 委托、G 图鉴、M 静音、F 全屏、Esc 暂停或关闭弹窗。存档按浏览器和站点地址隔离。

## 本地运行

使用 Node.js 22.12 或更新版本。依赖版本由 `package-lock.json` 锁定。

```powershell
npm ci
npm run dev
```

在浏览器打开终端输出的地址。开发服务器默认使用 5173 端口。

```powershell
npm test
npm run build
npm run preview
```

生产文件位于 `dist/`。Windows 桌面版可通过 `npm run desktop` 调试，安装包脚本见 [package.json](package.json)。

## 任务包 1–6 验收

146 项自动测试与生产构建通过。800×700 和 640×700 的生产预览完成新档主线与旧矿洞档导入。验收细节、截图和上线核查清单见[跨模块验收记录](docs/validation/2026-11-18-final-polish/cross-module-reliability.md)。

- [任务包与编号对照](docs/TASK_PACKAGE_2026-11-18_JADE_CULTURE_AND_POLISH.md)
- [收尾任务书](docs/FINAL_POLISH_TASKBOOK_2026-11-18.md)
- [800×700 原石行囊](docs/validation/2026-11-18-final-polish/screenshots/jade-inventory-raw-800x700.png) · [图鉴精绘](docs/validation/2026-11-18-final-polish/screenshots/jade-inventory-codex-unlocked-800x700.png) · [640×700 抛光](docs/validation/2026-11-18-final-polish/screenshots/jade-polish-bright-640x700.png)

## 项目文件

| 路径 | 用途 |
| --- | --- |
| [src/](src/) | 游戏状态、Phaser 场景、玉文化馆、玉稿加工与 UI |
| [src/assets/](src/assets/README.md) | 游戏美术与素材来源 |
| [desktop/](desktop/) | Windows 桌面与打包入口 |
| [docs/concept-art/](docs/concept-art/README.md) | 概念图与设计来源 |
| [docs/validation/](docs/validation/) | 小窗、存档、交互和历史验收 |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | 项目范围与开发计划 |

历史玩法见[矿洞验收](docs/validation/2026-11-15-cavern/REVIEW.md)、[玉文化视觉验收](docs/validation/2026-11-15-culture-visual/REVIEW.md)及[深化版验收](docs/validation/2026-11-15-depth/REVIEW.md)。矿洞运行入口已从当前产品撤下，迁移测试及设计资料仍可在仓库中查阅。
