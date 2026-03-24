const api = require('../../utils/api');
const { getWeekTitle } = require('../../utils/util');

Page({
  data: {
    loading: true,
    weekData: null,
    weekTitle: '',
    weekId: 0,
    hasData: false,
    notices: [],
    currentNotice: 0,
  },

  _noticeTimer: null,

  onLoad() {
    this.loadCurrentWeek();
    this.loadNotices();
  },

  onShow() {
    api.recordVisit('/pages/index').catch(() => {});
  },

  onUnload() {
    if (this._noticeTimer) clearInterval(this._noticeTimer);
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

  async loadNotices() {
    try {
      const list = await api.getNotices();
      if (list && list.length) {
        this.setData({ notices: list, currentNotice: 0 });
        if (list.length > 1) {
          this._noticeTimer = setInterval(() => {
            this.setData({
              currentNotice: (this.data.currentNotice + 1) % this.data.notices.length,
            });
          }, 5000);
        }
      }
    } catch (e) {}
  },
});
