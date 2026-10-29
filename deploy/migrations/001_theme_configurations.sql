-- ==============================================================================
-- The Ecom Buddy - Milestone 03E Theme Configurations Schema
-- ==============================================================================

CREATE TABLE IF NOT EXISTS theme_configurations (
  id VARCHAR(64) PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
  preset_id VARCHAR(50) NOT NULL DEFAULT 'crescendo',
  name VARCHAR(255) NOT NULL,
  theme_data JSONB NOT NULL,
  created_by VARCHAR(255) DEFAULT 'admin@theecombuddy.local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_theme_status ON theme_configurations (status);
CREATE INDEX IF NOT EXISTS idx_theme_version ON theme_configurations (version DESC);
CREATE INDEX IF NOT EXISTS idx_theme_preset ON theme_configurations (preset_id);
