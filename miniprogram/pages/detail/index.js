const api = require('../../utils/api');
const { getWeekTitle, parseDishes, MEAL_MAP } = require('../../utils/util');
const { applyTheme } = require('../../utils/theme');
const { drawPoster } = require('../../utils/poster');

Page({
  data: {
    loading: true,
    weekData: null,
    weekTitle: '',
    weekId: 0,
    hasData: false,
    showPoster: false,
    posterPath: '',
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
    applyTheme(this);
    api.recordVisit('/pages/detail').catch(() => {});
  },

  generatePoster() {
    wx.showLoading({ title: '生成中...' });
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      if (!res[0]) { wx.hideLoading(); return; }
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const dpr = wx.getWindowInfo().pixelRatio || 2;
      const cw = 375, ch = 660;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.scale(dpr, dpr);

      const items = this.data.weekData.items || [];
      const meals = [];
      for (let wd = 1; wd <= 5; wd++) {
        const dayItems = items.filter(i => i.weekday === wd || i.weekday === String(wd));
        if (dayItems.length === 0) continue;
        const weekdayNames = ['', '周一', '周二', '周三', '周四', '周五'];
        dayItems.forEach(item => {
          const mealInfo = MEAL_MAP[item.meal_type] || { label: item.meal_type, emoji: '🍽' };
          meals.push({
            label: weekdayNames[wd] + ' ' + mealInfo.label,
            emoji: mealInfo.emoji,
            dishes: parseDishes(item.content),
          });
        });
      }

      drawPoster(ctx, cw, ch, {
        title: '本周食谱',
        subtitle: this.data.weekTitle,
        meals,
      });

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
