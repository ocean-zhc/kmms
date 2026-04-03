const api = require('../../utils/api');
const { WEEKDAY_NAMES, WEEKDAY_EMOJIS, MEAL_MAP, parseDishes, getDishEmoji } = require('../../utils/util');
const { applyTheme } = require('../../utils/theme');
const { getTodayTip } = require('../../utils/tips');
const { drawPoster } = require('../../utils/poster');

Page({
  data: {
    loading: true,
    hasData: false,
    weekId: 0,
    weekday: 0,
    weekdayName: '',
    weekdayEmoji: '',
    date: '',
    meals: [],
    tip: null,
    dinnerLoading: false,
    dinnerData: null,
    dinnerExpanded: false,
    showPoster: false,
    posterPath: '',
  },

  onLoad() {
    this.setData({ tip: getTodayTip() });
    this.loadTodayMenu();
  },

  onShow() {
    applyTheme(this);
    api.recordVisit('/pages/today').catch(() => {});
  },

  onPullDownRefresh() {
    this.loadTodayMenu().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadDinner() {
    if (!this.data.weekId || !this.data.weekday) return;
    this.setData({ dinnerLoading: true, dinnerExpanded: true });
    try {
      const data = await api.getDinnerRecommendation(this.data.weekId, this.data.weekday);
      this.setData({ dinnerLoading: false, dinnerData: data });
    } catch (e) {
      this.setData({ dinnerLoading: false });
      wx.showToast({ title: '推荐生成失败', icon: 'none' });
    }
  },

  toggleDinner() {
    if (!this.data.dinnerData) {
      this.loadDinner();
      return;
    }
    this.setData({ dinnerExpanded: !this.data.dinnerExpanded });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  toggleFav(e) {
    const { mealIdx, dishIdx } = e.currentTarget.dataset;
    const dish = this.data.meals[mealIdx].dishes[dishIdx];
    let favs = [];
    try { favs = JSON.parse(wx.getStorageSync('kmms_favorites') || '[]'); } catch (e) {}
    const idx = favs.indexOf(dish.name);
    if (idx > -1) { favs.splice(idx, 1); } else { favs.push(dish.name); }
    wx.setStorageSync('kmms_favorites', JSON.stringify(favs));
    this.setData({ [`meals[${mealIdx}].dishes[${dishIdx}].isFavorite`]: favs.includes(dish.name) });
  },

  generatePoster() {
    wx.showLoading({ title: '生成中...' });
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) { wx.hideLoading(); return; }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      const cw = 375, ch = 560;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);

      const posterData = {
        title: this.data.weekdayName + ' 食谱',
        subtitle: this.data.date,
        meals: this.data.meals.map(m => ({
          label: m.label,
          emoji: m.emoji,
          dishes: m.dishes.map(d => d.name),
        })),
      };
      drawPoster(ctx, cw, ch, posterData);

      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvas,
          success: (r) => {
            this.setData({ posterPath: r.tempFilePath, showPoster: true });
            wx.hideLoading();
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '生成失败', icon: 'none' });
          },
        });
      }, 100);
    });
  },

  savePoster() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: () => wx.showToast({ title: '已保存到相册' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' }),
    });
  },

  closePoster() {
    this.setData({ showPoster: false });
  },

  onShareAppMessage() {
    return {
      title: `今日食谱 - ${this.data.weekdayName}`,
      path: '/pages/today/index',
    };
  },

  async loadTodayMenu() {
    this.setData({ loading: true });
    try {
      const data = await api.getTodayMenu();
      if (data && data.week_id && data.items) {
        const meals = [];
        const items = data.items || [];

        let allergens = [];
        try { allergens = JSON.parse(wx.getStorageSync('kmms_allergens') || '[]'); } catch (e) {}
        let favorites = [];
        try { favorites = JSON.parse(wx.getStorageSync('kmms_favorites') || '[]'); } catch (e) {}

        ['lunch', 'snack'].forEach(type => {
          const item = items.find(i => i.meal_type === type);
          if (item && item.content) {
            const mealInfo = MEAL_MAP[type] || { label: type, emoji: '🍽' };
            const dishes = parseDishes(item.content);
            meals.push({
              type,
              label: mealInfo.label,
              emoji: mealInfo.emoji,
              dishes: dishes.map((name, i) => ({
                name,
                emoji: getDishEmoji(name),
                colorIndex: i % 4,
                isAllergen: allergens.some(a => name.includes(a)),
                isFavorite: favorites.includes(name),
              })),
            });
          }
        });

        const hasContent = meals.some(m => m.dishes.length > 0);

        this.setData({
          loading: false,
          hasData: hasContent,
          weekId: data.week_id,
          weekday: data.weekday,
          weekdayName: data.weekday_name || WEEKDAY_NAMES[data.weekday] || '',
          weekdayEmoji: WEEKDAY_EMOJIS[data.weekday] || '☀️',
          date: data.date || '',
          meals,
        });
      } else {
        this.setData({ loading: false, hasData: false });
      }
    } catch (e) {
      this.setData({ loading: false, hasData: false });
    }
  },
});
