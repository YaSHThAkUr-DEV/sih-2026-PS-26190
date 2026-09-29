import { query, pool } from '../lib/db';

async function main() {
  const org = (await query<any>(`SELECT id, name, code, features FROM organizations WHERE code = 'DEMO'`))[0];
  const orgId = org.id;

  const depts = await query<any>(`SELECT id, name, code FROM departments WHERE organization_id = $1`, [orgId]);
  const users = await query<any>(`
    SELECT u.username, u.full_name, u.designation, u.max_security_level, d.name as dept,
      (SELECT r.code FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id LIMIT 1) as role
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.organization_id = $1
    ORDER BY u.max_security_level DESC, u.created_at ASC
  `, [orgId]);

  const docs = await query<any>(`SELECT count(*) as count FROM documents WHERE organization_id = $1`, [orgId]);
  const docsByTier = await query<any>(`
    SELECT sl.code as tier, count(d.id) as count
    FROM documents d
    JOIN security_levels sl ON d.security_level_id = sl.id
    WHERE d.organization_id = $1
    GROUP BY sl.code, sl.rank
    ORDER BY sl.rank ASC
  `, [orgId]);

  const holds = await query<any>(`
    SELECT count(*) as count FROM retention_records rr
    JOIN documents d ON rr.document_id = d.id
    WHERE d.organization_id = $1 AND rr.legal_hold = true
  `, [orgId]);

  const staged = await query<any>(`
    SELECT count(*) as count FROM deletion_requests dr
    JOIN documents d ON dr.document_id = d.id
    WHERE d.organization_id = $1 AND dr.status = 'PENDING_APPROVAL'
  `, [orgId]);

  const reqs = await query<any>(`
    SELECT count(*) as count FROM change_requests cr
    JOIN documents d ON cr.document_id = d.id
    WHERE d.organization_id = $1 AND cr.status = 'PENDING'
  `, [orgId]);

  const inter = await query<any>(`
    SELECT count(*) as count FROM inter_org_requests
    WHERE requesting_org_id = $1 OR target_org_id = $1
  `, [orgId]);

  const shares = await query<any>(`
    SELECT count(*) as count FROM inter_org_shares
    WHERE source_org_id = $1 OR target_org_id = $1
  `, [orgId]);

  const blockchain = await query<any>(`
    SELECT count(*) as count FROM blockchain_records br
    JOIN audit_events ae ON br.audit_event_id = ae.id
    WHERE ae.organization_id = $1
  `, [orgId]);

  console.log('=== VERIFIED DEMO ORG STATS ===');
  console.log(`Organization: ${org.name} (${org.code})`);
  console.log(`Departments: ${depts.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Total Ingested Documents: ${docs[0].count}`);
  console.log('Documents by Security Tier:', docsByTier);
  console.log(`Active WORM Preservation Holds: ${holds[0].count}`);
  console.log(`Disposal Staged Records: ${staged[0].count}`);
  console.log(`Pending Maker-Checker Revisions: ${reqs[0].count}`);
  console.log(`Inter-Org Requisitions: ${inter[0].count}`);
  console.log(`Active Inter-Agency Shares: ${shares[0].count}`);
  console.log(`Blockchain Fabric Anchors: ${blockchain[0].count}`);

  await pool.end();
}

main().catch(console.error);
