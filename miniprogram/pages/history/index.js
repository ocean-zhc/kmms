const api = require('../../utils/api');
const { formatDateRange } = require('../../utils/util');

Page({
  data: {
    loading: true,
    weeks: [],
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: true,
    loadingMore: false,
  },

  onLoad() {
    this.loadWeeks(1);
  },

  onShow() {
    api.recordVisit('/pages/history').catch(() => {});
  },

  onPullDownRefresh() {
    this.loadWeeks(1).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMore();
    }
  },

  async loadWeeks(page) {
    if (page === 1) this.setData({ loading: true });
    try {
      const res = await api.getPublicWeeks(page, this.data.pageSize);
      const list = (res.list || []).map(item => {
        const ws = item.week_start || item.start_date || '';
        const we = item.week_end || item.end_date || '';
        const startDay = ws ? new Date(ws).getDate() : '';
        const startMonth = ws ? (new Date(ws).getMonth() + 1) + '月' : '';
        return {
          ...item,
          dateRange: formatDateRange(ws, we),
          startDay,
          startMonth,
        };
      });
      this.setData({
        loading: false,
        weeks: page === 1 ? list : this.data.weeks.concat(list),
        page,
        total: res.total || 0,
        hasMore: page * this.data.pageSize < (res.total || 0),
        loadingMore: false,
      });
    } catch (e) {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  async loadMore() {
    this.setData({ loadingMore: true });
    await this.loadWeeks(this.data.page + 1);
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
