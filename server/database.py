import aiosqlite
from config import settings

DB_PATH = settings.database_url

CREATE_TABLES = """
-- 用户账号档案
CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY,
    niche TEXT,
    persona TEXT,
    content_type TEXT,
    video_subtype TEXT,
    platforms TEXT,
    weekly_hours INTEGER,
    monetization TEXT,
    background TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 对话历史
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conv_session ON conversations(session_id);

-- 内容记录
CREATE TABLE IF NOT EXISTS content_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT,
    topic TEXT NOT NULL,
    niche TEXT,
    content_type TEXT,
    platform TEXT,
    script TEXT,
    platform_versions TEXT,
    cover_image_url TEXT,
    status TEXT DEFAULT 'draft',
    publish_schedule TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 数据记录（用户上传的平台数据）
CREATE TABLE IF NOT EXISTS data_records (
    id TEXT PRIMARY KEY,
    content_id TEXT REFERENCES content_records(id),
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    saves INTEGER,
    new_followers INTEGER,
    open_rate REAL,
    completion_rate REAL,
    engagement_rate REAL,
    forward_rate REAL,
    raw_data TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 归因结果
CREATE TABLE IF NOT EXISTS attribution_results (
    id TEXT PRIMARY KEY,
    data_record_id TEXT REFERENCES data_records(id),
    content_id TEXT REFERENCES content_records(id),
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    triggered_rule TEXT,
    root_cause TEXT,
    action_advice TEXT,
    action_template TEXT,
    rule_candidate TEXT,
    calendar_note TEXT,
    next_topic_filter TEXT,
    baseline_metrics TEXT,
    followup_content_id TEXT,
    verified INTEGER DEFAULT 0,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创作规律库
CREATE TABLE IF NOT EXISTS creative_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    variable TEXT NOT NULL,
    winner_logic TEXT,
    loser_logic TEXT,
    metric TEXT,
    delta TEXT,
    platform TEXT,
    confidence REAL DEFAULT 0.6,
    source TEXT,
    test_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, variable, platform)
);

-- 内容日历
CREATE TABLE IF NOT EXISTS calendar (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    platform TEXT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    improvement_note TEXT,
    status TEXT DEFAULT 'planned',
    reminder_sent INTEGER DEFAULT 0,
    content_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 热点榜
CREATE TABLE IF NOT EXISTS trends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    title TEXT NOT NULL,
    heat_score INTEGER,
    category TEXT,
    url TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- L3 语义记忆
CREATE TABLE IF NOT EXISTS user_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence REAL DEFAULT 0.8,
    evidence TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, memory_type, key)
);

-- L2 情节记忆
CREATE TABLE IF NOT EXISTS episodic_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_decisions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent 决策日志
CREATE TABLE IF NOT EXISTS decision_logs (
    log_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    node TEXT NOT NULL,
    intent TEXT,
    reasoning TEXT,
    tool_called TEXT,
    tool_input TEXT,
    tool_output TEXT,
    rules_triggered TEXT,
    memory_used TEXT,
    creative_rules_applied TEXT,
    response_type TEXT,
    user_reaction TEXT,
    user_modification TEXT,
    outcome_content_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_logs_user ON decision_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_reaction ON decision_logs(user_reaction);

-- 通知队列
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT,
    status TEXT DEFAULT 'pending',
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_user_status ON notifications(user_id, status);
"""


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(CREATE_TABLES)
        await db.commit()


async def get_db():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db
