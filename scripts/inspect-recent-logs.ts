import { pool, query } from '../lib/db';

async function check() {
  const reqs = await query('SELECT id, request_number, status, requesting_org_id, target_org_id, responded_at FROM inter_org_requests ORDER BY created_at DESC LIMIT 5');
  console.log('Recent Requisitions:', reqs);
  const shares = await query('SELECT id, share_number, request_id, source_org_id, target_org_id FROM inter_org_shares ORDER BY created_at DESC LIMIT 5');
  console.log('Recent Shares:', shares);
  const logs = await query('SELECT id, action, requesting_org_id, created_at, event_hash FROM inter_org_access_logs ORDER BY created_at DESC LIMIT 15');
  console.log('Recent Access Logs:', logs);
  const users = await query('SELECT u.id, u.username, u.organization_id, o.name as org_name FROM users u JOIN organizations o ON u.organization_id = o.id LIMIT 10');
  console.log('Users and Orgs:', users);
  await pool.end();
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
