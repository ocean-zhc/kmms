const api = require('../../utils/api');
const { highlightText } = require('../../utils/util');

Component({
  properties: {
    weekId: { type: Number, value: 0 },
  },

  observers: {
    weekId(id) {
      if (id > 0) this.fetchSummary(id);
    },
  },

  data: {
    loading: true,
    content: '',
    nodes: [],
    cached: false,
    generatedAt: '',
    expanded: false,
    hasData: false,
  },

  methods: {
    async fetchSummary(weekId) {
      this.setData({ loading: true, hasData: false });
      try {
        const data = await api.getAiSummary(weekId);
        if (!data || !data.content) {
          this.setData({ loading: false, hasData: false });
          return;
        }
        const nodes = highlightText(data.content);
        this.setData({
          loading: false,
          hasData: true,
          content: data.content,
          nodes,
          cached: !!data.cached,
          generatedAt: data.generated_at || '',
          expanded: false,
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
