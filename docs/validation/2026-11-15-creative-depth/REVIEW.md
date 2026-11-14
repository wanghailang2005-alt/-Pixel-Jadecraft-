# 纹样组合与玉印试印验收

日期：2026-11-15。工作区 `E:\Pixel_Jadecraft`。

## 已实现

- 六个原创线条部件：云头、水波、叶片、游鱼、山峦、回旋。可添加至 12 个，分别选中、拖动、用方向键微调、旋转、缩放、镜像、复制及移除。
- 部件位置存于器型局部坐标，并随纸样整体变换。组合转为实际 64×64 加工导线；导线不会填入 `carve` 或代替玩家下刀。
- 新组合玉印采用正对印面的方形工作视角。白文刻下的线留白；朱文剔低背景、保留高处纹样着朱。两种印法有独立加工目标。
- 试印直接采样作品当前的 `base`、`height`、`carve`，校正纸样姿态后左右镜像。试印保留当时的刀痕，可继续下刀后再次落印比较。
- 抛光阶段可返回雕纹。保留原石 ID、基底、既有高低层次及刻线，重新细磨；新的阶段检查点可以撤销或重做。
- 工作台显示最近两次试印，PNG 印谱导出本次最近四次。已完成玉印也可通过 `createCreativeView().openSeal(piece)` 打开印谱。
- 桌面设计界面采用左侧米色纹样手记、中央木桌玉稿、右侧木铜框控件；原有三器型与参考起稿保留。

## 数据兼容

- 原草稿 `version: 1` 不变。没有 `motifs` 的旧稿继续使用原云纹、龙纹、谷纹导线。
- `motifs` 是可选白名单字段，每项保存 `id/kind/x/y/rotation/scale/mirror`；验证个数、唯一 ID、边界及数值类型。
- 新组合玉印增加 `sealFace: true`、`sealCut: 'intaglio' | 'relief'`。缺少 `sealFace` 的旧侧视玉印维持原几何。
- 试印纸是本次游戏的手记，不随存档保存；实际雕刻表面随存档保存，刷新后可以重新落印。PNG 可保存比较过程。

## 验证方法与证据

`craft-model.test.js`、`creative-integration.test.js` 与最初 8 项 `motifs-seal.test.js` 已通过 33 项测试，其中原料 × 器型 × 参考纹样 × 表面意图 × 纸样组合的 432 条真实工具流程全部可完成并序列化。白文/朱文规则落地后已重新运行这 33 项回归。随后补入印法独立性与印面元数据验证，新测试文件最终 10/10 通过；并补验拒绝稀疏部件数组。

浏览器使用独立 `jade-composition` 会话，从此前真实采矿验收的 `mine-real-input-save.json` 回放原石收藏。本轮没有重新采矿，也没有注入雕刻完成数据。白文和朱文各完成一轮：实际拖动部件、方向键微调、复制与移除、琢形、各自加工方式、试印、抛光、返回雕纹、继续下刀、撤销、再抛光及成器；存档刷新后组合保留。新增的一刀确实改变试印，撤销确实恢复原雕刻表面。800×700 时创作根节点宽度与滚动宽度均为 704 px。浏览器异常为 0。

脚本：`browser-smoke.mjs`。启动参数必须是独立 Chrome CDP 端口、准确目标页 ID 与阶段；不能连接同一浏览器中的其他页。

- `composition-design.png`：纹样手记与玉稿。
- `composition-intaglio-design.png`、`composition-relief-design.png`：选择白文、朱文的独立玉稿。
- `seal-before-carving.png`：尚未刻线的真实试印。
- `seal-carved-proof.png`：实际下刀前后对照。
- `seal-refined-proof.png`：返回雕纹后继续试印。
- `composition-finished-seal.png`：自定义组合成器。
- `composition-small.png`：小窗口布局。
- `downloads/玉印试印谱-C1-L.png`：浏览器真实下载的印谱。
- `seal-intaglio-album.png`、`seal-relief-album.png`：两种加工方式的实际印谱。已核验浏览器写入的新文件时间及 PNG 签名，未用图案预览替代导出结果。
- `finished-save.json`：实际浏览器操作得到的完成存档。
- `finished-intaglio-save.json`、`finished-relief-save.json`：两条独立完成路径的存档。

状态层对接：`startCrafting` 透传 `motifs` 和 `sealCut`；`reopenArtisanCarving()` 包装模型的 `reopenCarving()`；同器型重作保留原料种子、纸样、组合、表面意图和印法。完成页提供旧玉来信入口。创作动作按节流触发 `jade:sound` 的 `carve`、`polish`、`stamp` 事件。

本轮画面是可操作的原创像素实现。概念图的角色、复杂场景陈设和精细像素资产仍属于后续美术工作，不将本次验收描述为已达到概念图相似度目标。
