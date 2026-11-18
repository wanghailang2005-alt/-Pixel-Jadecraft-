import { WORKSHOP_BENCH, WORKSHOP_MASTER } from './workshop-pose.js';

function facet(graphics, color, points, alpha = 1) {
  graphics.fillStyle(color, alpha);
  graphics.fillPoints(points.map(([x, y]) => ({ x, y })), true);
}

function ticks(graphics, color, marks) {
  graphics.fillStyle(color);
  for (const [x, y, width, height] of marks) graphics.fillRect(x, y, width, height);
}

function addMasterPortrait(scene) {
  const { x, y, width, height } = WORKSHOP_MASTER;
  const key = 'workshop-master-portrait';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width, height);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.drawImage(scene.textures.get('master-carver').getSourceImage(), 288, 22, 658, 1218, 0, 0, width, height);
    texture.refresh();
  }
  scene.add.image(x, y, key).setOrigin(0).setDepth(1.5);
}

function drawJade(g) {
  facet(g, 0x331f15, [[325, 308], [333, 300], [357, 296], [372, 302], [376, 312], [367, 322], [347, 325], [332, 320]], .54);
  facet(g, 0x142b20, [[331, 307], [340, 299], [355, 296], [368, 299], [373, 306], [372, 313], [366, 319], [351, 323], [339, 320], [331, 315]]);
  facet(g, 0x426e49, [[333, 309], [345, 305], [371, 305], [370, 313], [363, 318], [349, 320], [339, 317], [334, 314]]);
  facet(g, 0x7eae75, [[333, 307], [341, 301], [355, 298], [366, 301], [370, 306], [365, 311], [352, 315], [340, 313], [335, 311]]);
  facet(g, 0xb9d19a, [[336, 306], [344, 301], [355, 299], [362, 300], [363, 302], [351, 302], [341, 307]]);
  facet(g, 0x233b2b, [[345, 307], [350, 304], [357, 304], [361, 307], [357, 310], [350, 311], [346, 309]]);
  ticks(g, 0x629562, [[339, 309, 4, 1], [361, 303, 4, 2], [359, 312, 4, 1], [348, 316, 5, 1], [364, 314, 3, 1]]);
  ticks(g, 0xc3dda4, [[342, 303, 3, 1], [348, 301, 4, 1], [339, 307, 2, 1], [360, 310, 3, 1]]);
}

export function addWorkshopMaster(scene) {
  addMasterPortrait(scene);

  // Reuse the authored wood grain and edge lighting as a foreground cutout.
  const key = 'workshop-bench-foreground';
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, 1024, 559);
    const context = texture.getContext();
    context.imageSmoothingEnabled = false;
    context.beginPath();
    context.moveTo(...WORKSHOP_BENCH[0]);
    for (const point of WORKSHOP_BENCH.slice(1)) context.lineTo(...point);
    context.closePath();
    context.clip();
    context.drawImage(scene.textures.get('workshop').getSourceImage(), 0, 0, 1024, 559);
    texture.refresh();
  }
  scene.add.image(0, 0, key).setOrigin(0).setDepth(1.6);
  drawJade(scene.add.graphics().setDepth(1.7));
}
