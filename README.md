# KMMS - 幼儿园食谱管理系统

Kindergarten Meal Menu System

面向幼儿园的食谱管理与展示系统，支持管理员在线编排食谱、AI 营养分析，家长端可查看今日/本周/历史食谱。支持浏览器和微信小程序双端访问，通过 Docker 部署到 NAS 或服务器。

## 功能特性

### 家长端

- **今日食谱** (`/today`) — 当天午餐+午点精美展示，AI 每日营养分析与点评
- **本周食谱** (`/`) — 周一至周五完整食谱 Bento 卡片布局，今日高亮标记
- **历史食谱** (`/history`) — 往期食谱分页浏览
- **公告栏** — 园所通知自动轮播
- **AI 营养分析** — 营养评分环形图、三大营养素占比、微量元素充足度、食材品类分布
- **AI 营养点评** — 智能生成亲切的营养建议，关键词高亮
- **移动端适配** — 响应式布局，手机体验友好

### 管理端 (`/admin`)

- **食谱管理** — 创建/编辑/发布/归档/复制周食谱，支持 OCR 图片识别自动填充
- **菜谱库** — 菜品 CRUD + 批量导入
- **公告管理** — 发布/编辑/删除园所公告
- **AI 配置** — 配置 AI API 地址、模型、提示词、OCR 模型
- **访问统计** — 页面浏览量、设备分布、趋势图表

### 微信小程序

- 与浏览器端功能一致，原生小程序体验
- 今日食谱（默认首页）/ 本周食谱 / 历史食谱 / 关于
- 食物 emoji 自动识别、AI 关键词高亮

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | PHP 8.2 (无框架) + Apache + PostgreSQL |
| 前端 | UmiJS 4 + Ant Design 5 + TypeScript |
| 小程序 | 微信原生小程序 |
| 部署 | Docker (PHP-Apache + Nginx) |
| AI | OpenAI 兼容 API (可配置任意兼容服务) |

## 项目结构

```
kmms/
├── api/                  # PHP 后端
│   ├── index.php         # 路由入口（正则分发）
│   ├── config.php        # 配置（环境变量覆盖）
│   ├── db.php            # PDO 单例
│   ├── controllers/      # Auth, Week, Dish, Ai, Notice, Visit, Workday
│   ├── middleware/        # JWT 认证, CORS
│   ├── helpers/          # json_success / json_error
│   └── scripts/          # 定时任务脚本
├── web/                  # UmiJS 前端
│   ├── .umirc.ts         # 路由 + 代理 + 主题配置
│   ├── src/layouts/      # AdminLayout, PublicLayout
│   ├── src/pages/        # admin/ + public/ (today, index, history)
│   ├── src/components/   # MenuGrid, AiSummary, NutritionAnalysis, NoticeBar
│   └── src/services/     # API 调用层
├── miniprogram/          # 微信小程序
│   ├── pages/            # today, index, history, detail, about
│   ├── components/       # menu-grid, ai-summary, nutrition-chart
│   └── utils/            # api.js, util.js
├── database/             # SQL 迁移脚本
│   ├── init.sql          # 核心表
│   ├── add_dishes.sql    # 菜品数据
│   ├── add_ai.sql        # AI 配置表 + 缓存表
│   ├── add_nutrition.sql # 营养数据字段
│   ├── add_notices.sql   # 公告表
│   └── add_daily_summaries.sql  # 每日 AI 分析缓存表
├── deploy/               # Nginx 配置, 启动脚本
├── Dockerfile.api        # API 镜像 (PHP + Apache)
├── Dockerfile.web        # Web 镜像 (Nginx)
└── docker-compose.yml    # 容器编排
```

## 快速开始

### 环境要求

- Node.js 18+
- PHP 8.2+
- PostgreSQL 14+
- Docker (部署用)

### 本地开发

```bash
# 1. 初始化数据库（按顺序执行）
psql -U postgres -d kmms -f database/init.sql
psql -U postgres -d kmms -f database/add_dishes.sql
psql -U postgres -d kmms -f database/add_ai.sql
psql -U postgres -d kmms -f database/add_nutrition.sql
psql -U postgres -d kmms -f database/add_notices.sql
psql -U postgres -d kmms -f database/add_daily_summaries.sql

# 2. 启动后端
cd api && php -S 0.0.0.0:8080

# 3. 启动前端（自动代理 /api → localhost:8080）
cd web && npm install && npm run dev
```

访问 http://localhost:8000，管理后台 http://localhost:8000/admin/login

### Docker 构建与部署

```bash
# 构建前端
cd web && npm run build

# 构建镜像 (amd64)
docker build --platform linux/amd64 -f Dockerfile.api -t 2192059462/kmms-api:latest .
docker build --platform linux/amd64 -f Dockerfile.web -t 2192059462/kmms-web:latest .

# 推送 Docker Hub
docker push 2192059462/kmms-api:latest
docker push 2192059462/kmms-web:latest
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | 数据库地址 | `127.0.0.1` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_NAME` | 数据库名 | `kmms` |
| `DB_USER` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | - |
| `JWT_SECRET` | JWT 签名密钥 | - |

## API 概览

### 公开接口（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/public/today/menu` | 今日食谱 |
| GET | `/public/weeks/current` | 当周食谱 |
| GET | `/public/weeks` | 历史食谱列表 |
| GET | `/public/weeks/{id}` | 周食谱详情 |
| GET | `/public/ai/summary/{weekId}` | 周 AI 营养点评 |
| GET | `/public/ai/nutrition/{weekId}` | 周营养分析数据 |
| GET | `/public/ai/daily-summary/{weekId}/{weekday}` | 每日 AI 点评 |
| GET | `/public/ai/daily-nutrition/{weekId}/{weekday}` | 每日营养分析 |
| GET | `/public/notices` | 公告列表 |
| GET | `/public/dishes` | 菜品名称列表 |

### 管理接口（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 管理员登录 |
| GET/POST | `/admin/weeks` | 食谱周列表/创建 |
| PUT | `/admin/weeks/{id}/items` | 更新食谱条目 |
| PUT | `/admin/weeks/{id}/publish` | 发布食谱 |
| GET/POST | `/admin/dishes` | 菜品管理 |
| GET/PUT | `/admin/ai/config` | AI 配置 |
| GET/POST/PUT/DELETE | `/admin/notices` | 公告管理 |
| POST | `/admin/ocr/recognize` | OCR 识别食谱图片 |

## 默认账号

- 管理员：`admin` / `admin123`

## License

MIT
