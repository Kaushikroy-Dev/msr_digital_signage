-- Add data_binding column to templates table for zone-level data bindings
ALTER TABLE templates ADD COLUMN IF NOT EXISTS data_bindings JSONB DEFAULT '{}'::jsonb;

-- Create data_sources table for managing external data sources
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'api', 'database', 'scheduled', 'websocket'
    config JSONB NOT NULL, -- API endpoint, database query, schedule config, etc.
    authentication JSONB, -- API keys, credentials, etc.
    refresh_interval INTEGER DEFAULT 60, -- seconds
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_sources_tenant_id ON data_sources(tenant_id);

-- Create scheduled_content table for time-based content switching
CREATE TABLE IF NOT EXISTS scheduled_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    zone_id VARCHAR(255) NOT NULL, -- Reference to zone.id in template
    content_type VARCHAR(50) NOT NULL, -- 'media', 'widget_config', 'variable'
    schedule_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
    schedule_config JSONB NOT NULL, -- Time ranges, days of week, etc.
    content_data JSONB NOT NULL, -- The content to display during scheduled time
    priority INTEGER DEFAULT 0, -- Higher priority overrides lower
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scheduled_content_template_id ON scheduled_content(template_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_zone_id ON scheduled_content(zone_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_content_active ON scheduled_content(is_active) WHERE is_active = true;
