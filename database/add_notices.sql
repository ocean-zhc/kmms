-- 公告表
CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 默认公告
INSERT INTO notices (title, content, is_active, sort_order) VALUES
('关于本系统', '每周一幼儿园会在园内展板公示本周食谱。如果您错过了拍照记录，可以随时在这里查看宝宝每天的用餐安排，再也不用担心错过啦！', true, 1),
('温馨提示', '食谱由园所营养师精心搭配，如宝宝有过敏食材，请及时告知班主任老师。', true, 2),
('功能说明', '本系统支持查看本周及历史食谱、AI营养分析点评，帮助家长全面了解宝宝的在园饮食。', true, 3);
