import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { isSuperAdmin, canViewCrossOrgAudit } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    if (!canViewCrossOrgAudit(session)) {
      return NextResponse.json({ error: 'Forbidden: Cross-organization audit view clearance required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;
    const actionFilter = searchParams.get('action')?.trim() || 'ALL';

    const orgId = session.organizationId;
    const isVigilanceAuditor = 
      isSuperAdmin(session) || 
      (session.maxSecurityLevel && session.maxSecurityLevel >= 4) || 
      session.roles?.includes('SUPER_ADMIN') || 
      session.roles?.includes('AUDITOR') ||
      session.permissions?.includes('AUDIT_VIEW');

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (!isVigilanceAuditor) {
      whereClause = `WHERE (l.requesting_org_id = $${paramIndex} OR shr.source_org_id = $${paramIndex} OR shr.target_org_id = $${paramIndex} OR d.organization_id = $${paramIndex})`;
      params.push(orgId);
      paramIndex++;
    }

    if (actionFilter && actionFilter !== 'ALL') {
      if (actionFilter === 'VIEW_PREVIEW') {
        whereClause += (whereClause ? ' AND ' : 'WHERE ') + `(l.action LIKE '%VIEW%' OR l.action LIKE '%STREAM%')`;
      } else if (actionFilter === 'DOWNLOAD_WATERMARKED') {
        whereClause += (whereClause ? ' AND ' : 'WHERE ') + `(l.action LIKE '%DOWNLOAD%' OR l.action LIKE '%CERT%')`;
      } else {
        whereClause += (whereClause ? ' AND ' : 'WHERE ') + `l.action = $${paramIndex}`;
        params.push(actionFilter);
        paramIndex++;
      }
    }

    const countSql = `
      SELECT COUNT(*)::int as total
      FROM inter_org_access_logs l
      LEFT JOIN documents d ON l.document_id = d.id
      LEFT JOIN inter_org_shares shr ON l.share_id = shr.id
      ${whereClause}
    `;
    const countRes = await query<{ total: number }>(countSql, params);
    const total = countRes[0]?.total || 0;

    const selectSql = `
      SELECT 
        l.id,
        l.action,
        l.ip_address as "ipAddress",
        l.user_agent as "userAgent",
        l.event_hash as "eventHash",
        l.blockchain_anchored as "blockchainAnchored",
        l.blockchain_tx_hash as "blockchainTx",
        l.watermark_payload_snapshot as "watermarkSnapshot",
        l.created_at as "createdAt",

        -- Document Metadata
        d.id as "documentId",
        d.document_number as "documentNumber",
        d.title as "documentTitle",
        sl.code as "securityTierCode",
        sl.rank as "securityTierRank",

        -- Share Metadata
        shr.id as "shareId",
        shr.share_number as "shareNumber",
        shr.expires_at as "shareExpiresAt",

        -- Accessing User & Org
        u.id as "accessingUserId",
        u.full_name as "accessingUserName",
        u.designation as "accessingUserDesignation",
        u.employee_code as "accessingUserEmpCode",
        req_org.id as "requestingOrgId",
        req_org.name as "requestingOrgName",
        req_org.code as "requestingOrgCode",

        -- Originating Source Org
        COALESCE(src_org.id, doc_org.id) as "sourceOrgId",
        COALESCE(src_org.name, doc_org.name) as "sourceOrgName",
        COALESCE(src_org.code, doc_org.code) as "sourceOrgCode"

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
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const logs = await query(selectSql, params);

    // Summary Statistics for Federation Audit Dashboard
    const statsSql = `
      SELECT 
        COUNT(*)::int as "totalAccessEvents",
        COUNT(CASE WHEN l.action LIKE '%VIEW%' OR l.action LIKE '%STREAM%' THEN 1 END)::int as "viewEvents",
        COUNT(CASE WHEN l.action LIKE '%DOWNLOAD%' OR l.action LIKE '%CERT%' THEN 1 END)::int as "downloadEvents",
        COUNT(DISTINCT l.requesting_org_id)::int as "activeRequestingAgencies",
        COUNT(DISTINCT l.document_id)::int as "uniqueDocumentsAccessed"
      FROM inter_org_access_logs l
      LEFT JOIN documents d ON l.document_id = d.id
      LEFT JOIN inter_org_shares shr ON l.share_id = shr.id
      ${isVigilanceAuditor ? '' : `WHERE (l.requesting_org_id = '${orgId}' OR shr.source_org_id = '${orgId}' OR shr.target_org_id = '${orgId}' OR d.organization_id = '${orgId}')`}
    `;
    const statsRes = await query(statsSql);
    const stats = statsRes[0] || {};

    return NextResponse.json({
      success: true,
      logs,
      stats,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('[COLLABORATION_AUDIT_GET_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch federation custody audit logs', details: error.message },
      { status: 500 }
    );
  }
}
