const assets = import.meta.glob('./assets/inventory/*.png', { eager: true, import: 'default' });
const images = new Map();
const size = 96;

const reliefs = {
  gui: ['M34 80 32 27 48 9 64 27 64 81 Q48 87 34 80Z',
    'M38 74V30L48 18 58 30V74ZM48 24V72M39 55H57M39 60H57'],
  zhang: ['M26 77 35 65 26 62 35 56 30 51 40 46 56 12 75 18 72 32 49 79 40 85Z',
    'M43 76 67 29 69 22 59 18 43 53 35 57M41 63 48 61M39 69 46 67'],
  jue: ['M67 17A35 35 0 1 0 81 28L65 39A15 15 0 1 1 58 33Z',
    'M61 20A31 31 0 1 0 74 32M59 29A21 21 0 1 0 68 37M29 45q6-10 10-2t-7 6M29 59q10-4 10 4t-8 2M44 70q8-9 12-3t-5 8M61 67q1-10 8-7'],
  cicada: ['M48 10Q62 8 65 24Q75 31 66 50Q62 72 48 86Q34 72 30 50Q21 31 31 24Q34 8 48 10Z',
    'M34 24Q48 30 62 24M32 31Q45 37 48 79Q51 37 64 31M30 38Q37 55 43 67M66 38Q59 55 53 67M33 18H38M58 18H63'],
};

function relief(id) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  const [outline, pattern] = reliefs[id].map(path => new Path2D(path));
  const light = c.createLinearGradient(17, 19, 72, 83);
  light.addColorStop(0, '#f2edbf');
  light.addColorStop(.45, '#a4aa78');
  light.addColorStop(.74, '#687850');
  light.addColorStop(1, '#364734');
  c.fillStyle = light;
  c.fill(outline);
  c.strokeStyle = '#39452f';
  c.lineWidth = 2;
  c.stroke(outline);
  c.clip(outline);
  for (let y = 12; y < 86; y++) for (let x = 20; x < 84; x++) {
    const grain = ((x * 73) ^ (y * 151)) % 47;
    if (grain > 14) continue;
    c.fillStyle = grain < 7 ? '#fff4be26' : '#2631242b';
    c.fillRect(x, y, 1, 1);
  }
  c.strokeStyle = '#516042';
  c.lineWidth = 1.7;
  c.stroke(pattern);
  c.translate(0, -.8);
  c.strokeStyle = '#e2e0aa';
  c.lineWidth = .7;
  c.stroke(pattern);
  return canvas;
}

function engraveSilhouette(context) {
  const pixels = context.getImageData(0, 0, size, size);
  const alpha = new Uint8Array(size * size);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels.data[i * 4 + 3];
  const tone = i => (pixels.data[i * 4] + pixels.data[i * 4 + 1] + pixels.data[i * 4 + 2]) / 3;
  const edges = alpha.map((a, i) => a > 64 && (!(alpha[i - 1] && alpha[i + 1] && alpha[i - size] && alpha[i + size])
    || Math.abs(tone(i - 1) - tone(i + 1)) + Math.abs(tone(i - size) - tone(i + size)) > 40));
  for (let i = 0; i < alpha.length; i++) {
    if (!alpha[i]) continue;
    const luminance = tone(i);
    const highlight = edges[i] ? 84 : luminance * .20;
    pixels.data.set([37 + highlight, 30 + highlight * .83, 21 + highlight * .56, alpha[i]], i * 4);
  }
  context.putImageData(pixels, 0, 0);
}

export async function drawInventoryArt(canvas, id, unlocked = true) {
  const c = canvas.getContext('2d');
  const url = assets[`./assets/inventory/${id}.png`];
  if (url && !images.has(id)) {
    const image = new Image();
    image.src = url;
    images.set(id, image.decode().then(() => image));
  }
  const art = url ? await images.get(id) : relief(id);
  c.clearRect(0, 0, size, size);
  c.drawImage(art, 0, 0);
  if (!unlocked) engraveSilhouette(c);
}
