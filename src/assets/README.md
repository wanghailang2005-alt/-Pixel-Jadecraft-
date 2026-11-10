# 基础框架素材

## workshop-v2.png

- 用途：工坊与主菜单的独立背景，不包含界面文字和角色。
- 创建日期：2026-11-10。
- 来源：使用内置 image_gen 工具生成，以用户提供的 `docs/concept-art/03-jade-workshop.png` 为构图及气氛参考，生成新的背景，不直接使用含水印的参考图作为游戏场景。
- 处理：未修改生成图片像素；由 Phaser 按 960×540 显示。界面按钮、原石数据、背包、人物和提示另行绘制，不从背景识别交互对象。
- 状态：开发阶段 AI 生成素材。原参考图的作者和许可仍待补充；正式公开交付前继续核对来源记录与素材适用性。该背景中的装饰器物不作为经过考证的历史复原。
- 最终提示词：

```text
Use case: stylized-concept. Asset type: game background plate, landscape 16:9, for a playable Chinese jade carving workshop in Pixel Jadecraft. The reference is ONLY for spatial atmosphere and pixel art style. Generate a NEW original background, not an edit. Authentic crisp detailed 2D pixel game environment, fixed elevated three-quarter camera, warm ancient Chinese artisan wooden workshop, walnut timber walls, dark grey stone slab floor, soft warm amber lantern pools, jade green artifact accents. Full room composition: far left a small brick hearth glowing subtly, upper left wooden shelf with three jade shapes and pale raw stones underneath; central lower middle a broad uncluttered wooden jade workbench with a pale green raw jade on a clamp, neatly arrayed chisels and a small polishing cloth; upper center a hanging lantern; right wall window with warm angled light and a small green jade-carving banner with NO lettering. NO people or characters, no animals. Leave a clear floor region in the center behind the desk for a separately rendered apprentice sprite. Clear separation between furniture with rich restrained pixel texture, dark outlines and controlled dithering, game-ready depth, cozy and contemplative, hand-pixelled retro 32-bit style. Entire scene visible, floor reaching all the way to bottom edge. UI safe zones top 12% and bottom 13% darker and low detail; the actual app will overlay HUD and action bar. All objects roughly in middle 75% of frame. NO text, no letters, no numbers, NO interface, NO borders, no logo, no watermark, no photorealism, no blur. Desired output wide 1536x864 or another exact16:9 composition. Save the generated asset to disk and provide its local path if available.
```

## 图标、人物与备用场景

`src/icons.js` 中的简化 SVG 玉器／工具图标，以及 `src/runtime.js` 中的角色和 `src/scenery.js` 的场景均为本项目编写的可编辑程序绘图，未引用第三方图标或角色资源。图鉴插图用于游戏界面示意，不作为真实馆藏照片或鉴定依据。声音为 Web Audio 合成短提示音，无外部音频文件。
