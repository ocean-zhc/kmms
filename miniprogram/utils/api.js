const BASE_URL = 'https://kmms.ocean-zhc.com.cn/api';

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const msg = (res.data && res.data.message) || '请求失败';
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'));
      }
    });
  });
};

module.exports = {
  getTodayMenu: () => request('/public/today/menu'),
  getDailyAiSummary: (weekId, weekday) => request(`/public/ai/daily-summary/${weekId}/${weekday}`),
  getDailyNutrition: (weekId, weekday) => request(`/public/ai/daily-nutrition/${weekId}/${weekday}`),
  getCurrentWeek: () => request('/public/weeks/current'),
  getPublicWeeks: (page = 1, pageSize = 10) =>
    request(`/public/weeks?page=${page}&page_size=${pageSize}`),
  getPublicWeeksByMonth: (year, month) =>
    request(`/public/weeks/month?year=${year}&month=${month}`),
  getWeekDetail: (id) => request(`/public/weeks/${id}`),
  getAiSummary: (weekId) => request(`/public/ai/summary/${weekId}`),
  getNutrition: (weekId) => request(`/public/ai/nutrition/${weekId}`),
  getPublicDishes: () => request('/public/dishes'),
  searchDishes: (keyword) => request(`/public/search?keyword=${encodeURIComponent(keyword)}`),
  getDinnerRecommendation: (weekId, weekday) => request(`/public/ai/dinner/${weekId}/${weekday}`),
  recordVisit: (path) =>
    request('/public/visit', { method: 'POST', data: { path } }),
  getVisitStats: () => request('/public/visit/stats'),
  getNotices: () => request('/public/notices'),
  getSiteConfig: () => request('/public/site-config'),
  getDailyLearningToday: () => request('/public/daily-learning/today'),
  getDailyLearningsByMonth: (year, month) =>
    request(`/public/daily-learnings/month?year=${year}&month=${month}`),
};
