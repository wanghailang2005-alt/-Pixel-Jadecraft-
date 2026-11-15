// Public course framing and independently sourced exhibit narratives, checked 2026-11-15.
// The course informs the route through the gallery; the object facts come from the
// named institutions. No lesson videos, lecture text or collection photos are bundled.
const source = (title, url) => ({ title, url });
const jadeHistory = source('GIA · Jade History and Lore', 'https://www.gia.edu/jade-history-lore');
const chalcedony = source('GIA · Gem Cutters Reveal the Beauty of Chalcedony', 'https://www.gia.edu/gia-news-research/gem-cutters-reveal-beauty-chalcedony');
const turquoise = source('GIA · Turquoise Description', 'https://www.gia.edu/turquoise-description');
const plaque = source('河南博物院 · 镶嵌绿松石兽面纹铜牌饰（洛阳博物馆藏）', 'https://www.chnmus.net/sitesources/hnsbwy/page_pc/dzjp/mzyp/xqlsssmwtps/list1.html');
const lapis = source('GIA · Lapis Lazuli Description', 'https://www.gia.edu/gia-website/lapis-lazuli-description-v1');
const lapisJourney = source('GIA · 青金石与群青颜料的历史文献导读', 'https://www.gia.edu/lazurite-afghanistan-reading-list');
const ancientStones = source('土耳其文化与旅游部 · Ancient Gems: Materials', 'https://www.ktb.gov.tr/EN-120290/materials.html');
const carnelianSeal = source('大都会艺术博物馆 · Seal Stone，38.40.100', 'https://www.metmuseum.org/art/collection/search/449312');
const malachite = source('法国国家自然历史博物馆 · Malachite', 'https://www.mnhn.fr/fr/malachite');
const malachiteVase = source('大都会艺术博物馆 · Monumental vase，44.152a,b', 'https://www.metmuseum.org/art/collection/search/199500');
const nanyue = source('南越王博物院 · 犀角形玉杯', 'https://www.nywmuseum.org.cn/Collection/Details/dcjp?nid=52');
const nanyueHistory = source('南越王博物院 · 南越藏珍', 'https://www.nywmuseum.org.cn/Exhibition/BDetails/jbcl?nid=7647&sid=mydg');

export const MUSEUM_LEARNING_GUIDE = Object.freeze({
  title: '读玉，也读人',
  intro: '从一块石头的形成，走到工匠的选择、使用者的生活与流传至今的经历。循着这四个问题逛展，再把自己的答案带回工作台。',
  lenses: [
    { title: '它是什么', text: '看成分、结构、颜色与光泽。玉石包含不同矿物材料；玛瑙、玉髓与碧石同属石英质家族，碧石也不等于软玉中的碧玉。' },
    { title: '谁与它相遇', text: '寻找制作者、使用者与发现者。器物没有留下姓名时，从工痕、出土位置和文献逐步认识它。' },
    { title: '人为什么用它', text: '佩饰、礼仪、饮器、印信、陈设，各有不同的生活背景。历史信仰、传说与已有考古证据分别阅读。' },
    { title: '今天怎样续写', text: '留下一处天然色斑，修好一件旧佩，为赠礼写一句话。材料的特点与人的心意，共同决定这一次创作。' },
  ],
  sources: [
    source('同济大学 · 中国玉石及玉文化鉴赏课程介绍', 'https://jwc.tongji.edu.cn/fe/8c/c30671a327308/page.htm'),
    source('同济大学新闻网 · 一块玉石，如何打通理工与人文的“任督二脉”', 'https://news.tongji.edu.cn/info/1006/94418.htm'),
    source('智慧树 · 中国玉石及玉文化鉴赏（周征宇，同济大学）公开课程介绍', 'https://coursehome.zhihuishu.com/courseHome/1000009379/272745/22?ft=map'),
  ],
  attribution: '导览参考同济大学课程的公开介绍与报道，展品事实另据下方机构资料编写。',
});

// Keep the original IDs: notebooks, commissions and existing saves refer to them.
export const MUSEUM_NARRATIVES = Object.freeze({
  'material-nephrite': {
    story: '温润的石头也曾是工具、佩饰和礼仪用品。人的生活不断变化，软玉承担的意义也随之生长。',
    storySections: [
      { title: '从石头到器物', text: '史前工匠利用软玉的韧性制作工具，也将它琢成装饰与礼仪用物。认识一件古玉，需要同时问材料怎样加工、人又为何如此使用。' },
      { title: '把心意留在玉上', text: '后来的玉雕把龙、桃等形象与祝愿联系起来。今天设计一件赠礼，也可以先想到收礼的人，再决定纹样。' },
    ],
    sources: [jadeHistory],
  },
  'material-jadeite': {
    story: '同一种翡翠，在不同文化里曾进入佩饰、仪式和艺术。天然色块给工匠提出难题，也留下独特的创作机会。',
    storySections: [
      { title: '不止一种玉文化', text: '中美洲的玛雅人与阿兹特克人也珍爱翡翠，将它制成饰品与仪式用品。欣赏玉石，可以把眼光从一件作品移向更广阔的世界。' },
      { title: '颜色参与叙事', text: '在翠玉白菜里，白与绿变成菜梗和叶片；在现代翡翠山子里，色区又成为山林与云气。工匠的想象从材料本身出发。' },
    ],
    sources: [jadeHistory, source('国立故宫博物院 · 翠玉白菜', 'https://digitalarchive.npm.gov.tw/Collection/Detail/3?dep=U'), source('中国工艺美术馆 · 岱岳奇观', 'https://old.gmfyg.org.cn/cloud/daguojiangzuo/collection-01.html')],
  },
  'material-xiuyu': {
    story: '岫玉背后还有一条玉石街与一代代手艺人。认清材料之后，再看看地方技艺如何把它带进日常生活。',
    storySections: [
      { title: '一条街上的手艺', text: '清末民初，岫岩已有数百人从业的玉石街。工匠发展出人物、花鸟、动物和瓶炉等作品，矿产也因此与地方生计相连。' },
      { title: '看得见的传承', text: '岫岩玉雕擅长圆雕、镂刻与俏色运用，柔环和活链尤其考验手艺。2006年，这项技艺列入首批国家级非遗名录。' },
    ],
    sources: [source('中国非物质文化遗产网 · 岫岩玉雕', 'https://www.ihchina.cn/project_details/14005.html')],
  },
  'material-dushan': {
    story: '独山玉把一座山与南阳的玉雕生活连接起来。一块玉里相间的颜色，常常决定工匠怎样安排人物、花叶与山川。',
    storySections: [
      { title: '名字来自一座山', text: '独山玉又称南阳玉，得名于南阳独山。当地集中的玉源与长期开采，使认识这种材料也成为认识地方历史的一条路。' },
      { title: '每块材料各有安排', text: '多种色区交错，适合顺色雕刻。先保留什么、再去掉什么，是工匠面对每块原料都要重新作出的决定。' },
    ],
  },
  'heritage-liangzhu-bi': {
    story: '制作这件玉璧的人没有留下姓名，钻孔与切割痕却保存了动作的线索。它让我们从成品回望劳动的过程。',
    storySections: [
      { title: '工匠留下的线索', text: '两面相向钻孔形成了中央圆孔，孔壁仍可见旋转痕迹；器缘的弧线则提示了切割过程。' },
      { title: '不抹去时间', text: '起伏的玉面、并非完全规整的轮廓和白色沁斑共同构成今天的样子。观察时也可以想一想：旧物的哪些痕迹值得保留？' },
    ],
  },
  'heritage-songze-huang': {
    story: '一件弧形玉器，藏着如何节省原料的线索。今天的研究者通过凹槽和外伸的角，推想古代工匠的制作顺序。',
    storySections: [
      { title: '半圆不一定来自整圆', text: '馆方根据外伸的两角提出，这件玉璜可能由长方形或三角形玉片磨成。弧形外观并不等于把圆器切半。' },
      { title: '让证据开口', text: '一面的凹槽保留了线切割剖料痕迹。原料如何利用，需要结合这些细节判断，而不能只凭今天看见的轮廓。' },
    ],
  },
  'heritage-cong-king': {
    story: '1986年，反山12号墓出土了这件大型玉琮。它让今人得以贴近良渚工匠的微雕，也提出了尚未完全解答的礼仪问题。',
    storySections: [
      { title: '地下重见天日', text: '这件重约6.5千克的玉琮现藏浙江省博物馆。墓葬位置与器物一起保存的线索，是理解它的重要背景。' },
      { title: '纹饰与未解之问', text: '完整与简化的神人兽面纹围绕器身展开。玉琮被解释为礼仪器物或权力象征，其具体用途仍有不同学术看法。' },
    ],
  },
  'heritage-hongshan-dragon': {
    story: '几千年前，工匠已经在思考一件佩饰怎样悬挂、怎样保持平衡。这条玉龙的故事，藏在弧线和一个小孔里。',
    storySections: [
      { title: '形象由取舍而来', text: '整块玉雕成C形，光素的躯体衬托头部与长鬣。细节集中在少数位置，轮廓便有了力量。' },
      { title: '佩戴者的视角', text: '身体中部的穿系孔让悬挂的玉龙保持水平。转到佩戴者的位置，便能看到工艺与身体动作之间的关系。' },
    ],
  },
  'heritage-jadeite-cabbage': {
    story: '这颗白菜原是宫殿盆景的一部分。工匠把玉料的白绿相间、裂痕与杂质安排成菜叶菜梗，让田园景物走进宫廷。',
    storySections: [
      { title: '宫廷里的菜园', text: '馆方记录它最初以栽种的样子立在珐琅盆景上。今天独立观看的名作，曾与底座和其他陈设共同构成场景。' },
      { title: '瑕疵成为情趣', text: '白色部分的裂痕融入菜梗，两只小虫停在叶端。工匠让宫廷陈设与寻常菜蔬相遇，器物的情趣也从这种转化中生长。' },
    ],
  },
  'heritage-yu-mountain': {
    story: '大禹治水是这座玉山的传说题材，制作它却需要真实的画样、模型和协作。山中的小人物，也让宏大叙事有了劳动的尺度。',
    storySections: [
      { title: '传说走进山水', text: '大禹疏导洪水的故事被组织成山路、溪流与治水人物。这里呈现的是后人对传说的艺术想象，细小人物让宏大山水有了生活的尺度。' },
      { title: '许多人的一件作品', text: '画样、制模与雕刻由不同人员衔接，扬州工匠集体完成制作。欣赏大作时，也要看见题款之外的协作劳动。' },
    ],
  },
  'heritage-crowned-phoenix': {
    story: '高冠、羽纹与佩系孔，让想象中的神鸟成为能戴在身边的器物。馆方将它与商代王室贵族祈求护佑的观念联系起来。',
    storySections: [
      { title: '神鸟贴近生活', text: '凤是古人想象的神鸟。冠顶的小孔提示了佩系用途，细小玉片因此与佩戴者的身体、服饰和愿望相连。' },
      { title: '从纹样读观念', text: '馆方认为此类玉凤佩可能供商王室贵族佩戴。这样的解释来自形制与历史背景，具体佩戴者姓名并未确定。' },
    ],
  },
  'heritage-jade-suit': {
    story: '这件玉衣的主人是中山怀王刘修。玉片与金丝曾承载保存身体的愿望，后来又经历墓葬盗掘与火损。',
    storySections: [
      { title: '一位汉代王侯的身后事', text: '刘修去世于公元前55年。1203片玉被连缀成头、躯干与四肢等部分，记录了贵族丧葬的投入与工匠的细密分工。' },
      { title: '愿望与现实', text: '玉使身体不朽是当时的信仰。玉衣经历盗掘与火损后仍有留存，今天既见证古人的生死观，也记录了墓葬被扰动的经历。' },
    ],
  },
  'master-daiyue': {
    story: '北京玉器厂创作集体把泰山、杜甫诗意与翡翠天然色区组织在一起。看山景，也是在看一群工匠怎样共同读懂原料。',
    storySections: [
      { title: '把名山带进一块玉', text: '作品取材泰山，将登山道路、树木和山峰安排成远近层次；背面的《望岳》又把诗歌引入观看。' },
      { title: '同料不同景', text: '正反面的色泽差别参与景色安排。材料并非均匀的底板，创作者需要顺着不同部位重新组织画面。' },
    ],
  },
  'master-hanxiang': {
    story: '一件花薰的盖，原来取自主身掏出的玉料。北京玉器厂的创作者既要安排美感，也要让多部分严密配合。',
    storySections: [
      { title: '珍惜原料的设计', text: '先规划外形与内部空间，再从主身中套取器盖。有限玉料的利用，贯穿构思和实际加工。' },
      { title: '看不见的地方也有功夫', text: '多个部件以精确的螺口连接。外面的花纹之外，内壁厚薄、接合角度与整体垂直同样关系成败。' },
    ],
  },
  'master-qunfang': {
    story: '暗青色原料与裂纹给制作带来限制，创作者用花篮、提梁和活动链条回应它们。完成的轻盈感，来自耐心的减料与连接。',
    storySections: [
      { title: '难题成为题材', text: '花叶可以灵活穿插，避开裂处并突出较好的色区。掏出的材料继续变成提梁、链条与花叶。' },
      { title: '一环接住另一环', text: '环环相扣的活动链条，要经过分链、透眼、活环等工序。看似轻松垂落的一段链，保存了很多次谨慎的加工。' },
    ],
  },
  'master-sihai': {
    story: '从1982年开工到1989年完成，北京玉器厂创作集体把四片翡翠接成一幅九龙云水图。薄薄屏面里，藏着长时间的协作。',
    storySections: [
      { title: '先分开，再合成', text: '原料被剖为四片，再拼成屏面。接缝的平直与整体布局同样重要，设计要同时考虑材料和工序。' },
      { title: '龙与云水的主次', text: '绿色部位成为深浮雕的龙，浅色云水以较浅层次衬托。作品用不同深度，让观众一眼找到主体。' },
    ],
  },
});

export const ADDITIONAL_MUSEUM_EXHIBITS = Object.freeze([
  {
    id: 'material-turquoise', room: 'materials', title: '绿松石 · 从山岩到胸前',
    period: '玉材知识', material: '含水铜铝磷酸盐', creator: '天然形成 · 游戏示意样本', museum: '玉材知识展',
    summary: '常见蓝色至绿色，多不透明；细密晶粒与孔隙影响光泽，暗色网脉常来自围岩。',
    story: '在二里头，工匠把细小绿松石片嵌入青铜框架。矿物的颜色走出了山岩，成为佩在胸前的图像。',
    storySections: [
      { title: '铜与石的相遇', text: '二里头兽面铜牌饰用许多小石片组成纹样，要求磨石与铸铜技艺相互配合。可以去千年玉事厅寻找这件作品。' },
      { title: '观察一条网脉', text: '网状深纹不等同于人为画线；它可能是留下的围岩。颜色与结构一起看，才能理解这块材料。' },
    ],
    lookFor: ['蓝绿色主体与暗纹的关系', '网脉分叉的位置', '小块材料如何拼成大纹样'],
    technique: { id: 'modular-composition', name: '小片成形', hint: '创作练习：用重复部件拼出清楚的脸形，保留各部件之间的间隙。' },
    shape: 'stone', palette: ['#25565C', '#43A99D', '#A1DBCA'], source: turquoise, sources: [turquoise, plaque],
    sourceStatus: '已核对GIA材料说明与博物馆器物记录', relatedIds: ['heritage-turquoise-plaque'],
  },
  {
    id: 'material-lapis', room: 'materials', title: '青金石 · 一抹蓝的远行',
    period: '玉材知识', material: '含青金石、方解石、黄铁矿等的岩石', creator: '天然形成 · 游戏示意样本', museum: '玉材知识展',
    summary: '浓蓝来自青金石矿物，白色斑纹可为方解石，金色亮点常是黄铁矿。',
    story: '青金石曾沿远距离贸易路线从中亚走向更多地区；其中的蓝色矿物还被提炼为群青颜料，进入画师的作品。',
    storySections: [
      { title: '玉石也能成为颜色', text: '阿富汗是青金石的重要历史产地。它既被雕成饰物，也被加工成珍贵的天然群青，把矿山与画室连接起来。' },
      { title: '金点不是黄金', text: '黄铁矿会闪出金属光，方解石留下白色区域。同一岩石里多种矿物相伴，形成了人们熟悉的蓝、白、金。' },
    ],
    lookFor: ['深蓝色主体', '细小金色颗粒', '白色矿物与蓝色交界'],
    technique: { id: 'color-landscape', name: '借色成景', hint: '创作练习：把少量亮点作为夜空中的星，留出大片安静背景。' },
    shape: 'stone', palette: ['#1F3269', '#4268AF', '#B9C7D1'], source: lapis, sources: [lapis, lapisJourney],
    sourceStatus: '已核对GIA材料与颜料史资料',
  },
  {
    id: 'material-agate', room: 'materials', title: '玛瑙 · 条带里的旅程',
    period: '玉材知识', material: '条带状玉髓 · 石英质', creator: '天然形成 · 游戏示意样本', museum: '玉材知识展',
    summary: '玛瑙属于隐晶质石英材料，常见层层条带；每块的颜色与纹理组合都可能不同。',
    story: '玛瑙的条带可以决定一件作品的表情。在兽首玛瑙杯上，工匠顺着自然纹理，把石头变成能盛酒的动物形象。',
    storySections: [
      { title: '河水推动的手艺', text: '德国伊达尔—奥伯施泰因的切磨传统曾利用河水带动磨轮；当地矿料减少后，工匠又使用来自巴西等地的材料。' },
      { title: '沿着条带构图', text: '观察条带何处转弯，再去看兽首杯如何借色。很鲜艳的玛瑙也可能经过染色，不能只凭颜色判断天然与否。' },
    ],
    lookFor: ['平行或弯曲的色带', '薄层与厚层的节奏', '纹带适合成为哪条轮廓'],
    technique: { id: 'color-design', name: '巧用俏色', hint: '创作练习：让纹样顺着一条天然色带延伸，而不是盖住它。' },
    shape: 'stone', palette: ['#754337', '#C28161', '#E7CFAB'], source: chalcedony,
    sources: [chalcedony, source('陕西历史博物馆 · 镶金兽首玛瑙杯', 'https://www.sxhm.com/collections/detail/512.html')],
    sourceStatus: '已核对材料科普及馆藏记录', relatedIds: ['heritage-agate-rhyton'],
  },
  {
    id: 'material-chalcedony', room: 'materials', title: '玉髓 · 一枚印记的身份',
    period: '玉材知识', material: '隐晶质石英；此处展示红玉髓示意', creator: '天然形成 · 游戏示意样本', museum: '玉材知识展',
    summary: '玉髓由很细的石英晶体组成；玛瑙、红玉髓等是这个家族中不同外观的材料。',
    story: '小小一块红玉髓，可以记录一个人的身份。近东地区的私人印章曾承担签名作用，把雕刻与信用联系起来。',
    storySections: [
      { title: '把名字随身携带', text: '大都会艺术博物馆藏有一枚10—11世纪红玉髓印石，出土于伊朗内沙布尔。上面的一个词尚未释读，馆方推测可能是人名。' },
      { title: '从印面到印迹', text: '下凹的刻线如何成为清晰的印记？回到工坊试印时，可以把图案是否好认也当作设计的一部分。' },
    ],
    lookFor: ['暖红色里的明暗层次', '与条带玛瑙的外观区别', '小面积里能留下多少线条'],
    technique: { id: 'silhouette-lines', name: '剪影与细纹', hint: '创作练习：用少量线条做一个可辨认的印记，再试印检查。' },
    shape: 'stone', palette: ['#8A4130', '#C9714B', '#E8B886'], source: chalcedony, sources: [chalcedony, carnelianSeal],
    sourceStatus: '已核对矿物家族及馆藏印石；人名解释保留推测', relatedIds: ['heritage-empress-seal'],
  },
  {
    id: 'material-jasper', room: 'materials', title: '碧石 · 斑斓的小画面',
    period: '玉材知识', material: '不透明石英质材料（Jasper）', creator: '天然形成 · 游戏示意样本', museum: '玉材知识展',
    summary: '碧石常见红、黄、褐等斑块或条纹，属石英质材料；它与软玉中的绿色碧玉不同。',
    story: '古罗马的雕刻宝石里，也能见到红黄碧石。天然色块与小小的刻面一起，进入人们佩戴和使用的器物。',
    storySections: [
      { title: '同一个字，不同材料', text: '碧石的“碧”不表示它一定是绿色，更不能由名称推定为软玉。先分清材料，再读颜色。' },
      { title: '小石头里的选择', text: '罗马时期的刻石曾流行红、黄碧石，也使用杂色品种。若只有一小块材料，你会突出最亮的斑点，还是保留整个图案？' },
    ],
    lookFor: ['红褐与黄白色斑块', '大色区与细纹的关系', '天然图案中的视觉重心'],
    technique: { id: 'color-design', name: '巧用俏色', hint: '创作练习：挑一个色斑成为主体，其余刻线为它留出位置。' },
    shape: 'stone', palette: ['#723D35', '#B87747', '#DCC38B'], source: ancientStones, sources: [ancientStones],
    sourceStatus: '已核对机构材料说明；明确区分碧石与碧玉',
  },
  {
    id: 'material-malachite', room: 'materials', title: '孔雀石 · 绿色走进厅堂',
    period: '玉材知识', material: '碱式碳酸铜', creator: '天然形成 · 游戏示意样本', museum: '玉材知识展',
    summary: '含铜矿物与富碳酸盐的水作用可形成孔雀石；切磨后，深浅绿色常显出同心条带。',
    story: '这种绿色曾从矿山进入欧洲厅堂。德米多夫家族拥有产孔雀石的土地，也委托制作以这种材料装饰的大型花瓶。',
    storySections: [
      { title: '一块材料的远行', text: '大都会艺术博物馆的一件大型花瓶使用俄罗斯孔雀石，金属底座与装饰由法国工匠托米尔制作，年代为1819年。' },
      { title: '材料连接着人', text: '矿主、切磨者、金属工匠与使用者，共同构成这件陈设的经历。观看纹带之外，也可以追问材料经过了哪些人的手。' },
    ],
    lookFor: ['同心弧线与深浅绿带', '不同切面上条带的变化', '适合保留为大面的纹理'],
    technique: { id: 'surface-contrast', name: '表面反差', hint: '创作练习：留出一块完整纹带，用局部光泽引导观看。' },
    shape: 'stone', palette: ['#184B3B', '#43895C', '#A3C58A'], source: malachite, sources: [malachite, malachiteVase],
    sourceStatus: '已核对自然史博物馆与艺术博物馆记录',
  },
  {
    id: 'heritage-turquoise-plaque', room: 'heritage', title: '绿松石兽面牌 · 拼起的目光',
    period: '二里头文化', material: '青铜、绿松石', creator: '制作者姓名未详', museum: '洛阳博物馆',
    summary: '盾形青铜框架上，数百片细小绿松石拼成兽面；两侧的小穿孔可供系缀。',
    story: '1984年，这件牌饰在二里头遗址M11墓出土，位于墓主人胸前。一件小饰物，同时留下了佩戴与复合工艺的证据。',
    storySections: [
      { title: '胸前的一张脸', text: '出土位置提示它与身体装饰有关。具体是身份标志、护身物还是礼仪用品，研究者仍有不同解释。' },
      { title: '许多小片，一幅图', text: '铸铜框架与逐片磨制的绿松石要严密配合。把很小的材料组成完整形象，也是工匠对有限原料的回应。' },
    ],
    lookFor: ['左右对称的兽面', '青铜线与石片的分工', '两侧系缀位置'],
    technique: { id: 'modular-composition', name: '小片成形', hint: '创作练习：先排一条中轴，再用成对部件组成表情。' },
    shape: 'plaque', palette: ['#41564C', '#62AA97', '#C0D5B2'], source: plaque, sources: [plaque],
    sourceStatus: '已核对河南博物院专题；对应1984年M11出土、洛阳博物馆藏件', relatedIds: ['material-turquoise'],
  },
  {
    id: 'heritage-pig-dragon', room: 'heritage', title: '玉猪龙 · 名字里的问号',
    period: '红山文化晚期', material: '玉', creator: '制作者姓名未详', museum: '国立故宫博物院，台北',
    summary: '短而卷曲的躯体一端雕出皱鼻、凸眼与立耳，中部留空；这件小器仅长3.9厘米。',
    story: '“猪龙”是研究者给这类器物的称呼。它究竟表现什么动物与观念，仍有不同解释；文物的故事有时也包括尚未解开的谜。',
    storySections: [
      { title: '先观察，再命名', text: '馆方指出，器形近似更早文化的耳饰玦，动物头部与蜷曲躯体又形成了新的形象。' },
      { title: '给未知留下位置', text: '部分研究者称它为猪龙，也有人提出虎胚胎的解释。展签保留这种分歧，邀请你比较它与C形玉龙的不同。' },
    ],
    lookFor: ['皱鼻、凸眼和立耳', '较粗短的卷曲躯体', '中部留空与边缘开口'],
    technique: { id: 'negative-space', name: '留空成形', hint: '创作练习：比较一个小孔与一个大开口怎样改变同一轮廓的感觉。' },
    shape: 'pig-dragon', palette: ['#5E6D4A', '#A2AC76', '#D9D8B0'],
    source: source('国立故宫博物院 · 玉猪龙，购玉000523', 'https://digitalarchive.npm.gov.tw/Collection/Detail/52424?dep=U'),
    sourceStatus: '文字来源：玉猪龙，国立故宫博物院，台北，CC BY 4.0；动物解释未定论', relatedIds: ['heritage-hongshan-dragon'],
  },
  {
    id: 'heritage-empress-seal', room: 'heritage', title: '皇后之玺 · 方寸间的权力',
    period: '西汉', material: '白玉', creator: '制作者姓名未详', museum: '陕西历史博物馆',
    summary: '正方印面刻有“皇后之玺”四字，顶部为螭虎钮，侧面饰云纹。',
    story: '一枚印章能代表谁说话？这件玉玺把小小印面与汉代皇后制度联系起来，材质、钮式和文字都参与身份表达。',
    storySections: [
      { title: '从印记读制度', text: '秦汉的玺印制度使帝后用玺成为权力的标志。螭虎是神话动物，钮的形象与印文一起传达威严。' },
      { title: '追寻玉玺的主人', text: '发现地点距长陵较近，馆方因此推测它很可能属于吕后。具体使用者尚不能确认，地点、文字和形制仍需一起研究。' },
    ],
    lookFor: ['印面的方形边界', '上方螭虎钮的位置', '四字印文怎样分配空间'],
    technique: { id: 'symmetry', name: '对称与留白', hint: '创作练习：把印面分成几个清楚的区域，试印时检查主次与空隙。' },
    shape: 'seal', palette: ['#7A856B', '#C7D1B1', '#EEEBD4'],
    source: source('陕西历史博物馆 · 汉“皇后之玺”玉印', 'https://www.sxhm.com/collections/detail/466.html'),
    sourceStatus: '已核对馆方原文；吕后归属保留推测', relatedIds: ['material-nephrite', 'material-chalcedony'],
  },
  {
    id: 'heritage-agate-rhyton', room: 'heritage', title: '兽首玛瑙杯 · 酒杯里的远方',
    period: '唐', material: '缠丝玛瑙、金', creator: '制作者姓名与产地未定', museum: '陕西历史博物馆',
    summary: '横置的角形杯一端雕为兽首，金质嘴塞可以取下，让液体从小孔流出。',
    story: '1970年何家村窖藏重见天日，这件角杯也来到今人眼前。它与中亚、西亚常见的“来通”酒具相似，留下了文化交流的线索。',
    storySections: [
      { title: '不只是一个金嘴', text: '金塞既是装饰，也控制流酒的孔口。顺着实际用途看器形，才能理解工匠为什么这样安排材料。' },
      { title: '形制相通，产地未定', text: '馆方指出其来通式造型有明确的跨文化联系，但制造地点仍存在争议。器物能说明交流，也保留着未解的问题。' },
    ],
    lookFor: ['横置角形与兽首的连接', '兽嘴处的金塞', '天然条带顺着杯身流动'],
    technique: { id: 'color-design', name: '巧用俏色', hint: '创作练习：让天然色带与器物的使用方向相互呼应。' },
    shape: 'rhyton', palette: ['#6C3E31', '#BC7750', '#E8CAA0'],
    source: source('陕西历史博物馆 · 唐镶金兽首形玛瑙杯', 'https://www.sxhm.com/collections/detail/512.html'),
    sourceStatus: '已核对馆藏页；产地未定，不推定具体旅行路线', relatedIds: ['material-agate'],
  },
  {
    id: 'heritage-nanyue-cup', room: 'heritage', title: '南越角形玉杯 · 岭南的宴饮',
    period: '西汉南越国', material: '青玉', creator: '制作者姓名未详', museum: '南越王博物院',
    summary: '玉杯中空，椭圆形口向下收束，底部卷曲回缠；外壁纹饰沿器身转动。',
    story: '这件杯来自1983年发现的南越文王赵眜墓。与墓中的印章、佩饰和生活器具一起，它把两千年前的岭南生活带到眼前。',
    storySections: [
      { title: '一座墓中的生活切片', text: '墓中留下了大量玉器。角杯属于器用玉，提醒我们玉也能进入饮食与日常陈设，而不只是佩戴。' },
      { title: '仿角，却由玉制成', text: '名称说的是器形像犀角，材料仍是青玉。雕刻者把坚硬玉料掏成中空容器，并让卷曲尾部和纹饰呼应。' },
    ],
    lookFor: ['椭圆杯口与中空器腹', '向下收束的器形', '卷尾与回环纹饰'],
    technique: { id: 'negative-space', name: '留空成形', hint: '创作练习：先想象空腔和外形的关系，再安排外围曲线。' },
    shape: 'horn-cup', palette: ['#577062', '#9CB09A', '#D7DBC0'], source: nanyue, sources: [nanyue, nanyueHistory],
    sourceStatus: '已核对南越王博物院藏品及基本陈列资料',
  },
  {
    id: 'heritage-tongyin', room: 'heritage', title: '桐荫仕女 · 余料里的庭院',
    period: '清 · 乾隆', material: '带黄褐色玉皮的白玉', creator: '器底题文称“吴工”；具体姓名未详', museum: '故宫博物院',
    summary: '半掩的月亮门分开两处庭院，两位女子隔门相望，玉皮被安排成树木与山石。',
    story: '这块玉原是雕碗余下的材料。工匠借它的形状与皮色，参照宫廷绘画雕出庭院，让原本的余料成为完整作品。',
    storySections: [
      { title: '从一只碗的余料开始', text: '乾隆在器底题文，记述工匠利用制碗余材的经过。文字让我们知道，巧思有时来自一个不能浪费的角落。' },
      { title: '画里的两个人', text: '题材参考《桐荫仕女图》。玉雕用门缝、人物目光与前后空间讲述相望的瞬间；她们具体说什么，作品没有给出答案。' },
    ],
    lookFor: ['半掩月亮门的留空', '两个人物相望的位置', '黄褐玉皮怎样进入树石'],
    technique: { id: 'borrow-imperfection', name: '借瑕成趣', hint: '创作练习：把一块不规则边角保留下来，让它成为作品的情节起点。' },
    shape: 'garden-jade', palette: ['#8E7752', '#C9C4A1', '#EEE5C9'],
    source: source('故宫博物院 · 乾隆款带皮白玉桐荫仕女图山子', 'https://intl.dpm.org.cn/Jade/64014.html?_isa=1&l=tc'),
    sourceStatus: '已核对故宫藏品全文与器底题文；人物对话未作虚构', relatedIds: ['material-nephrite', 'heritage-jadeite-cabbage'],
  },
]);
