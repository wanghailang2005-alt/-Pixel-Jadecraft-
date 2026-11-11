import { CELL_SIZE, MINE_MAP, WORLD_WIDTH, WORLD_HEIGHT } from './mining.js';

// Original geometric pixel scenery; no third-party assets.
export function drawScene(g, location) {
  g.clear();
  const rect = (x,y,w,h,c) => { g.fillStyle(c); g.fillRect(x,y,w,h); };
  const poly = (points,c) => { g.fillStyle(c); g.fillPoints(points.map(([x,y])=>({x,y})),true); };
  const jade = (x,y,s=1) => {
    for(const [r,c] of [[67,0x234d48],[61,0x4c917b],[49,0x78b79a],[37,0x5a9d85]]) {
      g.lineStyle(12*s,c); g.strokeCircle(x,y,r*s);
    }
    rect(x-57*s,y-36*s,17*s,9*s,0xb2d9b2); rect(x+19*s,y+39*s,18*s,7*s,0x367361);
    g.lineStyle(2*s,0xa5cbaa); g.strokeCircle(x,y,66*s); g.strokeCircle(x,y,29*s);
    for(let i=0;i<8;i++) { const a=i*Math.PI/4; rect(x+Math.cos(a)*49*s-3*s,y+Math.sin(a)*49*s-3*s,6*s,6*s,0xa4d0a7); }
  };
  const lantern = (x,y) => {
    rect(x+10,y-25,2,25,0x9d8052); rect(x,y,24,30,0xb68b4e); rect(x+4,y+3,16,23,0xe9c480);
    rect(x-3,y,30,4,0x634d38); rect(x-3,y+28,30,4,0x634d38); rect(x+11,y+32,2,13,0xb68b4e);
  };
  rect(0,0,960,540,0x182b2c);
  if (location === 'mine') {
    rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 0x182b2c);
    MINE_MAP.forEach((row, y) => row.forEach((tile, x) => {
      rect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE, [0x20383b, 0x152829, 0x30494a][tile]);
    }));
    return;
  }
  if (location === 'gallery') {
    rect(0,90,960,450,0x213938);
    poly([[480,140],[870,320],[480,500],[90,320]],0x657265);
    poly([[90,100],[480,0],[480,140],[90,320]],0x405851);
    poly([[480,0],[870,100],[870,320],[480,140]],0x344e49);
    for(let i=0;i<8;i++) { g.lineStyle(1,0x768173); g.lineBetween(150+i*48,292-i*22,540+i*42,472-i*20); }
    for (const [x,y] of [[320,310],[480,380],[640,310]]) {
      poly([[x-46,y],[x,y-22],[x+46,y],[x,y+22]],0xb4b498);
      poly([[x-46,y],[x,y+22],[x,y+80],[x-46,y+58]],0x626b5b);
      poly([[x,y+22],[x+46,y],[x+46,y+58],[x,y+80]],0x465a51);
      g.lineStyle(2,0x92b3a0,0.65); g.strokeRect(x-35,y-55,70,55);
    }
    return;
  }
  rect(0,0,960,360,0x243d38);
  for(let x=0;x<960;x+=80) { rect(x,0,5,360,0x1a2e2c); rect(x+6,0,2,360,0x3a5145); }
  rect(0,352,960,188,0x493e30);
  for(let y=360;y<540;y+=30) {
    rect(0,y,960,2,0x302e26);
    for(let x=(y%60?0:50);x<960;x+=110) rect(x,y,2,30,0x302e26);
  }
  rect(58,85,224,214,0x172e2e); rect(64,91,212,202,0x597e72);
  poly([[66,246],[120,149],[189,235],[242,157],[276,235],[276,291],[66,291]],0x315b51);
  poly([[66,271],[151,212],[211,262],[276,226],[276,291],[66,291]],0x25473f);
  rect(167,91,6,202,0x9c865a); rect(64,181,212,6,0x9c865a);
  rect(314,115,214,12,0x69583e); rect(314,254,214,12,0x69583e);
  for(let i=0;i<5;i++) { rect(331+i*38,213,22,40,0x354b40); rect(334+i*38,207,16,8,0xa49d71); }
  jade(423,183,.57);
  lantern(25,130); lantern(564,130); lantern(899,130);
  rect(82,340,454,24,0xa38a59); rect(82,364,454,23,0x685236);
  rect(98,386,20,100,0x3d3326); rect(501,386,20,100,0x3d3326);
  rect(130,329,120,9,0xb8ad83); rect(152,317,66,12,0x789c7f);
  rect(330,320,84,18,0x6b8470); rect(349,312,52,9,0x9cbe9b);
  rect(458,313,5,26,0xbcb395); rect(444,309,33,6,0x777f70);
  rect(277,356,34,35,0x242e2b); rect(281,367,27,25,0xc4a17b);
  rect(278,393,37,44,0x83947a); rect(289,394,8,43,0xc8b17f);
  rect(277,437,14,28,0x243b36); rect(302,437,14,28,0x243b36);
  rect(272,462,19,7,0x242b26); rect(302,462,21,7,0x242b26);
  if(location === 'menu') {
    rect(0,0,610,540,0x112b2b);
    for(let i=0;i<9;i++) { g.lineStyle(1,0x36554a); g.strokeCircle(298,261,93+i*14); }
    jade(298,245,1.8);
    rect(283,390,30,40,0x977449); rect(289,396,18,28,0x244d40);
  }
}
