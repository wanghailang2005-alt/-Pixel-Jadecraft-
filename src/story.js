import { getCraftSurface, localToCraftPoint } from './craft-model.js';
import { transformedMotifPaths } from './motifs.js';
/** A fictional heirloom commission. Choices and evidence survive reloads. */
export const LETTER_CLUES = Object.freeze([
  { id: 'cord', title: '松开的旧绳', text: '阿宁：绳子已经松了。我想继续戴，但不要让它再掉下来。', x: 9, y: 5 },
  { id: 'scar', title: '鱼腹的小划痕', text: '阿宁：小时候我把它碰在门槛上。祖母说，鱼也记得回家的路。请留下这道痕。', x: 14, y: 12 },
  { id: 'letter', title: '夹在信里的心愿', text: '阿宁：旧玉可以留在家中；若能有一条新鱼陪我出门，也很好。河纹让我想起渡口。', x: 25, y: 16 },
]);
export const STORY_ORDER = ['material', 'process', 'letter'];
export const STORY_LABELS = { material: '先见玉料', process: '再看手作', letter: '读一封信' };
export const CARE_CELLS = Object.freeze([
  ...[5, 6, 7].flatMap(y => [7, 8, 9].map(x => y * 32 + x)),
  ...[14, 15, 16].flatMap(y => [12, 13, 14].map(x => y * 32 + x)),
]);
export function freshStory() {
  return { clues: [], route: null, cleaned: [], cord: false, delivery: null, returned: false,
    order: [...STORY_ORDER], caption: 'memory' };
}
export function validateStory(input) {
  const s = input === undefined ? freshStory() : structuredClone(input);
  const fail = () => { throw new Error('旧玉来信记录不完整。'); };
  if (!s || typeof s !== 'object' || Array.isArray(s)) fail();
  const unique = (values, allowed) => Array.isArray(values) && new Set(values).size === values.length && values.every(v => allowed.includes(v));
  if (!unique(s.clues, LETTER_CLUES.map(c => c.id)) || !unique(s.cleaned, CARE_CELLS)
    || ![null, 'preserve', 'companion'].includes(s.route) || typeof s.cord !== 'boolean'
    || typeof s.returned !== 'boolean' || !unique(s.order, STORY_ORDER) || s.order.length !== 3
    || !['memory', 'craft'].includes(s.caption)) fail();
  if (s.route && s.clues.length !== 3 || s.returned && !s.delivery) fail();
  if (s.delivery !== null) {
    const d = s.delivery;
    if (!d || d.route !== s.route || !['preserve','companion'].includes(d.route)
      || !Array.isArray(d.motifs) || d.motifs.length > 12 || d.motifs.some(k => !['cloud','wave','leaf','fish','mountain','spiral'].includes(k))
      || ![null,'nephrite','jadeite'].includes(d.material) || ![null,'satin','contrast'].includes(d.finish)) fail();
    if (d.route === 'preserve' && (s.cleaned.length !== CARE_CELLS.length || !s.cord || d.pieceId !== null)) fail();
    if (d.route === 'companion' && (typeof d.pieceId !== 'string' || !d.pieceId || d.pieceId.length > 160 || !d.material || !d.finish)) fail();
  }
  return s;
}
export function brushHeirloom(story, from, to, radius = 2.2) {
  if (story.route !== 'preserve' || story.delivery || !from || !to
    || ![from.x,from.y,to.x,to.y,radius].every(Number.isFinite) || radius <= 0 || radius > 4) return false;
  const dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;
  const clean=new Set(story.cleaned);
  for(const index of CARE_CELLS) {
    const x=index%32+.5,y=Math.floor(index/32)+.5;
    const t=length?Math.max(0,Math.min(1,((x-from.x)*dx+(y-from.y)*dy)/length)):0;
    if(Math.hypot(x-from.x-t*dx,y-from.y-t*dy)<=radius) clean.add(index);
  }
  if(clean.size===story.cleaned.length)return false;
  story.cleaned=[...clean].sort((a,b)=>a-b);return true;
}
export function storyReadiness(story,piece) {
  if(story.delivery)return {ready:false,reason:'这封来信已经有了你的回答。'};
  if(story.clues.length<3)return {ready:false,reason:'先看旧绳、划痕和来信，听完她的心愿。'};
  if(story.route==='preserve')return {ready:story.cord&&story.cleaned.length===CARE_CELLS.length,
    reason:!story.cord?'清理两处积尘后，给旧玉换一条牢靠的新绳。':story.cleaned.length<CARE_CELLS.length?'用柔刷清理孔口和下缘的两处积尘，保留鱼腹划痕。':'旧玉已清理，划痕保留，新绳牢靠。'};
  if(story.route==='companion')return {ready:!!piece?.artisan?.completed&&piece.shape==='fish',reason:piece?.artisan?.completed&&piece.shape==='fish'?'让这条亲手刻成的新鱼，替她记住河流。':'在工坊完成一条玉鱼佩，再带来作为伴佩。'};
  return {ready:false,reason:'选择保养旧玉，或为它制作一件伴佩。'};
}
export function makeDelivery(story,piece) {
  if(!storyReadiness(story,piece).ready)return null;
  return {route:story.route,pieceId:story.route==='companion'?piece.id:null,
    material:story.route==='companion'?piece.material:null,
    finish:story.route==='companion'?piece.artisan.finish:null,
    motifs:story.route==='companion'?carvedMotifKinds(piece.artisan):[]};
}
/** A part outside the jade, or merely drawn on its guide, is not a carved motif. */
export function carvedMotifKinds(draft) {
  if(!draft?.motifs?.length)return [];
  const surface=getCraftSurface(draft);
  return draft.motifs.filter(m=>{
    const supported=new Set(),engraved=new Set();
    for(const path of transformedMotifPaths(m))for(let i=1;i<path.length;i++){
      const a=localToCraftPoint(draft,path[i-1]),b=localToCraftPoint(draft,path[i]);
      const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*2));
      for(let j=0;j<=steps;j++){
        const x=Math.floor(a.x+(b.x-a.x)*j/steps),y=Math.floor(a.y+(b.y-a.y)*j/steps),index=y*64+x;
        if(x<0||x>=64||y<0||y>=64||!surface.target[index])continue;
        supported.add(index);if(surface.carve[index]>0)engraved.add(index);
      }
    }
    return supported.size>=4&&engraved.size/supported.size>=.45;
  }).map(m=>m.kind);
}
export function returnLetter(story) {
  const d=story.delivery;if(!d)return '';
  if(d.route==='preserve')return '阿宁回访：新绳很稳。手指摸到鱼腹那道小划痕，我就想起祖母牵我过门槛的那一天。谢谢你留下它，也让我能继续戴着它。';
  const pattern=d.motifs.includes('wave')?'你刻的水纹，让我想起渡口的河。':d.motifs.includes('leaf')?'你留下的叶纹，像家门口的树。':'这条鱼的纹线，是一段新的记忆。';
  return `阿宁回访：旧玉我收在信匣里，新鱼陪我出门。${pattern}${d.material==='jadeite'?'那抹翠色像夏天的河岸。':'淡淡的玉色像清晨的河雾。'}${d.finish==='satin'?'柔和的光让我觉得很安静。':'亮处和暗处像水面闪动。'}`;
}
/** Responses depend on actual order, caption, displayed work and recorded story. */
export function exhibitionVisitors(state) {
  const s=state.story??freshStory();
  const pieces=(state.exhibits??[]).map(id=>state.pieces.find(p=>p.id===id)).filter(Boolean);
  const first=pieces[0];const storyShown=!!s.delivery;
  const firstPanel=s.order[0];
  const child=first?.shape==='fish'?'第一眼就看见小鱼！':first?.shape==='seal'?'这方玉印能盖出什么？':first?'玉上的圆孔像一扇窗。':storyShown?'这里展出的是旧玉的经历。':'这里还没有摆上自己的作品。';
  const actual=pieces.find(p=>p.artisan?.completed);
  const motifs=actual?.artisan?.motifs??[];
  return [
    {id:'child',name:'小禾 · 看形象',sprite:'child',text:child+(firstPanel==='material'?(first?'先看材料说明，我才发现它原来藏在石头里。':'这段材料说明让我想看看真玉。'):firstPanel==='process'?(first?.shape==='fish'?'先看刻线，我想知道鱼尾怎么留下来。':first?.shape==='seal'?'先看手作，我想看看刻槽在纸上留下什么。':'先看手作，我想知道这件东西怎样改变。'):storyShown?'先读来信，我知道它为什么值得留下。':'信匣还空着，我想听一个人的故事。')},
    {id:'apprentice',name:'小匠 · 问手艺',sprite:'apprentice',text:actual?(firstPanel==='process'?`先看到手作记录，我能沿着刀痕理解构图。${motifs.length?`你组合了${motifs.length}个纹样部件。`:'这些纹线都留在了玉面上。'}`:`我想先看制作过程。${s.caption==='craft'?'展签解释了刻线与柔亮面的取舍。':'现在展签讲的是记忆，还可以补一句为什么保留这些颜色。'}`):'摆上一件保留刀痕的作品，我想研究你的做法。'},
    {id:'giver',name:'阿宁 · 寻记忆',sprite:'giver',text:storyShown?(s.caption==='memory'?(firstPanel==='letter'?'先读信，再看作品，祖母和我的故事都连起来了。':'展签记得那道旧痕。把来信放在开头，大家会更容易明白。'):'这里讲清了怎么做；我还想让大家知道，我们为什么留住它。'):'技艺很美。我也想知道，这件作品是为谁做的。'},
  ];
}
