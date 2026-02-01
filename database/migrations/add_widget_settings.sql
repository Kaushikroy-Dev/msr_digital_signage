-- Add widget_settings table for tenant-level widget configuration
CREATE TABLE IF NOT EXISTS widget_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL, -- e.g., 'weather_api_key', 'default_clock_style'
    setting_value JSONB NOT NULL, -- Flexible JSON structure for different setting types
    widget_type VARCHAR(50), -- Optional: 'clock', 'weather', 'text', etc., or NULL for global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, setting_key, widget_type)
);

-- Create index for faster lookups
CREATE INDEX idx_widget_settings_tenant ON widget_settings(tenant_id);
CREATE INDEX idx_widget_settings_widget_type ON widget_settings(widget_type);

-- Insert default widget presets
INSERT INTO widget_settings (tenant_id, setting_key, setting_value, widget_type)
SELECT 
    t.id,
    'default_style',
    '{"font": {"family": "Arial", "size": 24, "color": "#ffffff", "weight": "normal"}, "backgroundColor": "#000000", "borderRadius": 0, "padding": "10px"}'::jsonb,
    'clock'
FROM tenants t
ON CONFLICT (tenant_id, setting_key, widget_type) DO NOTHING;

INSERT INTO widget_settings (tenant_id, setting_key, setting_value, widget_type)
SELECT 
    t.id,
    'default_style',
    '{"font": {"family": "Arial", "size": 20, "color": "#ffffff", "weight": "normal"}, "backgroundColor": "transparent", "borderRadius": 0, "padding": "10px"}'::jsonb,
    'weather'
FROM tenants t
ON CONFLICT (tenant_id, setting_key, widget_type) DO NOTHING;

INSERT INTO widget_settings (tenant_id, setting_key, setting_value, widget_type)
SELECT 
    t.id,
    'default_style',
    '{"font": {"family": "Arial", "size": 16, "color": "#000000", "weight": "normal"}, "backgroundColor": "#ffffff", "borderRadius": 0, "padding": "10px"}'::jsonb,
    'text'
FROM tenants t
ON CONFLICT (tenant_id, setting_key, widget_type) DO NOTHING;
