-- Add tags column to templates table (category already exists)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);

-- Add full-text search index on name and description
CREATE INDEX IF NOT EXISTS idx_templates_search ON templates USING GIN(
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);
