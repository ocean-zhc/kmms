const api = require('../../utils/api');
const { formatDateRange } = require('../../utils/util');

const MONTHS = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
const WEEKDAYS = ['日','一','二','三','四','五','六'];

function formatWeekItem(item) {
  const ws = item.week_start || '';
  const we = item.week_end || '';
  const startDate = ws ? new Date(ws) : null;
  return {
    ...item,
    dateRange: formatDateRange(ws, we),
    startDay: startDate ? startDate.getDate() : '',
    startMonth: startDate ? (startDate.getMonth() + 1) + '月' : '',
    weekdayRange: startDate ? `周${WEEKDAYS[startDate.getDay()]}起` : '',
  };
}

Page({
  data: {
    loading: true,
    monthData: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    monthLabel: '',
    monthLoading: false,
    isCurrentMonth: true,
  },

  onLoad() {
    this.updateMonthLabel();
    this.loadMonth();
  },

  onShow() {
    api.recordVisit('/pages/history').catch(() => {});
  },

  onPullDownRefresh() {
    this.loadMonth().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return { title: '历史食谱', path: '/pages/history/index' };
  },

  async loadMonth() {
    const { year, month } = this.data;
    this.setData({ monthLoading: true, loading: false });
    try {
      const list = await api.getPublicWeeksByMonth(year, month);
      this.setData({ monthData: (list || []).map(formatWeekItem) });
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
    if (month === 1) { year--; month = 12; } else { month--; }
    this.setData({ year, month }, () => {
      this.updateMonthLabel();
      this.loadMonth();
    });
  },

  nextMonth() {
    if (this.data.isCurrentMonth) return;
    let { year, month } = this.data;
    if (month === 12) { year++; month = 1; } else { month++; }
    this.setData({ year, month }, () => {
      this.updateMonthLabel();
      this.loadMonth();
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
