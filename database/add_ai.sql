-- AI配置表（全局只一条记录）
CREATE TABLE IF NOT EXISTS ai_config (
    id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    api_url     VARCHAR(500) NOT NULL DEFAULT '',
    api_key     VARCHAR(500) NOT NULL DEFAULT '',
    model       VARCHAR(100) NOT NULL DEFAULT 'gpt-3.5-turbo',
    prompt      TEXT NOT NULL DEFAULT '你是一位专业的幼儿营养师。请根据以下幼儿园一周食谱，从营养均衡、食材搭配、幼儿健康等角度进行简要总结和点评，给出2-3条温馨建议。语言亲切、适合家长阅读，控制在200字以内。',
    enabled     BOOLEAN NOT NULL DEFAULT true,
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- AI总结缓存表（每周一条）
CREATE TABLE IF NOT EXISTS ai_summaries (
    id          SERIAL PRIMARY KEY,
    week_id     INTEGER NOT NULL UNIQUE REFERENCES menu_weeks(id) ON DELETE CASCADE,
    summary     TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_week ON ai_summaries(week_id);

-- 初始化默认配置
INSERT INTO ai_config (id, api_url, api_key, model) VALUES (1, '', '', 'gpt-3.5-turbo')
ON CONFLICT (id) DO NOTHING;
