import { query, pool } from '../lib/db';

async function main() {
  const tables = [
    'organizations',
    'departments',
    'users',
    'security_levels',
    'document_types',
    'document_type_policies',
    'documents',
    'document_versions',
    'retention_policies',
    'retention_records',
    'deletion_requests',
    'change_requests',
    'approval_actions',
    'inter_org_requests',
    'inter_org_shares',
    'inter_org_access_logs',
    'blockchain_records',
    'ocr_results',
    'audit_events',
    'notifications',
  ];

  for (const t of tables) {
    const cols = await query<{ column_name: string; data_type: string; is_nullable: string }>(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== Table: ${t} (${cols.length} cols) ===`);
    console.log(cols.map((c) => `${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'null' : 'not null'})`).join(', '));
  }

  await pool.end();
}

main().catch(console.error);
