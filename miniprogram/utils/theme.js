const THEMES = [
  {
    id: 'green', name: '清新绿',
    primary: '#52c41a', primaryDark: '#389e0d',
    primaryLight: '#f6ffed', primaryBg: '#e8f8e0',
    bg: '#f8faf9', navBg: '#f0faf0', tabSelected: '#52c41a',
  },
  {
    id: 'orange', name: '暖橙奶油',
    primary: '#e8590c', primaryDark: '#c2410c',
    primaryLight: '#fff7ed', primaryBg: '#ffedd5',
    bg: '#fffbf0', navBg: '#fff8f0', tabSelected: '#e8590c',
  },
  {
    id: 'indigo', name: '靛蓝学院',
    primary: '#4f46e5', primaryDark: '#3730a3',
    primaryLight: '#eef2ff', primaryBg: '#e0e7ff',
    bg: '#f5f7ff', navBg: '#eef2ff', tabSelected: '#4f46e5',
  },
  {
    id: 'amber', name: '陶土自然',
    primary: '#b45309', primaryDark: '#92400e',
    primaryLight: '#fef3c7', primaryBg: '#fde68a',
    bg: '#fef9ee', navBg: '#fef3e2', tabSelected: '#b45309',
  },
  {
    id: 'violet', name: '薰衣草梦',
    primary: '#8b5cf6', primaryDark: '#7c3aed',
    primaryLight: '#f5f3ff', primaryBg: '#ede9fe',
    bg: '#faf8ff', navBg: '#f5f3ff', tabSelected: '#8b5cf6',
  },
  {
    id: 'pink', name: '樱花粉',
    primary: '#db2777', primaryDark: '#be185d',
    primaryLight: '#fdf2f8', primaryBg: '#fce7f3',
    bg: '#fef7fb', navBg: '#fdf2f8', tabSelected: '#db2777',
  },
  {
    id: 'cyan', name: '海洋蓝',
    primary: '#0891b2', primaryDark: '#0e7490',
    primaryLight: '#ecfeff', primaryBg: '#cffafe',
    bg: '#f5fdfe', navBg: '#ecfeff', tabSelected: '#0891b2',
  },
  {
    id: 'gold', name: '暖阳金',
    primary: '#ca8a04', primaryDark: '#a16207',
    primaryLight: '#fefce8', primaryBg: '#fef9c3',
    bg: '#fefef5', navBg: '#fefce8', tabSelected: '#ca8a04',
  },
  {
    id: 'terracotta', name: '玫瑰棕',
    primary: '#9a3412', primaryDark: '#7c2d12',
    primaryLight: '#fff7ed', primaryBg: '#fed7aa',
    bg: '#fffaf5', navBg: '#fff7ed', tabSelected: '#9a3412',
  },
  {
    id: 'forest', name: '森林墨',
    primary: '#166534', primaryDark: '#14532d',
    primaryLight: '#f0fdf4', primaryBg: '#dcfce7',
    bg: '#f5fdf8', navBg: '#f0fdf4', tabSelected: '#166534',
  },
];

const STORAGE_KEY = 'kmms_theme';

function getTheme(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

function getSavedThemeId() {
  return wx.getStorageSync(STORAGE_KEY) || 'green';
}

function saveThemeId(id) {
  wx.setStorageSync(STORAGE_KEY, id);
}

function buildStyleStr(theme) {
  return `--primary:${theme.primary};--primary-dark:${theme.primaryDark};--primary-light:${theme.primaryLight};--primary-bg:${theme.primaryBg};--bg:${theme.bg};`;
}

function applyTheme(pageCtx, themeId) {
  const theme = getTheme(themeId || getSavedThemeId());
  pageCtx.setData({ themeStyle: buildStyleStr(theme) });
  wx.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: theme.navBg,
    animation: { duration: 200, timingFunc: 'easeIn' },
  });
  wx.setTabBarStyle({
    selectedColor: theme.tabSelected,
  });
  wx.setBackgroundColor({
    backgroundColor: theme.bg,
  });
}

module.exports = { THEMES, getTheme, getSavedThemeId, saveThemeId, applyTheme };
