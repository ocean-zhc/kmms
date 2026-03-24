const WEEKDAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const WEEKDAY_EMOJIS = ['', '🌟', '🌈', '⭐', '🎨', '🎉', '🌻', '🍀'];
const MEAL_MAP = {
  lunch: { label: '营养午餐', emoji: '🍚' },
  snack: { label: '快乐午点', emoji: '🧁' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateRange = (start, end) => {
  if (!start || !end) return '';
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const parseDishes = (content) => {
  if (!content) return [];
  return content.split('|||').map(s => s.trim()).filter(Boolean);
};

const getWeekTitle = (data) => {
  if (!data) return '';
  const range = formatDateRange(data.week_start || data.start_date, data.week_end || data.end_date);
  return `${data.year}年第${data.week_number}周（${range}）`;
};

const getWeekdayDate = (startDate, weekday) => {
  if (!startDate) return '';
  const d = new Date(startDate);
  d.setDate(d.getDate() + weekday - 1);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// 食物 emoji 自动识别规则
const FOOD_EMOJI_RULES = [
  [/饭|米/, '🍚'],
  [/面|粉|饼/, '🍜'],
  [/汤|羹/, '🍲'],
  [/粥/, '🥣'],
  [/包|馒|卷|饺|馄/, '🥟'],
  [/鱼|虾|蟹/, '🐟'],
  [/鸡/, '🍗'],
  [/肉|排骨|牛|猪|鸭/, '🥩'],
  [/蛋|卵/, '🥚'],
  [/豆|腐/, '🫘'],
  [/奶|酸奶|牛乳/, '🥛'],
  [/果|苹|梨|蕉|橙|莓|桃|瓜(?!肉|鸡|骨)/, '🍎'],
  [/菜|菠|芹|萝卜|白菜|青|蔬|藕|笋|茄|椒|花菜|木耳|香菇|蘑/, '🥬'],
  [/糕|饼干|面包|蛋糕|琪玛/, '🍰'],
  [/玉米/, '🌽'],
];

const getDishEmoji = (name) => {
  for (const [pattern, emoji] of FOOD_EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return '🍽';
};

// AI 点评关键词高亮规则
const HIGHLIGHT_RULES = [
  { pattern: /蛋白质?|优质蛋白/g, color: '#52c41a', bg: '#f6ffed' },
  { pattern: /碳水化合物?|主食|粗粮|谷物/g, color: '#1890ff', bg: '#e6f7ff' },
  { pattern: /脂肪|油脂|不饱和/g, color: '#fa8c16', bg: '#fff7e6' },
  { pattern: /维生素|维C|维A|维D|维E/g, color: '#fadb14', bg: '#feffe6' },
  { pattern: /纤维素?|膳食纤维/g, color: '#13c2c2', bg: '#e6fffb' },
  { pattern: /钙|铁|锌|矿物质|微量元素/g, color: '#eb2f96', bg: '#fff0f6' },
  { pattern: /蔬菜|青菜|绿叶/g, color: '#52c41a', bg: '#f6ffed' },
  { pattern: /水果/g, color: '#fa541c', bg: '#fff2e8' },
  { pattern: /均衡|搭配合理|营养丰富/g, color: '#722ed1', bg: '#f9f0ff' },
];

const highlightText = (text) => {
  if (!text) return [];
  const nodes = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestMatch = null;
    let earliestIndex = remaining.length;
    let matchedRule = null;

    for (const rule of HIGHLIGHT_RULES) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(remaining);
      if (match && match.index < earliestIndex) {
        earliestMatch = match;
        earliestIndex = match.index;
        matchedRule = rule;
      }
    }

    if (!earliestMatch) {
      nodes.push({ type: 'text', text: remaining });
      break;
    }

    if (earliestIndex > 0) {
      nodes.push({ type: 'text', text: remaining.substring(0, earliestIndex) });
    }
    nodes.push({
      type: 'highlight',
      text: earliestMatch[0],
      color: matchedRule.color,
      bg: matchedRule.bg,
    });
    remaining = remaining.substring(earliestIndex + earliestMatch[0].length);
  }

  return nodes;
};

module.exports = {
  WEEKDAY_NAMES,
  WEEKDAY_EMOJIS,
  MEAL_MAP,
  formatDate,
  formatDateRange,
  parseDishes,
  getWeekTitle,
  getWeekdayDate,
  getDishEmoji,
  highlightText,
};
