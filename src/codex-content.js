// Short teaching notes paraphrased from the linked museum collection/education pages.
const ritualSource = {
  title: '无锡博物院 · 琳琅史迹·礼玉①',
  url: 'https://www.wxmuseum.cn/Wap/News/Details/93078792-c047-4030-a83b-9f2ca7559070',
};
const pendantSource = {
  title: '故宫博物院 · 玉石器',
  url: 'https://www.dpm.org.cn/collection/jade.html',
};
export const CODEX_CONTENT = Object.freeze({
  bi: {
    name: '玉璧',
    story: '古人在礼仪中使用玉璧。传世的礼制文献也记下了以璧祭天的说法。',
    detail: '先看圆孔与外缘之间的宽面。试做玉璧时，留出一圈连贯的玉面，再决定哪里刻纹、哪里保留柔光。',
    source: {
      title: '无锡博物院 · 在线微课「琳琅史迹·礼玉①」',
      url: 'https://www.wxmuseum.cn/Wap/News/Details/93078792-c047-4030-a83b-9f2ca7559070',
    },
  },
  cong: {
    name: '玉琮',
    story: '良渚人把玉琮放进部分高等级墓葬，后来礼制文献也把琮与祭地联系起来。',
    detail: '从上方看圆孔，再沿方形外壁看分节。起稿时先定中轴，再让转角两侧的纹样互相呼应。',
    source: {
      title: '无锡博物院 · 在线微课「琳琅史迹·礼玉①」',
      url: 'https://www.wxmuseum.cn/Wap/News/Details/93078792-c047-4030-a83b-9f2ca7559070',
    },
  },
  huang: {
    name: '玉璜',
    story: '古人会把弧形的玉璜串进组佩，让它随着佩戴者的步子轻轻摆动。',
    detail: '故宫所藏玉璜仍有弧形切割凹槽。顺着凹槽读成形的方向，再试着沿原石已有的弧度排纸样。',
    source: {
      title: '故宫博物院 · 玉璜',
      url: 'https://www.dpm.org.cn/collection/jade/234378.html',
    },
  },
  dragon: {
    name: '玉龙形佩',
    story: '红山文化的这件玉龙背上有穿系孔，可以系绳悬挂。它当年在什么场合使用，至今仍有待考证。',
    detail: '弯曲的龙身围出一道空隙，让轮廓一眼可辨。做自己的挂件时，先定轮廓和系绳的位置，再决定哪里留空。',
    source: {
      title: '故宫博物院 · 玉龙',
      url: 'https://www.dpm.org.cn/collection/jade/234671.html',
    },
  },
  fish: {
    name: '玉鱼佩',
    story: '故宫所藏的玉鱼莲坠把鱼和荷莲放进一件可悬挂的饰物，让佩戴的人把水边景象带在身边。',
    detail: '找出鱼和莲各自的轮廓，再看它们如何相接。起稿时可以先定鱼身，再用一枚叶纹呼应它。',
    source: {
      title: '故宫博物院 · 玉鱼莲坠',
      url: 'https://www.dpm.org.cn/collection/jade/229416.html',
    },
  },
  seal: {
    name: '玉印',
    story: '用印的人握住印钮，将印面按在纸上，留下标记。此处参考的是一件带兽钮的圆形白玉印。',
    detail: '兽钮在上供手持，纹线在印面。刻自己的玉印时，试印看看镜像和留白，再决定要修哪一笔。',
    source: {
      title: '玉印 · 国立故宫博物院，台北，CC BY 4.0',
      url: 'https://digitalarchive.npm.gov.tw/Collection/Detail/25145?dep=U',
    },
  },
  gui: {
    name: '玉圭', after: 'cong', source: ritualSource,
    story: '传世礼书记有执圭行礼。圭多成长片形，礼仪中的执持方式与它的长轴相呼应。',
    detail: '观察中轴和尖首，让两道长边的弧度与光泽互相照应。',
  },
  zhang: {
    name: '玉璋', after: 'huang', source: ritualSource,
    story: '玉璋有多种形制。这幅图借牙璋的侧齿和斜刃，表现它与长片形礼玉的关系。',
    detail: '先排长面，再决定在哪一段留下齿饰和薄边。',
  },
  jue: {
    name: '玉玦', after: 'bi', source: pendantSource,
    story: '玦是一类带缺口的环形玉器。在一些早期墓葬中，玉玦成对出现在头部两侧。',
    detail: '看缺口两面的转折光，试着让它们像两笔相向的弧线。',
  },
  cicada: {
    name: '玉蝉', after: 'fish', source: pendantSource,
    story: '蝉形玉器既见于佩饰，也见于葬俗。此处的示意取合翅的蝉形。',
    detail: '从背上的中线观察双翅。两侧用少量对称阴线就能分出翅与腹。',
  },
});
