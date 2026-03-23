-- 菜谱管理表
CREATE TABLE IF NOT EXISTS dishes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    meal_type   VARCHAR(10) NOT NULL CHECK (meal_type IN ('lunch', 'snack')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(name, meal_type)
);

CREATE INDEX IF NOT EXISTS idx_dishes_meal_type ON dishes(meal_type);
CREATE INDEX IF NOT EXISTS idx_dishes_name ON dishes(name);

-- 从图片初始化菜谱库（营养午餐）
INSERT INTO dishes (name, meal_type) VALUES
('黄米饭', 'lunch'),
('米饭', 'lunch'),
('土豆烧牛肉', 'lunch'),
('玉米炒火腿肠', 'lunch'),
('山药排骨汤', 'lunch'),
('水煮肉片', 'lunch'),
('时蔬炒鸡蛋', 'lunch'),
('润肺雪梨糖水', 'lunch'),
('百花酿鸡翅', 'lunch'),
('清炒西兰花', 'lunch'),
('紫菜蛋花汤', 'lunch'),
('红烧排骨', 'lunch'),
('蒜蓉生菜', 'lunch'),
('番茄蛋花汤', 'lunch'),
('炸鸡排薯条', 'lunch'),
('可乐鸡翅', 'lunch'),
('玉米粒', 'lunch'),
('南瓜小米粥', 'lunch'),
('蒸水蛋', 'lunch'),
('香菇滑鸡', 'lunch'),
('麻婆豆腐', 'lunch'),
('青椒肉丝', 'lunch'),
('冬瓜排骨汤', 'lunch')
ON CONFLICT (name, meal_type) DO NOTHING;

-- 从图片初始化菜谱库（快乐午点）
INSERT INTO dishes (name, meal_type) VALUES
('红薯薏米粥', 'snack'),
('面包', 'snack'),
('牛奶', 'snack'),
('番薯', 'snack'),
('黑米粥', 'snack'),
('椰奶西米露', 'snack'),
('饼干', 'snack'),
('香蕉', 'snack'),
('苹果', 'snack'),
('绿豆汤', 'snack'),
('银耳羹', 'snack'),
('蛋糕', 'snack')
ON CONFLICT (name, meal_type) DO NOTHING;

-- 初始化第11周食谱（2026年第11周: 2026-03-09 ~ 2026-03-13）
INSERT INTO menu_weeks (year, week_number, week_start, week_end, status, published_at)
VALUES (2026, 11, '2026-03-09', '2026-03-13', 'published', NOW())
ON CONFLICT (year, week_number) DO NOTHING;

-- 获取第11周ID并插入食谱数据
DO $$
DECLARE
    wid INTEGER;
BEGIN
    SELECT id INTO wid FROM menu_weeks WHERE year = 2026 AND week_number = 11;
    IF wid IS NOT NULL THEN
        INSERT INTO menu_items (week_id, weekday, meal_type, content) VALUES
        -- 星期一
        (wid, 1, 'lunch', '黄米饭、土豆烧牛肉、玉米炒火腿肠、山药排骨汤'),
        (wid, 1, 'snack', '红薯薏米粥、面包'),
        -- 星期二
        (wid, 2, 'lunch', '水煮肉片、时蔬炒鸡蛋、润肺雪梨糖水'),
        (wid, 2, 'snack', '牛奶'),
        -- 星期三
        (wid, 3, 'lunch', '百花酿鸡翅、清炒西兰花、紫菜蛋花汤、米饭'),
        (wid, 3, 'snack', '番薯、牛奶'),
        -- 星期四
        (wid, 4, 'lunch', '黄米饭、红烧排骨、蒜蓉生菜、番茄蛋花汤'),
        (wid, 4, 'snack', '黑米粥'),
        -- 星期五
        (wid, 5, 'lunch', '炸鸡排薯条、可乐鸡翅、玉米粒、南瓜小米粥'),
        (wid, 5, 'snack', '椰奶西米露')
        ON CONFLICT (week_id, weekday, meal_type) DO UPDATE SET content = EXCLUDED.content;
    END IF;
END $$;
