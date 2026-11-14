import { getCraftSurface } from './craft-model.js';

const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
/** One renderer for the workbench, collection, exhibition and downloaded artwork. */
export function drawArtisanPiece(context, draft, { x=0, y=0, size=320, light=-.65, guide=false, raw=false, design=false } = {}) {
  const surface = getCraftSurface(draft), n=surface.size;
  const texture = document.createElement('canvas'); texture.width=texture.height=n;
  const tc=texture.getContext('2d'), data=tc.createImageData(n,n);
  const exists = i => i>=0 && i<n*n && (raw ? surface.original[i] : surface.base[i]);
  for(let py=0;py<n;py++) for(let px=0;px<n;px++) {
    const i=py*n+px; if(!exists(i)) continue;
    const h=raw?5:surface.height[i];
    const left=px>0&&exists(i-1)?surface.height[i-1]:0;
    const top=py>0&&exists(i-n)?surface.height[i-n]:0;
    const right=px<n-1&&exists(i+1)?surface.height[i+1]:0;
    const bottom=py<n-1&&exists(i+n)?surface.height[i+n]:0;
    const edge=left===0||top===0||right===0||bottom===0;
    const rgb=surface.colors[i].match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
    const rough=raw?3:surface.roughness[i];
    let shade=(left-right)*light*7+(top-bottom)*-4 + (px/n+py/n<.8?9:-4);
    if(edge) shade+=px<n*.45&&py<n*.65?22:-29;
    if(!raw && surface.carve[i]) shade-=26+surface.carve[i]*8;
    if(!raw && surface.carve[i] && py>0&&!surface.carve[i-n]) shade+=15;
    if(!raw && rough===0) shade+=Math.max(0,1-Math.hypot(px/n-(.5+light*.2),py/n-.35)*3)*62;
    if(rough===3) shade-=13;
    if(design && !surface.target[i]) shade-=42;
    for(let c=0;c<3;c++) data.data[i*4+c]=clamp(rgb[c]+shade+(c===0&&rough===3?7:0));
    data.data[i*4+3]=255;
  }
  tc.putImageData(data,0,0);
  context.save(); context.imageSmoothingEnabled=false;
  context.globalAlpha=.3; context.drawImage(texture,x+size*.022,y+size*.035,size,size);
  context.globalAlpha=1; context.drawImage(texture,x,y,size,size);
  if(guide) {
    const scale=size/n; context.fillStyle='#f0dc9c';
    if(draft.stage==='shape'||design) {
      for(let py=1;py<n-1;py++) for(let px=1;px<n-1;px++) {
        const i=py*n+px;
        if(surface.target[i]&&(!surface.target[i-1]||!surface.target[i+1]||!surface.target[i-n]||!surface.target[i+n])&&(px+py)%3) context.fillRect(x+px*scale,y+py*scale,Math.max(1,scale*.5),Math.max(1,scale*.5));
      }
    }
    if(design) {
      context.globalAlpha=.92;
      for(const path of surface.guidePaths) for(let index=1;index<path.length;index++) {
        const from=path[index-1],to=path[index],steps=Math.max(1,Math.ceil(Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))*2));
        for(let step=0;step<=steps;step++) {
          const px=Math.floor(from.x+(to.x-from.x)*step/steps),py=Math.floor(from.y+(to.y-from.y)*step/steps);
          if(px>=0&&px<n&&py>=0&&py<n&&surface.target[py*n+px])context.fillRect(x+px*scale,y+py*scale,scale,scale);
        }
      }
    } else if(draft.stage==='carve') {
      context.globalAlpha=.6;
      for(let i=0;i<n*n;i++) if(surface.guide[i]&&!surface.carve[i]) context.fillRect(x+(i%n)*scale,y+Math.floor(i/n)*scale,Math.max(1,scale*.4),Math.max(1,scale*.4));
    }
  }
  context.restore();
  return surface;
}

export function drawWorktable(canvas, draft, options={}) {
  const context=canvas.getContext('2d'), w=canvas.width,h=canvas.height;
  context.imageSmoothingEnabled=false;
  context.fillStyle='#31271e';context.fillRect(0,0,w,h);
  for(let row=0;row<h;row+=32) {
    context.fillStyle='#5a4130';context.fillRect(0,row,w,29);
    context.fillStyle='#745039';for(let col=12;col<w;col+=83)context.fillRect(col,row+9,48,2);
  }
  context.fillStyle='#111f1b';context.fillRect(44,21,w-88,h-42);
  context.strokeStyle='#637653';context.lineWidth=2;context.strokeRect(49,26,w-98,h-52);
  context.fillStyle='#9b7d4f';for(const px of [34,w-45])for(const py of [48,h-72])context.fillRect(px,py,11,24);
  const size=Math.min(w-100,h-48); const x=(w-size)/2,y=(h-size)/2;
  drawArtisanPiece(context,draft,{x,y,size,...options});
  return {x,y,size};
}
