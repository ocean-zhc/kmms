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
  },

  methods: {
    buildGrid(items, startDate) {
      const dayMap = {};
      for (let wd = 1; wd <= 5; wd++) {
        dayMap[wd] = {
          weekday: wd,
          name: WEEKDAY_NAMES[wd],
          emoji: WEEKDAY_EMOJIS[wd],
          date: getWeekdayDate(startDate, wd),
          meals: [],
        };
      }

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
          })),
        });
      });

      // 按 lunch -> snack 排序
      const mealOrder = { lunch: 0, snack: 1 };
      Object.values(dayMap).forEach(day => {
        day.meals.sort((a, b) => (mealOrder[a.type] || 0) - (mealOrder[b.type] || 0));
      });

      this.setData({ days: Object.values(dayMap) });
    },
  },
});
