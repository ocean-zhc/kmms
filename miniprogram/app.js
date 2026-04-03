const { getSavedThemeId, getTheme } = require('./utils/theme');

App({
  onLaunch() {
    const sysInfo = wx.getSystemInfoSync();
    this.globalData.statusBarHeight = sysInfo.statusBarHeight;
    this.globalData.screenWidth = sysInfo.screenWidth;
    this.globalData.screenHeight = sysInfo.screenHeight;
    this.globalData.pixelRatio = sysInfo.pixelRatio;

    const theme = getTheme(getSavedThemeId());
    wx.setTabBarStyle({ selectedColor: theme.tabSelected });
  },
  globalData: {
    statusBarHeight: 0,
    screenWidth: 375,
    screenHeight: 667,
    pixelRatio: 2,
  }
});
