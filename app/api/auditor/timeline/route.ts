import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/jwt';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || 'all';
    const eventType = searchParams.get('eventType') || 'all';
    const riskLevel = searchParams.get('riskLevel') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        ae.id,
        ae.event_type,
        ae.result,
        ae.ip_address,
        ae.created_at,
        ae.event_hash,
        ae.event_metadata,
        u.id as actor_id,
        coalesce(u.full_name, 'System Central') as actor_name,
        coalesce(u.employee_code, 'SYS-ROOT') as actor_badge,
        coalesce(u.designation, 'Automated Daemon') as actor_designation,
        coalesce(dep.name, 'HQ Operations') as department_name,
        coalesce(dep.code, 'HQ') as department_code,
        d.id as document_id,
        d.document_number,
        d.title as document_title,
        dv.file_name,
        dv.file_size
      FROM audit_events ae
      LEFT JOIN users u ON ae.actor_id = u.id
      LEFT JOIN departments dep ON u.department_id = dep.id
      LEFT JOIN documents d ON ae.document_id = d.id
      LEFT JOIN document_versions dv ON ae.document_version_id = dv.id
      WHERE ae.organization_id = $1
    `;

    const params: any[] = [session.organizationId];

    // Department Filter
    if (department && department !== 'all') {
      params.push(`%${department}%`);
      sql += ` AND (dep.code ILIKE $${params.length} OR dep.name ILIKE $${params.length})`;
    }

    // Event Type Filter
    if (eventType && eventType !== 'all') {
      if (eventType === 'FILE_UPLOAD') {
        sql += ` AND (ae.event_type LIKE '%UPLOAD%' OR ae.event_type LIKE '%FILE%')`;
      } else if (eventType === 'DEK_UNWRAP') {
        sql += ` AND (ae.event_type LIKE '%DEK%' OR ae.event_type LIKE '%DOWNLOAD%' OR ae.event_type LIKE '%READ%' OR ae.event_type LIKE '%VIEW%')`;
      } else if (eventType === 'INTER_ORG') {
        sql += ` AND (ae.event_type LIKE '%INTER_ORG%' OR ae.event_type LIKE '%FEDERAT%' OR ae.event_type LIKE '%DISPATCH%' OR ae.event_type LIKE '%SHARE%' OR ae.event_type LIKE '%REQUISITION%')`;
      } else if (eventType === 'BLOCKCHAIN') {
        sql += ` AND (ae.event_type LIKE '%BLOCKCHAIN%' OR ae.event_type LIKE '%ATTEST%' OR ae.event_type LIKE '%LEDGER%')`;
      } else if (eventType === 'OCR') {
        sql += ` AND (ae.event_type LIKE '%OCR%' OR ae.event_type LIKE '%INDEX%')`;
      } else if (eventType === 'VERSION') {
        sql += ` AND (ae.event_type LIKE '%VERSION%' OR ae.event_type LIKE '%PROMOT%')`;
      } else if (eventType === 'CERT') {
        sql += ` AND (ae.event_type LIKE '%CERT%')`;
      } else if (eventType === 'AUTH') {
        sql += ` AND (ae.event_type LIKE '%LOGIN%' OR ae.event_type LIKE '%LOGOUT%' OR ae.event_type LIKE '%AUTH%' OR ae.event_type LIKE '%SESSION%')`;
      } else if (eventType === 'APPROV') {
        sql += ` AND (ae.event_type LIKE '%APPROV%' OR ae.event_type LIKE '%REJECT%' OR ae.event_type LIKE '%ADJUDICAT%')`;
      } else if (eventType === 'RETENTION') {
        sql += ` AND (ae.event_type LIKE '%RETENTION%' OR ae.event_type LIKE '%HOLD%' OR ae.event_type LIKE '%DELETE%' OR ae.event_type LIKE '%DISPOSAL%' OR ae.event_type LIKE '%SHRED%')`;
      } else if (eventType === 'ADMIN') {
        sql += ` AND (ae.event_type LIKE '%USER%' OR ae.event_type LIKE '%ROLE%' OR ae.event_type LIKE '%POLICY%' OR ae.event_type LIKE '%DEPT%' OR ae.event_type LIKE '%ORG%')`;
      } else {
        params.push(`%${eventType}%`);
        sql += ` AND ae.event_type ILIKE $${params.length}`;
      }
    }

    // Risk Filter
    if (riskLevel === 'FLAGGED') {
      sql += ` AND (ae.result = 'FAILURE' OR ae.result = 'DENIED' OR ae.event_type LIKE '%FAIL%' OR ae.event_type LIKE '%REJECT%')`;
    } else if (riskLevel === 'MEDIUM') {
      sql += ` AND (ae.event_type LIKE '%DEK%' OR ae.event_type LIKE '%DOWNLOAD%' OR ae.event_type LIKE '%VERIFY%' OR ae.event_type LIKE '%SHARE%')`;
    } else if (riskLevel === 'LOW') {
      sql += ` AND (ae.result = 'SUCCESS' AND ae.event_type NOT LIKE '%FAIL%')`;
    }

    // Search Query (Actor, Badge, Docket, IP, Hash)
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      sql += ` AND (
        u.full_name ILIKE $${pIdx} OR
        u.employee_code ILIKE $${pIdx} OR
        d.document_number ILIKE $${pIdx} OR
        d.title ILIKE $${pIdx} OR
        ae.ip_address ILIKE $${pIdx} OR
        ae.event_hash ILIKE $${pIdx} OR
        ae.event_type ILIKE $${pIdx}
      )`;
    }

    // Total Count Query
    const countSql = `SELECT count(*) as total FROM (${sql}) sub`;
    const countRes = await query<{ total: string }>(countSql, params);
    const totalRecords = parseInt(countRes[0]?.total || '0', 10);

    // Paginated Order Query
    sql += ` ORDER BY ae.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

    const rows = await query<any>(sql, params);

    // Format events for Stitch UI specification
    const events = rows.map((r) => {
      // Determine normalized event class
      const et = (r.event_type || '').toUpperCase();
      let eventClass = r.event_type;
      if (et.includes('UPLOAD')) eventClass = 'FILE_UPLOAD';
      else if (et.includes('DOWNLOAD') || et.includes('DEK') || et.includes('KEY')) eventClass = 'DEK_UNWRAP_STREAM';
      else if (et.includes('INTER_ORG') || et.includes('FEDERAT') || et.includes('DISPATCH') || et.includes('REQUISITION') || et.includes('SHARE')) eventClass = 'INTER_ORG_EXCHANGE';
      else if (et.includes('BLOCKCHAIN') || et.includes('ATTEST') || et.includes('LEDGER')) eventClass = 'BLOCKCHAIN_ANCHOR';
      else if (et.includes('OCR') || et.includes('INDEX')) eventClass = 'OCR_INTELLIGENCE';
      else if (et.includes('VERSION') || et.includes('PROMOT')) eventClass = 'VERSION_PROMOTION';
      else if (et.includes('CERT')) eventClass = 'SECTION_65B_CERT';
      else if (et.includes('APPROV') || et.includes('ADJUDICAT')) eventClass = 'APPROVAL_ADJUDICATED';
      else if (et.includes('RETENTION') || et.includes('HOLD') || et.includes('DELETE') || et.includes('DISPOSAL')) eventClass = 'RETENTION_HOLD';
      else if (et.includes('LOGIN') || et.includes('LOGOUT') || et.includes('AUTH') || et.includes('SESSION')) eventClass = 'AUTH_SESSION';
      else if (r.result === 'FAILURE' || r.result === 'DENIED' || et.includes('FAIL') || et.includes('REJECT')) eventClass = 'FAILED_AUTH';

      let targetDocket = r.document_number;
      let targetTitle = r.document_title || r.file_name;

      if (!targetDocket) {
        if (eventClass === 'INTER_ORG_EXCHANGE') {
          targetDocket = r.event_metadata?.shareNumber || r.event_metadata?.requestNumber || 'INTER-ORG-HUB';
          targetTitle = r.event_metadata?.targetOrg
            ? `Dispatch to ${r.event_metadata.targetOrg}`
            : r.event_metadata?.sourceOrg
            ? `Inbound from ${r.event_metadata.sourceOrg}`
            : 'Cross-Agency Document Requisition';
        } else if (eventClass === 'BLOCKCHAIN_ANCHOR') {
          targetDocket = r.event_metadata?.blockNumber ? `BLK-#${r.event_metadata.blockNumber}` : 'BLOCKCHAIN-LEDGER';
          targetTitle = r.event_metadata?.merkleRoot ? `Merkle Root: ${r.event_metadata.merkleRoot.substring(0, 14)}...` : 'Immutable State Ledger Attestation';
        } else if (eventClass === 'OCR_INTELLIGENCE') {
          targetDocket = 'OCR-PIPELINE';
          targetTitle = 'Deep OCR Vector & Text Indexing';
        } else if (eventClass === 'AUTH_SESSION') {
          targetDocket = r.actor_badge ? `AUTH-${r.actor_badge}` : 'IAM-SESSION';
          targetTitle = r.event_type.replace(/_/g, ' ');
        } else {
          targetDocket = 'SYSTEM_CORE';
          targetTitle = r.event_type.replace(/_/g, ' ');
        }
      }

      return {
        id: r.id,
        createdAt: r.created_at,
        timeUtc: new Date(r.created_at).toISOString().substring(11, 19) + ' UTC',
        actor: {
          id: r.actor_id,
          name: r.actor_name,
          badge: r.actor_badge,
          designation: r.actor_designation,
          department: r.department_name,
          departmentCode: r.department_code,
          initials: r.actor_name
            .replace('Insp. ', '')
            .replace('Dr. ', '')
            .replace('DG ', '')
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .substring(0, 2)
            .toUpperCase(),
        },
        eventClass,
        eventType: r.event_type,
        targetDocket: targetDocket || 'SYSTEM_CORE',
        targetTitle: targetTitle || 'Central Service Bus Event',
        targetFile: r.file_name || 'System Metadata',
        ipAddress: r.ip_address || '127.0.0.1',
        node: 'TLS 1.3 // SEC-GW-01',
        result: r.result || 'SUCCESS',
        isFlagged: r.result === 'FAILURE' || r.result === 'DENIED' || eventClass === 'FAILED_AUTH',
        eventHash: r.event_hash || 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        metadata: r.event_metadata || {},
      };
    });

    return NextResponse.json({
      success: true,
      totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
      events,
    });
  } catch (error: any) {
    console.error('Failed to fetch auditor timeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
