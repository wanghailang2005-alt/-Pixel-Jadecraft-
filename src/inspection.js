const GEOLOGY_SOURCE = Object.freeze({
  title: 'Geoscience Australia · Jade',
  url: 'https://www.ga.gov.au/education/minerals-energy/australian-mineral-facts/jade',
});
const JADEITE_SOURCE = Object.freeze({
  title: 'GIA · Jadeite Jade Quality Factors',
  url: 'https://www.gia.edu/jade-quality-factor',
});
const RITUAL_JADE_SOURCE = Object.freeze({
  title: '无锡博物院 · 在线微课「琳琅史迹·礼玉①」',
  url: 'https://www.wxmuseum.cn/Wap/News/Details/93078792-c047-4030-a83b-9f2ca7559070',
});

export const MATERIAL_GUIDES = Object.freeze({
  nephrite: Object.freeze({
    name: '和田玉原石',
    description: '本游戏的和田玉对应软玉。细密交织的矿物结构，让它适合琢制与抛光。',
    hotspots: Object.freeze([
      { id: 'color', label: '看颜色', text: '软玉可呈白、黄、绿及褐黑等色。观察色调与分布，并结合其他特征认识材料。' },
      { id: 'structure', label: '看结构', text: '软玉属于角闪石类，细小纤维或针状晶体相互交织，具有良好韧性。' },
      { id: 'polish', label: '看光泽', text: '细密结构适合抛光。加工时留意表面由粗糙逐渐平整、显露光泽的变化。' },
    ].map(Object.freeze)),
    source: GEOLOGY_SOURCE,
  }),
  jadeite: Object.freeze({
    name: '翡翠原石',
    description: '本游戏以硬玉质翡翠为材料范例。可以从颜色、透光表现和结构三个角度观察。',
    hotspots: Object.freeze([
      { id: 'color', label: '看颜色', text: '翡翠有绿、紫、白、黑等多种颜色。观察画面中的色块与分布，记录你看到的特征。' },
      { id: 'structure', label: '看结构', text: '翡翠的颗粒结构可以细、中、粗，交织的晶体构成紧密的材料。游戏放大图为观察示意。' },
      { id: 'light', label: '看透光', text: '翡翠的透明度可从不透明到半透明。观察光线进入材料后，边缘和内部明暗的变化。' },
    ].map(Object.freeze)),
    source: JADEITE_SOURCE,
  }),
});

export const INSPECTION_QUESTIONS = Object.freeze([
  {
    id: 'jadeite-colors',
    prompt: '翡翠的颜色有哪些可能？',
    choices: ['只有翠绿色', '绿、紫、白等多种颜色', '只有白色与黑色'],
    answer: 1,
    explanation: '翡翠颜色丰富，绿色之外还可见紫、白、黑等色。观察材料时应同时记录颜色、透光与结构。',
    source: JADEITE_SOURCE,
  },
  {
    id: 'nephrite-minerals',
    prompt: '和田玉对应的软玉，主要属于哪类矿物？',
    choices: ['石英类', '长石类', '角闪石类'],
    answer: 2,
    explanation: '软玉属于角闪石类，其细小晶体交织形成的结构有助于提高韧性。',
    source: GEOLOGY_SOURCE,
  },
  {
    id: 'jadeite-minerals',
    prompt: '本游戏中的硬玉质翡翠，主要对应哪类矿物？',
    choices: ['辉石类', '方解石类', '石英类'],
    answer: 0,
    explanation: '硬玉属于辉石类。软玉和硬玉有不同的化学组成与结构。',
    source: GEOLOGY_SOURCE,
  },
  {
    id: 'bi-shape',
    prompt: '玉璧的典型形态是什么？',
    choices: ['没有孔的方柱体', '中央有穿孔的扁平圆形', '一端尖锐的长条形'],
    answer: 1,
    explanation: '玉璧的典型形态为扁平圆形，中央有穿孔。观察玉璧时，可留意外缘、孔径和器身的比例。',
    source: RITUAL_JADE_SOURCE,
  },
  {
    id: 'cong-shape',
    prompt: '玉琮常见的造型特征是什么？',
    choices: ['内外都是三角形', '实心圆球', '内圆外方，中间有孔'],
    answer: 2,
    explanation: '玉琮具有内圆外方、中间穿孔的造型，器表可见不同的纹饰和分节。',
    source: RITUAL_JADE_SOURCE,
  },
  {
    id: 'polishing-surface',
    prompt: '抛光主要让玉器表面发生什么变化？',
    choices: ['表面更平整，光泽更明显', '把软玉变成硬玉', '让材料内部自行长出新矿物'],
    answer: 0,
    explanation: '切割和雕琢后的玉器经过抛光，可获得更平整、明亮的表面。',
    source: GEOLOGY_SOURCE,
  },
].map(question => Object.freeze({ ...question, choices: Object.freeze(question.choices) })));
