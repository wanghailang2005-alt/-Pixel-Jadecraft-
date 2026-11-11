# 基础框架素材

## workshop-v2.png

- 用途：历史工坊背景，不包含界面文字和角色。当前工坊使用下述等距版本。
- 创建日期：2026-11-10。
- 来源：使用内置 image_gen 工具生成，以用户提供的 `docs/concept-art/03-jade-workshop.png` 为构图及气氛参考，生成新的背景，不直接使用含水印的参考图作为游戏场景。
- 处理：未修改生成图片像素；由 Phaser 按 960×540 显示。界面按钮、原石数据、背包、人物和提示另行绘制，不从背景识别交互对象。
- 状态：开发阶段 AI 生成素材。原参考图的作者和许可仍待补充；正式公开交付前继续核对来源记录与素材适用性。该背景中的装饰器物不作为经过考证的历史复原。
- 最终提示词：

```text
Use case: stylized-concept. Asset type: game background plate, landscape 16:9, for a playable Chinese jade carving workshop in Pixel Jadecraft. The reference is ONLY for spatial atmosphere and pixel art style. Generate a NEW original background, not an edit. Authentic crisp detailed 2D pixel game environment, fixed elevated three-quarter camera, warm ancient Chinese artisan wooden workshop, walnut timber walls, dark grey stone slab floor, soft warm amber lantern pools, jade green artifact accents. Full room composition: far left a small brick hearth glowing subtly, upper left wooden shelf with three jade shapes and pale raw stones underneath; central lower middle a broad uncluttered wooden jade workbench with a pale green raw jade on a clamp, neatly arrayed chisels and a small polishing cloth; upper center a hanging lantern; right wall window with warm angled light and a small green jade-carving banner with NO lettering. NO people or characters, no animals. Leave a clear floor region in the center behind the desk for a separately rendered apprentice sprite. Clear separation between furniture with rich restrained pixel texture, dark outlines and controlled dithering, game-ready depth, cozy and contemplative, hand-pixelled retro 32-bit style. Entire scene visible, floor reaching all the way to bottom edge. UI safe zones top 12% and bottom 13% darker and low detail; the actual app will overlay HUD and action bar. All objects roughly in middle 75% of frame. NO text, no letters, no numbers, NO interface, NO borders, no logo, no watermark, no photorealism, no blur. Desired output wide 1536x864 or another exact16:9 composition. Save the generated asset to disk and provide its local path if available.
```

## workshop-isometric-v1.png

- 用途：当前工坊开场。左侧为等距三面墙室内与斜向雕刻台，右侧为动态委托和练习器型面板，下方承载导航与师傅对话。
- 创建日期：2026-11-11。
- 来源：内置 image_gen 工具，以用户指定概念图集中的 `docs/concept-art/09-workshop-interface.png` 为构图、美术与像素密度参考生成。人物、中文、按钮与状态由代码单独呈现。
- 保存位置：`src/assets/workshop-isometric-v1.png`。原始生成文件为 `exec-cf9be272-ffb2-4288-a70e-1b90155a2492.png`。
- 组件参考：`07-ui-components.png` 指导按钮、木铜材质和进度结构，`08-dialogs-and-menus.png` 指导师傅对话与侧栏深红褐底板。工坊侧栏与对话的回纹角饰通过 CSS 背景定位直接引用 08 原图相应区域。
- 当前状态：已接入可交互开场，视觉贴近程度与精确布局仍待评审。
- 最终生成提示词如下。

```text
Create the clean game background plate for this exact jade workshop reference, using the attached image as the authoritative composition and art-style reference. Preserve the distinctive isometric three-wall room in the LEFT 72 percent of a 16:9 canvas, dark jade-green carved wooden walls, square green stone floor tiles, copper-brown heavy wood, hanging amber lanterns, vertical ornamental jade wall panels, rear central jade bi-disc wall decoration, left shelves with paper scrolls and rough pale jade, right shelves and drawers with green finished jade figurines. Preserve the small diagonal carving workbench around x 34 percent, y 60 percent of the full image, with two small chisels and a small jade bi disc on its surface. Match the reference's bold visible square pixels, modest detail, crisp chunky limited-palette 16-bit pixel sprite style, warm lights and dark forest green, no smooth painting. NO people, leave clear standing positions behind and right of the table for separate game sprites. Preserve a copper wood decorative scene frame occupying x2%-73%, y4%-85%, with small square Chinese meander corner ornaments. Leave top center within this frame as a blank wooden title plaque. RIGHTMOST 25 percent of entire canvas must be EMPTY quiet very dark deep green, no panels, no icons, because real interactive interface will overlay it. Bottom y86%-100% dark quiet green strip for interactive dialogue and controls. Remove all reference text, lettering, labels, side panels, arrows, HUD, progress bars, buttons, sample cards, annotation markers, and portrait. Do not add any words, numbers, logos, or watermark. This is a playable game scene asset, not a screenshot of a menu or concept sheet. Keep the architecture and bench composition closely faithful to the reference.
```

## master-carver-v1.png

- 用途：规格版工坊桌后老师傅与右上头像。角色独立于场景背景，刻刀和星芒由 Phaser 单独叠加。
- 创建日期：2026-11-11。
- 来源：内置 image_gen 工具，以用户本轮工坊概念图为人物外观与像素风格参考生成。黑发束髻、胡须、绿色交领长袍，采用透明背景。
- 保存位置：`src/assets/master-carver-v1.png`。原始生成文件为 `exec-bf46f8d0-c094-40d7-a1b8-4bcad447fee0.png`。
- 最终生成提示词如下。

```text
An isolated transparent PNG pixel-art NPC sprite for a peaceful jade-crafting videogame. A friendly middle-aged Chinese traditional artisan with black topknot hair, thick eyebrows, a black moustache and short black beard, tan face, green crossed-collar robe with simple ochre trim. His two empty hands rest calmly together at waist level in a relaxed seated pose, looking down-right. Show the head, torso, hands and short robe. Match the reference image character's chunky 16-bit videogame pixel style and three-quarter isometric angle. Large readable head and compact stout body, dark pixel outlines, hard stepped edges, approximately 16 colors, simple shaded blocks and visible square pixels, apparent logical sprite resolution around 48 by 64. Single complete character centered occupying 85 percent of square canvas height, true transparent alpha everywhere outside the character. No background, no floor, no furniture, no tools, no lettering, no symbols, no border, no interface, no realistic texture or soft shadows.
```

## Silkscreen 像素字体

- 文件为 `src/assets/Silkscreen-Regular.ttf`，保留作英文规格首版的字体来源。当前中文工坊使用系统楷体呈现匾额、面板标题与对白，使用微软雅黑呈现数值和操作正文；字体按系统可用性回退。
- 来源为 Google Fonts 的 [Silkscreen 目录](https://github.com/google/fonts/tree/main/ofl/silkscreen)，字体 blob 为 `8caff819d666217fe8240ede768ef86d086b453b`。
- Copyright 2001 The Silkscreen Project Authors。许可为 SIL Open Font License 1.1，完整文本保存于 `public/licenses/Silkscreen-OFL.txt`，构建时随静态文件分发。

## menu-mountains-v1.png

- 用途：开始界面的山林、楼阁、云层与草地背景，显示于 960×540 逻辑画面。
- 创建日期：2026-11-11。
- 来源：内置 image_gen 工具。用户在本会话提供主菜单参考图，并提出可参考《泰拉瑞亚》或《星露谷物语》。采用参考图的中央标题、纵向菜单、山林与底部草地构图，生成原创背景。
- 保存位置：`src/assets/menu-mountains-v1.png`。原始生成文件为 `exec-e01993f3-9787-41f7-8f51-c82de7400b93.png`。
- 接入：Phaser 加载背景，`src/menu-art.js` 单独绘制像素标题、角色、轻微飘云与微光，`src/menu.css` 和 `src/ui.js` 实现动态中文菜单。减少动态效果偏好开启时停用装饰动画。
- 当前状态：已接入菜单首版，构图与像素密度待用户评审。
- 最终生成提示词如下。

```text
Create a production-ready 16:9 landscape background asset for an original Chinese jade-crafting pixel art videogame main menu, Pixel Jadecraft. Use the supplied reference image ONLY for composition and broad mood. Output just the game background filling the entire image. No letters, no words, no logo, no UI, no frame, no mockup sheet, no captions. Authentic deliberately coarse 16-bit pixel art with visible square pixels, limited palette, crisp stepped silhouettes and restrained dithering. Bright tranquil morning sky in pale turquoise and warm creamy yellow sunlight around center. Soft blocky clouds across top left and top right. Three or four layers of dramatic blue-green mountain peaks on both sides, receding hazy center. A Chinese multi-tier jade-green mountain pavilion / pagoda, situated on the far central mountain summit near the upper 20 percent, atmospheric and subtly faded. Dense dark pine forest silhouettes on left and right lower slopes, with darker foliage making the middle bottom quarter dark enough for ivory menu labels. Center area x 25%-75%, y 28%-83% remains visually quiet for a large overlaid title and vertical menu. Narrow side-scrolling grassy ground strip at bottom y 94%, green turf on top, layered brown stone earth below. Tiny clumps of bamboo or quartzlike pale green jade crystals at bottom left. Very small empty clearing at bottom right for separately rendered player sprite. Beautiful cohesive scene composition conveying peaceful exploration and traditional Chinese craftsmanship. Use chunky pixels at an apparent logical resolution around 480x270, avoid fine detailed illustration or painterly rendering.
```

## 图标、人物与备用场景

`src/icons.js` 中的简化 SVG 玉器／工具图标，以及 `src/runtime.js` 中的角色和 `src/scenery.js` 的场景均为本项目编写的可编辑程序绘图，未引用第三方图标或角色资源。图鉴插图用于游戏界面示意，不作为真实馆藏照片或鉴定依据。声音为 Web Audio 合成短提示音，无外部音频文件。
