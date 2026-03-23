-- 为 ai_summaries 表添加 nutrition_data 字段（缓存结构化营养分析数据）
ALTER TABLE ai_summaries ADD COLUMN IF NOT EXISTS nutrition_data JSONB;
