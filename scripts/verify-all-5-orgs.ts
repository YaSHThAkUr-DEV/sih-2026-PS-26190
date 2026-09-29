import { query, pool } from '../lib/db';
import { verifyPassword } from '../lib/auth/crypto';

async function main() {
  console.log('========================================================================');
  console.log('  VERIFYING 5 SOVEREIGN ORGANIZATIONS, ROLES, CLEARANCES & USERS');
  console.log('========================================================================\n');

  const orgs = await query<any>(`
    SELECT o.id, o.name, o.code, o.agency_code, t.name as tier, c.name as category, r.name as region
    FROM organizations o
    LEFT JOIN taxonomy_organization_tiers t ON o.tier_id = t.id
    LEFT JOIN taxonomy_domain_categories c ON o.domain_category_id = c.id
    LEFT JOIN taxonomy_jurisdiction_regions r ON o.jurisdiction_region_id = r.id
    WHERE o.code != 'DEMO'
    ORDER BY o.name ASC
  `);

  console.log(`Total Sovereign Organizations Found: ${orgs.length}\n`);

  for (const org of orgs) {
    console.log(`🏛️  ${org.name} [${org.code}] (${org.agency_code || 'N/A'})`);
    console.log(`   Tier: ${org.tier} | Domain: ${org.category} | Region: ${org.region}`);

    const depts = await query<any>(`SELECT name, code FROM departments WHERE organization_id = $1`, [org.id]);
    console.log(`   Departments (${depts.length}): ${depts.map((d: any) => `${d.name} [${d.code}]`).join('; ')}`);

    const docTypes = await query<any>(`SELECT name, code FROM document_types WHERE organization_id = $1`, [org.id]);
    console.log(`   Document Types (${docTypes.length}): ${docTypes.map((dt: any) => dt.code).join(', ')}`);

    const policies = await query<any>(`SELECT name, schedule_code FROM retention_policies WHERE organization_id = $1`, [org.id]);
    console.log(`   Retention Policies (${policies.length}): ${policies.map((p: any) => p.schedule_code).join(', ')}`);

    const users = await query<any>(`
      SELECT u.id, u.username, u.full_name, u.email, u.designation, u.employee_code, u.max_security_level, u.password_hash,
             d.code as dept_code,
             COALESCE(json_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '[]') as roles
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.organization_id = $1
      GROUP BY u.id, d.code
      ORDER BY u.max_security_level DESC, u.username ASC
    `, [org.id]);

    console.log(`   Officers/Users (${users.length}):`);
    for (const u of users) {
      const passValid = await verifyPassword('Password@DMS2026!', u.password_hash);
      const rolesList = Array.isArray(u.roles) ? u.roles.join(', ') : JSON.parse(u.roles || '[]').join(', ');
      console.log(`     • [T${u.max_security_level}] ${u.full_name} (@${u.username}) | Role: ${rolesList} | Dept: ${u.dept_code} | Email: ${u.email} | Auth: ${passValid ? '✓ OK' : '❌ FAIL'}`);
    }
    console.log('');
  }

  await pool.end();
}

main().catch(console.error);
