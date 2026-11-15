import { CELL_SIZE, TILE, CATWALK_Y } from './mining.js';

const ROCK_PATCH_SIZE = 256;
const ROCK_PATCH_COLUMNS = ROCK_PATCH_SIZE / 16;

// Deterministic flecks keep a single rock face continuous across collision cells.
const rockNoise = (x, y) => ((Math.imul(x + 157, 374761393) ^ Math.imul(y + 29, 668265263)) >>> 0) / 4294967295;

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
          : ['#182832', '#2B3A42', '#374A53', '#4A5A62', '#101C27'];
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
        // Broken facets, offset strata and small inclusions replace the smooth,
        // uniformly rounded look of the first generated rock sheet.
        polygon(rock, [[x+13,y+25],[x+23,y+20],[x+38,y+21],[x+31,y+24],[x+21,y+26]], colors[2]);
        polygon(rock, [[x+width-15,y+13],[x+width-9,y+17],[x+width-13,y+23],[x+width-20,y+26]], colors[0]);
        pixelLine(rock, [[x+5,y+height-7],[x+14,y+height-12],[x+22,y+height-11],[x+25,y+height-16]], colors[4]);
      }
      for (let y = 1; y < ROCK_PATCH_SIZE; y += 3) for (let x = 1; x < ROCK_PATCH_SIZE; x += 3) {
        const n = rockNoise(x, y + tile * 19);
        if (n > .89) rect(rock, x, y, n > .97 ? 3 : 1, 1, colors[n > .96 ? 3 : 2]);
        if (n < .035) rect(rock, x, y, 2, 1, colors[4]);
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
    const face = scene.add.image(column * 32, row * 32, key, frame).setOrigin(0).setScale(2).setDepth(1);
    // Keep the cavern silhouette legible: only rock near an actual opening
    // catches reflected light, while the unexcavated mass recedes into blue shade.
    if (!useFormalTiles && tile !== TILE.JADE_VEIN) {
      let exposure = 4;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance < exposure && world.map[row + dy]?.[column + dx] === TILE.AIR) exposure = distance;
      }
      const tint = [255, 255, 220, 186, 154][exposure];
      face.setTint((tint - 8) << 16 | (tint - 3) << 8 | tint);
      if (world.entrance && row * CELL_SIZE > world.entrance.floor && column * CELL_SIZE < world.entrance.right) {
        face.setTint(row === 28 ? 0x697d87 : 0x405463);
      }
    }
    cells.set(id, face);
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
        edge.fillStyle(0x3e6b45); edge.fillRect(px, py + 2, 32, 3);
        edge.fillStyle(0x6e8950); edge.fillRect(px + column % 3 * 6, py, 14, 3);
        edge.fillStyle(0x304f38); edge.fillRect(px + 10, py + 4, 10, 4 + column % 3 * 2);
        for (let x = 2; x < 31; x += 6) {
          const height = 2 + (column * 7 + row * 3 + x) % 5;
          edge.fillStyle(x % 4 ? 0x557b43 : 0x88a157);
          edge.fillRect(px + x, py - height, 2, height + 2);
          edge.fillRect(px + x - 2, py - height + 2, 2, 2);
        }
      }
    }
    if (left && row % 4 === 1 && tile !== TILE.BEDROCK) {
      edge.fillStyle(0x38523c); edge.fillRect(px + 3, py + 4, 5, 18);
      edge.fillStyle(0x557346); edge.fillRect(px + 2, py + 7, 3, 8);
    }
    if (bottom && column % 5 === 2 && tile !== TILE.BEDROCK) {
      edge.fillStyle(0x233c35); edge.fillRect(px + 9, py + 30, 2, 13);
      edge.fillStyle(0x3e6b45); edge.fillRect(px + 11, py + 34, 4, 3); edge.fillRect(px + 6, py + 39, 3, 3);
    }
    edges.set(id, edge);
  }
  world.map.forEach((row, y) => row.forEach((tile, x) => updateCell(x, y)));
  drawMineTerrain(scene, world, false);
  return { cells, update(column, row) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) <= 3) updateCell(column + dx, row + dy);
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

function pixelLine(ctx, points, color, width = 1) {
  ctx.fillStyle = color;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let step = 0; step <= steps; step++) ctx.fillRect(Math.round(ax + (bx - ax) * step / steps), Math.round(ay + (by - ay) * step / steps), width, width);
  }
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
  const bob = pose === 1 || pose === 3 ? 1 : 0;
  // Boots and trouser legs remain separate so the walk reads at 2× scale.
  rect(ctx, 8 + stride, 35, 8, 12, outline);
  rect(ctx, 18 - stride, 35, 8, 12, outline);
  rect(ctx, 10 + stride, 35, 5, 8, '#998b65');
  rect(ctx, 19 - stride, 35, 5, 8, '#c2b18a');
  rect(ctx, 7 + stride, 44, 9, 3, '#534738');
  rect(ctx, 19 - stride, 44, 9, 3, '#534738');
  rect(ctx, 8 + stride, 44, 5, 1, '#9b8664');
  rect(ctx, 20 - stride, 44, 5, 1, '#9b8664');
  ctx.translate(0, bob);
  polygon(ctx, [[9,19],[22,19],[26,25],[24,36],[8,36],[7,25]], outline);
  rect(ctx, 10, 22, 13, 12, '#9e9774');
  rect(ctx, 10, 23, 5, 11, '#5e705c');
  rect(ctx, 20, 23, 3, 11, '#485b4d');
  rect(ctx, 11, 23, 2, 10, '#c1b28b');
  rect(ctx, 19, 23, 2, 10, '#c1b28b');
  rect(ctx, 11, 29, 10, 2, '#726b50');
  rect(ctx, 14, 25, 4, 4, '#716b50');
  rect(ctx, 14, 25, 4, 1, '#d2be90');
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
    // During a strike the scene draws the tool outside this 32px sprite,
    // so its head can actually reach the selected wall and seam.
    rect(ctx, 23, 14, 4, 4, '#e3bd8a');
  } else if (pose === 5) {
    rect(ctx, 22, 23, 9, 5, outline); rect(ctx, 23, 23, 7, 3, '#dfb985');
    rect(ctx, 28, 22, 3, 4, '#e3bd8a');
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
  // Original pixel scenery, aligned to the real entrance vault (2x pixels).
  // Foreground collision tiles mask it; no ore or walkable ledge is baked in.
  texture(scene, 'mine-entrance-depth', 480, 216, ctx => {
    rect(ctx,0,0,480,216,'#182b35');
    polygon(ctx,[[72,0],[425,0],[461,80],[448,178],[393,216],[64,216],[38,150]],'#344d56');
    polygon(ctx,[[157,0],[367,0],[403,34],[423,115],[407,174],[371,216],[91,216],[114,159],[139,109],[135,49]],'#57767b');
    polygon(ctx,[[181,0],[308,0],[327,16],[339,48],[365,77],[369,119],[352,154],[326,169],[302,200],[146,216],[133,192],[151,165],[160,124],[178,96],[166,61]],'#8aaba9');
    polygon(ctx,[[204,0],[268,0],[274,26],[296,50],[298,80],[322,112],[306,152],[272,183],[239,216],[158,216],[178,160],[193,125]],'#94b3ae');
    // Angular mountain-like silhouettes recede into the blue-green haze.
    polygon(ctx,[[73,181],[100,174],[113,143],[129,143],[136,116],[149,138],[153,170],[168,179],[174,160],[188,152],[188,216],[64,216]],'#65878a');
    polygon(ctx,[[245,216],[259,178],[277,165],[285,139],[294,135],[300,157],[317,170],[334,168],[352,146],[362,122],[369,125],[379,180],[405,194],[428,216]],'#5d7e82');
    polygon(ctx,[[83,216],[106,197],[127,203],[144,191],[166,202],[181,187],[192,155],[201,149],[208,173],[222,178],[232,216]],'#45636c');
    polygon(ctx,[[300,216],[319,197],[327,180],[342,184],[356,164],[366,170],[373,192],[391,198],[405,216]],'#3c5963');
    // Distant worn stair fragments stop in the background, behind the solid floor.
    for(let step=0;step<6;step++){
      const x=307+step*8,y=198-step*7;
      rect(ctx,x,y,34,4,'#668387');rect(ctx,x+2,y+4,29,3,'#344f5b');
    }
    // Broken far pillars are silhouettes; the detailed nearer pair is layered below.
    for(const [x,top,height,width] of [[94,69,146,14],[321,19,170,12],[407,62,154,16]]){
      rect(ctx,x,top,width,height,'#3d5962');rect(ctx,x+2,top+7,3,height-8,'#607c7f');
      rect(ctx,x-3,top,width+6,5,'#506f75');rect(ctx,x-2,top+8,width+4,3,'#496970');
      rect(ctx,x-3,top+height-5,width+6,5,'#304c58');
    }
    // Dust is static and sparse: no frame uploads or decorative flicker.
    for(let i=0;i<28;i++){
      const x=150+(i*47)%210,y=24+(i*31)%165;
      rect(ctx,x,y,1+(i%3===0),1,i%2?'#aec5b5':'#789c9b');
    }
  });
  // One cached, low-resolution overlay follows the miner without per-frame uploads.
  // At 4x scale it covers the full viewport even at the world edges.
  texture(scene, 'mine-lamp-shade', 512, 288, ctx => {
    ctx.fillStyle = 'rgba(0, 8, 16, 0.22)';
    ctx.fillRect(0, 0, 512, 288);
    ctx.globalCompositeOperation = 'destination-out';
    const lamp = ctx.createRadialGradient(256,144,12,256,144,52);
    lamp.addColorStop(0,'#000');lamp.addColorStop(.45,'#000d');lamp.addColorStop(1,'#0000');
    ctx.fillStyle = lamp;
    ctx.beginPath();
    ctx.arc(256, 144, 52, 0, Math.PI * 2);
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
    for (const x of [13,24,35]) { rect(ctx, x, 8, 2, 12, '#403c37'); rect(ctx, x, 10, 1, 1, '#c1b296'); }
    rect(ctx, 11, 17, 26, 1, '#a4774d');
    rect(ctx, 2, 4, 44, 4, '#7b8a8f'); rect(ctx, 4, 4, 40, 1, '#b1c0bd');
    rect(ctx, 9, 22, 31, 3, '#39444c');
    for (const x of [12, 34]) {
      polygon(ctx, [[x-5,25],[x-3,22],[x+3,22],[x+5,25],[x+5,29],[x+2,32],[x-3,31],[x-5,28]], outline);
      rect(ctx, x-3, 25, 6, 5, '#506069'); rect(ctx, x-1, 26, 2, 2, '#8a9a9c');
    }
  });
  texture(scene, 'mine-distant-column', 32, 128, ctx => {
    polygon(ctx, [[5,8],[27,8],[25,111],[29,116],[29,122],[2,122],[2,116],[6,111]], '#263b43');
    rect(ctx, 8, 15, 4, 98, '#526b6e'); rect(ctx, 13, 15, 2, 98, '#3b555c'); rect(ctx, 22, 14, 3, 98, '#1b303a');
    for (const [y,width] of [[3,32],[9,28],[16,23],[112,25],[120,32]]) {
      rect(ctx, (32-width)/2, y, width, 4, '#3d555d'); rect(ctx, (32-width)/2, y, width, 1, '#647a79');
    }
    pixelLine(ctx, [[15,31],[13,40],[16,45],[14,51]], '#1b303a');
    rect(ctx, 6, 15, 7, 3, '#405744'); rect(ctx, 8, 17, 3, 8, '#405744');
  });
  texture(scene, 'mine-cold-window', 128, 160, ctx => {
    for (let y = 0; y < 160; y += 8) for (let x = 0; x < 128; x += 8) {
      const spread = 28 + y * .25;
      const strength = Math.max(0, 1 - Math.abs(x - 62 - y * .08) / spread) * (1 - y / 230);
      if (strength > 0) rect(ctx, x, y, 8, 8, `rgba(153, 192, 185, ${strength * .3})`);
    }
  });
}

export function drawMineTerrain(scene, world, terrain = true) {
  if (terrain) { drawRuntimeTerrain(scene, world); return; }
  // The entrance view and pillars are distant scenery. Opaque terrain above them
  // still describes every wall; only the existing air cells reveal this layer.
  scene.add.image(0, 432, 'mine-entrance-depth').setOrigin(0).setScale(2).setDepth(-9);
  scene.add.image(416, 458, 'mine-cold-window').setOrigin(.5, 0).setScale(2.4, 2.5).setDepth(-8);
  // The broad entrance light is clipped naturally by foreground solids. No
  // opaque wall becomes a painted opening or a false walkable passage.
  scene.add.image(470, 864, 'mine-distant-column').setOrigin(.5, 1).setScale(1.4, 2.8).setAlpha(.85).setDepth(-7);
  scene.add.image(814, 864, 'mine-distant-column').setOrigin(.5, 1).setScale(1.05, 2.2).setAlpha(.6).setDepth(-7);
  const distance = scene.add.graphics().setDepth(-5);
  for (const ladder of world.ladders ?? []) {
    distance.fillStyle(0x8aaba9, .12); distance.fillRect(ladder.x - 45, ladder.top, 90, ladder.bottom - ladder.top);
    distance.fillStyle(0x92b7ac, .08); distance.fillRect(ladder.x - 27, ladder.top, 18, ladder.bottom - ladder.top);
    // A tapered shaft of cold light and distant carved supports sit behind the
    // existing air openings; they have no bearing on traversal or mining.
    distance.fillStyle(0x8aaba9, .065);
    distance.fillTriangle(ladder.x - 12, ladder.top, ladder.x - 44, ladder.bottom, ladder.x + 30, ladder.bottom);
    if (ladder.id !== 'entrance') {
      scene.add.image(ladder.x + 30, ladder.bottom + 12, 'mine-distant-column').setOrigin(.5, 1).setScale(.8).setAlpha(.55).setDepth(-4);
    }
  }
  for (const [x, top, height] of [[77, 610, 252]]) {
    distance.fillStyle(0x2a444d, .85); distance.fillRect(x, top, 24, height);
    distance.fillStyle(0x4b6a6b, .65); distance.fillRect(x + 3, top + 14, 4, height - 24);
    distance.fillStyle(0x1b303a, .8); distance.fillRect(x + 18, top + 14, 4, height - 24);
    distance.fillStyle(0x45616a, .85); distance.fillRect(x - 5, top, 34, 7);
    distance.fillRect(x - 2, top + 9, 28, 4); distance.fillRect(x - 5, top + height - 5, 34, 5);
  }
  const g = scene.add.graphics().setDepth(2);
  for (const ladder of world.ladders ?? []) {
    g.fillStyle(0x182322); g.fillRect(ladder.x - 18, ladder.top - 8, 7, ladder.bottom - ladder.top + 8); g.fillRect(ladder.x + 11, ladder.top - 8, 7, ladder.bottom - ladder.top + 8);
    g.fillStyle(0x655744); g.fillRect(ladder.x - 16, ladder.top - 8, 4, ladder.bottom - ladder.top + 8); g.fillRect(ladder.x + 12, ladder.top - 8, 4, ladder.bottom - ladder.top + 8);
    for (let y = ladder.top; y < ladder.bottom; y += 20) {
      g.fillStyle(0x3e362e); g.fillRect(ladder.x - 16, y + 3, 32, 5);
      g.fillStyle(0x938367); g.fillRect(ladder.x - 16, y, 32, 3);
      g.fillStyle(0xb8a480); g.fillRect(ladder.x - 13, y, 4, 2);
      g.fillStyle(0x414640); g.fillRect(ladder.x - 14, y + 1, 2, 2); g.fillRect(ladder.x + 12, y + 1, 2, 2);
    }
    if (ladder.id !== 'entrance') {
      const lampX = ladder.x - 36, lampY = ladder.bottom - 48;
      g.fillStyle(0x2c3028); g.fillRect(lampX - 2, lampY - 20, 2, 15); g.fillRect(lampX - 5, lampY - 7, 11, 15);
      g.fillStyle(0x9b7946); g.fillRect(lampX - 4, lampY - 6, 9, 2); g.fillRect(lampX - 4, lampY + 5, 9, 2);
      g.fillStyle(0xd8b971); g.fillRect(lampX - 2, lampY - 3, 5, 7);
      g.fillStyle(0xffe2a0); g.fillRect(lampX, lampY - 2, 1, 5);
      scene.add.image(lampX, lampY, 'mine-glow').setScale(.8).setTint(0xffd79a).setAlpha(.25).setDepth(2.1);
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
    for (let x = 264; x < 578; x += 28) { g.fillStyle(0x564a3b); g.fillRect(x, 854, 12, 10); }
    g.fillStyle(0x19282d); g.fillRect(258, 855, 330, 3); g.fillRect(258, 862, 330, 2);
    g.fillStyle(0x778b88); g.fillRect(258, 854, 330, 1); g.fillRect(258, 861, 330, 1);
    scene.add.image(534, 864, 'mine-cart').setOrigin(0.5, 1).setScale(1.75).setDepth(3);
    const glow = scene.add.image(63, 781, 'mine-glow').setScale(.65).setTint(0xffd6a0).setAlpha(.55).setDepth(2);
    const lantern = scene.add.graphics().setDepth(3);
    lantern.fillStyle(0x3b3529); lantern.fillRect(61, 752, 2, 21); lantern.fillRect(55, 772, 15, 21);
    lantern.fillStyle(0xa88b51); lantern.fillRect(57, 773, 11, 3); lantern.fillRect(57, 788, 11, 3);
    lantern.fillStyle(0xe4c77f); lantern.fillRect(59, 777, 7, 10);
    lantern.fillStyle(0xffe6a6); lantern.fillRect(61, 778, 3, 7);
    glow.setName('entrance-lantern-glow');
  }
}
