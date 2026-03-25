const api = require('../../utils/api');
const { highlightText, trimMs } = require('../../utils/util');

Component({
  properties: {
    weekId: { type: Number, value: 0 },
    weekday: { type: Number, value: 0 },
  },

  observers: {
    'weekId, weekday'(id, wd) {
      if (id > 0) this.fetchSummary(id, wd);
    },
  },

  data: {
    loading: true,
    content: '',
    nodes: [],
    cached: false,
    generatedAt: '',
    expanded: true,
    hasData: false,
  },

  methods: {
    async fetchSummary(weekId, weekday) {
      this.setData({ loading: true, hasData: false });
      try {
        const data = weekday > 0
          ? await api.getDailyAiSummary(weekId, weekday)
          : await api.getAiSummary(weekId);
        if (!data || !data.summary || data.content) {
          this.setData({ loading: false, hasData: false });
          return;
        }
        const nodes = highlightText(data.summary || data.content);
        this.setData({
          loading: false,
          hasData: true,
          content: data.summary || data.content,
          nodes,
          cached: !!data.cached,
          generatedAt: trimMs(data.generated_at || ''),
          expanded: true,
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
