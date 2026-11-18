# P0-01 工坊全景与师傅姿态

日期：2026-11-18

## 对照来源

- 概念图：`docs/concept-art/09-workshop-interface.png`（1024×559）。
- 基线章节：`D:/DOWnload_EDge/pixel_jadecraft.html` 中“玉雕工坊：老师傅俯身姿态与右栏精简布局”。
- 正式运行素材：`src/assets/workshop-isometric-v1.png`、`src/assets/master-carver-v1.png`；本轮没有新增或重绘正式图片。

## 本轮结果

- 工坊背景继续使用带桌面、工具架、矿灯和窗光层次的正式 v1 资产；师傅立绘保持在工作台玉料上方，凿尖接触点落在玉料中心区域。
- 右栏标题采用“快捷预设”眉题加“琢玉成器”主标题，无加工存档时隐藏进度条，入口按钮显示“开始创作”；有加工存档时恢复“继续创作”和真实进度。
- 对话框固定在画面底部，侧栏与人物不发生 DOM 遮挡；对白由 DOM 渲染，Canvas 只负责像素场景与缩略图。
- `src/workshop-pose.js` 将师傅握凿接触点整理为 4 相数据表，接触高低、俯身微位移和玉屑冲击共用同一相位；新增 `WORKSHOP_CONTACT` 锚点，把玉料、桌面 AO、桌沿高光、凿尖与玉屑飞溅固定在同一像素坐标；减弱动效时固定在接触相位。
- 追加收尾：`WORKSHOP_PORTRAIT` 将透明师傅立绘放大到 68×124、以 -0.12 弧度轻微前倾，并以玉料接触点为底部锚点；`workshop-pose.test.js` 锁定尺寸、旋转和锚点，避免窄屏下人物再次缩小或悬浮。
- 640×700 走查中右栏入口、主要材料信息、师傅对白和底部导航均可见，未出现误导性的 0% 进度条。

## 验证

- `npm test`：157/157 通过，包含 432 种加工组合矩阵。
- `npm run build`：通过。
- 生产预览 `http://127.0.0.1:4173/`，独立无头 Chrome CDP 会话，截图尺寸：1280×720、1024×768、800×700、640×700。
- 入口：新建旅程 → 工坊；刷新后继续渲染同一工坊结构。四尺寸截图与指标保存在 `.tmp/validation/2026-11-18-final-polish/p001-workshop-1280x720.png`、`p001-workshop-1024x768.png`、`p001-workshop-800x700.png`、`p001-workshop-640x700.png`，未进入 Git。

## 已知差距

概念图 09 的英文 HUD 与当前中文信息架构不同；师傅主体仍为已有透明立绘，未新增外部逐帧位图。桌面、人物比例、数据化接触相位、桌面 AO 与工具接触点已通过现有资产与布局验证，但没有宣称逐像素相似度；v2 透视背景和逐帧人物源文件仍缺失。

结论：完成 P0-01 的当前可验收面；人物逐帧位图与透视背景源文件仍保留为素材差距。

## 2026-11-18 追加收尾

- 生产预览重新走查 `1280×720`、`1024×768`、`800×700`、`640×700`；截图：`p001-workshop-portrait-1280x720.png`、`p001-workshop-portrait-1024x768.png`、`p001-workshop-portrait-800x700.png`、`p001-workshop-portrait-640x700.png`。
- 四尺寸均保持 `document.documentElement.scrollWidth <= innerWidth`，场景为 `workshop`，无页面错误；人物放大前倾后仍以玉料接触点为底部锚点。
- 追加验证：`npm test` 154/154，432/432 加工矩阵；`npm run build` 通过；`git diff --check` 通过。

## 2026-11-18 标题层级优化

- 改动：`src/workshop-reference.js` 将右栏标题拆为“快捷预设”眉题和“琢玉成器”主标题；`src/workshop-reference.css` 增加两级标题的像素牌样式。
- 不变量：保留原有加工入口、纹样选择、真实进度、存档状态和 DOM 无遮挡布局。
- 生产预览四尺寸截图：`workshop-title-1280x720.png`、`workshop-title-1024x768.png`、`workshop-title-800x700.png`、`workshop-title-640x700.png`，均位于 `.tmp/validation/2026-11-18-final-polish/`，未进入 Git。
- 结果：四尺寸均可读，主标题与任务书要求一致，窄宽窗口未出现溢出或按钮遮挡。

## 2026-11-18 任务包 2 · 工坊人物与桌面样板

- 师傅在场景像素坐标中重新绘制。近脚踩在桌后左侧的地砖上，远腿由从原背景取样的工作台前景遮住。肩、背和腰形成向桌面倾下的轮廓，一手按稳玉璧，另一手握凿。凿尖在落凿相位接触玉璧上缘，抬凿期间脚和稳玉手的位置固定。减弱动效时显示落凿相位。
- 样板用 1–2 场景像素处理发丝、袖褶、指节和玉边细纹。主亮部朝左上灯光，衣褶暗面偏冷，玉璧用浅绿亮边、青绿厚度、深色孔壁和贴桌接触阴影区分材质。人物与玉料为 `src/workshop-art.js` 内手工绘制的 Phaser 图形，木纹前景取自仓库原有 `workshop-isometric-v1.png`。
- 从工作台进入玉稿时，开始按钮位于弹窗页脚。校验查找范围改为整个弹窗，使工作台可以进入琢形、保存并返回。渲染层不读写存档，现有草稿使用相同的姿态与遮挡。
- `node --test src/workshop-pose.test.js` 4/4 通过。工坊绘制改动后的 `npm test -- --test-reporter=dot` 145/145 通过。页脚按钮修复后，`node --test src/creative-integration.test.js src/workshop-pose.test.js` 14/14 通过，`npm run build` 通过。
- 独立 Chrome 生产预览启用减弱动效。800×700 从开启旅程进入工坊，确认空草稿进度条隐藏。640×700 经过师傅赠玉、打开鉴赏、进入玉璧琢形、保存返回、刷新和继续旅程，确认草稿进度恢复。两尺寸工坊首屏均显示右栏入口和底部对白，无横向溢出。两图均检查了近脚落在石地、躯干从桌后俯向桌面、手指稳玉与凿尖接触。
- 截图保存于 `.tmp/validation/2026-11-18-final-polish/`，文件为 `workshop-master-800x700.png`、`workshop-master-640x700.png`。

## 2026-11-18 站姿与桌沿复验

- 老师傅沿用 `master-carver-v1.png` 的五官、发髻、头颈和衣领。胸腰在场景坐标内自然微倾，双脚落点位于桌后，桌台前景遮住腰下衣袍和双脚。前伸的双臂单独叠在桌上，一手按青玉璧，另一手在落凿相位把凿尖抵在璧面。
- 左侧鉴赏标签居中显示「查看原石特征」。800×700 下工艺栏四个按钮同排，右侧无草稿时收合预览区，有草稿时恢复预览和进度。
- `node --test src/workshop-pose.test.js src/creative-integration.test.js` 14/14，`npm run build` 通过。独立 Chrome 生产预览检查新档、赠玉、进入琢形、保存返回和刷新继续。800×700 减弱动效截图为 `.tmp/validation/2026-11-18-final-polish/workshop-master-upright-800x700.png`。
