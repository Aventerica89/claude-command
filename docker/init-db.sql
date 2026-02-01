-- Multi-Claude Command Center (MC³) Database Schema
-- PostgreSQL 16+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Claude Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('idle', 'running', 'paused', 'completed', 'failed')),
  task_type VARCHAR(100),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  conversation_id TEXT,
  config JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_task_type ON sessions(task_type);

-- ============================================
-- Task Templates Table
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  icon VARCHAR(10),
  prompt_template TEXT NOT NULL,
  config_schema JSONB DEFAULT '{}',
  required_keys TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_active ON templates(is_active);

-- ============================================
-- Approval Queue Table
-- ============================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  tool_name VARCHAR(100),
  command TEXT,
  risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high')),
  context JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_approvals_session ON approvals(session_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_created_at ON approvals(created_at DESC);

-- ============================================
-- Activity Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  level VARCHAR(50) CHECK (level IN ('debug', 'info', 'success', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_session ON logs(session_id);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

-- Partitioning for logs (optional - for high volume)
-- CREATE TABLE logs_2025_01 PARTITION OF logs
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- ============================================
-- API Usage Tracking Table
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50) DEFAULT 'anthropic',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd DECIMAL(10, 4),
  request_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_usage_session ON api_usage(session_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX idx_api_usage_model ON api_usage(model);

-- ============================================
-- System Configuration Table
-- ============================================
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Users Table (for future multi-user support)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  api_key_hash TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- Update Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data (Optional)
-- ============================================

-- Insert default templates
INSERT INTO templates (name, description, category, icon, prompt_template, required_keys) VALUES
  (
    'WordPress Migration',
    'Migrate WordPress site from GridPane to xCloud with automated backup and testing',
    'migration',
    '🚀',
    'Migrate WordPress site from {{source_server}} to {{target_server}}. Create backup first: {{create_backup}}. Run tests after migration: {{run_tests}}.',
    ARRAY['ANTHROPIC_API_KEY']
  ),
  (
    'Vercel Deployment',
    'Build and deploy Next.js application to Vercel with environment variables',
    'deployment',
    '⚡',
    'Deploy {{project_name}} to Vercel. Environment: {{environment}}. Run build checks: {{run_checks}}.',
    ARRAY['ANTHROPIC_API_KEY', 'VERCEL_TOKEN']
  ),
  (
    'Cloudflare Worker Deploy',
    'Deploy Cloudflare Worker with Wrangler configuration',
    'deployment',
    '☁️',
    'Deploy Cloudflare Worker {{worker_name}}. Environment: {{environment}}. Route pattern: {{route_pattern}}.',
    ARRAY['ANTHROPIC_API_KEY', 'CLOUDFLARE_API_TOKEN']
  ),
  (
    'Site Analysis',
    'Comprehensive website analysis including performance, security, and SEO',
    'analysis',
    '🔍',
    'Analyze website {{url}}. Focus areas: {{focus_areas}}. Generate report: {{generate_report}}.',
    ARRAY['ANTHROPIC_API_KEY']
  ),
  (
    'Code Review',
    'Review pull request with automated testing and security checks',
    'development',
    '📝',
    'Review pull request {{pr_url}}. Check for: security issues, performance problems, code quality. Run tests: {{run_tests}}.',
    ARRAY['ANTHROPIC_API_KEY', 'GITHUB_TOKEN']
  )
ON CONFLICT DO NOTHING;

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
  ('max_concurrent_sessions', '10', 'Maximum number of parallel Claude sessions'),
  ('default_model', '"claude-3-5-sonnet-20241022"', 'Default Claude model to use'),
  ('max_tokens', '4096', 'Maximum tokens per request'),
  ('log_retention_days', '30', 'Number of days to keep logs'),
  ('auto_approve_low_risk', 'false', 'Automatically approve low-risk operations'),
  ('enable_telemetry', 'true', 'Enable anonymous usage telemetry')
ON CONFLICT DO NOTHING;

-- ============================================
-- Views
-- ============================================

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
  s.*,
  COUNT(l.id) as log_count,
  COUNT(a.id) as pending_approvals
FROM sessions s
LEFT JOIN logs l ON l.session_id = s.id
LEFT JOIN approvals a ON a.session_id = s.id AND a.status = 'pending'
WHERE s.status IN ('running', 'paused')
GROUP BY s.id;

-- API usage summary view
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT
  DATE(created_at) as date,
  model,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost
FROM api_usage
GROUP BY DATE(created_at), model
ORDER BY date DESC, model;

-- ============================================
-- Permissions
-- ============================================

-- Grant permissions to mc3 user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mc3;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mc3;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO mc3;

-- ============================================
-- Maintenance Functions
-- ============================================

-- Clean old logs
CREATE OR REPLACE FUNCTION clean_old_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Archive completed sessions
CREATE OR REPLACE FUNCTION archive_completed_sessions(age_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Future: Move to archive table
  -- For now, just count
  SELECT COUNT(*) INTO archived_count
  FROM sessions
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - (age_days || ' days')::INTERVAL;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Completion
-- ============================================

-- Analyze tables for better query performance
ANALYZE sessions;
ANALYZE templates;
ANALYZE approvals;
ANALYZE logs;
ANALYZE api_usage;

-- Log initialization
INSERT INTO logs (session_id, level, message, metadata) VALUES
  (NULL, 'info', 'Database schema initialized successfully', 
   jsonb_build_object('version', '1.0.0', 'timestamp', NOW()));

SELECT 'MC³ Database schema initialized successfully!' as message;
