const api = require('../../utils/api');

const SUBJECT_MAP = {
  '美术': { icon: '🎨', color: '#fa8c16' },
  '语言': { icon: '📖', color: '#1890ff' },
  '科学': { icon: '🔬', color: '#52c41a' },
  '社会': { icon: '🌍', color: '#722ed1' },
  '数学': { icon: '🔢', color: '#eb2f96' },
  '音乐': { icon: '🎵', color: '#13c2c2' },
  '体育': { icon: '⚽', color: '#f5222d' },
  '健康': { icon: '💪', color: '#52c41a' },
};

const MONTHS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const WEEKDAYS = ['日','一','二','三','四','五','六'];

function getSubject(name) {
  for (const [k, v] of Object.entries(SUBJECT_MAP)) {
    if (name && name.includes(k)) return { ...v, label: k };
  }
  return { icon: '📝', color: '#52c41a', label: '' };
}

function parseGoals(goals) {
  if (!goals) return [];
  return goals.split('\n').map(s => s.replace(/^\d+[.、．]/, '').trim()).filter(Boolean);
}

function formatDate(d) {
  const date = new Date(d + 'T00:00:00');
  return `${date.getMonth() + 1}月${date.getDate()}日 周${WEEKDAYS[date.getDay()]}`;
}

Page({
  data: {
    loading: true,
    today: null,
    monthData: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    monthLabel: '',
    monthLoading: false,
    isCurrentMonth: true,
  },

  onLoad() {
    this.updateMonthLabel();
    this.loadToday();
    this.loadMonth();
  },

  onShow() {
    api.recordVisit('/pages/learning').catch(() => {});
  },

  onPullDownRefresh() {
    Promise.all([this.loadToday(), this.loadMonth()]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: '宝贝今日所学',
      path: '/pages/learning/index',
    };
  },

  async loadToday() {
    this.setData({ loading: true });
    try {
      const data = await api.getDailyLearningToday();
      if (data) {
        const subj = getSubject(data.activity_name);
        this.setData({
          today: {
            ...data,
            icon: subj.icon,
            color: subj.color,
            dateText: formatDate(data.activity_date),
            goals: parseGoals(data.activity_goals),
          },
        });
      } else {
        this.setData({ today: null });
      }
    } catch (e) {
      this.setData({ today: null });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMonth() {
    const { year, month } = this.data;
    this.setData({ monthLoading: true });
    try {
      const list = await api.getDailyLearningsByMonth(year, month);
      const items = (list || [])
        .filter(h => !this.data.today || h.id !== this.data.today.id)
        .map(item => {
          const subj = getSubject(item.activity_name);
          return {
            ...item,
            icon: subj.icon,
            color: subj.color,
            dateText: formatDate(item.activity_date),
            goals: parseGoals(item.activity_goals),
          };
        });
      this.setData({ monthData: items });
    } catch (e) {
      this.setData({ monthData: [] });
    } finally {
      this.setData({ monthLoading: false });
    }
  },

  updateMonthLabel() {
    const { year, month } = this.data;
    const now = new Date();
    this.setData({
      monthLabel: `${year}年${MONTHS[month - 1]}`,
      isCurrentMonth: year === now.getFullYear() && month === now.getMonth() + 1,
    });
  },

  prevMonth() {
    let { year, month } = this.data;
    if (month === 1) { year--; month = 12; }
    else { month--; }
    this.setData({ year, month }, () => {
      this.updateMonthLabel();
      this.loadMonth();
    });
  },

  nextMonth() {
    if (this.data.isCurrentMonth) return;
    let { year, month } = this.data;
    if (month === 12) { year++; month = 1; }
    else { month++; }
    this.setData({ year, month }, () => {
      this.updateMonthLabel();
      this.loadMonth();
    });
  },
});
