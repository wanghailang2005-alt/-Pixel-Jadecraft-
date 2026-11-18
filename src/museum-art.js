// Original pixel illustrations, drawn from the documented shapes of the exhibits.
// These are interpretive game illustrations; collection photographs remain at the source links.
const SIZE = 160;
const cache = new Map();
const DEFAULT = ['#153d32', '#2f7154', '#69a875', '#b4d7a1', '#e1e6bc'];
const PALE = ['#4c5342', '#7c8965', '#a8b58a', '#d0d5ae', '#ede8cc'];
const ART_STYLE_VERSION = 2;

function stableSeed(value) {
  let hash = 2166136261;
  for (const character of String(value ?? 'museum')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * The museum illustrations are deterministic interpretive pixel art. Keeping
 * the style profile explicit makes the material treatment auditable without
 * bundling source photographs or an external sprite sheet.
 */
export function museumArtProfile(exhibit = {}) {
  const shape = String(exhibit.shape ?? 'stone');
  const id = String(exhibit.id ?? shape);
  return Object.freeze({
    version: ART_STYLE_VERSION,
    shape,
    seed: stableSeed(id),
    texture: shape === 'stone' ? 'mineral-grain' : 'carved-relief',
    optics: 'pixel-side-light-scatter',
  });
}

function rgb(hex) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex : '#699b73';
  return [1, 3, 5].map(start => parseInt(safe.slice(start, start + 2), 16));
}
function mix(a,b) { return `#${rgb(a).map((value,index)=>Math.round((value+rgb(b)[index])/2).toString(16).padStart(2,'0')).join('')}`; }
function inside(x, y, points) {
  let value = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = points[i], [c, d] = points[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) value = !value;
  }
  return value;
}
function ellipse(x, y, cx, cy, rx, ry) { return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1; }
function pxline(ctx, x0, y0, x1, y1, color, width = 1) {
  ctx.fillStyle = color;
  const scale = ctx.canvas.width / SIZE;
  x0 = Math.round(x0 * scale); y0 = Math.round(y0 * scale); x1 = Math.round(x1 * scale); y1 = Math.round(y1 * scale);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    ctx.fillRect(x0 / scale, y0 / scale, width, width);
    if (x0 === x1 && y0 === y1) break;
    const e = 2 * error;
    if (e >= dy) { error += dy; x0 += sx; }
    if (e <= dx) { error += dx; y0 += sy; }
  }
}
function line(ctx, points, color, width = 1) {
  for (let i = 1; i < points.length; i++) pxline(ctx, ...points[i - 1], ...points[i], color, width);
}
function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  const minY = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
  const maxY = Math.ceil(Math.max(...points.map(p => p[1])));
  for (let y = minY; y < maxY; y++) {
    const xs = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[i], [bx, by] = points[j];
      if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) * (bx - ax) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) ctx.fillRect(Math.ceil(xs[i]), y, Math.floor(xs[i + 1]) - Math.ceil(xs[i]) + 1, 1);
  }
}
function jade(ctx, mask, colors = DEFAULT, tone = () => 0) {
  const resolution = ctx.canvas.width, scale = resolution / SIZE;
  const palette = colors.map(rgb), pixels = ctx.createImageData(resolution, resolution);
  const seed = Number(ctx.__museumSeed) || 0;
  for (let py = 0; py < resolution; py++) for (let px = 0; px < resolution; px++) {
    const x = px / scale, y = py / scale;
    if (!mask(x, y)) continue;
    const edge = !mask(x - 2, y) || !mask(x, y - 2);
    const darkEdge = !mask(x + 2, y) || !mask(x, y + 2);
    const cloud = Math.sin((x + seed % 29) / 17 + Math.sin((y + seed % 37) / 23))
      + Math.cos((y + seed % 31) / 21 - (x + seed % 17) / 31);
    const grain = Math.sin((x * 13 + y * 7 + seed % 101) / 19) * .16;
    const shade = edge ? 3 : darkEdge ? 0 : Math.max(1, Math.min(3, Math.round(1.8 + cloud * .37 + grain + tone(x, y))));
    const index = (py * resolution + px) * 4;
    const color = palette[Math.min(shade, palette.length - 1)];
    pixels.data[index] = color[0]; pixels.data[index + 1] = color[1]; pixels.data[index + 2] = color[2]; pixels.data[index + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
}

function drawPixelMaterialTexture(ctx, exhibit, profile) {
  const palette = Array.isArray(exhibit.palette) && exhibit.palette.length >= 3 ? exhibit.palette : DEFAULT;
  const seed = profile.seed;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  // Sparse 1–2 pixel flecks keep the material readable at the 160px source
  // scale and survive nearest-neighbour enlargement in the observation lens.
  ctx.fillStyle = palette.at(-1) ?? DEFAULT.at(-1);
  ctx.globalAlpha = .28;
  for (let i = 0; i < 28; i++) {
    const x = (seed + i * 47) % 142 + 9;
    const y = ((seed >>> 5) + i * 31) % 142 + 9;
    ctx.fillRect(x, y, i % 3 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
  }
  ctx.fillStyle = palette[0] ?? DEFAULT[0];
  ctx.globalAlpha = .2;
  for (let i = 0; i < 12; i++) {
    const x = (seed + i * 71) % 132 + 14;
    const y = ((seed >>> 7) + i * 53) % 132 + 14;
    line(ctx, [[x, y], [x + (i % 2 ? 4 : -3), y + 2]], palette[0] ?? DEFAULT[0], 1);
  }
  ctx.restore();
}

function drawPixelOpticalLayer(ctx, canvas, exhibit, sideLight) {
  if (!sideLight) return;
  const profile = museumArtProfile(exhibit);
  const fromRight = sideLight === 'right';
  const width = canvas.width, height = canvas.height;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const gradient = ctx.createLinearGradient(fromRight ? width : 0, 0, fromRight ? 0 : width, 0);
  gradient.addColorStop(0, 'rgba(240,224,154,.42)');
  gradient.addColorStop(.2, 'rgba(198,235,167,.18)');
  gradient.addColorStop(.58, 'rgba(16,47,37,0)');
  gradient.addColorStop(1, 'rgba(5,18,18,.26)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  // Break the smooth gradient into a few hard pixel glints and translucent
  // mineral inclusions. This is the same side-light signal at every scale.
  ctx.globalAlpha = .32;
  ctx.fillStyle = '#eff4bd';
  for (let i = 0; i < 18; i++) {
    const y = (profile.seed + i * 37) % Math.max(1, height - 8) + 4;
    const x = fromRight ? width - ((profile.seed >>> 6) + i * 23) % Math.max(1, width / 2) : ((profile.seed >>> 6) + i * 23) % Math.max(1, width / 2);
    ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, i % 3 === 0 ? 4 : 2, 2);
  }
  ctx.globalAlpha = .18;
  ctx.fillStyle = '#b5e1bd';
  for (let i = 0; i < 11; i++) {
    const x = (profile.seed + i * 61) % Math.max(1, width - 5) + 2;
    const y = ((profile.seed >>> 8) + i * 29) % Math.max(1, height - 5) + 2;
    ctx.fillRect(x, y, 2, 3);
  }
  ctx.restore();
}
function artCanvas(exhibit, resolution = SIZE) {
  const profile = museumArtProfile(exhibit);
  const key = `${profile.version}:${resolution}:${exhibit.id ?? exhibit.shape}:${JSON.stringify(exhibit.palette ?? [])}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = resolution;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  c.scale(resolution / SIZE, resolution / SIZE);
  c.__museumSeed = profile.seed;
  const shape = exhibit.shape ?? 'stone';
  const supplied = Array.isArray(exhibit.palette) && exhibit.palette.length >= 3 ? exhibit.palette : null;
  let colors = supplied ? [...supplied].sort((a, b) => rgb(a).reduce((s, n) => s + n, 0) - rgb(b).reduce((s, n) => s + n, 0)) : /cong|bird|armor|seal/.test(shape) ? PALE : DEFAULT;
  if(colors.length===3)colors=[colors[0],mix(colors[0],colors[1]),colors[1],mix(colors[1],colors[2]),colors[2]];
  while (colors.length < 5) colors.push(colors.at(-1));
  const [dark, mid, light, high, cream] = colors;
  if (shape === 'plaque') {
    const outline=[[34,28],[125,28],[132,114],[107,138],[54,138],[27,114]];
    jade(c,(x,y)=>inside(x,y,outline),['#243f39','#467569','#67a99a','#8bc8b3','#c7dec1']);
    line(c,[...outline,outline[0]],'#997947',4);
    for(let y=38;y<128;y+=7)for(let x=39;x<120;x+=7)if(inside(x,y,outline)){
      c.fillStyle=(x+y)%3?'#88c3ae':'#4d8e84';c.fillRect(x,y,5,5);
    }
    line(c,[[40,58],[57,49],[71,59],[80,76],[89,59],[104,49],[120,58]],'#a78b52',5);
    line(c,[[42,84],[56,74],[69,85],[56,97],[42,84]],'#223f38',5);
    line(c,[[91,85],[105,74],[120,84],[106,97],[91,85]],'#223f38',5);
    line(c,[[80,77],[80,113],[60,123],[42,110]],'#a78b52',4);
    line(c,[[80,113],[101,123],[119,110]],'#a78b52',4);
  } else if (shape === 'pig-dragon') {
    const mask=(x,y)=>(ellipse(x,y,80,89,49,54)&&!ellipse(x,y,80,88,18,24))||inside(x,y,[[49,60],[43,30],[56,17],[69,29],[91,24],[110,38],[119,58],[108,73],[84,65]]);
    jade(c,mask,colors);
    line(c,[[50,41],[60,31],[66,45]],dark,2);
    line(c,[[91,43],[102,42],[107,48],[99,51],[91,47]],dark,2);
    line(c,[[107,59],[92,58]],dark,2);line(c,[[103,68],[99,91]],dark,2);
    line(c,[[44,89],[48,113],[66,130],[87,135]],high,3);
    c.fillStyle=dark;c.fillRect(70,38,3,4);
  } else if (shape === 'horn-cup'||shape === 'rhyton') {
    const horn=shape==='horn-cup';
    const outline=horn?[[31,25],[114,25],[107,66],[96,98],[74,126],[51,139],[36,129],[40,111],[54,103],[62,110],[57,121],[69,114],[78,90],[67,59],[40,45]]:[[27,26],[72,33],[96,63],[105,91],[133,95],[143,110],[135,126],[106,129],[88,115],[71,91],[59,69],[33,56]];
    jade(c,(x,y)=>inside(x,y,outline),colors,(x,y)=>Math.sin((x+y)/16)*.7);
    if(horn){
      for(let y=22;y<38;y++)for(let x=29;x<117;x++)if(ellipse(x,y,73,29,43,9)){c.fillStyle=ellipse(x,y,73,27,35,5)?dark:high;c.fillRect(x,y,1,1);}
      for(let y=48;y<100;y+=13)line(c,[[50+y*.1,y],[73,y+7],[99-y*.1,y]],dark,2);
      line(c,[[49,116],[48,128],[59,130],[70,121]],high,2);
    }else{
      line(c,[[30,30],[61,37],[83,63],[90,86]],high,3);
      line(c,[[107,100],[119,89],[126,96],[122,106]],dark,3);
      c.fillStyle=dark;c.fillRect(121,109,5,4);c.fillStyle='#c4a359';c.fillRect(133,119,10,8);
      line(c,[[94,107],[84,118],[78,113],[84,101]],light,4);
    }
  } else if (shape === 'garden-jade') {
    const outline=[[22,127],[19,76],[29,43],[51,25],[95,20],[126,40],[140,78],[132,129],[100,142],[51,140]];
    jade(c,(x,y)=>inside(x,y,outline)&&!ellipse(x,y,81,82,27,36),colors);
    for(const side of [-1,1]){
      const x=81+side*18;
      c.fillStyle=dark;c.fillRect(x-5,66,9,9);c.fillStyle=cream;c.fillRect(x-4,72,8,9);
      polygon(c,[[x-5,81],[x+5,81],[x+10,112],[x-11,112]],light);
      line(c,[[x-5,85],[x-side*14,92],[x-side*19,85]],high,3);
    }
    line(c,[[34,125],[41,94],[38,64],[51,37]],dark,4);
    for(const [x,y] of [[41,53],[53,42],[49,71],[113,47],[120,66]])polygon(c,[[x,y],[x-12,y-7],[x-6,y-13],[x+8,y-10],[x+13,y-3]],high);
    line(c,[[38,124],[115,124]],mid,3);
  } else if (shape === 'stone') {
    const outline = [[32,47],[57,23],[105,29],[133,55],[139,100],[112,132],[61,139],[23,107],[19,77]];
    jade(c, (x,y) => inside(x,y,outline), colors, (x,y) => Math.sin((x-y)/31)*.4);
    polygon(c, [[34,48],[57,27],[105,33],[78,54],[48,83],[27,77]], high);
    polygon(c, [[99,64],[130,58],[135,99],[109,127],[83,130]], mid);
    line(c, [[43,91],[64,69],[95,58],[108,43]], cream, 2);
    line(c, [[40,101],[58,111],[85,107],[107,89]], light, 3);
    // Mineral families get visible, distinct structures instead of recoloured copies.
    if(/agate|chalcedony|malachite|jasper|lapis|turquoise/.test(exhibit.id??'')){
      for(let y=28;y<137;y++)for(let x=23;x<137;x++)if(inside(x,y,outline)){
        const id=exhibit.id;
        if(/agate/.test(id)&&Math.floor(Math.hypot((x-50)*.8,y-72)/7)%3===0){c.fillStyle=high;c.fillRect(x,y,1,1);}
        if(/malachite/.test(id)&&Math.floor(Math.hypot(x-60,(y-82)*.8)/6)%2===0){c.fillStyle=dark;c.fillRect(x,y,1,1);}
        if(/lapis/.test(id)&&(x*71+y*43)%293<3){c.fillStyle='#cfac62';c.fillRect(x,y,2,1);}
        if(/turquoise/.test(id)&&Math.abs(Math.sin(x/17)+Math.cos(y/19+x/37))<.035){c.fillStyle=dark;c.fillRect(x,y,1,2);}
        if(/jasper/.test(id)&&Math.sin(x/13+y/19)+Math.cos(y/11)>1.4){c.fillStyle=mid;c.fillRect(x,y,1,1);}
        if(/chalcedony/.test(id)&&x<65&&y<67&&(x+y)%17===0){c.fillStyle=high;c.fillRect(x,y,2,1);}
      }
    }
  } else if (shape === 'cong') {
    const outline = [[43,32],[92,18],[124,39],[124,124],[76,143],[35,120],[35,43]];
    jade(c,(x,y)=>inside(x,y,outline),colors);
    polygon(c,[[78,53],[123,39],[123,123],[78,141]],mid);
    polygon(c,[[36,43],[78,57],[78,140],[36,120]],light);
    polygon(c,[[43,32],[92,19],[123,39],[77,56],[36,43]],high);
    for(let y=32;y<52;y++)for(let x=57;x<103;x++)if(ellipse(x,y,80,39,22,10)){c.fillStyle=ellipse(x,y,80,37,15,6)?dark:mid;c.fillRect(x,y,1,1);}
    for(const y of [60,82,104,124]) {
      line(c,[[38,y],[77,y+14],[120,y-1]],dark,2);
      line(c,[[41,y+3],[75,y+15],[117,y+1]],high);
    }
    for(const y of [65,87,109]) {
      c.fillStyle=dark;c.fillRect(46,y,6,4);c.fillRect(62,y+5,6,4);
      line(c,[[47,y+7],[54,y+10],[64,y+11]],cream);
      c.fillStyle=light;c.fillRect(87,y+9,6,4);c.fillRect(107,y+2,6,4);
    }
  } else if (shape === 'dragon') {
    const head=[[91,24],[101,20],[109,24],[116,31],[137,37],[140,43],[134,49],[111,47],[106,61],[91,59]];
    const mane=[[96,29],[73,22],[53,10],[63,35],[70,48],[89,49]];
    jade(c,(x,y)=>(ellipse(x,y,77,83,51,60)&&!ellipse(x,y,80,81,29,38)&&!(x>91&&y>60&&y<112))||inside(x,y,head)||inside(x,y,mane),colors);
    line(c,[[98,34],[108,33],[126,41],[135,40]],high,2);
    c.fillStyle=dark;c.fillRect(107,35,4,4);c.fillStyle=cream;c.fillRect(108,35,1,1);
    line(c,[[46,50],[37,70],[38,98],[50,117],[67,127]],high,2);
    line(c,[[92,113],[105,119],[110,127],[104,135]],light,2);
    c.fillStyle=dark;c.fillRect(78,27,3,4);
  } else if (shape === 'cabbage') {
    const leaves=[[58,71],[35,52],[36,28],[46,16],[63,20],[71,11],[85,17],[94,8],[108,17],[116,34],[126,33],[133,50],[119,74],[100,92]];
    const body=[[58,60],[98,65],[111,91],[102,124],[87,145],[66,143],[49,126],[48,94]];
    jade(c,(x,y)=>inside(x,y,leaves)||inside(x,y,body),colors,(x,y)=>y>84?.8:0);
    polygon(c,[[40,29],[47,20],[62,24],[70,48],[69,73],[54,64],[42,47]],mid);
    polygon(c,[[72,17],[82,21],[92,43],[84,71],[77,53]],light);
    polygon(c,[[99,14],[107,20],[113,40],[102,65],[88,83],[92,54]],mid);
    polygon(c,[[119,39],[127,39],[129,52],[116,70],[102,78],[110,57]],dark);
    polygon(c,[[43,36],[49,26],[54,30],[60,47],[64,62],[55,57]],light);
    polygon(c,[[112,41],[117,37],[122,45],[112,61],[101,72]],light);
    polygon(c,[[58,77],[65,83],[66,130],[75,143],[65,139],[52,123],[52,100]],'#dbe0b7');
    polygon(c,[[77,74],[88,74],[97,99],[90,132],[79,144],[72,128]],'#edf0cf');
    for(const points of [[[43,29],[59,47],[74,77]],[[69,23],[78,45],[82,77]],[[103,23],[98,48],[85,82]],[[122,44],[109,64],[92,82]]])line(c,points,high,2);
    for(const y of [39,51,63])line(c,[[50,y],[69,y+8],[77,y+16]],high);
    line(c,[[92,83],[103,65],[113,50]],cream,1);
    line(c,[[70,88],[73,115],[78,136]],'#bacb98',1);
    line(c,[[102,24],[110,19],[119,22],[120,27],[115,30]],dark,2);
    line(c,[[112,21],[115,12]],dark);line(c,[[114,29],[124,34]],dark);
  } else if (shape === 'bird') {
    const body=[[80,30],[96,25],[107,32],[109,43],[101,51],[100,70],[120,81],[132,103],[126,121],[105,128],[88,119],[68,124],[44,138],[22,137],[43,121],[58,100],[59,77],[69,55]];
    const crown=[[79,32],[69,22],[69,11],[76,8],[83,16],[87,8],[94,13],[91,27]];
    jade(c,(x,y)=>inside(x,y,body)||inside(x,y,crown),colors);
    c.fillStyle=dark;c.fillRect(98,35,3,3);line(c,[[103,42],[115,44],[105,47]],dark);
    line(c,[[81,63],[107,82],[117,102],[109,115],[91,111],[73,95],[70,81],[81,70]],dark,2);
    line(c,[[83,75],[103,90],[105,105],[95,103],[82,93]],high,2);
    line(c,[[69,103],[53,122],[36,134]],high,2);
    for(const offset of [0,6,12])line(c,[[88+offset,112],[103+offset,124]],mid);
  } else if (shape === 'armor') {
    const mask=(x,y)=>ellipse(x,y,81,27,15,19)||inside(x,y,[[58,47],[104,47],[117,87],[103,101],[102,145],[83,145],[80,103],[76,145],[55,145],[58,100],[43,89]]);
    jade(c,mask,colors);
    for(let y=15;y<145;y+=9)for(let x=43;x<118;x+=9)if(mask(x+3,y+3)){
      c.fillStyle=(Math.floor(x/9)+Math.floor(y/9))%3===0?high:light;c.fillRect(x,y,7,7);
      c.fillStyle='#a99754';c.fillRect(x+2,y+7,1,2);c.fillRect(x+7,y+2,2,1);
    }
    c.fillStyle=dark;c.fillRect(71,25,3,2);c.fillRect(85,25,3,2);c.fillRect(77,35,6,1);
  } else if (shape === 'basket') {
    const bowl=[[37,87],[126,87],[116,128],[103,140],[57,140],[44,128]];
    jade(c,(x,y)=>inside(x,y,bowl)||(ellipse(x,y,81,71,48,54)&&!ellipse(x,y,81,71,41,48)&&y<89)||ellipse(x,y,79,75,29,23),colors);
    for(const [x,y,r] of [[54,64,13],[79,50,17],[102,65,14],[74,76,12],[103,83,9]]){
      for(let py=y-r;py<y+r;py++)for(let px=x-r;px<x+r;px++)if(ellipse(px,py,x,y,r,r)){c.fillStyle=ellipse(px,py,x,y,r*.4,r*.4)?high:light;c.fillRect(px,py,1,1);}
      line(c,[[x-r+4,y],[x-3,y-4],[x+5,y-2],[x+3,y+5]],high);
    }
    polygon(c,[[35,92],[128,92],[124,99],[39,99]],high);
    for(let y=103;y<132;y+=9)for(let x=49;x<117;x+=10)if(inside(x,y,bowl))polygon(c,[[x,y-3],[x+4,y],[x,y+4],[x-4,y]],dark);
    line(c,[[49,133],[111,133]],high,3);
  } else if (shape === 'vessel') {
    const vessel=[[56,48],[103,48],[104,63],[115,77],[113,118],[98,133],[61,133],[45,119],[43,77],[55,63]];
    jade(c,(x,y)=>inside(x,y,vessel)||inside(x,y,[[65,29],[94,29],[102,45],[57,45]])||ellipse(x,y,80,25,6,7)||(ellipse(x,y,32,81,20,24)&&!ellipse(x,y,32,81,12,16))||(ellipse(x,y,125,81,20,24)&&!ellipse(x,y,125,81,12,16)),colors);
    line(c,[[56,51],[104,51]],high,3);line(c,[[49,116],[65,125],[96,125],[109,115]],high,2);
    for(let x=57;x<104;x+=15)line(c,[[x,76],[x+8,76],[x+8,88],[x,88],[x,101],[x+8,101]],dark,2);
    polygon(c,[[57,131],[65,131],[62,142],[54,142]],mid);polygon(c,[[97,131],[105,131],[108,142],[100,142]],mid);
  } else if (shape === 'screen') {
    jade(c,(x,y)=>x>=18&&x<143&&y>=32&&y<115,colors,(x,y)=>Math.sin(x/27)*.7);
    c.fillStyle='#744c2c';c.fillRect(13,24,135,9);c.fillRect(13,113,135,9);c.fillRect(13,24,7,112);c.fillRect(141,24,7,112);
    c.fillStyle='#bd9860';c.fillRect(18,27,125,2);c.fillRect(18,116,125,2);
    for(let n=0;n<5;n++){
      const x=26+n*24,y=51+(n%2)*20;
      line(c,[[x,y],[x+11,y-8],[x+18,y],[x+12,y+8],[x+2,y+15],[x+4,y+25],[x+17,y+27]],n%2?cream:high,3);
      c.fillStyle=dark;c.fillRect(x+15,y-1,2,2);line(c,[[x+13,y-5],[x+14,y-11]],high);
    }
    c.fillStyle='#9a7041';c.fillRect(8,134,23,7);c.fillRect(131,134,23,7);
  } else if (shape === 'mountain') {
    const outline=[[15,132],[19,96],[34,88],[37,55],[51,67],[62,20],[76,44],[90,14],[101,58],[116,45],[126,76],[141,91],[144,132]];
    jade(c,(x,y)=>inside(x,y,outline),colors,(x,y)=>Math.sin(x/14+y/29)*.5);
    for(const points of [[[62,28],[54,77],[38,111]],[[91,24],[82,78],[104,114]],[[116,56],[109,91],[131,117]]])line(c,points,dark,3);
    for(const points of [[[65,38],[64,70],[51,102]],[[95,47],[99,76],[118,106]]])line(c,points,high,2);
    line(c,[[29,122],[57,111],[72,123],[99,110],[126,126]],high,2);
    for(const [x,y] of [[49,100],[80,95],[112,108]]){c.fillStyle=cream;c.fillRect(x,y,3,4);c.fillRect(x-1,y+4,5,7);line(c,[[x,y+11],[x-2,y+15]],cream);line(c,[[x+2,y+11],[x+4,y+15]],cream);}
    polygon(c,[[10,135],[149,135],[143,144],[17,144]],'#68452e');line(c,[[17,138],[144,138]],'#b78d53',2);
  } else if (shape === 'huang') {
    const outline=[[24,59],[54,65],[80,72],[106,65],[136,59],[132,89],[115,115],[81,134],[46,116],[28,91]];
    jade(c,(x,y)=>inside(x,y,outline)&&!ellipse(x,y,37,76,3,4)&&!ellipse(x,y,122,76,3,4),colors,(x,y)=>Math.sin((x+y)/27)*.4);
    line(c,[[34,91],[52,112],[81,125],[107,112],[125,92]],high,2);
    line(c,[[48,75],[79,83],[111,74]],mid,2);
  } else if (shape === 'fish') {
    jade(c,(x,y)=>ellipse(x,y,73,80,48,31)||inside(x,y,[[108,77],[143,48],[142,113],[108,87]]),colors);
    c.fillStyle=dark;c.fillRect(42,73,5,5);c.fillStyle=cream;c.fillRect(43,73,2,2);
    line(c,[[59,58],[53,77],[59,100]],high,2);
    for(let x=67;x<104;x+=11)line(c,[[x,65],[x+5,72],[x,81],[x+5,90]],high);
  } else if (shape === 'seal') {
    jade(c,(x,y)=>inside(x,y,[[35,88],[91,67],[126,86],[126,125],[69,146],[35,125]])||ellipse(x,y,81,60,24,25),colors);
    polygon(c,[[35,88],[90,70],[126,86],[69,108]],high);polygon(c,[[69,108],[126,86],[126,125],[69,145]],mid);
    line(c,[[44,111],[44,124],[55,128],[55,115]],dark,2);
  } else {
    jade(c,(x,y)=>ellipse(x,y,80,80,55,55)&&!ellipse(x,y,80,80,20,20),colors);
    for(let a=0;a<Math.PI*2;a+=Math.PI/6){const x=80+Math.cos(a)*38,y=80+Math.sin(a)*38;line(c,[[x-5,y-3],[x+3,y-3],[x+3,y+5],[x-2,y+5]],high,2);}
  }
  drawPixelMaterialTexture(c, exhibit, profile);
  cache.set(key,canvas); return canvas;
}

const STUDY_SIZE = 480;
const studyArt = {
  'heritage-jadeite-cabbage': drawStudyCabbage,
  'heritage-cong-king': drawStudyCong,
  'heritage-yu-mountain': drawStudyMountain,
};

// Paint the same paths into the jade color and relief maps. Light direction
// changes the shading of the relief edges without moving the carving.
function studyPainter(ctx, relief) {
  function paint(path, color, depth, width = 0) {
    const shape = new Path2D(path);
    const gray = `rgb(${depth} ${depth} ${depth})`;
    if (width) {
      ctx.strokeStyle = color;
      relief.strokeStyle = gray;
      ctx.lineWidth = relief.lineWidth = width;
      ctx.stroke(shape);
      relief.stroke(shape);
    } else {
      ctx.fillStyle = color;
      relief.fillStyle = gray;
      ctx.fill(shape);
      relief.fill(shape);
    }
  }
  function jade(path, axis, colors, heights) {
    function gradient(context, stops) {
      const fill = context.createLinearGradient(...axis);
      stops.forEach(([at, color]) => fill.addColorStop(at, color));
      return fill;
    }
    const shape = new Path2D(path);
    ctx.fillStyle = gradient(ctx, colors);
    relief.fillStyle = gradient(relief, heights.map(([at, h]) => [at, `rgb(${h} ${h} ${h})`]));
    ctx.fill(shape);
    relief.fill(shape);
  }
  return { paint, jade };
}

function drawStudyCabbage({ paint, jade }) {
  const leaves = [
    { shape: 'M81 116C67 102 61 78 45 69Q33 63 32 54Q26 49 32 42Q29 35 36 30Q35 22 43 23Q49 16 55 24Q64 22 66 34C67 61 83 73 81 116Z', vein: 'M76 97Q65 63 43 34', tips: [[37,42],[38,52],[44,60],[56,29],[60,40],[64,52]], axis: [38,24,91,113], green: '#477c4f' },
    { shape: 'M78 119C83 93 65 79 64 57Q57 52 61 43Q56 36 63 30Q61 23 68 19Q69 11 76 15Q82 12 87 20Q94 21 92 35C102 56 92 85 78 119Z', vein: 'M78 98Q84 66 75 23', tips: [[65,34],[66,46],[72,59],[85,27],[91,39],[90,52]], axis: [85,17,76,110], green: '#669857' },
    { shape: 'M76 122C79 96 86 74 88 57Q85 49 92 43Q89 36 97 30Q96 23 103 21Q106 13 113 17Q121 15 122 23Q131 24 127 33Q133 41 125 47Q129 54 119 59C112 78 98 101 76 122Z', vein: 'M84 97Q101 64 112 24', tips: [[99,31],[94,45],[91,56],[121,30],[122,42],[115,55]], axis: [118,18,78,116], green: '#306943' },
    { shape: 'M72 123C88 108 92 85 106 74Q111 66 119 65Q121 58 128 58Q131 52 137 57Q143 60 139 67Q142 74 133 77Q133 83 125 85C114 101 94 113 72 123Z', vein: 'M89 107Q115 83 134 62', tips: [[113,73],[105,84],[100,95],[132,72],[122,83],[112,94]], axis: [134,55,81,120], green: '#598a53' },
    { shape: 'M80 145C64 148 51 136 50 122Q48 110 54 98Q45 86 47 75Q40 68 43 60Q36 58 37 52Q38 47 44 50Q48 48 53 55C56 66 66 72 72 81C84 96 85 123 80 145Z', vein: 'M72 136Q68 90 44 55', tips: [[45,64],[49,75],[58,87],[52,59],[61,73],[69,86]], axis: [46,52,76,125], green: '#548753' },
    { shape: 'M79 145Q89 149 99 133C105 124 100 113 106 103Q110 94 106 89Q108 82 102 79Q103 73 97 71Q91 66 87 72Q80 74 83 81C71 98 68 132 79 145Z', vein: 'M83 140Q82 108 94 77', tips: [[85,87],[81,98],[77,112],[101,81],[103,91],[97,103]], axis: [94,69,82,131], green: '#79a86a' },
  ];
  for (const { shape, vein, tips, axis, green } of leaves) {
    jade(shape, axis, [[0,'#234d36'],[.22,green],[.48,'#8db273'],[.66,'#c9d8a7'],[.83,'#e9e9cf'],[1,'#a6bb90']], [[0,65],[.24,126],[.46,104],[.69,170],[1,204]]);
    paint(shape, '#cfdfae50', 108, .65);
    paint(vein, '#d8e3b5b5', 184, 1.5);
    tips.forEach(([x,y], i) => {
      const [a,b] = tips[(i + 3) % 6];
      const endX = x * .35 + a * .65, endY = y + 11;
      paint(`M${x} ${y}Q${(x + endX) / 2} ${b + 3} ${endX} ${endY}`, '#e2e6b086', 150, .67);
      paint(`M${x + 1} ${y + 2}q1 3 4 5`, '#254a35a0', 86, .7);
    });
  }
  paint('M60 112q5 4 3 11l5 7m22-27q-4 8-3 15l-4 7', '#78946b9c', 142, .65);
  for (const [x,y,s] of [[109,31,1],[74,23,.58]]) {
    paint(`M${x-6*s} ${y+3*s}q${8*s} ${-8*s} ${14*s} ${-2*s}q${-2*s} ${4*s} ${-14*s} ${2*s}Z`, '#203f2b', 186);
    paint(`M${x-4*s} ${y+2*s}l${7*s} ${-3*s}m${-4*s} ${4*s}l${-4*s} ${5*s} ${-4*s} 0m${13*s} ${-7*s}l${4*s} ${-5*s} ${4*s} ${-2*s}`, '#78904f', 213, .85);
  }
}

function drawStudyCong({ paint, jade }) {
  jade('M33 116L79 98 128 116 127 125Q81 150 34 126Z', [32,121,130,122], [[0,'#949065'],[.47,'#d4c89b'],[.55,'#827b57'],[1,'#655e43']], [[0,85],[.48,163],[1,80]]);
  jade('M27 46L80 22 133 46 133 111 80 138 27 111Z', [27,70,133,70], [[0,'#8c8860'],[.49,'#d2c397'],[.51,'#9c9369'],[1,'#797251']], [[0,101],[.49,192],[.51,188],[1,105]]);
  paint('M27 46L80 69 133 46 80 22Z', '#c7bb90', 194);
  jade('M47 32C47 15 113 15 113 32L113 47C111 66 49 66 47 47Z', [47,40,113,39], [[0,'#8f8b62'],[.37,'#dbcda0'],[.64,'#cabe91'],[1,'#827951']], [[0,156],[.5,213],[1,153]]);
  paint('M47 32C47 12 113 12 113 32S47 53 47 32Z', '#e0d3a8', 221);
  jade('M57 32C57 18 103 18 103 32S57 47 57 32Z', [80,20,80,44], [[0,'#625b42'],[.35,'#302f28'],[.62,'#403b2c'],[1,'#a0966b']], [[0,147],[.5,36],[1,163]]);
  paint('M58 33C65 43 95 43 102 33', '#e9d9a47a', 187, .8);
  for (const y of [58, 90, 111]) {
    paint(`M28 ${y}L80 ${y+22} 132 ${y}`, '#655b40', 91, 1.45);
    paint(`M29 ${y+2}L80 ${y+24} 131 ${y+2}`, '#dacf9b', 164, .8);
  }
  for (const side of [-1, 1]) {
    const x = n => 80 + side * n;
    const y = (n, offset) => 82 + offset - n * .43;
    const point = (n, offset) => `${x(n)} ${y(n,offset)}`;
    paint(`M${point(2,-8)}L${point(8,-15)} ${point(20,-14)} ${point(27,-7)} ${point(30,0)} ${point(23,6)} ${point(17,10)} ${point(3,9)}Z`, side < 0 ? '#b8aa7c' : '#a99d72', 176);
    paint(`M${point(3,-8)}L${point(9,-13)} ${point(20,-12)} ${point(26,-7)}M${point(4,4)}L${point(10,7)} ${point(21,7)} ${point(29,0)}`, '#695d40', 119, 1.05);
    paint(`M${point(6,-2)}Q${point(15,-12)} ${point(25,-4)}Q${point(18,4)} ${point(6,-2)}Z`, '#ded1a1', 208);
    paint(`M${point(17,-4)}l${side*2} -1 1 2 -2 1Z`, '#524a36', 92);
    paint(`M${point(1,1)}L${point(5,4)} ${point(5,8)} ${point(1,10)}M${point(2,12)}L${point(12,12)} ${point(16,9)}`, '#6a5b41', 112, 1);
    for (let n = 9; n < 25; n += 2.4) {
      paint(`M${point(n,-13)}l${side*2} -5M${point(n,7)}l${side*1.6} 2`, '#786b4d', 127, .48);
    }
    for (const offset of [24, 43]) {
      paint(`M${point(3,offset+3)}Q${point(12,offset-4)} ${point(21,offset+2)}Q${point(14,offset+9)} ${point(3,offset+3)}Z`, '#b7a779', 175);
      paint(`M${point(4,offset+3)}Q${point(12,offset-2)} ${point(19,offset+2)}Q${point(13,offset+7)} ${point(4,offset+3)}M${point(9,offset+3)}L${point(14,offset+3)}`, '#6e6346', 110, .75);
    }
  }
}

function drawStudyMountain({ paint, jade }) {
  const rock = (path, axis, dark, light, depth) => jade(path, axis, [[0,light],[.31,'#91a18a'],[.75,dark],[1,'#344e44']], [[0,depth],[.38,depth+24],[.77,depth-25],[1,depth-47]]);
  const silhouette = 'M16 120L18 109 25 99 26 81 33 74 36 61 42 56 44 40 53 34 58 22 63 18 70 24 74 36 81 40 85 30 91 28 98 40 107 39 111 48 119 51 123 66 133 72 135 87 143 94 141 108 148 120 143 133Q83 150 19 135Z';
  rock(silhouette, [36,28,142,123], '#526958', '#b8c4ad', 122);
  rock('M19 122L27 98 31 79 45 69 45 51 57 43 63 22 71 43 68 59 58 76 62 88 51 99 47 117 36 133Z', [42,53,66,80], '#456457', '#c0cbb2', 174);
  rock('M63 91L73 74 74 56 85 47 91 31 98 45 109 43 118 55 113 67 120 77 105 91 81 101Z', [78,44,110,102], '#536e5a', '#b5bfa4', 126);
  rock('M93 135L102 122 100 108 113 100 111 88 124 76 130 81 130 96 142 102 139 112 146 122 140 132 121 138Z', [103,104,146,114], '#48685a', '#aeba9d', 172);
  rock('M18 128L27 116 42 112 53 115 61 110 69 117 68 125 84 127 90 138 55 143 20 136Z', [35,110,73,145], '#536e5d', '#bec5a7', 178);
  const faces = [
    { x:54, y:50, rows:9, drift:-2.8, span:14 }, { x:86, y:46, rows:11, drift:-.25, span:16 },
    { x:111, y:56, rows:8, drift:1.15, span:12 }, { x:122, y:86, rows:10, drift:.55, span:15 },
    { x:30, y:118, rows:4, drift:-1, span:23 },
  ];
  for (const {x, y, rows, drift, span} of faces) {
    for (let i = 0; i < rows; i++) {
      const a = x + drift*i + Math.sin(i*3)*2, b = y + i*3.7;
      const path = `M${a} ${b}q${span*.32} -3 ${span*.5} -1l${span*.27} -1.4 ${span*.23} .8`;
      paint(path, '#40594d98', 105+i%3*9, .8+i%3*.29);
      paint(`M${a+2} ${b-1.3}l${span*.34} -1.8 ${span*.31} .6`, '#c4ceb190', 162, .54);
    }
  }
  jade('M96 61Q86 70 95 79Q105 89 89 97Q75 103 80 111Q83 120 67 127L85 135Q104 122 95 111Q91 105 106 97Q118 88 106 79Q98 72 104 64Z', [75,112,108,101], [[0,'#6f9683'],[.45,'#a8bc9d'],[1,'#486d61']], [[0,95],[.49,81],[1,109]]);
  for (const path of ['M99 65q-7 6 0 14t0 14','M102 88q-1 5-10 8m7-2-6 5','M89 100q-11 5-5 12t-6 13','M94 104q-5 4-1 9t-6 14','M71 129q7-4 11-3m-5 6 9-2']) paint(path, '#d0d9bbad', 109, .8);
  paint('M34 108q10-6 26-5l14-7Q82 92 90 92M101 119q9-5 29-2', '#b7bd9a', 155, 1.75);
  for (const [x,y,s] of [[53,91,1],[65,84,.82],[113,104,.9]]) {
    paint(`M${x-s} ${y+8*s}l${-s} ${4*s}m${3*s} ${-4*s}l${2*s} ${3*s}m${-s} ${-10*s}l${4*s} ${s} ${2*s} ${-3*s}m${-7*s} ${s}l${-3*s} ${3*s}`, '#c6ceb0', 199, 1.4*s);
    paint(`M${x-2*s} ${y+s}q${2*s} ${-2*s} ${4*s} 0l${s} ${6*s} -${5*s} ${s}Z`, '#a8b895', 203);
    paint(`M${x-2*s} ${y-2*s}q0 ${-3*s} ${2*s} ${-3*s}t${s} ${4*s}q${-2*s} ${2*s} ${-3*s} ${-s}Z`, '#d7d7b2', 218);
    paint(`M${x+3*s} ${y-6*s}l${4*s} ${10*s}m${-9*s} ${s}l${4*s} ${-s}`, '#5e745b', 112, .64);
  }
  for (const [x,y,s] of [[37,91,1],[73,68,.75],[129,115,1.15],[29,127,.7]]) {
    paint(`M${x} ${y}q${-2*s} ${-5*s} ${s} ${-13*s}m${-s} ${7*s}l${-5*s} ${-4*s}m${5*s} ${2*s}l${5*s} ${-4*s}`, '#4d6850', 147, 1.25*s);
    paint(`M${x-8*s} ${y-10*s}l${5*s} ${-4*s} ${4*s} ${s} ${5*s} ${-3*s} ${4*s} ${3*s}m${-7*s} ${5*s}l${7*s} ${-3*s}`, '#859e7d', 193, 1.55*s);
  }
}

function studyCanvas(exhibit, sideLight) {
  const draw = studyArt[exhibit.id];
  const light = sideLight === 'right' ? 1 : sideLight ? -1 : 0;
  const key = `study:${exhibit.id}:${light}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  const heightMap = document.createElement('canvas');
  canvas.width = canvas.height = heightMap.width = heightMap.height = STUDY_SIZE;
  const ctx = canvas.getContext('2d');
  const relief = heightMap.getContext('2d');
  ctx.scale(3, 3);
  relief.scale(3, 3);
  ctx.lineJoin = ctx.lineCap = relief.lineJoin = relief.lineCap = 'round';
  if (draw) draw(studyPainter(ctx, relief));
  else ctx.drawImage(artCanvas(exhibit, STUDY_SIZE), 0, 0, SIZE, SIZE);
  const pixels = ctx.getImageData(0, 0, STUDY_SIZE, STUDY_SIZE);
  const heights = draw ? relief.getImageData(0, 0, STUDY_SIZE, STUDY_SIZE).data : new Uint8ClampedArray(pixels.data);
  if (!draw) {
    // The fine raster carvings record incisions in their dark strokes.
    for (let i = 0; i < heights.length; i += 4) heights[i] = 82 + heights[i + 1] * .55;
  }
  const seed = museumArtProfile(exhibit).seed % 307;
  for (let y = 2; y < STUDY_SIZE - 2; y++) {
    for (let x = 2; x < STUDY_SIZE - 2; x++) {
      const i = (y * STUDY_SIZE + x) * 4;
      if (!pixels.data[i + 3]) continue;
      const heightAt = offset => heights[i + offset] * heights[i + offset + 3] / 255;
      const dx = (heightAt(8) - heightAt(-8)) / 88;
      const dy = (heightAt(STUDY_SIZE * 8) - heightAt(-STUDY_SIZE * 8)) / 88;
      const normal = Math.hypot(1, dx, dy);
      const grain = ((x * 73 ^ y * 151 ^ seed) % 19 - 9) * .31;
      const cloud = Math.sin(x * .033 + Math.sin(y * .055) + seed) * Math.cos(y * .028 - x * .013) * 5;
      const diffuse = light ? (-light * dx * .93 + dy * .19 + .38) / normal - .38 : (dx * .3 + dy * .45 + .84) / normal - .84;
      const shade = diffuse * (light ? 67 : 35) + grain + cloud + (light ? (x / STUDY_SIZE - .5) * light * 44 : 0);
      pixels.data[i] += shade;
      pixels.data[i + 1] += shade * .93;
      pixels.data[i + 2] += shade * .73;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  cache.set(key, canvas);
  return canvas;
}

export function drawMuseumArtifact(canvas, exhibit, { backdrop = false, light = false, sideLight = false } = {}) {
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  if(backdrop){c.fillStyle=light?'#29473e':'#101f20';c.fillRect(0,0,canvas.width,canvas.height);}
  const size = Math.min(canvas.width, canvas.height);
  const detailed = size >= STUDY_SIZE;
  const art = detailed ? studyCanvas(exhibit, sideLight) : artCanvas(exhibit);
  c.drawImage(art, (canvas.width-size)/2, (canvas.height-size)/2, size, size);
  if (!detailed) drawPixelOpticalLayer(c, canvas, exhibit, sideLight);
}

export const MUSEUM_CASE_POSITIONS = [
  { x:123,y:139 },{ x:239,y:119 },{ x:356,y:139 },
  { x:123,y:221 },{ x:239,y:201 },{ x:356,y:221 },
];
export function museumCasePositions(count) {
  const order=count===1?[1]:count===2?[0,2]:count===3?[0,1,2]:count===4?[0,2,3,5]:[0,1,2,3,4,5];
  return order.map(index=>MUSEUM_CASE_POSITIONS[index]);
}

export function drawMuseumRoom(canvas, exhibits, roomId='heritage') {
  const layer=document.createElement('canvas');layer.width=480;layer.height=280;
  const c=layer.getContext('2d');c.imageSmoothingEnabled=false;
  c.fillStyle='#101817';c.fillRect(0,0,480,280);
  polygon(c,[[8,47],[240,5],[472,47],[472,174],[240,268],[8,174]],'#2a2e2b');
  polygon(c,[[8,47],[240,5],[240,111],[8,181]],'#42423e');
  polygon(c,[[240,5],[472,47],[472,181],[240,111]],'#34343a');
  for(let y=18;y<171;y+=16) {
    line(c,[[10,y+35],[238,y-7]],'#1c2623',2);line(c,[[242,y-7],[470,y+35]],'#192320',2);
    for(let x=12+(Math.floor(y/16)%2)*22;x<239;x+=44)line(c,[[x,y+33-x*.18],[x,y+47-x*.18]],'#232e29');
    for(let x=242+(Math.floor(y/16)%2)*22;x<470;x+=44)line(c,[[x,y-51+x*.18],[x,y-37+x*.18]],'#17231f');
  }
  // Irregular highlights and mortar give the reference's stone masonry depth.
  for(let y=42;y<160;y+=16)for(let x=21;x<455;x+=38){
    const wallY=x<238?y+32-x*.18:y-51+x*.18;
    if(wallY<50||wallY>159)continue;
    c.fillStyle=(x+y)%3?'#626055':'#50514c';c.fillRect(x,Math.round(wallY)+1,23,1);
    c.fillStyle='#252b2c';c.fillRect(x+4,Math.round(wallY)+11,17,2);
  }
  const tile=(a,b)=>[240+(a-b)*27,106+(a+b)*11];
  for(let a=0;a<9;a++)for(let b=0;b<9;b++){
    const p=tile(a,b);polygon(c,[p,tile(a+1,b),tile(a+1,b+1),tile(a,b+1)],['#4b5344','#666143','#3d4f46','#6f674a'][(a*3+b*7)%4]);
    line(c,[p,tile(a+1,b),tile(a+1,b+1)],'#28362d');
    line(c,[[p[0]+2,p[1]+3],[p[0]+23,p[1]+11]],'#788067');
    if((a+b)%3===0)line(c,[[p[0]-9,p[1]+14],[p[0]+2,p[1]+16],[p[0]+9,p[1]+13]],'#424e40');
  }
  polygon(c,[[4,43],[240,0],[476,43],[470,51],[240,11],[10,52]],'#704b31');
  line(c,[[10,45],[240,3],[470,45]],'#b18551',2);
  for(const [x,y] of [[10,48],[233,9],[465,48]]) {
    c.fillStyle='#4d3528';c.fillRect(x,y,10,128);c.fillStyle='#9b7044';c.fillRect(x+2,y,3,123);c.fillStyle='#68492f';c.fillRect(x-2,y+118,15,10);
  }
  for(const [x,y] of [[39,71],[102,51],[166,31]]) {
    const arch=[[x,y+10],[x+4,y],[x+11,y-9],[x+22,y-16],[x+32,y-14],[x+41,y-7],[x+44,y+4],[x+44,y+58],[x,y+72]];
    polygon(c,arch,'#929789');line(c,[...arch,arch[0]],'#1b2528',2);
    const pane=[[x+5,y+13],[x+8,y+3],[x+15,y-5],[x+23,y-10],[x+31,y-9],[x+37,y-4],[x+39,y+5],[x+39,y+54],[x+5,y+65]];
    polygon(c,pane,'#b7d8cf');
    polygon(c,[[x+5,y+36],[x+17,y+24],[x+25,y+31],[x+39,y+19],[x+39,y+54],[x+5,y+65]],'#537e89');
    polygon(c,[[x+5,y+48],[x+17,y+43],[x+29,y+48],[x+39,y+36],[x+39,y+54],[x+5,y+65]],'#395465');
    line(c,[[x+22,y-10],[x+22,y+58]],'#352923',3);line(c,[[x+6,y+22],[x+39,y+12]],'#352923',3);
    line(c,[[x+2,y+73],[x+45,y+59]],'#9d9270',4);
    for(let n=0;n<4;n++)line(c,[[x+1,y+18+n*13],[x+5,y+17+n*13]],'#303b3c',2);
  }
  for(const [x,y] of [[299,35],[399,55]]){
    polygon(c,[[x,y],[x+49,y+10],[x+49,y+37],[x,y+28]],'#513925');
    line(c,[[x+3,y+3],[x+46,y+12],[x+46,y+33],[x+3,y+25],[x+3,y+3]],'#ae8250');
    c.save();c.translate(x+6,y+7);c.transform(1,.2,0,1,0,0);c.font='10px "Fusion Pixel",monospace';c.fillStyle='#ecd6a0';c.fillText(x===299?'玉文化':'听玉说',0,13);c.restore();
  }
  for(const [x,y] of [[36,111],[214,81],[432,119]]){
    c.fillStyle='#262422';c.fillRect(x-2,y,5,13);c.fillRect(x-4,y+7,9,3);
    c.fillStyle='#b46932';c.fillRect(x-5,y-8,11,11);c.fillStyle='#dfad53';c.fillRect(x-3,y-12,7,12);c.fillStyle='#ffe3a0';c.fillRect(x-1,y-14,3,12);
  }
  const positions=museumCasePositions(exhibits.length);
  exhibits.slice(0,6).forEach((exhibit,index)=>{
    const {x,y}=positions[index];
    polygon(c,[[x-34,y+15],[x,y+28],[x+38,y+13],[x+4,y]],'#28382c');
    polygon(c,[[x-26,y-3],[x,y+6],[x+28,y-4],[x+28,y+17],[x,y+27],[x-26,y+17]],'#513930');
    polygon(c,[[x-26,y-3],[x,y-14],[x+28,y-4],[x,y+7]],'#a17e50');
    line(c,[[x-26,y+1],[x,y+11],[x+27,y+1]],'#c6a16a');
    line(c,[[x-24,y+5],[x-2,y+14],[x-2,y+22],[x-24,y+13],[x-24,y+5]],'#86634a');
    line(c,[[x+3,y+14],[x+24,y+6],[x+24,y+13],[x+3,y+21]],'#71523f');
    c.fillStyle='#c7ab69';c.fillRect(x-13,y+12,12,4);
    c.drawImage(exhibit.artworkCanvas ?? artCanvas(exhibit),x-27,y-61,54,58);
    line(c,[[x-28,y-58],[x,y-70],[x+29,y-59],[x+29,y-5],[x,y+6],[x-28,y-5],[x-28,y-58],[x,y-46],[x+29,y-59]],'#9bbdb0');
    line(c,[[x,y-46],[x,y+6]],'#b0dfd1');
    c.fillStyle='#b6e4ce18';polygon(c,[[x-26,y-55],[x-16,y-51],[x-16,y-11],[x-26,y-7]],'#779d8b33');
  });
  if(exhibits.length){
    // Visitors stand in the aisles, leaving every showcase hit target clear.
    for(const [x,y,coat] of [[176,196,'#bd9c6c'],[300,251,'#73969b']]){
      polygon(c,[[x-11,y+1],[x,y-3],[x+12,y+1],[x,y+6]],'#263b36');
      c.fillStyle='#282625';c.fillRect(x-6,y-13,5,15);c.fillRect(x+3,y-13,5,15);
      c.fillStyle='#4b3828';c.fillRect(x-8,y,7,3);c.fillRect(x+2,y+1,8,3);
      c.fillStyle='#302d29';c.fillRect(x-9,y-34,18,25);
      c.fillStyle=coat;c.fillRect(x-7,y-33,14,21);c.fillRect(x-11,y-29,5,14);
      c.fillStyle='#d7b082';c.fillRect(x-5,y-47,12,13);c.fillRect(x-13,y-17,5,5);
      c.fillStyle='#362c28';c.fillRect(x-7,y-50,14,7);c.fillRect(x-8,y-45,5,9);
      c.fillStyle='#e2be90';c.fillRect(x+5,y-43,4,5);
      line(c,[[x+8,y-29],[x+14,y-35],[x+16,y-42]],'#d7b082',4);
      c.fillStyle='#725b3a';c.fillRect(x-7,y-17,14,3);
    }
  }
  if(roomId==='studio'&&!exhibits.length){
    polygon(c,[[181,165],[239,145],[300,165],[240,187]],'#9b794e');polygon(c,[[181,165],[240,187],[300,165],[300,179],[240,202],[181,181]],'#63472f');
    c.fillStyle='#3b3025';c.fillRect(188,180,7,27);c.fillRect(287,180,7,27);
  }
  const dest=canvas.getContext('2d');dest.imageSmoothingEnabled=false;dest.clearRect(0,0,canvas.width,canvas.height);dest.drawImage(layer,0,0,canvas.width,canvas.height);
}
