-- 管理员角色：admin=系统管理员, superadmin=配置管理员
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'admin';

-- 默认配置管理员 (密码: admin123)
INSERT INTO admin_users (username, password, real_name, role) VALUES
('superadmin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '配置管理员', 'superadmin')
ON CONFLICT (username) DO NOTHING;
