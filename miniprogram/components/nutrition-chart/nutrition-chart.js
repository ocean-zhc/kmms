const api = require('../../utils/api');
const { trimMs } = require('../../utils/util');

Component({
  properties: {
    weekId: { type: Number, value: 0 },
    weekday: { type: Number, value: 0 },
  },

  observers: {
    'weekId, weekday'(id, wd) {
      if (id > 0) this.fetchNutrition(id, wd);
    },
  },

  data: {
    loading: true,
    hasData: false,
    expanded: true,
    score: 0,
    summary: '',
    cached: false,
    generatedAt: '',
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    vitamins: 0,
    minerals: 0,
    categories: [],
    conicGradient: '',
  },

  methods: {
    async fetchNutrition(weekId, weekday) {
      this.setData({ loading: true, hasData: false });
      try {
        const data = weekday > 0
          ? await api.getDailyNutrition(weekId, weekday)
          : await api.getNutrition(weekId);
        if (!data) {
          this.setData({ loading: false, hasData: false });
          return;
        }

        const macro = data.macronutrients || {};
        const micro = data.micronutrients || {};
        const cats = data.categories || {};

        const protein = macro.protein || 0;
        const carbs = macro.carbs || 0;
        const fat = macro.fat || 0;
        const total = protein + carbs + fat || 1;

        const pPct = Math.round((protein / total) * 100);
        const cPct = Math.round((carbs / total) * 100);
        const fPct = 100 - pPct - cPct;

        const catLabels = {
          staple: { name: '主食', emoji: '🍚' },
          meat: { name: '肉类', emoji: '🥩' },
          veg: { name: '蔬菜', emoji: '🥬' },
          soup: { name: '汤品', emoji: '🍲' },
          dairy: { name: '奶制品', emoji: '🥛' },
          fruit: { name: '水果', emoji: '🍎' },
        };
        const categories = Object.entries(cats)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => ({
            key: k,
            name: (catLabels[k] || {}).name || k,
            emoji: (catLabels[k] || {}).emoji || '🍽',
            count: v,
          }));

        this.setData({
          loading: false,
          hasData: true,
          score: data.score || 0,
          summary: data.summary || '',
          cached: !!data.cached,
          generatedAt: trimMs(data.generated_at || ''),
          protein: pPct,
          carbs: cPct,
          fat: fPct,
          fiber: micro.fiber || 0,
          vitamins: micro.vitamins || 0,
          minerals: micro.minerals || 0,
          categories,
        });
      } catch (e) {
        this.setData({ loading: false, hasData: false });
      }
    },

    toggleExpand() {
      this.setData({ expanded: !this.data.expanded });
    },
  },
});
