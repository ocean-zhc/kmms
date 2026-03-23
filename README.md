# KMMS - 幼儿园每周食谱管理系统

Kindergarten Weekly Meal Menu System

面向幼儿园的每周食谱管理与展示系统，支持管理员在线编排一周食谱、AI 营养分析，家长端可随时查看当周及历史食谱。通过 Docker 一键部署到 NAS 或任意服务器。

## 功能特性

**管理端** (`/admin`)
- 每周食谱编排：按周创建/编辑食谱，支持早餐、早点、午餐、午点、晚餐五餐
- 菜品库管理：维护常用菜品，编辑时快速选用
- AI 营养分析：接入 OpenAI 兼容 API，自动生成每周营养评估报告
- 访问统计：查看家长端页面访问数据
- 多角色支持：管理员 / 超级管理员

**家长端** (`/`)
- 当周食谱查看：自动展示本周食谱，含 AI 营养点评
- 历史食谱浏览：按周回顾过往食谱
- 移动端适配：响应式布局，手机访问体验良好

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | UmiJS 4 + React + Ant Design 5 + Pro Components + TypeScript |
| 后端 | PHP 8.2 (原生，无框架) + Apache |
| 数据库 | PostgreSQL |
| 部署 | Docker + Nginx 反向代理 |

## 项目结构

```
kmms/
├── api/                    # 后端 PHP API
│   ├── index.php           # 入口，正则路由分发
│   ├── config.php          # 配置（支持环境变量覆盖）
│   ├── db.php              # PDO 单例
│   ├── controllers/        # 控制器
│   │   ├── AuthController.php
│   │   ├── WeekController.php
│   │   ├── DishController.php
│   │   ├── AiController.php
│   │   ├── VisitController.php
│   │   └── WorkdayController.php
│   ├── middleware/          # JWT 鉴权 & CORS
│   └── helpers/             # 响应格式化
├── web/                    # 前端 UmiJS
│   ├── src/
│   │   ├── pages/admin/    # 管理端页面
│   │   ├── pages/public/   # 家长端页面
│   │   ├── layouts/        # 布局组件
│   │   ├── components/     # 通用组件
│   │   └── services/       # API 请求封装
│   └── .umirc.ts           # 路由 & 构建配置
├── database/               # SQL 初始化脚本
├── deploy/                 # 部署配置（Nginx、启动脚本）
├── Dockerfile.api          # API 镜像（PHP + Apache）
├── Dockerfile.web          # Web 镜像（Nginx）
├── docker-compose.yml      # 编排配置
└── deploy-to-nas.sh        # 一键构建部署脚本
```

## 快速开始

### 环境要求

- Node.js 18+
- PHP 8.2+
- PostgreSQL 14+
- Docker (部署用)

### 本地开发

```bash
# 1. 初始化数据库
psql -U postgres -d kmms -f database/init.sql
psql -U postgres -d kmms -f database/add_dishes.sql
psql -U postgres -d kmms -f database/add_ai.sql

# 2. 启动后端（PHP 内置服务器）
cd api && php -S 0.0.0.0:8080

# 3. 启动前端（自动代理 /api 到 8080）
cd web && npm install && npm run dev
```

访问 `http://localhost:8000`，管理后台 `http://localhost:8000/admin/login`。

### Docker 部署

```bash
# 构建镜像并导出
./deploy-to-nas.sh

# 或直接构建 + 部署到 NAS
./deploy-to-nas.sh user@nas-ip
```

部署脚本会自动完成：前端构建 → Docker 镜像打包 → 导出 tar.gz → 上传到 NAS → 提示启动命令。

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

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/auth/login` | 管理员登录 | - |
| GET | `/weeks` | 食谱周列表 | JWT |
| POST | `/weeks` | 创建食谱周 | JWT |
| PUT | `/weeks/{id}` | 更新食谱周 | JWT |
| GET | `/dishes` | 菜品列表 | JWT |
| POST | `/ai/summary` | 生成 AI 营养分析 | JWT |
| GET | `/public/current-week` | 当周食谱（家长端） | - |
| GET | `/public/weeks` | 历史食谱（家长端） | - |

## License

MIT
