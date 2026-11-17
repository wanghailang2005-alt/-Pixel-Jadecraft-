# P0-00 基线锁定与素材清点（2026-11-18）

## 状态

完成。当前分支为 `codex/museum-craft-20261114`，本地 HEAD 与 `origin/codex/museum-craft-20261114` 一致（任务开始时为 `2537d2ce224449b0119b2298ade11235057e32b3`）。工作区已有 `.gitignore`、`AGENTS.md`、`README.md` 的修改和未跟踪的收尾任务书；这些文件不属于本轮改动，提交时保持未暂存。

Notion Agent Operating Guide 的检索结果存在，但当前连接对页面正文返回 404；本记录不写入 Notion，依据仓库文件和可复现命令建立。

## 概念图清点

概念图目录 `docs/concept-art/` 包含 01–10 共 10 张 PNG。它们均为 RGB、无透明通道；尺寸与 SHA-256 如下：

| 编号 | 文件 | 尺寸 | SHA-256（工作区） |
| --- | --- | --- | --- |
| 01 | `01-mine-exploration.png` | 1024×559 | `989b65027bd8b70ca3e9804c94a39130a00d866cfb974207d074589dc208adce` |
| 02 | `02-inventory-codex.png` | 1024×559 | `af75ee91b6bbb915b703d48e29b31c26191a18f45b3acdccf15a5925ecfc90b8` |
| 03 | `03-jade-workshop.png` | 1024×589 | `65eaaf8a773b8453a63abd4d242051fc60b166a50469a6cfbb09965d937d6c4d` |
| 04 | `04-digital-exhibition.png` | 903×1024 | `731579bacf5cd1b3f9cab9dac6741e12af88cfd28d4ee15b81519c44cfd8a513` |
| 05 | `05-jade-inspection.png` | 903×1024 | `78c86a7f52aa4873a7dfa192a3fccd0b856e1b11217189649cb06b8b88e11850` |
| 06 | `06-pattern-customization.png` | 1024×559 | `b883fa489c462b7a191725fcd0750307d0875b61b6949cd5e19efb80c03091f4` |
| 07 | `07-ui-components.png` | 1024×559 | `d3f1dfdfaa652b30ce3ee65404520180b73261d993e55967aa55cb01ba3217cc` |
| 08 | `08-dialogs-and-menus.png` | 1024×559 | `b55f057b16017fa18ba76c16ba6df2d553965195a33b157b46a91912dbea4be0` |
| 09 | `09-workshop-interface.png` | 1024×559 | `b4fd7b275e1d83196bc33ef3504bcf207c58c0904d05813e0c703442038db0f3` |
| 10 | `10-art-and-system-overview.png` | 1024×559 | `cfbdd26da9a5a41df1d5e069a7698c1d23b365ca5276f57af99a67d05047c4f4` |

设计基线 `D:/DOWnload_EDge/pixel_jadecraft.html` 仍以 SHA-256 `0B35CF5FFE6BF5D77CF83A2D905DD7FCC5A8C1CACB02A251C07C4CF23E3935A4` 为准。文档明确的四个对齐轴是人物与道具比例、矿洞接缝与像素质感、Canvas 缩略图与文字解耦、800×700 紧凑窗口可用性。

## 正式素材核验

`src/assets/` 当前引用的正式 PNG 已核对尺寸、模式、透明通道和哈希：

- `workshop-isometric-v1.png`：1672×941，RGB，无透明通道，SHA-256 `883ee547d25b6659f848acdbca2c257c57f27a111ae2fc41217e588b5f4d9704`。
- `master-carver-v1.png`：1254×1254，RGBA，透明通道范围 0–255，SHA-256 `92dba9402f84b348a37a33b362942df8bad21865faa26260b1de6dfdffd79aee`。
- `gallery-isometric-v1.png`：1672×941，RGB，无透明通道，SHA-256 `630391e069970ea13ab92f6721774c34dee4821930558a30e55e7ea15223cc89`。
- `mine-cavern-v1.png`：1672×941，RGB，无透明通道，SHA-256 `a665b765d5333778d0808603d84a2367a9df6ad04a0424f7dc30fe4eb6ba2686`。
- `menu-mountains-v1.png`：1672×941，RGB，无透明通道，SHA-256 `42d0647e1a3e928bfd54782de1adc32234259224291f506ae0929035f245789`。
- `tiles-mine.png`：80×16，RGBA，透明通道范围 0–255；运行时帧数检查不足 20 帧时回退到程序地形。
- `player-32x48.png`：192×144，RGBA，透明通道范围 0–255；运行时按 18 帧校验。

任务书中提到的 `master-carver-v2-bent.png` 与 `workshop-isometric-v2-aligned.png` 不在当前源目录，当前正式代码仍引用 v1；未把构建目录中无法追溯来源的残留文件当作正式资产。后续若补入 v2，必须先补原始来源、许可记录和哈希。

根目录没有 `tmp_*.png`；`.tmp/` 与 `tmp_*.png` 已由现有 `.gitignore` 排除。本轮回归截图统一写入 `.tmp/validation/2026-11-18-final-polish/`。

## 自动基线

- `npm test`：137/137 通过，包含 432 种加工组合矩阵。
- `npm run build`：通过；当前首包仍有 Vite >500 kB 提示，记录为 P1-01 待处理。
