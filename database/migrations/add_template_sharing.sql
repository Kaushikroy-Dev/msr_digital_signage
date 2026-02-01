-- Template sharing functionality

-- Create template_shares table for sharing templates with users/tenants
CREATE TABLE IF NOT EXISTS template_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view', 'edit', 'admin'
    is_public BOOLEAN DEFAULT false, -- Public template gallery
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure a template is shared with either a user or tenant, or is public
    CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_tenant_id IS NULL AND is_public = false) OR
        (shared_with_user_id IS NULL AND shared_with_tenant_id IS NOT NULL AND is_public = false) OR
        (shared_with_user_id IS NULL AND shared_with_tenant_id IS NULL AND is_public = true)
    )
);

CREATE INDEX IF NOT EXISTS idx_template_shares_template_id ON template_shares(template_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_shared_by ON template_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_template_shares_shared_with_user ON template_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_shared_with_tenant ON template_shares(shared_with_tenant_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_public ON template_shares(is_public) WHERE is_public = true;

-- Create template_comments table for comments/notes on templates
CREATE TABLE IF NOT EXISTS template_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_comments_template_id ON template_comments(template_id);
CREATE INDEX IF NOT EXISTS idx_template_comments_user_id ON template_comments(user_id);
