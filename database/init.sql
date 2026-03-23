-- 幼儿园食谱管理系统 数据库初始化脚本
-- PostgreSQL

-- 创建数据库
-- CREATE DATABASE kmms ENCODING 'UTF8';

-- 周次表
CREATE TABLE IF NOT EXISTS menu_weeks (
    id          SERIAL PRIMARY KEY,
    year        SMALLINT NOT NULL,
    week_number SMALLINT NOT NULL,
    week_start  DATE NOT NULL,
    week_end    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP,
    UNIQUE(year, week_number)
);

-- 食谱条目表
CREATE TABLE IF NOT EXISTS menu_items (
    id          SERIAL PRIMARY KEY,
    week_id     INTEGER NOT NULL REFERENCES menu_weeks(id) ON DELETE CASCADE,
    weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 5),
    meal_type   VARCHAR(10) NOT NULL CHECK (meal_type IN ('lunch', 'snack')),
    content     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(week_id, weekday, meal_type)
);

-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    real_name   VARCHAR(50),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id          SERIAL PRIMARY KEY,
    admin_id    INTEGER REFERENCES admin_users(id),
    action      VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id   INTEGER,
    detail      TEXT,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 工作日缓存表
CREATE TABLE IF NOT EXISTS workday_cache (
    date        DATE PRIMARY KEY,
    is_workday  BOOLEAN NOT NULL,
    fetched_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_menu_weeks_status ON menu_weeks(status);
CREATE INDEX IF NOT EXISTS idx_menu_weeks_start ON menu_weeks(week_start);
CREATE INDEX IF NOT EXISTS idx_menu_items_week ON menu_items(week_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_admin ON operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

-- 插入默认管理员 (密码: admin123)
INSERT INTO admin_users (username, password, real_name) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '系统管理员')
ON CONFLICT (username) DO NOTHING;
