# 玉文化馆与创作玩法改造 · 本地验证记录

日期：2026-11-15。用户已授权按修改任务书、扩展展厅要求和创新方向实施。本轮在 `codex/museum-craft-20261114` 集成，未提交或上传 GitHub。

## 实际交付

- **玉文化博物馆**：山川藏玉、千年玉事、匠心天工、我的玉展四个入口。公共馆含 4 类玉材、8 件历史名器、4 件现代集体作品；每组最多 6 柜，可翻页近看。我的玉展包含库存原石和玩家成品。
- **故事进入创作**：展签区分材料、年代、作者和来源；观察细节后收藏灵感，灵感册可回看并进入工作台。现代作品署名北京玉器厂创作集体，古代作者不详之处保留不详。
- **同一块玉有不同设计**：每个材料 ID 决定稳定的原石轮廓、色带、色斑与细纹。观察台可以放大、侧光、透光示意，比较两套布局；进入设计时保留具体材料、器型与布局。设计支持有限平移、旋转、缩放、三类纹样、两种表面意图。
- **三个阶段处理不同内容**：琢形去余料；雕纹记录实际刻线并磨低背景；抛光先细磨，再用局部亮面与柔光构成层次。全表面乱刻或全部抛亮不能直接替代相应目标，可撤销和重做阶段。
- **作品有连续身份**：实际表面进入落款、行囊、工坊预览、个人展柜、文化馆与 PNG。新作取消返还原石；返工沿用同一 ID，取消恢复原作及仍空闲的原展位。旧版成品及旧加工记录继续兼容。
- **委托与策展**：三个虚构心意委托按实际器型、表面与已收藏灵感判断；三个策展主题、三种展柜照明、依据真实陈列生成的观展文字。
- **矿洞**：连续岩层、冷光、石柱、苔藓、矿车与轨道；六簇名称和创作线索；逐击碎屑、破开闪光。地图与碰撞规则保留；未拾取玉料持久化，回访可回收。

原工作区有大量未提交实现。本轮开始前备份为 `E:/Pixel_Jadecraft_backups/before-museum-craft-20261114-235656.zip`，没有重置已有工作。

## 浏览器验证方法与证据

独立 Chrome 会话，通过正常按钮、选择框、CDP 原生鼠标输入操作加工画布。创作测试使用明确标记的三原石夹具 `raw-material-fixture.json`，置入独立浏览器存储，**该部分不作为真实采矿证据**。操作没有直接设置刻痕、阶段或完成状态。

`browser-driver.mjs` 是连接本地独立浏览器的 CDP 辅助；`craft-browser-smoke.mjs <Chrome调试端口> setup|carve|display` 记录核心操作。调试端口通过 `npx --yes agent-browser --session <会话名> get cdp-url` 获得，不是游戏 HTTP 端口。脚本只用于隔离测试，不连接日常浏览器。

| 路径 | 本轮证据 |
| --- | --- |
| 设计→琢形 | 选择玉鱼佩，实际鼠标划去余料；撤销恢复上一笔；完成后进入雕纹 |
| 保存→刷新→继续 | 雕纹阶段保存退出、刷新后从菜单继续，阶段与原料身份保留 |
| 刻线→浮雕 | 实际鼠标沿引导线雕刻，再改用平磨头降低背景；记录纹线约 83%、准确度 100%、浮雕约 30% |
| 细磨→局部抛光 | 实际鼠标先细磨，再局部抛光；记录柔光约 71%、亮面约 29%，完成一件作品 |
| 落款→PNG | 保存“让春水留在玉里”；浏览器实际下载 480×480 PNG，文件可打开且图文完整 |
| 行囊→展柜 | 行囊使用真实作品图；同 ID 陈列至展位，改为侧光后状态保存 |
| 返工→刷新→取消 | 鱼佩改为印章返工，动笔后保存刷新；取消恢复原鱼佩全部表面、落款和原展位 |
| 鉴赏→设计 | 在和田玉上选择透光与“留白”，进入设计保留材料 ID、鱼佩、旋转 22°、平移 x=4%、y=2.5% |

实际导出文件：`downloads/像素琢玉_玉鱼佩.png`，14,933 字节。最初浏览器自动化下载命令被隔离上下文取消；设置正确的测试浏览器上下文下载路径后成功，未为此修改产品下载行为。

截图包含 `creative-design.png`、`creative-carving.png`、`creative-finishing.png`、`creative-finished.png`、`creative-inscription.png`、`inventory-actual-work.png`、`exhibition-curation.png`、`personal-gallery.png`、`inspection-live.png`、`inspection-to-design.png`。功能截图不代表用户已认可最终美术。

公共馆实际检查了四分厅、历史馆第二页、现代四件名作；白菜观察与灵感收藏在刷新后仍保留，灵感册可翻看。原石收藏使用 11 月 14 日已有真实采矿存档核对 12 件分页、来源与同 ID 创作透传，没有把这次导入说成本轮新采矿。六个展签的点击中心均命中各自展柜；800×700 无横向溢出，长故事和来源可滚动访问。见 `museum-hall-final.png`、`museum-notebook-restored.png`、`museum-raw-collection.png` 和 `museum-small-study-actions.png`。

矿洞另用空存档真实操作新游戏、爬梯、行走和挖掘，取得 `C1-L` 与 `C1-R`；刷新后两件原石及耗尽标记一致。没有修改位置、资源或注入原料。详细路线与七张截图见 [MINE_SMOKE.md](MINE_SMOKE.md)。

## 自动验证与构建

`npm test` 最终 **105/105 通过**。包含 **432/432 组合**的实际工具调用与序列化恢复：12 块矿石 × 3 器型 × 3 纹样 × 2 表面意图 × 2 预设布局；这是规则层可完成性矩阵，不代表 432 次人工浏览器试玩。

规则覆盖包括材料唯一身份、阶段判定、撤销、重做、保存恢复、旧档迁移、非法输入、返工恢复、待拾取掉落、灵感去重与六图鉴收录。追加了损坏返工快照的导入保护，以及未达标进度不得显示 100% 的边界测试。

生产构建通过：`npm run build -- --outDir E:/Pixel_Jadecraft_review_build/museum-craft-final-20261115`。主 JS 1,586.29 kB、gzip 439.61 kB，仍有超过 500 kB 的 chunk 提示；没有构建错误。输出目录在仓库外，没有清空其他版本。

本机生产预览启动命令：

```powershell
npm run preview -- --outDir E:/Pixel_Jadecraft_review_build/museum-craft-final-20261115 --port 5184 --strictPort
```

试玩地址为 `http://127.0.0.1:5184/`，仅本机服务；若进程结束，重新执行上面命令。不同端口与浏览器的存档独立，可用设置中的备份导入/导出迁移。

最终生产版 Chrome 1440×1000 再次跑完 `setup → carve → display` 三段脚本；随后验证故事委托直达相关玉作、观察收藏、带入玉璧/温润表面/正确灵感，以及原石收藏透传。按住空格配合方向键实际连续去除 121 个余料格；鉴赏“带着观察去设计”按钮底部 741.6px，小于面板可见区底部 857px。证据为 `production-smoke.mjs`、`inspection-production.png`、`museum-raw-production.png`。

生产版 PNG 实际下载至 `downloads-production/像素琢玉_玉鱼佩.png`，480×480、14,933 字节。Edge 1280×800 检查主菜单、文化馆分厅及《岱岳奇观》近看，见 `edge-production-museum.png`。两浏览器应用异常列表为空。Edge 本轮是浏览冒烟，没有重做整套加工。

最终 `git diff --check` 通过；工作区其他既有改动保留。测试浏览器会话已关闭，生产预览服务保留供本机体验。

## 原图、内容和图像来源

唯一正式美术参考仍是 GitHub `docs/concept-art/01–10`。本轮已核对十图与远端基准提交 `60bf493786e293f6964a88786f5f55432f58aa68` 的 blob 相同。当前程序画面与历史生成素材属于实现，不能替代原图作为验收来源。

文化馆采用本项目程序绘制的像素示意，没有打包博物馆摄影图。每条展签含来源链接和核验状态；完整数据在 `src/museum-content.js`。

- 玉材知识：[GIA · Jade Description](https://www.gia.edu/jade-description)。岫玉示例限定为蛇纹石质玉，避免将所有绿色材料视为同一种玉。
- 翠玉白菜：[台北故宫典藏](https://digitalarchive.npm.gov.tw/Collection/Detail/3?dep=U)与[展览介绍](https://theme.npm.edu.tw/exh106/npm_anime/cabbage/ch/index.html)。
- 现代集体创作：[中国工艺美术馆《岱岳奇观》](https://old.gmfyg.org.cn/cloud/daguojiangzuo/collection-01.html)、[《含香聚瑞》](https://old.gmfyg.org.cn/cloud/daguojiangzuo/collection-02.html)、[《群芳揽胜》](https://old.gmfyg.org.cn/cloud/daguojiangzuo/collection-03.html)、[《四海腾欢》](https://old.gmfyg.org.cn/cloud/daguojiangzuo/collection-04.html)。
- 机制研究参考：[Master Of Pottery](https://store.steampowered.com/app/1160490/Master_Of_Pottery/)、[Behind the Frame](https://store.steampowered.com/app/1634150/Behind_the_Frame_The_Finest_Scenery/)。借鉴材料—创作—展示的联系和故事组织，没有复制其代码或美术。

四类材料的知识展示不会自动扩展为四类可采材料；本轮可采、可加工材料仍为和田玉与翡翠。故事委托为游戏虚构；展品历史、作者和馆藏信息另有来源。

## 尚待完成的验收与后续工作

- 没有测出或宣称“与概念图 95% 相似”。工坊细节、矿洞大洞室空间、设置原图五行布局及其他整屏配准仍需继续完善。原 01/04/05 的画幅与现有界面不同，本轮做了横屏适配，不能算逐像素复刻。
- 当前创作为预设器型加有限布局、手动刻线、浮雕与表面处理；任意自由造型、自由绘纹编辑器、分支叙事与会走动的观众尚未实现。
- 原石由 ID 稳定生成，尚未逐块人工定稿；原石观察圈注尚未作为个人笔记持久化。裂纹提供观察示意，不模拟物理断裂。
- 首展规则、三个故事委托已能计算反馈，趣味与手感仍需要真实玩家体验。未开展 3–5 人盲测；自动测试数量不能代替美术或趣味验收。
- 构建仍包含较大的 Phaser 主包，首次加载和低端设备帧时间尚未做正式性能验收。暂无手机或 Safari 的完整验证。

后续具体工作和 R00–R15 状态以 `docs/REVISION_TASKBOOK_2026-11-14.md` 为准。
