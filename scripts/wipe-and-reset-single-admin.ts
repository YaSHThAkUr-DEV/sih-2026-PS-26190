import { pool, query } from '../lib/db';
import { s3Client, BUCKET_NAME } from '../lib/storage/minio';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { invalidateCache } from '../lib/cache/redis';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('================================================================');
  console.log('    NIRMAN DMS: WIPE SYSTEM & INITIALIZE SINGLE SUPER-ADMIN     ');
  console.log('================================================================\n');

  // 1. Purge MinIO Storage Objects
  console.log(`[1/7] Purging MinIO Object DB Bucket '${BUCKET_NAME}'...`);
  try {
    const listRes = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME }));
    if (listRes.Contents && listRes.Contents.length > 0) {
      console.log(`  Found ${listRes.Contents.length} objects to delete.`);
      const deleteParams = {
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: listRes.Contents.map((c) => ({ Key: c.Key! })),
          Quiet: false,
        },
      };
      const delRes = await s3Client.send(new DeleteObjectsCommand(deleteParams));
      console.log(`  ✓ Successfully deleted ${delRes.Deleted?.length || 0} objects from MinIO.`);
    } else {
      console.log(`  ✓ MinIO bucket '${BUCKET_NAME}' is already empty.`);
    }
  } catch (err: any) {
    console.warn('  ⚠️ MinIO purge notice:', err.message);
  }

  // 2. Temporarily Drop WORM Immutability Triggers to allow clean truncation
  console.log('\n[2/7] Temporarily lifting WORM triggers for database purge...');
  try {
    await query(`DROP TRIGGER IF EXISTS trg_audit_events_immutable ON audit_events;`);
    await query(`DROP TRIGGER IF EXISTS trg_inter_org_access_logs_immutable ON inter_org_access_logs;`);
    await query(`DROP TRIGGER IF EXISTS trg_blockchain_records_immutable ON blockchain_records;`);
    console.log('  ✓ WORM triggers removed temporarily.');
  } catch (err: any) {
    console.warn('  ⚠️ Notice dropping triggers:', err.message);
  }

  // 3. Truncate all tables
  console.log('\n[3/7] Purging all Organizations, Users, Documents & Federation Tables...');
  const tablesToTruncate = [
    'inter_org_access_logs',
    'inter_org_shares',
    'inter_org_requests',
    'inter_org_workspace_documents',
    'inter_org_workspace_members',
    'inter_org_workspaces',
    'approval_actions',
    'change_requests',
    'deletion_requests',
    'retention_records',
    'retention_policies',
    'ocr_results',
    'ocr_jobs',
    'processing_jobs',
    'blockchain_records',
    'document_tags',
    'document_permissions',
    'document_versions',
    'documents',
    'tags',
    'notifications',
    'audit_events',
    'user_roles',
    'users',
    'role_permissions',
    'roles',
    'department_document_types',
    'document_type_policies',
    'document_types',
    'security_levels',
    'departments',
    'organizations',
  ];

  for (const table of tablesToTruncate) {
    try {
      await query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`  ✓ Truncated: ${table}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Could not truncate ${table}: ${err.message}`);
    }
  }

  // 4. Ensure All Standard System Permissions Exist
  console.log('\n[4/7] Ensuring Standard System Permissions...');
  const systemPermissions = [
    { code: 'DOCUMENT_CREATE', description: 'Create/upload documents' },
    { code: 'DOCUMENT_VIEW', description: 'View documents' },
    { code: 'DOCUMENT_DOWNLOAD', description: 'Download documents' },
    { code: 'DOCUMENT_EDIT', description: 'Modify documents' },
    { code: 'DOCUMENT_DELETE', description: 'Delete documents' },
    { code: 'DOCUMENT_RESTORE', description: 'Restore documents' },
    { code: 'DOCUMENT_REQUEST_CHANGE', description: 'Request a controlled document change' },
    { code: 'DOCUMENT_APPROVE_CHANGE', description: 'Approve sensitive document changes' },
    { code: 'DOCUMENT_REJECT_CHANGE', description: 'Reject sensitive document changes' },
    { code: 'AUDIT_VIEW', description: 'View audit records' },
    { code: 'USER_PROFILE_AUDIT_VIEW', description: 'View user audit profile' },
    { code: 'PERMISSION_MANAGE', description: 'Manage document/user permissions' },
    { code: 'RETENTION_MANAGE', description: 'Manage retention policies' },
    { code: 'BLOCKCHAIN_VIEW', description: 'View immutable blockchain ledger, transaction receipts, and node topology' },
    { code: 'BLOCKCHAIN_ANCHOR', description: 'Anchor document hashes and forensic attestations to blockchain ledger' },
    { code: 'BLOCKCHAIN_VERIFY', description: 'Perform cryptographic Merkle proof and ledger verifications' },
  ];

  for (const p of systemPermissions) {
    await query(
      `INSERT INTO permissions (code, description)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;`,
      [p.code, p.description]
    );
  }
  const allPerms = await query<{ id: string; code: string }>('SELECT id, code FROM permissions');
  const permMap = Object.fromEntries(allPerms.map((p) => [p.code, p.id]));
  console.log(`  ✓ ${allPerms.length} System Permissions verified.`);

  // 5. Seed Single Organization & Structure
  console.log('\n[5/7] Provisioning Single Sovereign Organization & Core Department...');
  
  // Organization: National Digital Governance Authority (Code: DEMO for seamless login & presets)
  const orgRes = await query<{ id: string }>(
    `INSERT INTO organizations (name, code, status)
     VALUES ($1, $2, 'ACTIVE')
     RETURNING id;`,
    ['National Digital Governance Authority', 'DEMO']
  );
  const orgId = orgRes[0].id;
  console.log(`  ✓ Created Apex Organization: National Digital Governance Authority (Code: DEMO, ID: ${orgId})`);

  // Department: Central Systems Command & Governance
  const deptRes = await query<{ id: string }>(
    `INSERT INTO departments (organization_id, name, code, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     RETURNING id;`,
    [orgId, 'Central Systems Command & Governance', 'ADMIN']
  );
  const deptId = deptRes[0].id;
  console.log(`  ✓ Created Primary Department: Central Systems Command & Governance (Code: ADMIN, ID: ${deptId})`);

  // Security Clearance Levels (T1 to T5)
  const secLevels = [
    { code: 'T1', name: 'Public / Low', rank: 1, approval_required: false, encryption_required: false, audit_level: 1 },
    { code: 'T2', name: 'Internal', rank: 2, approval_required: false, encryption_required: true, audit_level: 2 },
    { code: 'T3', name: 'Confidential', rank: 3, approval_required: false, encryption_required: true, audit_level: 3 },
    { code: 'T4', name: 'Sensitive', rank: 4, approval_required: true, encryption_required: true, audit_level: 4 },
    { code: 'T5', name: 'Highly Sensitive / Top Secret', rank: 5, approval_required: true, encryption_required: true, audit_level: 5 },
  ];
  for (const s of secLevels) {
    await query(
      `INSERT INTO security_levels (organization_id, code, name, rank, approval_required, encryption_required, audit_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (organization_id, code) DO NOTHING;`,
      [orgId, s.code, s.name, s.rank, s.approval_required, s.encryption_required, s.audit_level]
    );
  }
  console.log('  ✓ Configured Security Clearance Levels (T1 Public to T5 Top Secret).');

  // Document Types
  const docTypes = [
    { code: 'OM', name: 'Office Memorandum' },
    { code: 'ORDER', name: 'Executive Order & Sanction' },
    { code: 'NOTICE', name: 'Public Notice & Circular' },
    { code: 'REPORT', name: 'Official Inspection / Audit Report' },
    { code: 'LETTER', name: 'Official Correspondence / Letter' },
    { code: 'ANNEXURE', name: 'Verified Annexure & Dossier' },
    { code: 'CASE_FILE', name: 'Judicial & Executive Case Record' },
  ];
  for (const dt of docTypes) {
    await query(
      `INSERT INTO document_types (organization_id, code, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, code) DO NOTHING;`,
      [orgId, dt.code, dt.name, `Official Document: ${dt.name}`]
    );
  }
  console.log('  ✓ Configured Statutory Document Types (OM, ORDER, NOTICE, REPORT, etc.).');

  // Seed Roles for this Organization
  const roles = [
    { code: 'SUPER_ADMIN', name: 'System Super Administrator', description: 'Full apex system control, sovereign governance & user management', is_system: true },
    { code: 'ORG_ADMIN', name: 'Organization Administrator', description: 'Organization policy and department control', is_system: true },
    { code: 'DEPT_HEAD', name: 'Department Head / Approver', description: 'Can review, approve, and reject sensitive document changes', is_system: true },
    { code: 'INVESTIGATING_OFFICER', name: 'Executive Dealing Officer', description: 'Can upload, view, edit, and request changes to official records', is_system: false },
    { code: 'AUDITOR', name: 'Compliance & Vigilance Auditor', description: 'Read-only access to audit trails, user profiles, and compliance logs', is_system: true },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const rRes = await query<{ id: string }>(
      `INSERT INTO roles (organization_id, code, name, description, is_system_role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      [orgId, r.code, r.name, r.description, r.is_system]
    );
    roleMap[r.code] = rRes[0].id;
  }

  // Map ALL permissions to SUPER_ADMIN & ORG_ADMIN
  for (const p of allPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
      [roleMap['SUPER_ADMIN'], p.id]
    );
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
      [roleMap['ORG_ADMIN'], p.id]
    );
  }
  console.log('  ✓ Configured Roles and assigned All Permissions to SUPER_ADMIN.');

  // Default Statutory Retention Policy
  try {
    await query(
      `INSERT INTO retention_policies (
         organization_id, name, description, retention_years, trigger_event,
         action_on_expiry, applies_to_doc_types, is_active
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING;`,
      [
        orgId,
        'Statutory Executive Records Policy',
        'Standard 7-year statutory retention rule under Public Records Act',
        7,
        'CREATION_DATE',
        'ARCHIVE_ONLY',
        JSON.stringify(['OM', 'ORDER', 'REPORT', 'NOTICE', 'LETTER', 'ANNEXURE', 'CASE_FILE']),
        true,
      ]
    );
    console.log('  ✓ Configured Default Statutory Retention Policy (7-Year).');
  } catch (err: any) {
    console.warn('  ⚠️ Retention policy setup note:', err.message);
  }

  // 6. Create the Single Highest-Level Super Administrator Account
  console.log('\n[6/7] Creating Highest-Level Super Administrator Account...');
  const passwordPlain = 'Password@DMS2026!';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const adminUserRes = await query<{ id: string }>(
    `INSERT INTO users (
       organization_id, department_id, employee_code, username, full_name,
       email, designation, password_hash, max_security_level, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
     RETURNING id;`,
    [
      orgId,
      deptId,
      'GOV-SUPER-001',
      'admin',
      'Principal Systems Administrator',
      'admin@dms.gov.in',
      'Chief Information Security Officer & Apex Super Admin',
      passwordHash,
      5, // Highest Clearance: Level 5 (T5_TOP_SECRET)
    ]
  );
  const adminUserId = adminUserRes[0].id;

  // Assign SUPER_ADMIN role
  await query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, role_id) DO NOTHING;`,
    [adminUserId, roleMap['SUPER_ADMIN']]
  );
  console.log(`  ✓ Single Super-Admin provisioned: admin@dms.gov.in (ID: ${adminUserId})`);

  // 7. Re-apply WORM Triggers & Reset Caches
  console.log('\n[7/7] Re-enforcing WORM Immutability Triggers & Cache Invalidation...');
  await query(`
    CREATE OR REPLACE FUNCTION prevent_audit_tampering()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'TAMPER_PREVENTION_VIOLATION: Audit logs and blockchain records are strictly WORM (Write Once, Read Many) immutable under Section 65B BSA 2023. UPDATE and DELETE operations are physically prohibited.';
    END;
    $$ LANGUAGE plpgsql;
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_audit_events_immutable ON audit_events;
    CREATE TRIGGER trg_audit_events_immutable
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_inter_org_access_logs_immutable ON inter_org_access_logs;
    CREATE TRIGGER trg_inter_org_access_logs_immutable
    BEFORE UPDATE OR DELETE ON inter_org_access_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_blockchain_records_immutable ON blockchain_records;
    CREATE TRIGGER trg_blockchain_records_immutable
    BEFORE UPDATE OR DELETE ON blockchain_records
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();
  `);
  console.log('  ✓ WORM Immutability Triggers successfully re-engaged.');

  // Invalidate Redis Caches
  try {
    await invalidateCache('dms:*');
    await invalidateCache('collab:*');
    await invalidateCache('taxonomy:*');
    await invalidateCache('user:*');
    await invalidateCache('org:*');
    console.log('  ✓ Redis caches completely cleared.');
  } catch (err: any) {
    console.warn('  ⚠️ Redis cache warning:', err.message);
  }

  // Final System Inspection & Verification
  const orgCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM organizations');
  const deptCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM departments');
  const userCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
  const docCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM documents');
  const roleCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM roles');

  console.log('\n================================================================');
  console.log('                 SYSTEM CLEANUP & RESET SUMMARY                 ');
  console.log('================================================================');
  console.log(`  🏛️  Organizations:           ${orgCount[0]?.count} (Single Apex Authority)`);
  console.log(`  🏢  Departments:             ${deptCount[0]?.count} (Central Systems Command)`);
  console.log(`  👤  Users:                   ${userCount[0]?.count} (Single Highest Super-Admin)`);
  console.log(`  📁  Vault Documents:         ${docCount[0]?.count} (Clean / Reset)`);
  console.log(`  🛡️  Security Roles:          ${roleCount[0]?.count} (SUPER_ADMIN + Standard)`);
  console.log('----------------------------------------------------------------');
  console.log('  🔑  SUPER-ADMIN CREDENTIALS:');
  console.log('      • Email:               admin@dms.gov.in');
  console.log('      • Username:            admin');
  console.log('      • Password:            Password@DMS2026!');
  console.log('      • Role:                SUPER_ADMIN (Highest System Authority)');
  console.log('      • Clearance Level:     T5 (Top Secret - Level 5)');
  console.log('      • Organization Code:   DEMO');
  console.log('================================================================\n');

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
