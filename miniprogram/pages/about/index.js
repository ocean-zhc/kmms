const api = require('../../utils/api');

Page({
  data: {
    version: '1.0.0',
    stats: { total: 0, week: 0, today: 0 },
  },

  onLoad() {
    this.loadStats();
  },

  onShow() {
    api.recordVisit('/pages/about').catch(() => {});
  },

  async loadStats() {
    try {
      const stats = await api.getVisitStats();
      this.setData({ stats });
    } catch (e) {}
  },
});
