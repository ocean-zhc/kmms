-- 今日所学
CREATE TABLE IF NOT EXISTS daily_learnings (
    id SERIAL PRIMARY KEY,
    activity_date DATE NOT NULL,
    activity_name VARCHAR(200) NOT NULL DEFAULT '',
    activity_goals TEXT NOT NULL DEFAULT '',
    raw_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_learnings_date ON daily_learnings(activity_date DESC);
