const api = require('../../utils/api');

function simpleMd(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f5f5f5;padding:0 4px;border-radius:3px;font-size:0.9em;">$1</code>')
    .replace(/\n/g, '<br/>');
}

function getReadIds() {
  try {
    return JSON.parse(wx.getStorageSync('kmms_read_notices') || '[]');
  } catch { return []; }
}

Page({
  data: {
    version: '1.0.0',
    stats: { total: 0, week: 0, today: 0 },
    notices: [],
    unreadCount: 0,
    noticeExpanded: false,
  },

  onLoad() {
    this.loadStats();
    this.loadNotices();
  },

  onShow() {
    api.recordVisit('/pages/about').catch(() => {});
    this.updateBadge();
  },

  goLearning() {
    wx.navigateTo({ url: '/pages/learning/index' });
  },

  toggleNotice() {
    this.setData({ noticeExpanded: !this.data.noticeExpanded });
  },

  markRead(e) {
    const id = e.currentTarget.dataset.id;
    const readIds = getReadIds();
    if (!readIds.includes(id)) {
      readIds.push(id);
      wx.setStorageSync('kmms_read_notices', JSON.stringify(readIds));
    }
    const notices = this.data.notices.map(n => ({ ...n, isRead: readIds.includes(n.id) }));
    const unreadCount = notices.filter(n => !n.isRead).length;
    this.setData({ notices, unreadCount });
    this.updateBadge();
  },

  updateBadge() {
    const unread = this.data.unreadCount;
    if (unread > 0) {
      wx.setTabBarBadge({ index: 3, text: String(unread) });
    } else {
      wx.removeTabBarBadge({ index: 3 });
    }
  },

  async loadStats() {
    try {
      const stats = await api.getVisitStats();
      this.setData({ stats });
    } catch (e) {}
  },

  async loadNotices() {
    try {
      const list = await api.getNotices();
      if (list && list.length) {
        const readIds = getReadIds();
        list.forEach(n => {
          n.htmlContent = simpleMd(n.content);
          n.isRead = readIds.includes(n.id);
        });
        const unreadCount = list.filter(n => !n.isRead).length;
        this.setData({ notices: list, unreadCount });
        this.updateBadge();
      }
    } catch (e) {}
  },
});
