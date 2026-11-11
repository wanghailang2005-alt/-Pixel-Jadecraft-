# Pixel Jadecraft 开源参考与游戏框架方案

整理于 2026 年 11 月 11 日。本文为基于 GitHub 实查的技术方案草案，供框架评审与后续实施使用。用户要求先建立好的游戏框架，再开展代码设计。新选型与接口均为建议，具体玩法参数仍按设计评审确定。

## 1. 当前基线

GitHub 主分支在检查时为 `61635cc1e1e48dfec8b4d50e03d55d854e46afed`，包含设计文档、十张概念图、依赖和环境入口。远程 `src/main.js` 只显示环境就绪画面。

本地 HEAD 为 `d99e2f96ab23e81d69e12237904a743e7b2b232a`，已经实现菜单、独立地点场景、背包、委托、组合暂停、单档保存、检查点恢复和导入导出。工作区另有设计文档与样稿修改。后续框架实施需要先核对两边提交与工作区，整合本地基础系统和远程设计资料。

本地当前 `npm test` 的 11 项测试通过。采矿、鉴赏、三阶段加工、定制及布展交互待实现，`crafting` 的合法存档值目前只有 `null`。

技术基线为 Phaser 4.2.1、Vite 8.3.7、JavaScript ES Modules。功能基线与视觉要求分别见 [项目计划](PROJECT_PLAN.md)和[视觉与交互框架](../DESIGN_SYSTEM.md)。本地 UI 当前采用 DOM/CSS，世界画面由 Phaser 绘制。

[远程入口](https://github.com/wanghailang2005-alt/-Pixel-Jadecraft-/blob/61635cc1e1e48dfec8b4d50e03d55d854e46afed/src/main.js) · [远程目录](https://github.com/wanghailang2005-alt/-Pixel-Jadecraft-/tree/61635cc1e1e48dfec8b4d50e03d55d854e46afed)

## 2. 建议的技术组合

| 用途 | 建议 | 对本项目的作用 |
| --- | --- | --- |
| 游戏运行 | Phaser 4.2.1 | 场景、输入、动画、摄像机、地图与矿洞物理 |
| 开发构建 | 现有 Vite 工程 | 本地开发、资源导入、生产构建 |
| 地图制作 | Tiled 编辑器，导出 JSON | 可视化编辑矿洞地形、碰撞、出生点和六个矿点 |
| 中文界面 | 现有 DOM/CSS，接入原图切片和布局坐标 | 背包、弹窗、祝福语输入与键盘焦点 |
| 场景内特效 | Phaser 4 内建能力，Rex 组件按需评估 | 灯光、粒子、九宫格等局部需求 |
| 加工算法 | 项目内独立规则模块 | 轮廓覆盖、纹样显露、有效区域抛光与阶段结算 |
| 本地保存 | 现有 GameStore 与 localStorage | 结构化小存档、版本迁移、备份和恢复 |

建议沿用当前 JavaScript，先用 JSDoc 明确材料、成品、加工会话和结果结构。官方 TypeScript 模板可作为目录与类型设计参考，语言迁移可在后续需要时单独评估。

## 3. GitHub 开源参考

本节核对仓库说明、依赖或具体源码。最新维护日期只反映 GitHub 元数据。兼容性结论分为文档与依赖核对、后续运行验证两个阶段。

### 3.1 Phaser 官方引擎与模板

Phaser 的场景、Arcade Physics、Tilemap、摄像机及输入已经覆盖本项目需求。官方 Vite 模板可参考 Boot、Preloader、MainMenu、Game 的组织方式，以及加载进度、资源清单和生产构建。

核对发现 `template-vite-ts` 的 README 已说明 Phaser 4，当前 package.json 使用 Phaser 4.0.0、Vite 6.3.1。模板结构可以借鉴，依赖版本按本工程锁文件管理。具体参考 `src/game/scenes/Preloader.ts`，其实现包含加载进度事件和启动主菜单。

引擎和模板采用 MIT。引擎 README 标明品牌与角色的独立版权信息。

[Phaser](https://github.com/phaserjs/phaser) · [JavaScript 模板](https://github.com/phaserjs/template-vite) · [TypeScript 模板](https://github.com/phaserjs/template-vite-ts) · [Preloader 源码](https://github.com/phaserjs/template-vite-ts/blob/d1d7d58acfcf47f97642bcb8b4967071b85f8db9/src/game/scenes/Preloader.ts)

### 3.2 Phaser Examples

优先查找 Arcade 平台移动、Tilemap 碰撞、输入、粒子、动态纹理、Mask Filter、截图导出的最小示例。每项示例先在本工程 4.2.1 下做小规模运行验证，再进入游戏模块。

当前 README 标题为 Phaser 4 Examples，并说明演示站默认运行开发版本。查看示例时需要切换到目标发布版本。示例代码采用 MIT，素材需要分别核对授权。

[Examples 仓库与授权说明](https://github.com/phaserjs/examples)

### 3.3 Tiled

适合矿洞横版地图。其自定义属性和对象层可保存矿点 ID、材料类型、交互半径、出口及出生点，减少在场景代码中手写坐标。建议导出 JSON，运行时由 Phaser 加载。

地图约定建议包含背景、地形、碰撞、前景图层，以及出生点、矿点、出口对象层。矿点配置使用稳定 ID，与存档中的已采集状态对应。展厅的三个展位可以先用固定坐标与深度排序表达。

Tiled 的 COPYING 列明编辑器及插件为 GPL、libtiled 为 BSD 2-Clause 等多种授权。这里将 Tiled 作为地图制作工具使用，地图素材按各自来源记录授权。

[Tiled](https://github.com/mapeditor/tiled) · [授权清单](https://github.com/mapeditor/tiled/blob/master/COPYING)

### 3.4 Rex 插件与文档

可参考 NinePatch、输入控件、滚动面板与状态机。NinePatch 文档包含固定边角、伸缩区域和比例控制，适合木框、铜角与凹槽类面板的技术制作。

仓库名仍为 `phaser3-rex-notes`，当前 package.json 实际为 `phaser4-rex-plugins` 4.2.0，开发依赖包含 Phaser `^4.2.1`。这提供版本匹配依据，实际使用的单个组件仍需运行验证。代码采用 MIT，GitHub 显示最近推送于 2026 年 11 月 4 日。

本项目界面先使用 DOM/CSS 与原图切片完成。场景内确需可伸缩贴图时，再评估 Rex 对应模块。原图组件的位置、数量、排列与比例由 DESIGN_SYSTEM.md 指定，九宫格仅辅助边框制作。

[Rex 仓库](https://github.com/rexrainbow/phaser3-rex-notes) · [当前依赖](https://github.com/rexrainbow/phaser3-rex-notes/blob/master/package.json) · [NinePatch 文档](https://github.com/rexrainbow/phaser3-rex-notes/blob/master/docs/docs/ninepatch.md)

### 3.5 Ourcade Dungeon Crawler Starter

源码中 `Game.ts` 展示地图对象层到场景对象的映射、碰撞属性和摄像机跟随。`GameUI.ts` 展示玩法事件驱动界面，以及场景 SHUTDOWN 时解绑监听。可借鉴矿点创建、HUD 更新和场景退出清理。

当前依赖是 Phaser `^3.22.0` 和 Parcel，GitHub 显示最近推送于 2022 年 6 月。它采用俯视移动。矿洞所需横版跳跃应结合官方 Arcade 平台示例设计。旧代码使用 `createStaticLayer` 等历史接口，移植时按当前引擎核对。代码采用 MIT。

[项目](https://github.com/ourcade/phaser3-dungeon-crawler-starter) · [地图与碰撞源码](https://github.com/ourcade/phaser3-dungeon-crawler-starter/blob/186705eb557af3d7042590fc61485a7cbed7b7f0/src/scenes/Game.ts) · [HUD 生命周期源码](https://github.com/ourcade/phaser3-dungeon-crawler-starter/blob/186705eb557af3d7042590fc61485a7cbed7b7f0/src/scenes/GameUI.ts)

### 3.6 Farming Game

可参考数据驱动内容和资源点状态变化。`src/farm/land.ts` 用 EMPTY、PLOWED、PLANTED、READY 表达土地状态，并在状态变化后更新贴图、进度和提示。矿点可借鉴这种状态表达，具体恢复规则待玩法设计确定。

代码采用 MIT，README 明确农场 tileset 使用 GPL3，角色也有独立来源。GitHub 显示最近推送于 2022 年 7 月，工程使用 TypeScript 和 Webpack。它更适合作为资源循环的学习材料。

[项目与素材来源](https://github.com/amcolash/farming-game) · [资源点状态源码](https://github.com/amcolash/farming-game/blob/b955a3fdd25799480122727afe92e1dab800a9f6/src/farm/land.ts)

### 3.7 ScratchCard

与打磨最接近的交互参考。源码包含笔刷轨迹、前景擦除和覆盖率反馈，可用于研究粗糙层逐渐露出翠色的操作体验。

项目采用 MIT，package.json 为 1.5.5，GitHub 显示最近推送于 2024 年 2 月。其独立 DOM Canvas、事件绑定和完成后清空遮罩的行为需要针对本游戏重新设计。玉璧内孔、器型外区域、暂停和阶段主动确认都必须进入本项目规则。

建议在 Phaser 场景中呈现加工，覆盖计算使用独立的有效区域网格。重复擦拭同一格只记一次，快速拖动按连续线段采样。覆盖率分母只包含玉器有效区域。阶段阈值与评分另行评审。

[项目](https://github.com/Masth0/ScratchCard) · [交互源码](https://github.com/Masth0/ScratchCard/blob/b73847cb7c0ec3206bc9f62e8942a91b9b77b791/src/ScratchCard.ts) · [笔刷源码](https://github.com/Masth0/ScratchCard/blob/b73847cb7c0ec3206bc9f62e8942a91b9b77b791/src/Brush.ts)

### 3.8 Grid Engine 备选评估

提供格子移动、寻路、碰撞及等距地图支持，适合未来出现复杂格子角色移动的需求。当前矿洞需要横版跳跃，展厅仅三个展位，已有 Phaser 能力足以覆盖首版。

当前 package.json 的 peerDependencies 为 Phaser `~4.0.0`，该范围覆盖 4.0.x，与本项目 4.2.1 的版本范围存在差异。它采用 Apache-2.0，GitHub 显示最近推送于 2026 年 11 月 2 日。列入备选，接入前再核对版本与实际需求。

[Grid Engine](https://github.com/Annoraaq/grid-engine) · [版本范围](https://github.com/Annoraaq/grid-engine/blob/master/package.json)

## 4. 游戏模块与数据流

建议采用以下模块职责。目录可在真正拆分时逐步建立。

| 模块 | 负责内容 | 与其他模块的交互 |
| --- | --- | --- |
| 启动与运行 | 创建游戏、资源加载、场景注册、统一坐标缩放 | 向场景注入 GameStore 与内容配置 |
| 场景 | 菜单、矿洞、工坊全景、加工近景、展厅 | 接收输入，调用规则，呈现结果 |
| 游戏规则 | 采集、鉴赏、加工阶段、成品生成、图鉴与任务判定 | 接收状态和操作，返回结果及失败原因 |
| GameStore | 会话状态、合法操作入口、一次性结算与变更通知 | 接收界面和场景操作，发布已接受的状态变化 |
| 存档 | 校验、迁移、导入导出、备份及失败恢复 | 保存和恢复可序列化状态 |
| 界面 | HUD、背包、任务、图鉴、设置与确认弹窗 | 读取状态，通过 GameStore 发起操作 |
| 内容配置 | 材料、器型、纹样、题目、知识来源、矿点和展位 | 使用稳定 ID 供玩法和存档引用 |
| 资源与音效 | 图集、切片、工具与人物动画、环境声和反馈声 | 根据场景和状态更新显示与播放 |

建议数据流为“玩家输入 → 场景或界面 → GameStore 操作 → 规则计算 → 完整状态提交 → 保存与通知 → 场景和界面更新”。持续拖动的视觉和覆盖过程由加工会话管理，保存按检查点进行。

场景退出时释放本场景监听、计时器和临时绘制资源。全局状态由 GameStore 持有。弹窗、手动暂停和标签页隐藏共同进入现有 PauseGate，全部原因解除后恢复输入与计时。

## 5. 需要在写玩法前确定的接口约定

### 状态与一次性结算

- 矿点拥有稳定 ID，采集操作同时检查距离、矿点可用状态及背包容量，成功后一次提交入包和矿点状态。
- 材料、成品、加工会话使用不同对象与稳定 ID，成品保留材料、器型、纹样及制作记录。
- 加工会话将所选原石转入加工占用状态，防止重复使用。退出、继续、放弃与成品生成由统一操作处理，放弃时的材料处理规则待确认。
- 完工操作携带加工会话 ID，同一会话只能生成一件成品。展位保存成品 ID，并验证引用有效性。
- 任务与图鉴根据已接受的状态计算完成情况。知识文本、文化来源与游戏评分分别存储。

### 加工规则与画面

- 加工阶段为切形、雕纹、抛光、完成。每一步需要明确输入、覆盖数据、完成条件与玩家确认动作。
- 核心覆盖规则接收玉器局部坐标中的连续轨迹，输出新增覆盖和阶段进度。坐标由场景统一从屏幕空间转换。
- 玉器底色、器型、粗糙层、纹样和高光分层。进度保存在规则数据，画面由这些数据重建。
- `pointerup`、离开画布、失焦、暂停与切场都结束当前笔触。恢复时重新按下开始下一笔。
- 覆盖网格使用整数格或位集合表达，存档编码选择在原型中测量体积后确定。

### 存档演进

- 现有 v1 存档的 `crafting` 只接受 `null`。加入加工会话或矿点状态时增加格式版本，并提供 v1 到新版本的迁移。
- 导入流程先解析、迁移和校验完整候选状态，再写入磁盘和替换内存。恢复测试覆盖历史导出文件。
- 暂停原因、DOM、Phaser 对象和浏览器音频对象作为运行时状态。存档保存进度数据与稳定引用。
- 保存失败时保留内存进度与导出入口。普通变更保存、检查点备份和覆盖确认沿用已建立的恢复行为。

## 6. Phaser 4 兼容性重点

Phaser 官方迁移指南明确，v3 的 FX 与 Mask 已统一到 Filter，BitmapMask 被移除，GeometryMask 保留于 Canvas，DynamicTexture 和 RenderTexture 的绘制需要调用 `render()` 执行缓冲命令。

加工遮罩与渐进显露是本项目关键技术风险。框架实施的第一项技术原型应使用本地锁定的 4.2.1，验证半抛光玉璧、内孔透明、连续拖动、暂停恢复及导出。Phaser.AUTO 下的 WebGL 与 Canvas 行为需分别检查，再确定最终呈现路径。

[Phaser 4 迁移指南](https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md)

## 7. 框架搭建顺序与验收

| 步骤 | 交付 | 验收方式 |
| --- | --- | --- |
| 1 | 核对并整合仓库基础 | 本地基础系统与远程设计资料都进入可追溯基线，已有 11 项测试通过 |
| 2 | 两个最小技术原型 | 玉璧有效区域打磨、原图切片弹窗在真实中文及缩放下可操作 |
| 3 | 明确状态与存档结构 | 历史 v1 档可读，新加工会话可暂停、保存和恢复 |
| 4 | 按职责拆出场景、规则、界面和内容 | 场景反复进入退出后输入与事件次数正常，状态通过统一入口变更 |
| 5 | 接通一条可玩流程 | 一块原石经历采集、鉴赏、加工、定制、图鉴和陈列，数量及引用一致 |
| 6 | 补齐首版数量与正式资源 | 六矿点、两玉材、三器型、三纹样、六题、六图鉴、三展位全部可验证 |

框架阶段需要覆盖背包满、重复采集、重复完工、加工中退出、失焦暂停、刷新恢复、损坏导入和写盘失败。UI 原型按原组件板的布局、数量、间距、宽高比和装饰评审，95% 贴近目标通过实际界面核对。

## 8. 待评审与验证

- Phaser、Vite、Tiled、DOM/CSS、GameStore 的职责组合为本轮推荐方案。
- Rex、Grid Engine 的单模块运行兼容性仍待原型验证。
- 加工会话结构、放弃后材料处理、评分和阈值需要设计确认。
- 逻辑分辨率、中文字体、切片尺寸与统一色表继续按视觉样稿评审收敛。
- 本轮完成仓库与参考源码调查，以及框架方案整理。开源依赖的接入与玩法实现属于后续实施步骤。
