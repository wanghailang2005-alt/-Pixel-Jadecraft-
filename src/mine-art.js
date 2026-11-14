import { CELL_SIZE, TILE, CATWALK_Y } from './mining.js';

const ROCK_PATCH_SIZE = 256;
const ROCK_PATCH_COLUMNS = ROCK_PATCH_SIZE / 16;

/** A continuous geological face is cut into cells; cells never get brick borders. */
export function createTerrainArt(scene) {
  texture(scene, 'mine-terrain-source', 80, ROCK_PATCH_COLUMNS ** 2 * 16, ctx => {
    for (let tile = 1; tile <= 4; tile++) {
      const patch = document.createElement('canvas');
      patch.width = patch.height = ROCK_PATCH_SIZE;
      const rock = patch.getContext('2d');
      const colors = tile === TILE.BEDROCK
        ? ['#101C25', '#182A34', '#20353F', '#29424B', '#111F28']
        : tile === TILE.DIRT
          ? ['#25333A', '#344447', '#3D5150', '#50615A', '#202E35']
          : ['#1D2F3B', '#2C4350', '#35505B', '#4B6469', '#172B36'];
      rect(rock, 0, 0, ROCK_PATCH_SIZE, ROCK_PATCH_SIZE, colors[0]);
      // Each face spans several collision cells. Sparse stepped fissures expose
      // broad blue-grey planes instead of repeating a pebble in every cell.
      for (let band = -1; band < 7; band++) for (let block = -1; block < 6; block++) {
        const seed = (band * 31 + block * 17 + 97) >>> 0;
        const x = block * 58 + (band % 2 ? 22 : -6);
        const y = band * 45 + (seed % 3) * 4;
        const width = 48 + seed % 17, height = 34 + seed % 11;
        polygon(rock, [[x,y+13],[x+9,y+7],[x+15,y+7],[x+21,y], [x+width-9,y+2],
          [x+width,y+14],[x+width-7,y+height-3],[x+width-19,y+height+3], [x+9,y+height-1],[x,y+height-10]], colors[1 + seed % 2]);
        polygon(rock, [[x+7,y+16],[x+17,y+10],[x+24,y+4],[x+width-12,y+5],
          [x+width-20,y+11],[x+21,y+12],[x+12,y+20]], colors[3]);
        polygon(rock, [[x+width-5,y+16],[x+width-12,y+height-5],[x+width-21,y+height+1],
          [x+14,y+height-2],[x+20,y+height-7],[x+width-22,y+height-8]], colors[4]);
        if (seed % 3 === 0) polygon(rock, [[x+17,y+18],[x+20,y+15],[x+31,y+16],[x+29,y+18],
          [x+22,y+18],[x+18,y+25],[x+14,y+27]], colors[0]);
      }
      for (let variant = 0; variant < ROCK_PATCH_COLUMNS ** 2; variant++) {
        ctx.save(); ctx.translate(tile * 16, variant * 16);
        ctx.drawImage(patch, variant % ROCK_PATCH_COLUMNS * 16, Math.floor(variant / ROCK_PATCH_COLUMNS) * 16, 16, 16, 0, 0, 16, 16);
      if (tile === TILE.JADE_VEIN) {
          polygon(ctx, [[1,10],[3,5],[8,1],[12,2],[15,8],[12,14],[6,16]], '#102F2B');
          polygon(ctx, [[3,10],[5,5],[9,2],[12,4],[13,9],[10,13],[6,14]], '#287D5A');
          polygon(ctx, [[4,9],[6,5],[9,3],[11,4],[7,10]], '#8CE8A9');
          polygon(ctx, [[7,10],[12,6],[12,10],[9,13],[5,13]], '#42BE84');
          rect(ctx, 6, 6, 2, 2, '#D2F4C9');
        }
        ctx.restore();
      }
    }
  });
  if (!scene.textures.exists('mine-terrain')) scene.textures.addSpriteSheet('mine-terrain', scene.textures.get('mine-terrain-source').getSourceImage(), { frameWidth: 16, frameHeight: 16 });
  texture(scene, 'mine-pale-vein', 16, 16, ctx => {
    polygon(ctx, [[1,10],[3,5],[8,1],[12,2],[15,8],[12,14],[6,16]], '#213E37');
    polygon(ctx, [[3,10],[5,5],[9,2],[12,4],[13,9],[10,13],[6,14]], '#6B9D79');
    polygon(ctx, [[4,9],[6,5],[9,3],[11,4],[7,10]], '#D4E7B7');
    polygon(ctx, [[7,10],[12,6],[12,10],[9,13],[5,13]], '#A4C995');
    rect(ctx, 6, 6, 2, 2, '#F0F1CE');
  });
}

/** Only changed cells and neighboring exposed edges are redrawn. */
export function drawRuntimeTerrain(scene, world, useFormalTiles = false) {
  createTerrainArt(scene);
  const key = useFormalTiles ? 'mine-tiles' : 'mine-terrain';
  const cells = new Map(), edges = new Map(), oreFaces = new Map();
  const veinAt = new Map(world.veins.map(vein => [`${vein.column},${vein.row}`, vein]));
  function updateCell(column, row) {
    const id = `${column},${row}`;
    cells.get(id)?.destroy(); cells.delete(id);
    edges.get(id)?.destroy(); edges.delete(id);
    oreFaces.get(id)?.destroy(); oreFaces.delete(id);
    const tile = world.map[row]?.[column];
    if (tile === undefined || tile === TILE.AIR) return;
    const variant = column % ROCK_PATCH_COLUMNS + row % ROCK_PATCH_COLUMNS * ROCK_PATCH_COLUMNS;
    const frame = useFormalTiles ? world.frames[tile] : variant * 5 + tile;
    cells.set(id, scene.add.image(column * 32, row * 32, key, frame).setOrigin(0).setScale(2).setDepth(1));
    if (!useFormalTiles && tile === TILE.JADE_VEIN && veinAt.get(id)?.material === 'nephrite') {
      oreFaces.set(id, scene.add.image(column * 32, row * 32, 'mine-pale-vein').setOrigin(0).setScale(2).setDepth(1.5));
    }
    const top = world.map[row - 1]?.[column] === TILE.AIR;
    const left = world.map[row]?.[column - 1] === TILE.AIR;
    const right = world.map[row]?.[column + 1] === TILE.AIR;
    const bottom = world.map[row + 1]?.[column] === TILE.AIR;
    if (!top && !left && !right && !bottom) return;
    const edge = scene.add.graphics().setDepth(2);
    const px = column * 32, py = row * 32;
    // Every solid-air boundary stays visible and sits on the real collision edge.
    if (left) { edge.fillStyle(0x49616a); edge.fillRect(px, py, 2, 32); edge.fillStyle(0x10222c); edge.fillRect(px + 2, py + 4, 2, 24); }
    if (right) { edge.fillStyle(0x0c1b25); edge.fillRect(px + 28, py, 4, 32); }
    if (bottom) { edge.fillStyle(0x0b1821); edge.fillRect(px, py + 28, 32, 4); }
    if (top) {
      edge.fillStyle(0x6a7974); edge.fillRect(px, py, 32, 2);
      if (tile !== TILE.BEDROCK) {
        edge.fillStyle(0x476443); edge.fillRect(px, py + 2, 32, 3);
        edge.fillStyle(0x668350); edge.fillRect(px + column % 3 * 6, py, 14, 3);
        edge.fillStyle(0x3c5840); edge.fillRect(px + 10, py + 4, 10, 4 + column % 3 * 2);
      }
    }
    if (left && row % 4 === 1 && tile !== TILE.BEDROCK) {
      edge.fillStyle(0x38523c); edge.fillRect(px + 3, py + 4, 5, 18);
      edge.fillStyle(0x557346); edge.fillRect(px + 2, py + 7, 3, 8);
    }
    edges.set(id, edge);
  }
  world.map.forEach((row, y) => row.forEach((tile, x) => updateCell(x, y)));
  drawMineTerrain(scene, world, false);
  return { cells, update(column, row) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) updateCell(column + dx, row + dy);
  } };
}

export function createMiningEffects(scene) {
  texture(scene, 'mine-cracks-source', 64, 16, ctx => {
    for (let frame = 1; frame < 4; frame++) {
      ctx.save(); ctx.translate(frame * 16, 0);
      ctx.strokeStyle = '#101C1B'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(7, 1); ctx.lineTo(9, 6); ctx.lineTo(5, 10); ctx.lineTo(8, 15);
      if (frame >= 2) { ctx.moveTo(9, 6); ctx.lineTo(14, 8); ctx.lineTo(12, 12); }
      if (frame >= 3) { ctx.moveTo(5, 10); ctx.lineTo(1, 7); ctx.moveTo(8, 14); ctx.lineTo(14, 15); }
      ctx.stroke(); ctx.restore();
    }
  });
  if (!scene.textures.exists('mine-cracks')) scene.textures.addSpriteSheet('mine-cracks', scene.textures.get('mine-cracks-source').getSourceImage(), { frameWidth: 16, frameHeight: 16 });
  texture(scene, 'mine-drop-source', 16, 8, ctx => {
    for (let frame = 0; frame < 2; frame++) {
      ctx.save(); ctx.translate(frame * 8, 0);
      polygon(ctx, [[0,4],[3,0],[6,1],[8,4],[5,8],[2,7]], '#22684F');
      polygon(ctx, [[1,4],[3,1],[6,2],[5,6],[2,6]], frame ? '#7FE3B0' : '#4FC98A');
      rect(ctx, 3, 2, 2, 1, '#C4F1CE'); ctx.restore();
    }
  });
  if (!scene.textures.exists('mine-drop')) scene.textures.addSpriteSheet('mine-drop', scene.textures.get('mine-drop-source').getSourceImage(), { frameWidth: 8, frameHeight: 8 });
}

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
  // One cached, low-resolution overlay follows the miner without per-frame uploads.
  // At 4x scale it covers the full viewport even at the world edges.
  texture(scene, 'mine-lamp-shade', 512, 288, ctx => {
    ctx.fillStyle = 'rgba(0, 8, 16, 0.22)';
    ctx.fillRect(0, 0, 512, 288);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(256, 144, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  });
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
  if (terrain) { drawRuntimeTerrain(scene, world); return; }
  // The entrance view and pillars are distant scenery. Opaque terrain above them
  // still describes every wall; only the existing air cells reveal this layer.
  if (scene.textures.exists('mine-cavern')) scene.add.image(world.spawn.x + 36, 786, 'mine-cavern')
    .setDisplaySize(560, 315).setDepth(-9);
  const distance = scene.add.graphics().setDepth(-5);
  for (const ladder of world.ladders ?? []) {
    distance.fillStyle(0x769c9b, .12); distance.fillRect(ladder.x - 45, ladder.top, 90, ladder.bottom - ladder.top);
    distance.fillStyle(0x92b7ac, .08); distance.fillRect(ladder.x - 27, ladder.top, 18, ladder.bottom - ladder.top);
  }
  for (const [x, top, height] of [[77, 748, 114], [268, 766, 98]]) {
    distance.fillStyle(0x2a444d, .85); distance.fillRect(x, top, 24, height);
    distance.fillStyle(0x4b6a6b, .65); distance.fillRect(x + 3, top + 14, 4, height - 24);
    distance.fillStyle(0x1b303a, .8); distance.fillRect(x + 18, top + 14, 4, height - 24);
    distance.fillStyle(0x45616a, .85); distance.fillRect(x - 5, top, 34, 7);
    distance.fillRect(x - 2, top + 9, 28, 4); distance.fillRect(x - 5, top + height - 5, 34, 5);
  }
  const g = scene.add.graphics().setDepth(2);
  for (const ladder of world.ladders ?? []) {
    g.fillStyle(0x182322); g.fillRect(ladder.x - 18, ladder.top - 8, 7, ladder.bottom - ladder.top + 8); g.fillRect(ladder.x + 11, ladder.top - 8, 7, ladder.bottom - ladder.top + 8);
    g.fillStyle(0x77634b); g.fillRect(ladder.x - 16, ladder.top - 8, 4, ladder.bottom - ladder.top + 8); g.fillRect(ladder.x + 12, ladder.top - 8, 4, ladder.bottom - ladder.top + 8);
    for (let y = ladder.top; y < ladder.bottom; y += 20) {
      g.fillStyle(0x3e362e); g.fillRect(ladder.x - 16, y + 3, 32, 5);
      g.fillStyle(0xa38b62); g.fillRect(ladder.x - 16, y, 32, 3);
      g.fillStyle(0xc1ac79); g.fillRect(ladder.x - 13, y, 4, 2);
    }
    // These one-way planks are the real walking surface in moveMiner. W/S at
    // the central ladder still goes through the hatch into the fixed shaft.
    g.fillStyle(0x302d26); g.fillRect(ladder.x - 48, CATWALK_Y, 96, 6);
    for (let x = ladder.x - 48; x < ladder.x + 48; x += 16) {
      g.fillStyle(0xa28b62); g.fillRect(x, CATWALK_Y - 2, 14, 3);
      g.fillStyle(0x635441); g.fillRect(x + 2, CATWALK_Y + 1, 12, 3);
    }
  }
  if (world.ladders?.length) {
    // Rails sit on the already solid entrance floor and do not add collision.
    for (let x = 72; x < 270; x += 28) { g.fillStyle(0x564a3b); g.fillRect(x, 854, 12, 10); }
    g.fillStyle(0x19282d); g.fillRect(66, 855, 208, 3); g.fillRect(66, 862, 208, 2);
    g.fillStyle(0x778b88); g.fillRect(66, 854, 208, 1); g.fillRect(66, 861, 208, 1);
    scene.add.image(world.spawn.x + 64, 864, 'mine-cart').setOrigin(0.5, 1).setScale(1.5).setDepth(3);
    const glow = scene.add.image(63, 781, 'mine-glow').setScale(.65).setTint(0xffd6a0).setAlpha(.55).setDepth(2);
    const lantern = scene.add.graphics().setDepth(3);
    lantern.fillStyle(0x3b3529); lantern.fillRect(61, 752, 2, 21); lantern.fillRect(55, 772, 15, 21);
    lantern.fillStyle(0xa88b51); lantern.fillRect(57, 773, 11, 3); lantern.fillRect(57, 788, 11, 3);
    lantern.fillStyle(0xe4c77f); lantern.fillRect(59, 777, 7, 10);
    lantern.fillStyle(0xffe6a6); lantern.fillRect(61, 778, 3, 7);
    glow.setName('entrance-lantern-glow');
  }
}
