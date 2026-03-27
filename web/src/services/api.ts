const API_BASE = '/api';

const getToken = () => localStorage.getItem('kmms_token') || '';

async function req(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  return data;
}

// ============ 认证 ============
export async function login(data: { username: string; password: string }) {
  return req('/auth/login', { method: 'POST', body: JSON.stringify(data) });
}

export async function getCurrentUser() {
  return req('/auth/current');
}

export async function changePassword(data: { oldPassword: string; newPassword: string }) {
  return req('/auth/password', { method: 'PUT', body: JSON.stringify(data) });
}

// ============ 管理端 - 周食谱 ============
export async function getAdminWeeks(params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return req(`/admin/weeks${qs}`);
}

export async function getAdminWeekDetail(id: number) {
  return req(`/admin/weeks/${id}`);
}

export async function createWeek(data: { year: number; week_number: number }) {
  return req('/admin/weeks', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateWeekItems(id: number, items: any[]) {
  return req(`/admin/weeks/${id}/items`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}

export async function publishWeek(id: number) {
  return req(`/admin/weeks/${id}/publish`, { method: 'PUT' });
}

export async function archiveWeek(id: number) {
  return req(`/admin/weeks/${id}/archive`, { method: 'PUT' });
}

export async function deleteWeek(id: number) {
  return req(`/admin/weeks/${id}`, { method: 'DELETE' });
}

export async function copyWeek(id: number, data: { target_year: number; target_week: number }) {
  return req(`/admin/weeks/${id}/copy`, { method: 'POST', body: JSON.stringify(data) });
}

// ============ 菜谱管理 ============
export async function getDishes(params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return req(`/admin/dishes${qs}`);
}

export async function getAllDishes(mealType?: string) {
  const qs = mealType ? `?meal_type=${mealType}` : '';
  return req(`/admin/dishes/all${qs}`);
}

export async function createDish(data: { name: string; meal_type: string }) {
  return req('/admin/dishes', { method: 'POST', body: JSON.stringify(data) });
}

export async function batchCreateDishes(items: Array<{ name: string; meal_type: string }>) {
  return req('/admin/dishes/batch', { method: 'POST', body: JSON.stringify({ items }) });
}

export async function updateDish(id: number, data: { name: string; meal_type: string }) {
  return req(`/admin/dishes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteDish(id: number) {
  return req(`/admin/dishes/${id}`, { method: 'DELETE' });
}

export async function batchDeleteDishes(ids: number[]) {
  return req('/admin/dishes/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

// ============ 公共接口 ============
export async function getCurrentWeek() {
  return req('/public/weeks/current');
}

export async function getTodayMenu() {
  return req('/public/today/menu');
}

export async function getDailyAiSummary(weekId: number, weekday: number) {
  return req(`/public/ai/daily-summary/${weekId}/${weekday}`);
}

export async function getDailyNutritionAnalysis(weekId: number, weekday: number) {
  return req(`/public/ai/daily-nutrition/${weekId}/${weekday}`);
}

export async function getPublicWeeks(params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return req(`/public/weeks${qs}`);
}

export async function getPublicWeekDetail(id: number) {
  return req(`/public/weeks/${id}`);
}

export async function getPublicDishes() {
  return req('/public/dishes');
}

// ============ AI配置与总结 ============
export async function getAiConfig() {
  return req('/admin/ai/config');
}

export async function getAiModels(apiUrl?: string, apiKey?: string) {
  const params: Record<string, string> = {};
  if (apiUrl) params.api_url = apiUrl;
  if (apiKey) params.api_key = apiKey;
  const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
  return req(`/admin/ai/models${qs}`);
}

export async function updateAiConfig(data: any) {
  return req('/admin/ai/config', { method: 'PUT', body: JSON.stringify(data) });
}

export async function checkAiAvailability() {
  return req('/admin/ai/check');
}

export async function getAiSummary(weekId: number) {
  return req(`/public/ai/summary/${weekId}`);
}

export async function getNutritionAnalysis(weekId: number) {
  return req(`/public/ai/nutrition/${weekId}`);
}

export async function regenerateAiSummary(weekId: number) {
  return req(`/admin/ai/summary/${weekId}/regenerate`, { method: 'POST' });
}

export async function listAiSummaries() {
  return req('/admin/ai/summaries');
}

export async function deleteAiSummary(weekId: number) {
  return req(`/admin/ai/summary/${weekId}`, { method: 'DELETE' });
}

export async function clearAllAiSummaries() {
  return req('/admin/ai/summaries/clear', { method: 'POST' });
}

// ============ OCR识别 ============
export async function getOcrConfig() {
  return req('/admin/ocr/config');
}

export async function updateOcrConfig(data: any) {
  return req('/admin/ocr/config', { method: 'PUT', body: JSON.stringify(data) });
}

export async function ocrRecognize(data: { image_url?: string; image_base64?: string }) {
  return req('/admin/ocr/recognize', { method: 'POST', body: JSON.stringify(data) });
}

// ============ 访问统计 ============
export async function recordVisit(path: string) {
  return req('/public/visit', { method: 'POST', body: JSON.stringify({ path }) });
}

export async function getVisitStats() {
  return req('/public/visit/stats');
}

export async function getAdminVisits(params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
  return req(`/admin/visits${qs}`);
}

export async function getVisitOverview() {
  return req('/admin/visits/overview');
}

// ============ 公告 ============
export async function getPublicNotices() {
  return req('/public/notices');
}
export async function getAdminNotices() {
  return req('/admin/notices');
}
export async function createNotice(data: { title: string; content: string; sort_order?: number }) {
  return req('/admin/notices', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateNotice(id: number, data: any) {
  return req(`/admin/notices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function deleteNotice(id: number) {
  return req(`/admin/notices/${id}`, { method: 'DELETE' });
}

// ============ 今日所学 ============
export async function getDailyLearningToday() {
  return req('/public/daily-learning/today');
}

export async function getDailyLearnings(limit = 10) {
  return req(`/public/daily-learnings?limit=${limit}`);
}

export async function getDailyLearningsByMonth(year: number, month: number) {
  return req(`/public/daily-learnings/month?year=${year}&month=${month}`);
}

// ============ 站点配置 ============
export async function getSiteConfig() {
  return req('/public/site-config');
}
export async function getAdminSiteConfig() {
  return req('/admin/site-config');
}
export async function updateSiteConfig(data: Record<string, string>) {
  return req('/admin/site-config', { method: 'PUT', body: JSON.stringify(data) });
}

// ============ 工作日 ============
export async function getWorkdays(year: number, month: number) {
  return req(`/workdays/${year}/${month}`);
}
