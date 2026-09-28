import { pool, query } from '../lib/db';
import { invalidateCache } from '../lib/cache/redis';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('================================================================');
  console.log('       PROVISIONING SECONDARY SOVEREIGN ORGANIZATION            ');
  console.log('================================================================\n');

  const orgName = 'High Court of Judicature at New Delhi';
  const orgCode = 'DL-HC-DEL';
  const orgStatus = 'ACTIVE';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if org already exists
    const existing = await client.query('SELECT id FROM organizations WHERE code = $1;', [orgCode]);
    if (existing.rows.length > 0) {
      console.log(`⚠️ Organization "${orgCode}" already exists. Updating...`);
    }

    // 2. Insert Organization
    const orgRes = await client.query(
      `INSERT INTO organizations (name, code, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status
       RETURNING id, name, code;`,
      [orgName, orgCode, orgStatus]
    );
    const orgId = orgRes.rows[0].id;
    console.log(`✓ [1/6] Organization Created: "${orgName}" (Code: ${orgCode}, ID: ${orgId})`);

    // 3. Insert Departments
    const departments = [
      { name: 'Judicial Registry & Writ Section', code: 'REGISTRY' },
      { name: 'Case Documentation & Archives Wing', code: 'ARCHIVES' },
      { name: 'Digital Forensics & Electronic Evidence Unit', code: 'FORENSICS' },
      { name: 'Vigilance & Judicial Inspection Cell', code: 'VIGILANCE' },
    ];

    const deptMap: Record<string, string> = {};
    for (const d of departments) {
      const dRes = await client.query(
        `INSERT INTO departments (organization_id, name, code, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [orgId, d.name, d.code]
      );
      deptMap[dRes.rows[0].code] = dRes.rows[0].id;
    }
    console.log(`✓ [2/6] Provisioned ${departments.length} Specialized Departments.`);

    // 4. Security Levels (T1 to T5)
    const secLevels = [
      { code: 'T1', name: 'Public / Low', rank: 1, approval_required: false, encryption_required: false, audit_level: 1 },
      { code: 'T2', name: 'Internal', rank: 2, approval_required: false, encryption_required: true, audit_level: 2 },
      { code: 'T3', name: 'Confidential', rank: 3, approval_required: false, encryption_required: true, audit_level: 3 },
      { code: 'T4', name: 'Sensitive', rank: 4, approval_required: true, encryption_required: true, audit_level: 4 },
      { code: 'T5', name: 'Highly Sensitive / Top Secret', rank: 5, approval_required: true, encryption_required: true, audit_level: 5 },
    ];
    for (const s of secLevels) {
      await client.query(
        `INSERT INTO security_levels (organization_id, code, name, rank, approval_required, encryption_required, audit_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (organization_id, code) DO NOTHING;`,
        [orgId, s.code, s.name, s.rank, s.approval_required, s.encryption_required, s.audit_level]
      );
    }
    console.log('✓ [3/6] Configured Security Clearance Levels (T1 - T5).');

    // 5. Document Types
    const docTypes = [
      { code: 'CASE_RECORD', name: 'Judicial Case Record & Chargesheet' },
      { code: 'COURT_ORDER', name: 'Judicial Injunction & Decree' },
      { code: 'AFFIDAVIT', name: 'Sworn Evidentiary Affidavit' },
      { code: 'WRIT_PETITION', name: 'Constitutional Writ Petition' },
      { code: 'FORENSIC_REPORT', name: 'Certified Forensic Lab Report' },
      { code: 'OM', name: 'Judicial Administration Circular' },
    ];
    for (const dt of docTypes) {
      await client.query(
        `INSERT INTO document_types (organization_id, code, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (organization_id, code) DO NOTHING;`,
        [orgId, dt.code, dt.name, `Institutional Document: ${dt.name}`]
      );
    }
    console.log('✓ [4/6] Configured Statutory Document Types.');

    // 6. Roles & Permissions Mapping
    const roles = [
      { code: 'ORG_ADMIN', name: 'High Court Institutional Administrator', description: 'Institutional policy, judicial registry and department control', is_system: true },
      { code: 'DEPT_HEAD', name: 'Bench Registrar / Section Head', description: 'Review, approve, and verify sensitive judicial records', is_system: true },
      { code: 'INVESTIGATING_OFFICER', name: 'Bench Officer / Case Operator', description: 'Upload, manage, and process official case documents', is_system: false },
      { code: 'AUDITOR', name: 'Judicial Vigilance & Compliance Auditor', description: 'Independent inspection of activity trails and cryptographic records', is_system: true },
    ];

    const roleMap: Record<string, string> = {};
    for (const r of roles) {
      const rRes = await client.query(
        `INSERT INTO roles (organization_id, code, name, description, is_system_role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [orgId, r.code, r.name, r.description, r.is_system]
      );
      roleMap[rRes.rows[0].code] = rRes.rows[0].id;
    }

    const allPerms = await client.query('SELECT id, code FROM permissions;');
    const permMap = Object.fromEntries(allPerms.rows.map((p) => [p.code, p.id]));

    // ORG_ADMIN gets all permissions
    for (const perm of allPerms.rows) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [roleMap['ORG_ADMIN'], perm.id]
      );
    }

    // Assign standard role permissions for other roles
    const deptHeadPerms = ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT', 'DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE', 'DOCUMENT_REQUEST_CHANGE', 'AUDIT_VIEW', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY'];
    for (const pCode of deptHeadPerms) {
      if (permMap[pCode]) {
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['DEPT_HEAD'], permMap[pCode]]);
      }
    }

    const officerPerms = ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT', 'DOCUMENT_REQUEST_CHANGE', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY'];
    for (const pCode of officerPerms) {
      if (permMap[pCode]) {
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['INVESTIGATING_OFFICER'], permMap[pCode]]);
      }
    }

    const auditorPerms = ['AUDIT_VIEW', 'USER_PROFILE_AUDIT_VIEW', 'DOCUMENT_VIEW', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY'];
    for (const pCode of auditorPerms) {
      if (permMap[pCode]) {
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['AUDITOR'], permMap[pCode]]);
      }
    }
    console.log('✓ [5/6] Configured Institutional Roles and RBAC Permission Matrix.');

    // 7. Provision Organization Administrator
    const passwordHash = await bcrypt.hash('Password@DMS2026!', 10);
    const adminUserRes = await client.query(
      `INSERT INTO users (
         organization_id, department_id, employee_code, username, full_name,
         email, designation, password_hash, max_security_level, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
       ON CONFLICT (organization_id, email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           designation = EXCLUDED.designation,
           status = 'ACTIVE'
       RETURNING id;`,
      [
        orgId,
        deptMap['REGISTRY'],
        'JUD-REG-001',
        'registrar',
        'Registrar General (Judicial Systems)',
        'registrar@judiciary.gov.in',
        'Registrar General & Judicial Administrator',
        passwordHash,
        5, // T5 Clearance
      ]
    );
    const adminUserId = adminUserRes.rows[0].id;

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING;`,
      [adminUserId, roleMap['ORG_ADMIN']]
    );
    console.log(`✓ [6/6] Created Administrator: registrar@judiciary.gov.in (ID: ${adminUserId})`);

    // Retention policy for court records
    await client.query(
      `INSERT INTO retention_policies (
         organization_id, name, description, retention_days, permanent,
         deletion_requires_approval, schedule_code, action_on_expiry, statutory_framework
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING;`,
      [
        orgId,
        'Permanent Judicial Case Archives Policy',
        'Permanent 30-year retention rule for High Court records',
        10950, // 30 years
        false,
        true,
        'RET-HC-PERM',
        'ARCHIVE_ONLY',
        'Judicial Records & High Court Rules',
      ]
    );

    await client.query('COMMIT');
    console.log('\n✅ Secondary Organization provisioned successfully!');

    // Invalidate Redis Caches
    try {
      await invalidateCache('dms:*');
      await invalidateCache('collab:*');
      await invalidateCache('taxonomy:*');
      await invalidateCache('user:*');
      await invalidateCache('org:*');
    } catch (e: any) {
      console.warn('⚠️ Cache flush note:', e.message);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to provision secondary organization:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
