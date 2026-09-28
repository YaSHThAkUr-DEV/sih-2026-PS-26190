import { pool, query } from '../lib/db';

async function testAudit() {
  const orgs = await query('SELECT id, name, code FROM organizations');
  for (const org of orgs) {
    const orgId = org.id;
    const whereClause = `WHERE (l.requesting_org_id = $1 OR shr.source_org_id = $1 OR shr.target_org_id = $1 OR d.organization_id = $1)`;
    const selectSql = `
      SELECT 
        l.id,
        l.action,
        l.created_at,
        d.document_number,
        d.title,
        req_org.name as req_org,
        COALESCE(src_org.name, doc_org.name) as src_org
      FROM inter_org_access_logs l
      JOIN documents d ON l.document_id = d.id
      JOIN security_levels sl ON d.security_level_id = sl.id
      JOIN users u ON l.accessing_user_id = u.id
      JOIN organizations req_org ON l.requesting_org_id = req_org.id
      LEFT JOIN organizations doc_org ON d.organization_id = doc_org.id
      LEFT JOIN inter_org_shares shr ON l.share_id = shr.id
      LEFT JOIN organizations src_org ON shr.source_org_id = src_org.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT 10
    `;
    const logs = await query(selectSql, [orgId]);
    console.log(`Org [${org.name}] has ${logs.length} visible audit entries.`);
  }
  await pool.end();
}

testAudit().catch(console.error);
