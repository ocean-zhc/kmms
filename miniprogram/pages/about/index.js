const api = require('../../utils/api');

Page({
  data: {
    version: '1.0.0',
    stats: { total: 0, week: 0, today: 0 },
    notices: [],
    currentNotice: 0,
  },

  _noticeTimer: null,

  onLoad() {
    this.loadStats();
    this.loadNotices();
  },

  onShow() {
    api.recordVisit('/pages/about').catch(() => {});
  },

  onUnload() {
    if (this._noticeTimer) clearInterval(this._noticeTimer);
  },

  goLearning() {
    wx.navigateTo({ url: '/pages/learning/index' });
  },

  async loadStats() {
    try {
      const stats = await api.getVisitStats();
      this.setData({ stats });
    } catch (e) {}
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
