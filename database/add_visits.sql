CREATE TABLE IF NOT EXISTS visit_logs (
    id          SERIAL PRIMARY KEY,
    ip          VARCHAR(45) NOT NULL DEFAULT '',
    path        VARCHAR(255) NOT NULL DEFAULT '/',
    user_agent  TEXT NOT NULL DEFAULT '',
    device      VARCHAR(20) NOT NULL DEFAULT 'unknown',
    os          VARCHAR(30) NOT NULL DEFAULT 'unknown',
    browser     VARCHAR(50) NOT NULL DEFAULT 'unknown',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_created ON visit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visit_logs_ip ON visit_logs(ip);
