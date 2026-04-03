const api = require('../../utils/api');
const { applyTheme } = require('../../utils/theme');
const { parseDishes } = require('../../utils/util');

Page({
  data: {
    keyword: '',
    results: [],
    loading: false,
    searched: false,
    themeStyle: '',
  },

  _timer: null,

  onShow() {
    applyTheme(this);
  },

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    if (this._timer) clearTimeout(this._timer);
    if (!keyword.trim()) {
      this.setData({ results: [], searched: false });
      return;
    }
    this._timer = setTimeout(() => this.doSearch(), 500);
  },

  onClear() {
    this.setData({ keyword: '', results: [], searched: false });
  },

  async doSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;
    this.setData({ loading: true });
    try {
      const raw = await api.searchDishes(keyword);
      const results = (raw || []).map(r => {
        const dishes = parseDishes(r.content);
        const matched = dishes.filter(d => d.includes(keyword));
        return {
          weekId: r.week_id,
          year: r.year,
          weekNumber: r.week_number,
          weekStart: r.week_start,
          weekEnd: r.week_end,
          weekdayName: r.weekday_name,
          mealLabel: r.meal_label,
          matched: matched.join('、'),
          allDishes: dishes.join('、'),
        };
      });
      this.setData({ results, loading: false, searched: true });
    } catch (e) {
      this.setData({ loading: false, searched: true, results: [] });
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
