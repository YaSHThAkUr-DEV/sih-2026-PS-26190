import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin-guard';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  const auth = await verifyAdminSession(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const permissions = await query(
      `SELECT id, code, description FROM permissions ORDER BY code ASC`
    );

    // Group logically by category with clean concise names
    const categorized = permissions.map((p) => {
      let category = 'Documents';
      if (p.code.startsWith('INTER_ORG') || p.code.startsWith('FEDERATION')) {
        category = 'Cross-Agency';
      } else if (p.code.startsWith('BLOCKCHAIN') || p.code.includes('BLOCKCHAIN')) {
        category = 'Blockchain';
      } else if (p.code.startsWith('AUDIT') || p.code.includes('AUDIT')) {
        category = 'Audit & Logs';
      } else if (p.code.includes('APPROVE') || p.code.includes('REJECT') || p.code.includes('REQUEST_CHANGE')) {
        category = 'Approvals';
      } else if (p.code.includes('PERMISSION') || p.code.includes('USER') || p.code.includes('ROLE')) {
        category = 'Access & Identity';
      } else if (p.code.includes('RETENTION')) {
        category = 'Retention';
      }

      return {
        ...p,
        category,
      };
    });

    return NextResponse.json({ permissions: categorized });
  } catch (err: any) {
    console.error('[ADMIN_GET_PERMISSIONS_ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to retrieve permissions list.', details: err.message },
      { status: 500 }
    );
  }
}
