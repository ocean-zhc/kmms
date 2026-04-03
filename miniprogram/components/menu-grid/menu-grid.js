const { WEEKDAY_NAMES, WEEKDAY_EMOJIS, MEAL_MAP, parseDishes, getWeekdayDate, getDishEmoji } = require('../../utils/util');

Component({
  properties: {
    items: { type: Array, value: [] },
    startDate: { type: String, value: '' },
    compact: { type: Boolean, value: false },
  },

  observers: {
    'items, startDate'(items, startDate) {
      this.buildGrid(items, startDate);
    },
  },

  data: {
    days: [],
    todayWeekday: 0,
  },

  methods: {
    toggleFav(e) {
      const { dayIdx, mealIdx, dishIdx } = e.currentTarget.dataset;
      const dish = this.data.days[dayIdx].meals[mealIdx].dishes[dishIdx];
      let favs = [];
      try { favs = JSON.parse(wx.getStorageSync('kmms_favorites') || '[]'); } catch (e) {}
      const idx = favs.indexOf(dish.name);
      if (idx > -1) { favs.splice(idx, 1); } else { favs.push(dish.name); }
      wx.setStorageSync('kmms_favorites', JSON.stringify(favs));
      this.setData({ [`days[${dayIdx}].meals[${mealIdx}].dishes[${dishIdx}].isFavorite`]: favs.includes(dish.name) });
    },

    buildGrid(items, startDate) {
      const dayMap = {};
      for (let wd = 1; wd <= 5; wd++) {
        dayMap[wd] = {
          weekday: wd,
          name: WEEKDAY_NAMES[wd],
          emoji: WEEKDAY_EMOJIS[wd],
          date: getWeekdayDate(startDate, wd),
          meals: [],
          isToday: false,
        };
      }

      let allergens = [];
      try { allergens = JSON.parse(wx.getStorageSync('kmms_allergens') || '[]'); } catch (e) {}
      let favorites = [];
      try { favorites = JSON.parse(wx.getStorageSync('kmms_favorites') || '[]'); } catch (e) {}

      (items || []).forEach(item => {
        const wd = item.weekday;
        if (wd < 1 || wd > 5 || !dayMap[wd]) return;
        const mealInfo = MEAL_MAP[item.meal_type] || { label: item.meal_type, emoji: '🍽' };
        const dishes = parseDishes(item.content);
        dayMap[wd].meals.push({
          type: item.meal_type,
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
      });

      // 按 lunch -> snack 排序
      const mealOrder = { lunch: 0, snack: 1 };
      Object.values(dayMap).forEach(day => {
        day.meals.sort((a, b) => (mealOrder[a.type] || 0) - (mealOrder[b.type] || 0));
      });

      // 判断今天是周几
      let todayWd = 0;
      if (startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
        if (diff >= 0 && diff < 5) {
          todayWd = diff + 1;
          dayMap[todayWd].isToday = true;
        }
      }

      // 过滤无食谱的天，今日排最前
      const allDays = Object.values(dayMap).filter(d => d.meals.some(m => m.dishes.length > 0));
      if (todayWd > 0) {
        const todayItem = allDays.find(d => d.weekday === todayWd);
        const rest = allDays.filter(d => d.weekday !== todayWd);
        this.setData({ days: todayItem ? [todayItem, ...rest] : allDays, todayWeekday: todayWd });
      } else {
        this.setData({ days: allDays, todayWeekday: 0 });
      }
    },
  },
});
