-- Add variables column to templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;

-- Create index for variable searches
CREATE INDEX IF NOT EXISTS idx_templates_variables ON templates USING GIN(variables);

-- Create template_variables table for managing variable definitions
CREATE TABLE IF NOT EXISTS template_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    variable_key VARCHAR(255) NOT NULL,
    variable_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'image', 'url'
    default_value TEXT,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB, -- e.g., {"min": 0, "max": 100, "pattern": "^[A-Z]+$"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, variable_key)
);

CREATE INDEX IF NOT EXISTS idx_template_variables_template_id ON template_variables(template_id);
