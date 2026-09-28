import { query, pool } from '../lib/db';

async function testFlow() {
  console.log('=== TESTING CROSS-ORGANIZATION SHARING FLOW ===');

  // 1. Check organizations
  const orgs = await query<{ id: string; name: string; code: string }>('SELECT id, name, code FROM organizations');
  console.log('Organizations:', orgs);

  if (orgs.length < 2) {
    console.log('Need at least 2 organizations.');
    await pool.end();
    return;
  }

  const [org1, org2] = orgs;

  // 2. Check if Org1 has a document
  const docRes = await query<{ id: string; title: string; document_number: string; current_version_id: string }>(
    `SELECT id, title, document_number, current_version_id FROM documents WHERE organization_id = $1 LIMIT 1`,
    [org1.id]
  );

  console.log(`Org1 (${org1.code}) Documents Count:`, docRes.length);

  // 3. Check active shares
  const shares = await query(
    `SELECT shr.id, shr.share_number, d.title as document_title,
            src.code as source_org, tgt.code as target_org, shr.blockchain_tx_hash
     FROM inter_org_shares shr
     JOIN organizations src ON shr.source_org_id = src.id
     JOIN organizations tgt ON shr.target_org_id = tgt.id
     JOIN documents d ON shr.document_id = d.id`
  );
  console.log('Active Cross-Org Shares in System:', shares);

  await pool.end();
}

testFlow().catch(console.error);
