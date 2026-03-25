const api = require('../../utils/api');
const { WEEKDAY_NAMES, WEEKDAY_EMOJIS, MEAL_MAP, parseDishes, getDishEmoji } = require('../../utils/util');

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
  },

  onLoad() {
    this.loadTodayMenu();
  },

  onShow() {
    api.recordVisit('/pages/today').catch(() => {});
  },

  onPullDownRefresh() {
    this.loadTodayMenu().then(() => {
      wx.stopPullDownRefresh();
    });
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
