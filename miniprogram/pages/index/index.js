const api = require('../../utils/api');
const { getWeekTitle } = require('../../utils/util');

Page({
  data: {
    loading: true,
    weekData: null,
    weekTitle: '',
    weekId: 0,
    hasData: false,
  },

  onLoad() {
    this.loadCurrentWeek();
  },

  onShow() {
    api.recordVisit('/pages/index').catch(() => {});
  },

  onPullDownRefresh() {
    this.loadCurrentWeek().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: `宝宝食谱 - ${this.data.weekTitle || '本周食谱'}`,
      path: this.data.weekId
        ? `/pages/detail/index?id=${this.data.weekId}`
        : '/pages/index/index',
    };
  },

  async loadCurrentWeek() {
    this.setData({ loading: true });
    try {
      const data = await api.getCurrentWeek();
      if (data && data.id) {
        this.setData({
          loading: false,
          weekData: data,
          weekTitle: getWeekTitle(data),
          weekId: data.id,
          hasData: true,
        });
      } else {
        this.setData({ loading: false, hasData: false });
      }
    } catch (e) {
      this.setData({ loading: false, hasData: false });
    }
  },
});
