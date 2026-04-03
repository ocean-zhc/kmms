const api = require('../../utils/api');
const { THEMES, applyTheme, getSavedThemeId, saveThemeId } = require('../../utils/theme');

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
    aboutText: '',
    features: [],
    stats: { total: 0, week: 0, today: 0 },
    notices: [],
    unreadCount: 0,
    noticeExpanded: false,
    themes: THEMES,
    currentTheme: getSavedThemeId(),
    themeStyle: '',
    allergenInput: '',
    allergens: [],
    favorites: [],
  },

  onLoad() {
    this.setData({ allergens: JSON.parse(wx.getStorageSync('kmms_allergens') || '[]') });
    this.loadSiteConfig();
    this.loadStats();
    this.loadNotices();
  },

  onShow() {
    applyTheme(this);
    api.recordVisit('/pages/about').catch(() => {});
    this.updateBadge();
    this.setData({ favorites: JSON.parse(wx.getStorageSync('kmms_favorites') || '[]') });
  },

  switchTheme(e) {
    const id = e.currentTarget.dataset.id;
    saveThemeId(id);
    this.setData({ currentTheme: id });
    applyTheme(this, id);
  },

  goLearning() {
    wx.navigateTo({ url: '/pages/learning/index' });
  },

  onAllergenInput(e) {
    this.setData({ allergenInput: e.detail.value });
  },

  addAllergen() {
    const name = this.data.allergenInput.trim();
    if (!name) return;
    const allergens = this.data.allergens;
    if (allergens.includes(name)) {
      wx.showToast({ title: '已存在', icon: 'none' });
      return;
    }
    allergens.push(name);
    wx.setStorageSync('kmms_allergens', JSON.stringify(allergens));
    this.setData({ allergens, allergenInput: '' });
  },

  removeAllergen(e) {
    const idx = e.currentTarget.dataset.index;
    const allergens = this.data.allergens;
    allergens.splice(idx, 1);
    wx.setStorageSync('kmms_allergens', JSON.stringify(allergens));
    this.setData({ allergens });
  },

  removeFavorite(e) {
    const idx = e.currentTarget.dataset.index;
    const favorites = this.data.favorites;
    favorites.splice(idx, 1);
    wx.setStorageSync('kmms_favorites', JSON.stringify(favorites));
    this.setData({ favorites });
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

  async loadSiteConfig() {
    try {
      const config = await api.getSiteConfig();
      if (config) {
        const aboutText = simpleMd(config.about_text || '');
        let features = [];
        try { features = JSON.parse(config.features || '[]'); } catch {}
        this.setData({
          aboutText,
          features,
          version: config.app_version || '1.0.0',
        });
      }
    } catch (e) {}
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
