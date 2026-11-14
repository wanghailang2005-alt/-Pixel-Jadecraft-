// Original pixel illustrations, drawn from the documented shapes of the exhibits.
// These are interpretive game illustrations; collection photographs remain at the source links.
const SIZE = 160;
const cache = new Map();
const DEFAULT = ['#153d32', '#2f7154', '#69a875', '#b4d7a1', '#e1e6bc'];
const PALE = ['#4c5342', '#7c8965', '#a8b58a', '#d0d5ae', '#ede8cc'];

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
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, width, width);
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
  const palette = colors.map(rgb), pixels = ctx.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (!mask(x, y)) continue;
    const edge = !mask(x - 2, y) || !mask(x, y - 2);
    const darkEdge = !mask(x + 2, y) || !mask(x, y + 2);
    const cloud = Math.sin(x / 17 + Math.sin(y / 23)) + Math.cos(y / 21 - x / 31);
    const shade = edge ? 3 : darkEdge ? 0 : Math.max(1, Math.min(3, Math.round(1.8 + cloud * .37 + tone(x, y))));
    const index = (y * SIZE + x) * 4;
    const color = palette[Math.min(shade, palette.length - 1)];
    pixels.data[index] = color[0]; pixels.data[index + 1] = color[1]; pixels.data[index + 2] = color[2]; pixels.data[index + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
}
function artCanvas(exhibit) {
  const key = `${exhibit.id ?? exhibit.shape}:${JSON.stringify(exhibit.palette ?? [])}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
  const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false;
  const shape = exhibit.shape ?? 'stone';
  const supplied = Array.isArray(exhibit.palette) && exhibit.palette.length >= 3 ? exhibit.palette : null;
  let colors = supplied ? [...supplied].sort((a, b) => rgb(a).reduce((s, n) => s + n, 0) - rgb(b).reduce((s, n) => s + n, 0)) : /cong|bird|armor|seal/.test(shape) ? PALE : DEFAULT;
  if(colors.length===3)colors=[colors[0],mix(colors[0],colors[1]),colors[1],mix(colors[1],colors[2]),colors[2]];
  while (colors.length < 5) colors.push(colors.at(-1));
  const [dark, mid, light, high, cream] = colors;
  if (shape === 'stone') {
    const outline = [[32,47],[57,23],[105,29],[133,55],[139,100],[112,132],[61,139],[23,107],[19,77]];
    jade(c, (x,y) => inside(x,y,outline), colors, (x,y) => Math.sin((x-y)/31)*.4);
    polygon(c, [[34,48],[57,27],[105,33],[78,54],[48,83],[27,77]], high);
    polygon(c, [[99,64],[130,58],[135,99],[109,127],[83,130]], mid);
    line(c, [[43,91],[64,69],[95,58],[108,43]], cream, 2);
    line(c, [[40,101],[58,111],[85,107],[107,89]], light, 3);
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
  cache.set(key,canvas); return canvas;
}

export function drawMuseumArtifact(canvas, exhibit, { backdrop = false, light = false } = {}) {
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  if(backdrop){c.fillStyle=light?'#29473e':'#101f20';c.fillRect(0,0,canvas.width,canvas.height);}
  const size=Math.min(canvas.width,canvas.height);c.drawImage(artCanvas(exhibit),(canvas.width-size)/2,(canvas.height-size)/2,size,size);
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
  polygon(c,[[8,47],[240,5],[240,111],[8,181]],'#41423a');
  polygon(c,[[240,5],[472,47],[472,181],[240,111]],'#303630');
  for(let y=18;y<171;y+=16) {
    line(c,[[10,y+35],[238,y-7]],'#1c2623',2);line(c,[[242,y-7],[470,y+35]],'#192320',2);
    for(let x=12+(Math.floor(y/16)%2)*22;x<239;x+=44)line(c,[[x,y+33-x*.18],[x,y+47-x*.18]],'#232e29');
    for(let x=242+(Math.floor(y/16)%2)*22;x<470;x+=44)line(c,[[x,y-51+x*.18],[x,y-37+x*.18]],'#17231f');
  }
  const tile=(a,b)=>[240+(a-b)*27,106+(a+b)*11];
  for(let a=0;a<9;a++)for(let b=0;b<9;b++){
    const p=tile(a,b);polygon(c,[p,tile(a+1,b),tile(a+1,b+1),tile(a,b+1)],['#4b5140','#555944','#454c3c','#626044'][(a*3+b*7)%4]);
    line(c,[p,tile(a+1,b),tile(a+1,b+1)],'#28362d');
  }
  polygon(c,[[4,43],[240,0],[476,43],[470,51],[240,11],[10,52]],'#704b31');
  line(c,[[10,45],[240,3],[470,45]],'#b18551',2);
  for(const [x,y] of [[10,48],[233,9],[465,48]]) {
    c.fillStyle='#4d3528';c.fillRect(x,y,10,128);c.fillStyle='#9b7044';c.fillRect(x+2,y,3,123);c.fillStyle='#68492f';c.fillRect(x-2,y+118,15,10);
  }
  for(const [x,y] of [[64,49],[151,33]]) {
    polygon(c,[[x,y],[x+43,y-8],[x+43,y+54],[x,y+67]],'#182a2b');
    polygon(c,[[x+4,y+3],[x+39,y-3],[x+39,y+49],[x+4,y+59]],'#7faaa5');
    polygon(c,[[x+4,y+39],[x+15,y+20],[x+24,y+37],[x+39,y+19],[x+39,y+49],[x+4,y+59]],'#527e7c');
    line(c,[[x+20,y],[x+20,y+54]],'#392f25',3);line(c,[[x+2,y+25],[x+40,y+17]],'#392f25',3);
    line(c,[[x-2,y+68],[x+44,y+55]],'#9d9270',3);
  }
  for(const [x,y] of [[299,35],[399,55]]){
    polygon(c,[[x,y],[x+49,y+10],[x+49,y+37],[x,y+28]],'#513925');
    line(c,[[x+3,y+3],[x+46,y+12],[x+46,y+33],[x+3,y+25],[x+3,y+3]],'#ae8250');
    for(let i=0;i<4;i++){c.fillStyle='#c7ad71';c.fillRect(x+10+i*8,y+11+i,3,10);}
  }
  for(const [x,y] of [[36,111],[214,81],[432,119]]){
    c.fillStyle='#392c20';c.fillRect(x-2,y,5,13);c.fillStyle='#9f6935';c.fillRect(x-5,y-10,11,13);c.fillStyle='#dfad53';c.fillRect(x-3,y-8,7,9);c.fillStyle='#ffe3a0';c.fillRect(x-1,y-7,3,7);
  }
  const positions=museumCasePositions(exhibits.length);
  exhibits.slice(0,6).forEach((exhibit,index)=>{
    const {x,y}=positions[index];
    polygon(c,[[x-34,y+15],[x,y+28],[x+38,y+13],[x+4,y]],'#28382c');
    polygon(c,[[x-26,y-3],[x,y+6],[x+28,y-4],[x+28,y+17],[x,y+27],[x-26,y+17]],'#5a3e2d');
    polygon(c,[[x-26,y-3],[x,y-14],[x+28,y-4],[x,y+7]],'#a17e50');
    line(c,[[x-26,y+1],[x,y+11],[x+27,y+1]],'#c6a16a');
    c.fillStyle='#c7ab69';c.fillRect(x-13,y+12,12,4);
    c.drawImage(exhibit.artworkCanvas ?? artCanvas(exhibit),x-27,y-61,54,58);
    line(c,[[x-28,y-58],[x,y-70],[x+29,y-59],[x+29,y-5],[x,y+6],[x-28,y-5],[x-28,y-58],[x,y-46],[x+29,y-59]],'#9bbdb0');
    line(c,[[x,y-46],[x,y+6]],'#789b90');
    c.fillStyle='#b6e4ce18';polygon(c,[[x-26,y-55],[x-16,y-51],[x-16,y-11],[x-26,y-7]],'#779d8b33');
  });
  if(roomId==='studio'&&!exhibits.length){
    polygon(c,[[181,165],[239,145],[300,165],[240,187]],'#9b794e');polygon(c,[[181,165],[240,187],[300,165],[300,179],[240,202],[181,181]],'#63472f');
    c.fillStyle='#3b3025';c.fillRect(188,180,7,27);c.fillRect(287,180,7,27);
  }
  const dest=canvas.getContext('2d');dest.imageSmoothingEnabled=false;dest.clearRect(0,0,canvas.width,canvas.height);dest.drawImage(layer,0,0,canvas.width,canvas.height);
}
