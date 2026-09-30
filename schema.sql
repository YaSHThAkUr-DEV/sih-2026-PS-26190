-- ==============================================================================
-- NIRMAN DMS: FULL MASTER LOGICAL SCHEMA & DATABASE INITIALIZATION
-- Complete Enterprise & Federation Schema (PostgreSQL 15, 16, 17, 18)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. CUSTOM ENUMS AND DOMAINS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE organization_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DECOMMISSIONED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_APPROVAL', 'DEACTIVATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'QUARANTINED', 'ARCHIVED', 'DELETED', 'FROZEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE version_status AS ENUM ('DRAFT', 'PENDING_REVIEW', 'CURRENT', 'SUPERSEDED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE change_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_decision AS ENUM ('APPROVED', 'REJECTED', 'REQUEST_REVISION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deletion_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAILURE', 'DENIED', 'WARNING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------------------
-- 2. DYNAMIC TAXONOMIES (GOVERNMENT TIERS, DOMAIN CATEGORIES, JURISDICTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS taxonomy_organization_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL DEFAULT 1,
  badge_color VARCHAR(30) DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxonomy_domain_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  icon_name VARCHAR(60) DEFAULT 'corporate_fare',
  badge_color VARCHAR(30) DEFAULT '#6366f1',
  custom_fields_schema JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxonomy_jurisdiction_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES taxonomy_jurisdiction_regions(id) ON DELETE CASCADE,
  region_type VARCHAR(50) NOT NULL,
  code VARCHAR(60) NOT NULL,
  name VARCHAR(150) NOT NULL,
  state_code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region_type, code)
);

CREATE INDEX IF NOT EXISTS idx_jurisdiction_parent ON taxonomy_jurisdiction_regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_state ON taxonomy_jurisdiction_regions(state_code);

CREATE TABLE IF NOT EXISTS taxonomy_priority_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sla_hours INTEGER NOT NULL DEFAULT 168,
  badge_color VARCHAR(30) DEFAULT '#eab308',
  requires_justification BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxonomy_access_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  allow_raw_download BOOLEAN DEFAULT false,
  allow_watermarked_pdf BOOLEAN DEFAULT true,
  allow_browser_view BOOLEAN DEFAULT true,
  requires_redaction_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. CORE ORGANIZATIONS, DEPARTMENTS & TEAMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  domain VARCHAR(255),
  tier_id UUID REFERENCES taxonomy_organization_tiers(id),
  domain_category_id UUID REFERENCES taxonomy_domain_categories(id),
  jurisdiction_region_id UUID REFERENCES taxonomy_jurisdiction_regions(id),
  agency_code VARCHAR(60),
  nodal_officer_name VARCHAR(150),
  nodal_officer_email VARCHAR(200),
  nodal_officer_phone VARCHAR(50),
  is_verified_federation_node BOOLEAN DEFAULT true,
  custom_metadata JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, code)
);

-- ------------------------------------------------------------------------------
-- 4. SECURITY CLEARANCES, ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  rank INTEGER NOT NULL,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  encryption_required BOOLEAN NOT NULL DEFAULT true,
  audit_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  designation VARCHAR(150),
  security_level_id UUID REFERENCES security_levels(id),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, username),
  UNIQUE(email)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ------------------------------------------------------------------------------
-- 5. DOCUMENT TYPES, RETENTION & STATUTORY TEMPLATES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  mime_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/png', 'image/jpeg'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS taxonomy_statutory_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  legal_act_name VARCHAR(200) NOT NULL,
  section_citation VARCHAR(100) NOT NULL,
  default_purpose_text TEXT,
  applicable_domain_category_id UUID REFERENCES taxonomy_domain_categories(id),
  applicable_doc_type_code VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stat_templates_global_code 
  ON taxonomy_statutory_templates (code) WHERE organization_id IS NULL;

CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  retention_days INTEGER,
  permanent BOOLEAN NOT NULL DEFAULT false,
  deletion_requires_approval BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  schedule_code VARCHAR(50),
  action_on_expiry VARCHAR(100) DEFAULT 'Crypto-Shred After Expiry',
  statutory_framework VARCHAR(100) DEFAULT 'BNSS 2023',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_type_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  security_level_id UUID NOT NULL REFERENCES security_levels(id) ON DELETE CASCADE,
  retention_policy_id UUID REFERENCES retention_policies(id) ON DELETE SET NULL,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  ocr_required BOOLEAN NOT NULL DEFAULT true,
  download_allowed BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, department_id, document_type_id)
);

-- ------------------------------------------------------------------------------
-- 6. DOCUMENTS, VERSIONS & METADATA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_number VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  security_level_id UUID NOT NULL REFERENCES security_levels(id),
  retention_policy_id UUID REFERENCES retention_policies(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  current_version_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'CURRENT',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  sha256_hash CHAR(64) NOT NULL,
  encryption_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
  key_wrap_algorithm VARCHAR(50) DEFAULT 'VAULT_TRANSIT_RSA_OAEP',
  vault_key_reference TEXT,
  minio_bucket VARCHAR(100) NOT NULL DEFAULT 'dms-documents',
  minio_object_key TEXT NOT NULL,
  minio_version_id TEXT,
  checksum_verified BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(document_id, version_number)
);

-- ------------------------------------------------------------------------------
-- 7. MAKER-CHECKER GOVERNANCE & APPROVAL WORKFLOWS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  original_version_id UUID NOT NULL REFERENCES document_versions(id),
  proposed_version_id UUID NOT NULL REFERENCES document_versions(id),
  requested_by UUID NOT NULL REFERENCES users(id),
  assigned_approver_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  decision VARCHAR(50) NOT NULL,
  comment TEXT,
  approved_version_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. RETENTION LIFECYCLE & LEGAL HOLDS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retention_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  retention_policy_id UUID NOT NULL REFERENCES retention_policies(id),
  retention_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_end_at TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  legal_hold_order_number VARCHAR(100),
  legal_hold_authority VARCHAR(200),
  legal_hold_reason TEXT,
  legal_hold_by UUID REFERENCES users(id),
  legal_hold_applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  shred_method VARCHAR(100) DEFAULT 'WORM Object Purge + KMS Transit Key Zeroization',
  approver_token_id VARCHAR(100)
);

-- ------------------------------------------------------------------------------
-- 9. INTER-ORGANIZATION HIGHWAY & COLLABORATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inter_org_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(64) UNIQUE NOT NULL,
  requesting_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  requesting_dept_id UUID REFERENCES departments(id),
  requesting_user_id UUID NOT NULL REFERENCES users(id),
  target_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  target_dept_id UUID REFERENCES departments(id),
  document_type_id UUID REFERENCES document_types(id),
  target_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  statutory_template_id UUID REFERENCES taxonomy_statutory_templates(id),
  priority_tier_id UUID REFERENCES taxonomy_priority_tiers(id),
  reference_case_number VARCHAR(120),
  subject_title VARCHAR(255) NOT NULL,
  custom_statutory_purpose TEXT,
  custom_legal_provisions VARCHAR(255),
  requested_access_days INTEGER DEFAULT 7,
  sla_deadline TIMESTAMPTZ,
  status VARCHAR(40) DEFAULT 'PENDING',
  response_note TEXT,
  responded_by_user_id UUID REFERENCES users(id),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inter_org_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_number VARCHAR(64) UNIQUE NOT NULL,
  request_id UUID REFERENCES inter_org_requests(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
  source_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  target_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  authorized_user_id UUID REFERENCES users(id),
  access_mode_id UUID REFERENCES taxonomy_access_modes(id),
  is_watermarked BOOLEAN DEFAULT true,
  custom_watermark_template TEXT,
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  ephemeral_key_id VARCHAR(128),
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  revoked_reason TEXT,
  revoked_by_user_id UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  blockchain_tx_hash VARCHAR(128),
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inter_org_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_code VARCHAR(64) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  lead_org_id UUID NOT NULL REFERENCES organizations(id),
  lead_user_id UUID NOT NULL REFERENCES users(id),
  classification_level VARCHAR(20) DEFAULT 'CONFIDENTIAL',
  status VARCHAR(30) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inter_org_workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES inter_org_workspaces(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES departments(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(30) DEFAULT 'COLLABORATOR',
  invited_by UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, org_id, user_id)
);

CREATE TABLE IF NOT EXISTS inter_org_workspace_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES inter_org_workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
  contributed_by_org_id UUID NOT NULL REFERENCES organizations(id),
  contributed_by_user_id UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, document_id)
);

CREATE TABLE IF NOT EXISTS inter_org_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES inter_org_shares(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  requesting_org_id UUID NOT NULL REFERENCES organizations(id),
  accessing_user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  watermark_payload_snapshot JSONB,
  event_hash VARCHAR(128) NOT NULL,
  blockchain_anchored BOOLEAN DEFAULT false,
  blockchain_tx_hash VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. AUDIT LOGS, NOTIFICATIONS & IMMUTABLE LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  request_id VARCHAR(100),
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  result VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  failure_reason TEXT,
  event_metadata JSONB NOT NULL DEFAULT '{}',
  event_hash CHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_event_id UUID NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE,
  network_name VARCHAR(100) NOT NULL DEFAULT 'dms-records-network',
  channel_name VARCHAR(100) DEFAULT 'recordschannel',
  chaincode_name VARCHAR(100) DEFAULT 'dms_audit_cc',
  transaction_id VARCHAR(128),
  payload_hash CHAR(64) NOT NULL,
  ledger_status VARCHAR(50) NOT NULL DEFAULT 'SIMULATED',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity VARCHAR(30) DEFAULT 'info',
  metadata JSONB DEFAULT '{}'
);

-- ------------------------------------------------------------------------------
-- 11. OCR RESULTS & FULL-TEXT GIN SEARCH
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  extracted_text TEXT,
  text_sha256 CHAR(64),
  language VARCHAR(50) DEFAULT 'eng',
  confidence NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR
);

CREATE INDEX IF NOT EXISTS idx_ocr_search_vector ON ocr_results USING GIN (search_vector);

-- ------------------------------------------------------------------------------
-- 12. SYSTEM SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. INDEXES FOR HIGH QUERY EFFICIENCY
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_dept ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_hash ON document_versions(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_inter_org_req_inbound ON inter_org_requests (target_org_id, status);
CREATE INDEX IF NOT EXISTS idx_inter_org_req_outbound ON inter_org_requests (requesting_org_id, status);
CREATE INDEX IF NOT EXISTS idx_inter_org_shares_target ON inter_org_shares (target_org_id, is_revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_inter_org_shares_doc ON inter_org_shares (document_id);
