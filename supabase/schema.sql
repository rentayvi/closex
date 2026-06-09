-- ============================================
-- CloserX — Schéma Supabase (multi-tenant)
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ORGANIZATIONS (tenants)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  stripe_customer_id TEXT,
  leads_used_this_month INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INTEGRATIONS (clés API chiffrées par org)
-- ============================================
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gmail', 'openai', 'apify')),
  encrypted_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, type)
);

-- ============================================
-- CAMPAIGNS
-- ============================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'done')),
  filters JSONB NOT NULL DEFAULT '{
    "industry": "",
    "location": "",
    "job_title": "",
    "employee_range": "",
    "min_revenue": ""
  }',
  ai_persona JSONB NOT NULL DEFAULT '{
    "agency_name": "",
    "tone": "professional",
    "language": "fr",
    "reference_clients": [],
    "cta_url": ""
  }',
  rag_enabled BOOLEAN NOT NULL DEFAULT false,
  leads_count INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- LEADS
-- ============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person JSONB NOT NULL DEFAULT '{}',
  company JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'emailed', 'replied', 'booked', 'unsubscribed')),
  email_subject TEXT,
  email_body_html TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RAG DOCUMENTS
-- ============================================
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USAGE LOGS
-- ============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('lead_found', 'email_sent')),
  count INTEGER NOT NULL DEFAULT 1,
  period TEXT NOT NULL, -- format: YYYY-MM
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's org_id
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organizations: members can read their own org
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = get_my_org_id());

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (id = get_my_org_id());

-- Users: see members of same org
CREATE POLICY "users_select" ON users
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

-- Integrations: same org only
CREATE POLICY "integrations_all" ON integrations
  FOR ALL USING (org_id = get_my_org_id());

-- Campaigns
CREATE POLICY "campaigns_all" ON campaigns
  FOR ALL USING (org_id = get_my_org_id());

-- Leads
CREATE POLICY "leads_all" ON leads
  FOR ALL USING (org_id = get_my_org_id());

-- RAG Documents
CREATE POLICY "rag_documents_all" ON rag_documents
  FOR ALL USING (org_id = get_my_org_id());

-- Usage Logs
CREATE POLICY "usage_logs_all" ON usage_logs
  FOR ALL USING (org_id = get_my_org_id());

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_org_id ON leads(org_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_integrations_org_id ON integrations(org_id);

-- ============================================
-- FUNCTION: Create org + user on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
BEGIN
  -- Generate unique slug from email
  org_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'))
    || '-' || substring(NEW.id::text, 1, 6);

  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (split_part(NEW.email, '@', 1), org_slug)
  RETURNING id INTO new_org_id;

  -- Create user profile
  INSERT INTO users (id, org_id, email, role)
  VALUES (NEW.id, new_org_id, NEW.email, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new auth user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
