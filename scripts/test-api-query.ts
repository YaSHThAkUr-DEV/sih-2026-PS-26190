import { query, pool } from '../lib/db';

async function testApiQuery() {
  const hcOrg = '941f790c-2724-4971-9aad-1c51fa71b63d';
  const demoOrg = '4f1997b5-12c8-481e-b7ce-b1d357cfc323';

  console.log('--- TESTING HC ORG QUERIES ---');
  const hcInbound = await query(
    `SELECT req.id, req.request_number, req.subject_title, shr.share_number
     FROM inter_org_requests req
     JOIN organizations req_org ON req.requesting_org_id = req_org.id
     JOIN users req_user ON req.requesting_user_id = req_user.id
     JOIN organizations tgt_org ON req.target_org_id = tgt_org.id
     LEFT JOIN documents doc ON req.target_document_id = doc.id
     LEFT JOIN security_levels sl ON doc.security_level_id = sl.id
     LEFT JOIN LATERAL (
       SELECT s.id, s.share_number FROM inter_org_shares s
       WHERE s.request_id = req.id AND s.is_revoked = false
       ORDER BY s.created_at DESC LIMIT 1
     ) shr ON true
     WHERE req.target_org_id = $1`,
    [hcOrg]
  );
  console.log('HC (DL-HC-DEL) Inbound Requests:', hcInbound.length);
  hcInbound.forEach((r) => console.log('  •', r));

  const hcOutbound = await query(
    `SELECT req.id, req.request_number, req.subject_title, shr.share_number
     FROM inter_org_requests req
     JOIN organizations req_org ON req.requesting_org_id = req_org.id
     JOIN users req_user ON req.requesting_user_id = req_user.id
     JOIN organizations tgt_org ON req.target_org_id = tgt_org.id
     LEFT JOIN documents doc ON req.target_document_id = doc.id
     LEFT JOIN security_levels sl ON doc.security_level_id = sl.id
     LEFT JOIN LATERAL (
       SELECT s.id, s.share_number FROM inter_org_shares s
       WHERE s.request_id = req.id AND s.is_revoked = false
       ORDER BY s.created_at DESC LIMIT 1
     ) shr ON true
     WHERE req.requesting_org_id = $1`,
    [hcOrg]
  );
  console.log('\nHC (DL-HC-DEL) Outbound Dispatches & Requisitions:', hcOutbound.length);
  hcOutbound.forEach((r) => console.log('  •', r));

  console.log('\n--- TESTING DEMO ORG (National Digital Authority) QUERIES ---');
  const demoInbound = await query(
    `SELECT req.id, req.request_number, req.subject_title, shr.share_number
     FROM inter_org_requests req
     JOIN organizations req_org ON req.requesting_org_id = req_org.id
     JOIN users req_user ON req.requesting_user_id = req_user.id
     JOIN organizations tgt_org ON req.target_org_id = tgt_org.id
     LEFT JOIN documents doc ON req.target_document_id = doc.id
     LEFT JOIN security_levels sl ON doc.security_level_id = sl.id
     LEFT JOIN LATERAL (
       SELECT s.id, s.share_number FROM inter_org_shares s
       WHERE s.request_id = req.id AND s.is_revoked = false
       ORDER BY s.created_at DESC LIMIT 1
     ) shr ON true
     WHERE req.target_org_id = $1`,
    [demoOrg]
  );
  console.log('DEMO (admin@dms.gov.in) Inbound Received Dispatches & Demands:', demoInbound.length);
  demoInbound.forEach((r) => console.log('  •', r));

  await pool.end();
}

testApiQuery().catch(console.error);
