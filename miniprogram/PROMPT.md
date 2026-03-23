# KMMS 微信小程序版本 - 开发提示词

## 项目背景

KMMS（幼儿园每周食谱管理系统）已有 Web 版本（PHP API + UmiJS 前端）。现需开发**微信小程序版本**，面向家长使用，复用现有 PHP API 后端，无需开发管理端（管理员继续使用 Web 端）。

## 现有 API 后端信息

**基础地址**：`https://你的域名/api`（小程序要求 HTTPS）

### 小程序需要调用的公共接口（无需鉴权）

| 方法 | 路径 | 说明 | 响应数据 |
|------|------|------|----------|
| GET | `/public/weeks/current` | 获取当周已发布食谱 | `{ code: 0, data: { id, year, week_number, start_date, end_date, status, items: [{weekday, meal_type, content}] } }` |
| GET | `/public/weeks` | 历史食谱列表（分页） | `{ code: 0, data: { list: [...], total, page, page_size } }` |
| GET | `/public/weeks/{id}` | 指定周食谱详情 | 同 current 结构 |
| GET | `/public/dishes` | 所有菜品名称列表 | `{ code: 0, data: [{id, name, category}] }` |
| GET | `/public/ai/summary/{weekId}` | AI 营养点评 | `{ code: 0, data: { content, cached, generated_at } }` |
| GET | `/public/ai/nutrition/{weekId}` | 营养分析数据 | `{ code: 0, data: { macronutrients: {protein,carbs,fat}, micronutrients: {fiber,vitamins,minerals}, categories: {staple,meat,veg,soup,dairy,fruit}, score, summary } }` |
| POST | `/public/visit` | 记录访问 | body: `{ path, user_agent? }` |
| GET | `/public/visit/stats` | 访问统计 | `{ code: 0, data: { total, week, today } }` |

### 数据结构关键说明

- **menu_items.content**：菜品内容，多个菜品用 `|||` 分隔（如 `"红烧肉|||炒青菜|||紫菜蛋花汤"`）
- **meal_type**：餐次类型，值为 `lunch`（午餐）或 `snack`（点心）
- **weekday**：1-7 对应周一到周日，幼儿园通常只用 1-5（工作日）
- **status**：`draft` / `published` / `archived`，公共接口只返回 `published`
- **API 响应统一格式**：`{ code: 0, data: ..., message: "success" }`，错误时 `code !== 0`

## 小程序功能需求

### 页面结构（3 个 Tab + 详情页）

```
TabBar:
├── 📋 本周食谱 (pages/index/index)        — 首页，展示当周食谱
├── 📅 历史食谱 (pages/history/index)      — 按周浏览历史食谱
└── 👤 关于 (pages/about/index)            — 幼儿园信息、小程序说明

详情页（非Tab）:
└── 📋 食谱详情 (pages/detail/index)       — 查看某一周食谱详情
```

### 页面 1：本周食谱（首页）

**功能**：
- 调用 `GET /public/weeks/current` 获取当周食谱
- 顶部展示周信息：`2026年第13周（3.23 - 3.29）`
- **食谱网格**：按工作日（周一~周五）展示，每天显示午餐和点心
  - 解析 content 中的 `|||` 分隔符，每个菜品单独展示为标签/卡片
  - 午餐用 🍚 图标，点心用 🍰 图标
- **AI 营养点评**：调用 `GET /public/ai/summary/{weekId}`
  - 关键词高亮：蛋白质(绿)、碳水(蓝)、维生素(黄)、钙铁锌(粉)
  - 支持折叠/展开
- **营养分析**：调用 `GET /public/ai/nutrition/{weekId}`
  - Canvas 绘制环形图（蛋白质/碳水/脂肪占比）
  - 中心显示综合评分（0-100）
  - 下方微量元素进度条
- **空状态**：未发布时显示友好提示"本周食谱尚未发布，请稍后查看"
- **下拉刷新**：支持页面下拉刷新

### 页面 2：历史食谱

**功能**：
- 调用 `GET /public/weeks?page=1&page_size=10` 分页加载
- 列表形式展示历史周食谱卡片：
  - 显示：年份、周次、日期范围、发布时间
  - 点击进入详情页
- **上拉加载更多**：触底自动加载下一页
- **空状态**：暂无历史食谱

### 页面 3：关于

- 幼儿园名称和简介（可配置）
- 小程序版本号
- 访问统计展示（调 `/public/visit/stats`）

### 详情页：食谱详情

- 与首页结构相同，但加载指定周数据（`GET /public/weeks/{id}`）
- 包含食谱网格 + AI 营养点评 + 营养分析
- 支持分享到聊天/朋友圈

## 技术要求

### 项目初始化

```
miniprogram/
├── app.js                  # 小程序入口，全局配置
├── app.json                # 页面路由、TabBar、窗口配置
├── app.wxss                # 全局样式
├── utils/
│   ├── api.js              # API 请求封装（wx.request）
│   └── util.js             # 工具函数（日期格式化等）
├── components/
│   ├── menu-grid/          # 食谱网格组件
│   ├── ai-summary/         # AI 营养点评组件
│   └── nutrition-chart/    # 营养分析图表组件（Canvas 2D）
├── pages/
│   ├── index/              # 本周食谱
│   ├── history/            # 历史食谱
│   ├── detail/             # 食谱详情
│   └── about/              # 关于
└── images/                 # 图标资源
```

### API 封装要求

```javascript
// utils/api.js
const BASE_URL = 'https://你的域名/api';

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(res.data.message || '请求失败');
        }
      },
      fail: reject
    });
  });
};

// 导出所有接口
module.exports = {
  getCurrentWeek: () => request('/public/weeks/current'),
  getPublicWeeks: (page = 1, pageSize = 10) => request(`/public/weeks?page=${page}&page_size=${pageSize}`),
  getWeekDetail: (id) => request(`/public/weeks/${id}`),
  getAiSummary: (weekId) => request(`/public/ai/summary/${weekId}`),
  getNutrition: (weekId) => request(`/public/ai/nutrition/${weekId}`),
  getPublicDishes: () => request('/public/dishes'),
  recordVisit: (path) => request('/public/visit', { method: 'POST', data: { path } }),
  getVisitStats: () => request('/public/visit/stats'),
};
```

### 样式规范

**配色**（与 Web 版保持一致）：
- 主色：`#52c41a`（绿色，代表健康/食物）
- 辅助色：`#1890ff`（蓝）、`#faad14`（橙）、`#ff4d4f`（红）
- 背景：`#f5f5f5`
- 卡片背景：`#ffffff`
- 文字：`#333`（主）、`#666`（次）、`#999`（辅助）

**菜品标签颜色循环**（与 Web 版 MenuGrid 一致）：
```css
/* 4色循环 */
.dish-tag-0 { background: linear-gradient(135deg, #e6f7ff, #bae7ff); color: #1890ff; }
.dish-tag-1 { background: linear-gradient(135deg, #f6ffed, #d9f7be); color: #52c41a; }
.dish-tag-2 { background: linear-gradient(135deg, #fff7e6, #ffd591); color: #fa8c16; }
.dish-tag-3 { background: linear-gradient(135deg, #fff1f0, #ffccc7); color: #ff4d4f; }
```

**间距**：
- 页面边距：`32rpx`
- 卡片内边距：`24rpx`
- 卡片圆角：`16rpx`
- 元素间距：`16rpx`

**字号**：
- 标题：`36rpx`（粗体）
- 副标题：`30rpx`
- 正文：`28rpx`
- 辅助文字：`24rpx`

### 组件设计

#### menu-grid 组件

```
Properties:
  - items: Array<{weekday, meal_type, content}>  // 食谱数据
  - compact: Boolean  // 紧凑模式（历史列表用）

结构：
  竖向排列，每天一个卡片：
  ┌─────────────────────┐
  │ 📅 周一 (3/23)       │
  │ ─────────────────── │
  │ 🍚 午餐              │
  │ [红烧肉] [炒青菜]    │  ← 菜品标签，颜色循环
  │ [紫菜蛋花汤]         │
  │ ─────────────────── │
  │ 🍰 点心              │
  │ [水果拼盘] [酸奶]    │
  └─────────────────────┘
```

#### nutrition-chart 组件

```
Properties:
  - weekId: Number

使用 Canvas 2D 绘制：
  - 环形图（蛋白质#52c41a / 碳水#1890ff / 脂肪#faad14）
  - 中心评分数字
  - 底部进度条（纤维素、维生素、矿物质）
  - 食材分类标签（主食、肉类、蔬菜、汤品、奶制品、水果）
```

#### ai-summary 组件

```
Properties:
  - weekId: Number

功能：
  - 获取 AI 点评内容
  - 正则匹配关键词并用 rich-text 渲染彩色高亮
  - 折叠/展开切换
  - 显示缓存状态和生成时间
```

### app.json 配置参考

```json
{
  "pages": [
    "pages/index/index",
    "pages/history/index",
    "pages/detail/index",
    "pages/about/index"
  ],
  "window": {
    "navigationBarBackgroundColor": "#52c41a",
    "navigationBarTitleText": "宝宝食谱",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f5f5f5",
    "backgroundTextStyle": "dark",
    "enablePullDownRefresh": false
  },
  "tabBar": {
    "color": "#999",
    "selectedColor": "#52c41a",
    "backgroundColor": "#fff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "本周食谱",
        "iconPath": "images/tab-menu.png",
        "selectedIconPath": "images/tab-menu-active.png"
      },
      {
        "pagePath": "pages/history/index",
        "text": "历史食谱",
        "iconPath": "images/tab-history.png",
        "selectedIconPath": "images/tab-history-active.png"
      },
      {
        "pagePath": "pages/about/index",
        "text": "关于",
        "iconPath": "images/tab-about.png",
        "selectedIconPath": "images/tab-about-active.png"
      }
    ]
  },
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

### 分享功能

每个食谱页面支持转发：
```javascript
onShareAppMessage() {
  return {
    title: `宝宝食谱 - ${this.data.weekTitle}`,
    path: `/pages/detail/index?id=${this.data.weekId}`,
    imageUrl: '' // 可选：生成食谱截图
  };
}
```

### 注意事项

1. **域名配置**：小程序后台需配置 API 域名为合法域名（HTTPS）
2. **Content 解析**：菜品内容用 `|||` 分隔，`content.split('|||')` 获取菜品数组
3. **AI 接口容错**：AI 功能可能未启用，接口返回错误时静默隐藏相关区域
4. **空数据处理**：周末、寒暑假可能无食谱，需友好提示
5. **性能优化**：历史列表使用分页加载，避免一次拉取全部数据
6. **访问记录**：每次进入页面调用 `recordVisit()` 记录，与 Web 端统计打通
7. **TabBar 图标**：需准备 6 张图标（3个 tab × 选中/未选中），尺寸 81×81px
