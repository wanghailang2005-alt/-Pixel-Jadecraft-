import { CELL_SIZE } from './mining.js';

const outline = '#10151e';

function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}

function rect(ctx, x, y, width, height, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, width, height);
}

function texture(scene, key, width, height, paint) {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, width, height);
  paint(canvas.context);
  canvas.refresh();
}

function paintMiner(ctx, direction, pose) {
  ctx.save();
  if (direction === 'left') { ctx.translate(32, 0); ctx.scale(-1, 1); }
  const stride = pose < 4 ? [0, 2, 0, -2][pose] : 0;
  // Boots and trouser legs remain separate so the walk reads at 2× scale.
  rect(ctx, 8 + stride, 35, 8, 12, outline);
  rect(ctx, 18 - stride, 35, 8, 12, outline);
  rect(ctx, 10 + stride, 35, 5, 8, '#998b65');
  rect(ctx, 19 - stride, 35, 5, 8, '#c2b18a');
  rect(ctx, 7 + stride, 44, 9, 3, '#534738');
  rect(ctx, 19 - stride, 44, 9, 3, '#534738');
  polygon(ctx, [[9,19],[22,19],[26,25],[24,36],[8,36],[7,25]], outline);
  rect(ctx, 10, 22, 13, 12, '#9e9774');
  rect(ctx, 10, 23, 5, 11, '#5e705c');
  rect(ctx, 20, 23, 3, 11, '#485b4d');
  rect(ctx, 9, 33, 15, 3, '#65482f');
  rect(ctx, 16, 33, 3, 2, '#c7aa6d');
  rect(ctx, 8, 10, 17, 12, outline);
  rect(ctx, 11, 11, 12, 9, '#cb9c71');
  rect(ctx, 17, 11, 6, 8, '#e3bd8a');
  rect(ctx, 21, 12, 2, 3, '#131c24');
  rect(ctx, 23, 15, 3, 3, '#dcb383');
  rect(ctx, 10, 10, 3, 7, '#574438');
  rect(ctx, 18, 19, 5, 2, '#7e5b45');
  // Brass helmet with a compact, bright lamp.
  polygon(ctx, [[7,10],[8,5],[12,2],[21,2],[25,6],[26,10]], outline);
  polygon(ctx, [[9,9],[10,5],[14,3],[21,4],[24,7],[24,10]], '#b59147');
  rect(ctx, 13, 4, 8, 2, '#e2c576');
  rect(ctx, 6, 9, 21, 3, '#e1bd68');
  rect(ctx, 6, 12, 21, 1, '#775830');
  rect(ctx, direction === 'down' ? 15 : 22, 6, 5, 5, outline);
  rect(ctx, direction === 'down' ? 16 : 23, 7, 3, 3, '#fff0b7');
  if (pose === 4) {
    polygon(ctx, [[20,23],[24,23],[27,15],[24,12],[21,17]], outline);
    rect(ctx, 22, 16, 4, 8, '#d6ad7b');
    polygon(ctx, [[23,17],[25,18],[31,4],[29,3]], '#b2874d');
    polygon(ctx, [[20,4],[23,1],[29,0],[32,3],[32,6],[28,3],[24,3],[21,6]], '#afbbb7');
    rect(ctx, 22, 2, 7, 1, '#e0e1cb');
  } else if (pose === 5) {
    rect(ctx, 22, 23, 9, 5, outline); rect(ctx, 23, 23, 7, 3, '#dfb985');
    polygon(ctx, [[23,23],[25,22],[31,34],[29,35]], '#b2874d');
    polygon(ctx, [[24,31],[28,29],[32,30],[32,36],[29,33],[25,34]], '#d1d8c7');
  } else {
    rect(ctx, 22, 23, 5, 9, outline); rect(ctx, 23, 24, 3, 6, '#d7af7b');
    polygon(ctx, [[24,29],[26,29],[30,39],[28,40]], '#a77a45');
    polygon(ctx, [[24,38],[27,35],[31,35],[32,38],[29,37],[26,40]], '#9daea9');
  }
  ctx.restore();
}

function paintOre(ctx, material, phase) {
  const pale = material === 'nephrite';
  polygon(ctx, [[1,20],[4,10],[12,3],[22,2],[30,12],[31,23],[22,31],[7,29]], outline);
  polygon(ctx, [[3,19],[6,10],[13,5],[23,5],[28,13],[29,23],[21,28],[8,27]], '#344b49');
  if (phase === 'empty') {
    polygon(ctx, [[6,17],[13,9],[24,12],[26,23],[16,27],[8,23]], '#111f24');
    rect(ctx, 5, 24, 7, 3, '#52635a'); rect(ctx, 22, 26, 5, 2, '#4a5a62');
    rect(ctx, 14, 13, 2, 2, '#3e6b45'); return;
  }
  const colors = pale ? ['#416d5a','#8cc99d','#b9e6b5','#e0f5c9'] : ['#146d55','#27ae7e','#5ee3ac','#b1f5cf'];
  polygon(ctx, [[6,18],[10,9],[18,5],[25,12],[27,21],[20,27],[10,24]], colors[0]);
  polygon(ctx, [[8,17],[11,10],[18,7],[22,11],[13,21]], colors[2]);
  polygon(ctx, [[13,21],[23,11],[25,19],[20,25],[11,23]], colors[1]);
  polygon(ctx, [[11,12],[17,8],[20,9],[12,17]], colors[3]);
  polygon(ctx, [[13,21],[24,15],[24,18],[18,25]], colors[2]);
  rect(ctx, 8, 18, 2, 5, colors[3]); rect(ctx, 21, 22, 3, 2, colors[3]);
  if (phase === 'cracked' || phase === 'mining') {
    polygon(ctx, [[18,7],[17,14],[21,17],[16,20],[16,26],[13,20],[18,16],[14,14]], '#15382f');
  }
  if (phase === 'regrowing') {
    rect(ctx, 10, 8, 5, 5, '#344b49'); rect(ctx, 21, 19, 6, 6, '#344b49');
  }
}

export function paintMineIcon(canvas, kind) {
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (kind !== 'pick') { paintOre(ctx, kind === 'white' ? 'nephrite' : 'jadeite', 'ready'); return; }
  polygon(ctx, [[5,28],[3,25],[22,5],[25,8]], outline);
  polygon(ctx, [[5,26],[6,28],[24,8],[22,7]], '#b68b51');
  polygon(ctx, [[9,7],[13,3],[21,2],[28,7],[30,14],[27,12],[23,8],[17,6],[12,8]], outline);
  polygon(ctx, [[10,6],[15,3],[21,3],[27,8],[29,12],[24,8],[18,5],[13,7]], '#b6c4bf');
  rect(ctx, 14, 3, 7, 2, '#e8dcc0');
}

export function createMineArt(scene) {
  if (!scene.textures.exists('mine-player')) {
    texture(scene, 'mine-player-source', 192, 144, ctx => {
      ['left', 'right', 'down'].forEach((direction, row) => {
        for (let pose = 0; pose < 6; pose++) {
          ctx.save(); ctx.translate(pose * 32, row * 48); paintMiner(ctx, direction, pose); ctx.restore();
        }
      });
    });
    scene.textures.addSpriteSheet('mine-player', scene.textures.get('mine-player-source').getSourceImage(), { frameWidth: 32, frameHeight: 48 });
  }
  for (const material of ['nephrite', 'jadeite']) {
    for (const phase of ['full', 'cracked', 'ready', 'mining', 'empty', 'regrowing']) {
      texture(scene, `mine-ore-${material}-${phase}`, 32, 32, ctx => paintOre(ctx, material, phase));
    }
  }
  texture(scene, 'mine-glow', 64, 64, ctx => {
    const glow = ctx.createRadialGradient(32, 32, 5, 32, 32, 32);
    glow.addColorStop(0, '#7fe3b077'); glow.addColorStop(0.45, '#4fc98a33'); glow.addColorStop(1, '#4fc98a00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
  });
  texture(scene, 'mine-cart', 48, 32, ctx => {
    polygon(ctx, [[2,5],[46,5],[41,22],[9,22]], outline);
    polygon(ctx, [[5,8],[43,8],[39,20],[10,20]], '#765038');
    rect(ctx, 7, 9, 34, 3, '#a9784a'); rect(ctx, 9, 15, 31, 2, '#4b332b');
    rect(ctx, 2, 4, 44, 4, '#7b8a8f'); rect(ctx, 4, 4, 40, 1, '#b1c0bd');
    rect(ctx, 9, 22, 31, 3, '#39444c');
    for (const x of [12, 34]) {
      polygon(ctx, [[x-5,25],[x-3,22],[x+3,22],[x+5,25],[x+5,29],[x+2,32],[x-3,31],[x-5,28]], outline);
      rect(ctx, x-3, 25, 6, 5, '#506069'); rect(ctx, x-1, 26, 2, 2, '#8a9a9c');
    }
  });
}

export function drawMineTerrain(scene, world, terrain = true) {
  const g = scene.add.graphics().setDepth(1);
  if (terrain) world.map.forEach((row, y) => row.forEach((tile, x) => {
    if (!tile) return;
    const px = x * CELL_SIZE, py = y * CELL_SIZE;
    g.fillStyle(0x152129); g.fillRect(px, py, CELL_SIZE, CELL_SIZE);
    for (let part = 0; part < 8; part++) {
      const seed = (x * 73 + y * 41 + part * 19) % 97;
      const rx = px + (seed % 7) * 4, ry = py + ((seed * 3) % 7) * 4;
      g.fillStyle([0x2b3a42, 0x34454e, 0x4a5a62, 0x243139][part % 4]);
      g.fillRect(rx, ry, 4 + (seed % 3) * 4, 4 + (seed % 2) * 4);
    }
    if (!world.map[y - 1]?.[x]) {
      g.fillStyle(0x3e6b45); g.fillRect(px, py, CELL_SIZE, 4);
      for (let moss = 0; moss < 4; moss++) {
        g.fillStyle(moss % 2 ? 0x70925a : 0x526f43);
        g.fillRect(px + moss * 8, py - (moss % 2) * 3, 6, 6 + ((x + moss) % 3) * 3);
      }
    }
  }));
  for (const ladder of world.ladders ?? []) {
    g.fillStyle(0x231c1c); g.fillRect(ladder.x - 18, ladder.top - 8, 7, ladder.bottom - ladder.top + 8); g.fillRect(ladder.x + 11, ladder.top - 8, 7, ladder.bottom - ladder.top + 8);
    g.fillStyle(0x8b5a2b); g.fillRect(ladder.x - 16, ladder.top - 8, 4, ladder.bottom - ladder.top + 8); g.fillRect(ladder.x + 12, ladder.top - 8, 4, ladder.bottom - ladder.top + 8);
    for (let y = ladder.top; y < ladder.bottom; y += 20) {
      g.fillStyle(0x4b3426); g.fillRect(ladder.x - 16, y + 3, 32, 5);
      g.fillStyle(0xb08a53); g.fillRect(ladder.x - 16, y, 32, 4);
    }
  }
  if (world.ladders?.length) scene.add.image(768, 928, 'mine-cart').setOrigin(0.5, 1).setScale(2).setDepth(3);
}
