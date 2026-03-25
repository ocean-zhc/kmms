-- 今日食谱 AI 分析缓存表（每日一条）
CREATE TABLE IF NOT EXISTS ai_daily_summaries (
    id          SERIAL PRIMARY KEY,
    week_id     INTEGER NOT NULL REFERENCES menu_weeks(id) ON DELETE CASCADE,
    weekday     INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 7),
    summary     TEXT,
    nutrition_data JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (week_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_ai_daily_summaries_week_day ON ai_daily_summaries(week_id, weekday);
