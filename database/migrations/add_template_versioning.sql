-- Add template versioning support
-- Add version column to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES templates(id) ON DELETE SET NULL;

-- Create template_versions table for version history
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    zones JSONB NOT NULL,
    background_color VARCHAR(7),
    background_image_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, version)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version ON template_versions(template_id, version DESC);

-- Add comment
COMMENT ON TABLE template_versions IS 'Stores version history for templates, allowing users to restore previous versions';
