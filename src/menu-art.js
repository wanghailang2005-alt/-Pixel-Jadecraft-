const LETTERS = {
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  J: ['11111', '00010', '00010', '00010', '10010', '10010', '01100'],
  A: ['01110', '11011', '10001', '10001', '11111', '10001', '10001'],
  D: ['11110', '10011', '10001', '10001', '10001', '10011', '11110'],
  C: ['01111', '11000', '10000', '10000', '10000', '11000', '01111'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
};

export function createMenuLogo() {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 165;
  canvas.className = 'menu-logo';
  canvas.setAttribute('aria-hidden', 'true');
  const mask = document.createElement('canvas');
  mask.width = canvas.width;
  mask.height = canvas.height;
  const letters = mask.getContext('2d');
  letters.fillStyle = '#ffffff';
  function word(text, scale, top) {
    const left = Math.round((canvas.width - (text.length * 6 - 1) * scale) / 2);
    [...text].forEach((letter, index) => {
      LETTERS[letter].forEach((row, y) => [...row].forEach((cell, x) => {
        if (cell === '1') letters.fillRect(left + (index * 6 + x) * scale, top + y * scale, scale, scale);
      }));
    });
  }
  word('PIXEL', 6, 10);
  word('JADECRAFT', 11, 73);
  const ctx = canvas.getContext('2d');
  letters.globalCompositeOperation = 'source-in';
  letters.fillStyle = '#10372b';
  letters.fillRect(0, 0, 700, 165);
  ctx.shadowColor = '#b1e8a5';
  ctx.shadowBlur = 13;
  ctx.drawImage(mask, 0, 4);
  ctx.shadowBlur = 0;
  for (let y = -5; y <= 5; y++) {
    for (let x = -5; x <= 5; x++) ctx.drawImage(mask, x, y + 2);
  }
  const fill = letters.createLinearGradient(0, 0, 0, 165);
  fill.addColorStop(0, '#f0f4d3');
  fill.addColorStop(0.5, '#d0eac1');
  fill.addColorStop(1, '#8bc495');
  letters.fillStyle = fill;
  letters.fillRect(0, 0, 700, 165);
  ctx.drawImage(mask, 0, -1);
  return canvas;
}

export function decorateMenuScene(scene) {
  const actor = scene.add.graphics();
  const palette = { h: 0x3d3026, s: 0xdbb88b, j: 0x799975, b: 0xc5b98c, p: 0x374c3d };
  const rows = ['   hhhh   ', '  hhhhhh  ', ' hhhhhhhh ', '  hssssh  ', '  spssps  ', '   ssss   ', '  jjbjjj  ', ' sjjbjjjs ', ' sjjbjjjs ', '  jjjjjj  ', '   pp pp  ', '   pp pp  '];
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (palette[cell]) { actor.fillStyle(palette[cell]); actor.fillRect(x * 2, y * 2, 2, 2); }
  }));
  actor.setPosition(808, 465);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  scene.tweens.add({ targets: actor, y: 464, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const cloud = scene.add.graphics();
  cloud.fillStyle(0xf1f2d6, 0.32);
  cloud.fillRect(0, 10, 65, 8); cloud.fillRect(12, 4, 37, 7); cloud.fillRect(23, 0, 17, 5);
  cloud.setPosition(150, 66);
  scene.tweens.add({ targets: cloud, x: 182, duration: 28000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  for (let index = 0; index < 7; index++) {
    const mote = scene.add.rectangle(70 + index * 133, 430 + index % 3 * 16, 2, 2, 0xe5e9a3, 0.5);
    scene.tweens.add({ targets: mote, y: mote.y - 14, alpha: 0.1, duration: 2800 + index * 390, yoyo: true, repeat: -1 });
  }
}
