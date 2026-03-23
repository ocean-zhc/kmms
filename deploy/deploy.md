# 幼儿园食谱管理系统 - 部署文档

## 环境要求

- PHP >= 8.0 (需启用 pdo_pgsql 扩展)
- PostgreSQL >= 12
- Node.js >= 16 (用于前端构建)
- Nginx

## 一、数据库部署

```bash
# 创建数据库
psql -h 192.168.1.3 -U postgres -c "CREATE DATABASE kmms ENCODING 'UTF8';"

# 执行初始化脚本
psql -h 192.168.1.3 -U postgres -d kmms -f database/init.sql
```

默认管理员账号：`admin` / `admin123`

## 二、后端部署

1. 将 `api/` 目录部署到服务器（如 `/var/www/kmms/api/`）
2. 修改 `api/config.php` 中的数据库连接信息和 JWT 密钥
3. 确保 PHP-FPM 已启动

## 三、前端部署

```bash
cd web

# 安装依赖
npm install

# 修改 .umirc.ts 中的 proxy 配置（生产环境指向实际API地址）
# 构建
npm run build

# 将 dist/ 目录部署到 Nginx
```

## 四、Nginx 配置

参考 `deploy/nginx.conf`，修改域名和路径后使用。

## 五、使用说明

### 管理端
- 访问 `/admin/login` 登录管理后台
- 在食谱管理页面可以新建、编辑、发布、归档、复制周食谱
- 新建时选择年份和ISO周次，系统自动计算日期范围
- 编辑页面按 周一~周五 × 营养午餐/快乐午点 的网格录入
- 保存后可选择发布，发布后家长端可见

### 家长端
- 访问首页 `/` 查看本周食谱
- 访问 `/history` 查看历史食谱
- 自动适配手机端和PC端

## 六、目录结构

```
kmms/
├── api/                    # PHP后端
│   ├── index.php          # 入口文件/路由
│   ├── config.php         # 配置文件
│   ├── db.php             # 数据库连接
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   └── helpers/           # 工具函数
├── web/                    # UmiJS前端
│   ├── src/
│   │   ├── layouts/       # 布局组件
│   │   ├── pages/         # 页面
│   │   ├── components/    # 公共组件
│   │   └── services/      # API服务
│   └── .umirc.ts          # Umi配置
├── database/
│   └── init.sql           # 数据库初始化脚本
└── deploy/
    ├── nginx.conf         # Nginx配置示例
    └── deploy.md          # 本文档
```
