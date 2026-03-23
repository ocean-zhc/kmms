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

  onLoad(options) {
    const id = parseInt(options.id, 10);
    if (id > 0) {
      this.setData({ weekId: id });
      this.loadDetail(id);
    } else {
      this.setData({ loading: false, hasData: false });
    }
  },

  onShow() {
    api.recordVisit('/pages/detail').catch(() => {});
  },

  onShareAppMessage() {
    return {
      title: `宝宝食谱 - ${this.data.weekTitle || '食谱详情'}`,
      path: `/pages/detail/index?id=${this.data.weekId}`,
    };
  },

  async loadDetail(id) {
    this.setData({ loading: true });
    try {
      const data = await api.getWeekDetail(id);
      if (data && data.id) {
        const title = getWeekTitle(data);
        wx.setNavigationBarTitle({ title: `第${data.week_number}周食谱` });
        this.setData({
          loading: false,
          weekData: data,
          weekTitle: title,
          hasData: true,
        });
      } else {
        this.setData({ loading: false, hasData: false });
      }
    } catch (e) {
      this.setData({ loading: false, hasData: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
