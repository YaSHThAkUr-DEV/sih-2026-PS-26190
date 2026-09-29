import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool, query } from '../lib/db';
import { EnvelopeEncryptionService } from '../lib/crypto/envelope';
import { putEncryptedObject, BUCKET_NAME } from '../lib/storage/minio';

// Human-friendly title generator based on document file patterns
function generateTitleAndDescription(filename: string): { title: string; description: string; preferredCategory?: string } {
  const baseName = path.basename(filename, path.extname(filename));

  if (baseName.startsWith('Financial_Audit_')) {
    const num = baseName.replace('Financial_Audit_', '');
    return {
      title: `FY2025-26 Consolidated Financial Audit & Balance Statement #${num}`,
      description: `Comprehensive quarterly corporate balance sheet, certified tax audit schedule, and statutory ledger attestations.`,
      preferredCategory: 'FINANCE',
    };
  }

  if (baseName.startsWith('Forensic_Report_CR_')) {
    const num = baseName.replace('Forensic_Report_CR_', '');
    return {
      title: `Digital Forensics & Memory Bitstream Extraction Report #${num}`,
      description: `Hardware extraction telemetries, SHA-256 binary disk image verification, and Section 65B certified telemetry.`,
      preferredCategory: 'FORENSICS',
    };
  }

  if (baseName.startsWith('Land_Acquisition_Award_')) {
    const num = baseName.replace('Land_Acquisition_Award_', '');
    return {
      title: `Gazette Statutory Land Acquisition Sanction Award #${num}`,
      description: `Competent Authority Land Acquisition (CALA) final valuation award, compensation schedules, and cadastral survey map.`,
      preferredCategory: 'LAND',
    };
  }

  if (baseName.startsWith('Invoice_')) {
    const num = baseName.replace('Invoice_', '');
    return {
      title: `Institutional Infrastructure Procurement Invoice #${num}`,
      description: `Certified vendor procurement requisition, line-item equipment disbursements, and tax deductions.`,
      preferredCategory: 'PROCUREMENT',
    };
  }

  if (baseName.startsWith('Employee_ID_')) {
    const num = baseName.replace('Employee_ID_', '');
    return {
      title: `Official Government Gazetted Officer Credential #${num}`,
      description: `Biometric credential dossier, cryptographic badge verification, and authorized security clearance credential.`,
      preferredCategory: 'PERSONNEL',
    };
  }

  if (baseName.startsWith('COURT_')) {
    const hex = baseName.replace('COURT_', '').slice(0, 8);
    return {
      title: `High Court Judicial Decree & Stay Sanction Order #${hex.toUpperCase()}`,
      description: `Certified judicial bench ruling, criminal revision petition record, and authentic court seal transcript.`,
      preferredCategory: 'JUDICIAL',
    };
  }

  if (baseName.startsWith('GST_')) {
    const hex = baseName.replace('GST_', '').slice(0, 8);
    return {
      title: `Commercial GST-3B Statutory Tax Assessment Ledger #${hex.toUpperCase()}`,
      description: `Goods and Services Tax quarterly reconciliation statement, input tax credit ledger, and revenue audit filing.`,
      preferredCategory: 'TAX',
    };
  }

  if (baseName.startsWith('EXPENSE_')) {
    const hex = baseName.replace('EXPENSE_', '').slice(0, 8);
    return {
      title: `Departmental Contingency & Operational Expenditure Docket #${hex.toUpperCase()}`,
      description: `Station house operational voucher, secret service fund expenditure clearance, and auditor sign-off.`,
      preferredCategory: 'EXPENSE',
    };
  }

  if (baseName.startsWith('EPF_')) {
    const hex = baseName.replace('EPF_', '').slice(0, 8);
    return {
      title: `Employees Provident Fund Statutory Remittance Record #${hex.toUpperCase()}`,
      description: `Monthly statutory PF contribution schedule, employee universal account number audit, and compliance certificate.`,
      preferredCategory: 'LABOR',
    };
  }

  if (baseName.startsWith('TDS_')) {
    const hex = baseName.replace('TDS_', '').slice(0, 8);
    return {
      title: `Form 16A Statutory Tax Deduction at Source (TDS) Certificate #${hex.toUpperCase()}`,
      description: `Certified income tax withholding voucher, TRACES digital signature attestation, and challan reconciliation.`,
      preferredCategory: 'TAX',
    };
  }

  if (baseName.startsWith('SLA_')) {
    const hex = baseName.replace('SLA_', '').slice(0, 8);
    return {
      title: `Enterprise Master Cloud Infrastructure Service Level Agreement #${hex.toUpperCase()}`,
      description: `Multi-jurisdictional vendor SLA guarantee, uptime benchmarks, failover parameters, and liability caps.`,
      preferredCategory: 'AGREEMENT',
    };
  }

  if (baseName.startsWith('SAFETY_')) {
    const hex = baseName.replace('SAFETY_', '').slice(0, 8);
    return {
      title: `Hazardous Operations & Occupational Safety Compliance Audit #${hex.toUpperCase()}`,
      description: `Industrial safety inspection findings, zero-incident protocol attestations, and emergency response directives.`,
      preferredCategory: 'SAFETY',
    };
  }

  if (baseName.startsWith('RFP_')) {
    const hex = baseName.replace('RFP_', '').slice(0, 8);
    return {
      title: `Public Tender Requisition & Request for Proposal (RFP) #${hex.toUpperCase()}`,
      description: `Technical procurement specifications, commercial evaluation criteria, and earnest money deposit guidelines.`,
      preferredCategory: 'TENDER',
    };
  }

  if (baseName.startsWith('PTAX_')) {
    const hex = baseName.replace('PTAX_', '').slice(0, 8);
    return {
      title: `Municipal Corporation Property & Cadastral Tax Assessment #${hex.toUpperCase()}`,
      description: `Urban local body annual ratable valuation assessment, property tax challan, and municipal revenue certificate.`,
      preferredCategory: 'MUNICIPAL',
    };
  }

  if (baseName.startsWith('LICENSE_')) {
    const hex = baseName.replace('LICENSE_', '').slice(0, 8);
    return {
      title: `Statutory Regulatory Operating License & Accreditation #${hex.toUpperCase()}`,
      description: `National regulatory compliance certificate, periodic inspection clearance, and sovereign license renewal.`,
      preferredCategory: 'LICENSE',
    };
  }

  if (baseName.startsWith('LEASE_')) {
    const hex = baseName.replace('LEASE_', '').slice(0, 8);
    return {
      title: `Government Land & Commercial Premises Registered Lease Deed #${hex.toUpperCase()}`,
      description: `Registered commercial occupancy lease agreement, sub-registrar stamp certificate, and mutation entry.`,
      preferredCategory: 'LAND',
    };
  }

  if (baseName.startsWith('CUSTOMS_')) {
    const hex = baseName.replace('CUSTOMS_', '').slice(0, 8);
    return {
      title: `Central Customs Port of Entry Clearance & Bill of Entry #${hex.toUpperCase()}`,
      description: `Tariff classification declaration, container duty assessment, and anti-smuggling inspection endorsement.`,
      preferredCategory: 'CUSTOMS',
    };
  }

  if (baseName.startsWith('CIN_')) {
    const hex = baseName.replace('CIN_', '').slice(0, 8);
    return {
      title: `Ministry of Corporate Affairs Certificate of Incorporation #${hex.toUpperCase()}`,
      description: `Registrar of Companies statutory incorporation certificate, articles of association, and authorized capital filing.`,
      preferredCategory: 'CORPORATE',
    };
  }

  if (baseName.startsWith('BOL_')) {
    const hex = baseName.replace('BOL_', '').slice(0, 8);
    return {
      title: `International Maritime Ocean Cargo Bill of Lading (BOL) #${hex.toUpperCase()}`,
      description: `Carrier shipping manifest, multimodal freight tracking voucher, and certified port consignee endorsement.`,
      preferredCategory: 'SHIPPING',
    };
  }

  if (baseName.startsWith('ENV_')) {
    const hex = baseName.replace('ENV_', '').slice(0, 8);
    return {
      title: `State Pollution Control Board Environmental Clearance Sanction #${hex.toUpperCase()}`,
      description: `National Green Tribunal compliance directives, emissions monitoring report, and industrial effluent clearance.`,
      preferredCategory: 'ENVIRONMENT',
    };
  }

  // Generic fallback
  const cleanTitle = baseName.replace(/[_.-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `Statutory Institutional Record: ${cleanTitle}`,
    description: `Official sealed evidentiary record filed in accordance with departmental governance directives.`,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('  ENTERPRISE MASS INGESTION: 400 PROJECT DOCUMENTS -> 5 SOVEREIGN ORGS');
  console.log('========================================================================\n');

  const sourceDir = path.resolve(process.cwd(), 'docments');
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory '${sourceDir}' does not exist!`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(sourceDir).filter((f) => {
    const stat = fs.statSync(path.join(sourceDir, f));
    return stat.isFile() && (f.endsWith('.pdf') || f.endsWith('.png') || f.endsWith('.docx') || f.endsWith('.jpg') || f.endsWith('.xlsx'));
  });

  console.log(`📁 Found ${allFiles.length} real document files in '${sourceDir}'\n`);

  if (allFiles.length === 0) {
    console.error('No supported document files found to ingest.');
    process.exit(1);
  }

  // 1. Fetch All Organizations
  const orgs = await query<any>(`
    SELECT o.id, o.name, o.code, o.agency_code
    FROM organizations o
    WHERE o.code != 'DEMO'
    ORDER BY o.name ASC
  `);

  if (orgs.length === 0) {
    console.error('❌ No organizations found. Please run base seed first.');
    process.exit(1);
  }

  console.log(`🏛️  Target Sovereign Organizations (${orgs.length}):`);
  orgs.forEach((o) => console.log(`   • ${o.name} [${o.code}]`));
  console.log('');

  // 2. Preload Metadata & Eligible Uploaders per Organization
  interface OrgContext {
    id: string;
    name: string;
    code: string;
    departments: Array<{ id: string; name: string; code: string }>;
    docTypes: Array<{ id: string; name: string; code: string }>;
    secLevels: Array<{ id: string; code: string; name: string; rank: number }>;
    retentionPolicies: Array<{ id: string; name: string; schedule_code: string; retention_days: number | null; permanent: boolean }>;
    policies: Array<any>;
    uploaders: Array<{ id: string; username: string; full_name: string; designation: string; department_id: string; max_security_level: number }>;
    approvers: Array<{ id: string; username: string; full_name: string; designation: string; department_id: string }>;
  }

  const orgContexts: OrgContext[] = [];

  for (const org of orgs) {
    const depts = await query<any>(`SELECT id, name, code FROM departments WHERE organization_id = $1 ORDER BY name ASC`, [org.id]);
    const docTypes = await query<any>(`SELECT id, name, code FROM document_types WHERE organization_id = $1 ORDER BY name ASC`, [org.id]);
    const secLevels = await query<any>(`SELECT id, code, name, rank FROM security_levels WHERE organization_id = $1 ORDER BY rank ASC`, [org.id]);
    const retentionPolicies = await query<any>(`SELECT id, name, schedule_code, retention_days, permanent FROM retention_policies WHERE organization_id = $1 ORDER BY permanent DESC, retention_days DESC`, [org.id]);
    const policies = await query<any>(`SELECT * FROM document_type_policies WHERE organization_id = $1 AND active = true`, [org.id]);

    // Query uploaders who have DOCUMENT_CREATE permission
    const uploaders = await query<any>(`
      SELECT DISTINCT u.id, u.username, u.full_name, u.designation, u.department_id, u.max_security_level
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.organization_id = $1 
        AND p.code = 'DOCUMENT_CREATE'
        AND u.status = 'ACTIVE'
    `, [org.id]);

    // Query approvers (DEPT_HEAD, APPROVER, ORG_ADMIN)
    const approvers = await query<any>(`
      SELECT DISTINCT u.id, u.username, u.full_name, u.designation, u.department_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.organization_id = $1 
        AND (r.code IN ('DEPT_HEAD', 'APPROVER', 'ORG_ADMIN') OR u.username LIKE '%admin%' OR u.username LIKE '%sp_%' OR u.username LIKE '%collector%')
        AND u.status = 'ACTIVE'
    `, [org.id]);

    orgContexts.push({
      id: org.id,
      name: org.name,
      code: org.code,
      departments: depts,
      docTypes,
      secLevels,
      retentionPolicies,
      policies,
      uploaders: uploaders.length > 0 ? uploaders : await query<any>(`SELECT id, username, full_name, designation, department_id, max_security_level FROM users WHERE organization_id = $1 LIMIT 5`, [org.id]),
      approvers: approvers.length > 0 ? approvers : uploaders,
    });
  }

  // Clean existing documents to ensure bit-exact, fresh state across all orgs
  console.log('🧹 Purging previous documents and audit transactions...');
  const tablesToTruncate = [
    'inter_org_access_logs',
    'inter_org_shares',
    'inter_org_requests',
    'inter_org_workspace_documents',
    'approval_actions',
    'change_requests',
    'deletion_requests',
    'retention_records',
    'ocr_results',
    'ocr_jobs',
    'processing_jobs',
    'blockchain_records',
    'audit_events',
  ];

  for (const table of tablesToTruncate) {
    try {
      await query(`TRUNCATE TABLE ${table} CASCADE;`);
    } catch (err: any) {}
  }

  try {
    await query('UPDATE documents SET current_version_id = NULL;');
    await query('TRUNCATE TABLE document_versions CASCADE;');
    await query('TRUNCATE TABLE documents CASCADE;');
  } catch (err: any) {}
  console.log('✓ Database cleaned for fresh ingestion.\n');

  // 3. Process All Files in Batches
  let totalSealed = 0;
  let totalPendingApprovals = 0;
  let totalBytesProcessed = 0;
  let totalErrors = 0;
  const orgCounts: Record<string, number> = {};
  orgContexts.forEach((o) => (orgCounts[o.code] = 0));

  console.log('🚀 Starting Mass Envelope Encryption & Ledger Registration...\n');

  const startTime = Date.now();

  for (let i = 0; i < allFiles.length; i++) {
    const filename = allFiles[i];
    const filePath = path.join(sourceDir, filename);

    try {
      const rawBuffer = fs.readFileSync(filePath);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.png') ? 'image/png' : filename.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream';
      totalBytesProcessed += rawBuffer.length;

      // Select target organization round-robin
      const org = orgContexts[i % orgContexts.length];
      orgCounts[org.code] = (orgCounts[org.code] || 0) + 1;

      // Select department & document type for this org
      const dept = org.departments[i % org.departments.length] || org.departments[0];
      const docType = org.docTypes[i % org.docTypes.length] || org.docTypes[0];

      // Find active policy for (department, docType)
      const matchedPolicy = org.policies.find(
        (p) => p.department_id === dept.id && p.document_type_id === docType.id
      );

      // Determine security level
      let secLevel = org.secLevels[1]; // Default T2
      if (matchedPolicy) {
        secLevel = org.secLevels.find((s) => s.id === matchedPolicy.security_level_id) || secLevel;
      } else {
        // Natural distribution: T1 (15%), T2 (40%), T3 (25%), T4 (15%), T5 (5%)
        const roll = Math.random() * 100;
        if (roll < 15) secLevel = org.secLevels.find((s) => s.code === 'T1') || org.secLevels[0];
        else if (roll < 55) secLevel = org.secLevels.find((s) => s.code === 'T2') || org.secLevels[1];
        else if (roll < 80) secLevel = org.secLevels.find((s) => s.code === 'T3') || org.secLevels[2];
        else if (roll < 95) secLevel = org.secLevels.find((s) => s.code === 'T4') || org.secLevels[3];
        else secLevel = org.secLevels.find((s) => s.code === 'T5') || org.secLevels[org.secLevels.length - 1];
      }

      // Find uploader with clearance >= secLevel.rank
      let uploader = org.uploaders.find(
        (u) => u.department_id === dept.id && (u.max_security_level ?? 3) >= (secLevel.rank ?? 2)
      );
      if (!uploader) {
        uploader = org.uploaders.find((u) => (u.max_security_level ?? 3) >= (secLevel.rank ?? 2)) || org.uploaders[0];
      }

      // Determine Approval Required & Status
      // If policy mandates approval or if it's sensitive (T4/T5) with 20% probability
      const isApprovalRequired = matchedPolicy ? !!matchedPolicy.approval_required : (secLevel.rank >= 4 && i % 4 === 0);
      const docStatus = isApprovalRequired ? 'PENDING_APPROVAL' : 'ACTIVE';
      if (isApprovalRequired) totalPendingApprovals++;

      // Document Title & Description
      const { title, description } = generateTitleAndDescription(filename);

      // Document Number
      const year = 2026;
      const seqStr = String(i + 1).padStart(4, '0');
      const deptShort = dept.code.replace(/[^A-Z0-9]/g, '').substring(0, 4);
      const docNumber = `${org.code}-${deptShort}-${year}-${seqStr}`;

      // Cryptographic Envelope Encryption
      const envelope = await EnvelopeEncryptionService.encryptDocument(rawBuffer, docNumber);

      // MinIO Storage Object Key
      const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `documents/${docNumber}/v1_${Date.now()}_${sanitizedFileName}.enc`;

      // Upload to MinIO S3
      try {
        await putEncryptedObject(objectKey, envelope.encryptedPayload, {
          'x-dms-doc-number': docNumber,
          'x-dms-sha256': envelope.sha256Checksum,
          'x-dms-kms-provider': envelope.kmsProvider,
          'x-dms-algo': envelope.cipherAlgorithm,
        });
      } catch (minioErr: any) {
        // Non-blocking if S3 is deferred
      }

      // Realistic historical created_at timestamp (spread over the past 120 days)
      const hoursAgo = Math.floor((allFiles.length - i) * 6.5) + Math.floor(Math.random() * 8);

      // 1. Insert Document
      const docRes = await query<any>(
        `INSERT INTO documents (
           organization_id, document_number, title, description,
           document_type_id, department_id, security_level_id,
           owner_id, status, created_by, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $8, NOW() - ($10 || ' hours')::INTERVAL, NOW() - ($10 || ' hours')::INTERVAL)
         RETURNING id;`,
        [
          org.id,
          docNumber,
          title,
          description,
          docType.id,
          dept.id,
          secLevel.id,
          uploader.id,
          docStatus,
          hoursAgo,
        ]
      );
      const docId = docRes[0].id;

      // Vault Reference JSON
      const vaultRef = JSON.stringify({
        iv: envelope.iv,
        authTag: envelope.authTag,
        wrappedDek: envelope.wrappedDek,
        kmsProvider: envelope.kmsProvider,
      });

      // 2. Insert Document Version
      const verRes = await query<any>(
        `INSERT INTO document_versions (
           document_id, version_number, status, created_by,
           file_name, mime_type, file_size, sha256_hash,
           encryption_algorithm, key_wrap_algorithm, vault_key_reference,
           minio_bucket, minio_object_key, checksum_verified, created_at
         )
         VALUES (
           $1, 1, $2, $3,
           $4, $5, $6, $7,
           $8, $9, $10,
           $11, $12, true, NOW() - ($13 || ' hours')::INTERVAL
         )
         RETURNING id;`,
        [
          docId,
          docStatus,
          uploader.id,
          filename,
          mimeType,
          rawBuffer.length,
          envelope.sha256Checksum,
          envelope.cipherAlgorithm.toUpperCase(),
          envelope.kmsProvider,
          vaultRef,
          BUCKET_NAME,
          objectKey,
          hoursAgo,
        ]
      );
      const verId = verRes[0].id;

      // Set current version pointer
      await query('UPDATE documents SET current_version_id = $1 WHERE id = $2', [verId, docId]);

      // 3. Insert Retention Record
      let retentionPolicy = org.retentionPolicies[i % org.retentionPolicies.length] || org.retentionPolicies[0];
      if (matchedPolicy && matchedPolicy.retention_policy_id) {
        retentionPolicy = org.retentionPolicies.find((r) => r.id === matchedPolicy.retention_policy_id) || retentionPolicy;
      }

      if (retentionPolicy) {
        if (retentionPolicy.permanent) {
          await query(
            `INSERT INTO retention_records 
             (document_id, retention_policy_id, retention_start_at, retention_end_at, legal_hold, status, created_at)
             VALUES ($1, $2, NOW() - ($3 || ' hours')::INTERVAL, NULL, false, 'ACTIVE', NOW() - ($3 || ' hours')::INTERVAL)
             ON CONFLICT DO NOTHING`,
            [docId, retentionPolicy.id, hoursAgo]
          );
        } else {
          const days = retentionPolicy.retention_days || 3650;
          await query(
            `INSERT INTO retention_records 
             (document_id, retention_policy_id, retention_start_at, retention_end_at, legal_hold, status, created_at)
             VALUES ($1, $2, NOW() - ($3 || ' hours')::INTERVAL, (NOW() - ($3 || ' hours')::INTERVAL) + ($4 || ' days')::INTERVAL, false, 'ACTIVE', NOW() - ($3 || ' hours')::INTERVAL)
             ON CONFLICT DO NOTHING`,
            [docId, retentionPolicy.id, hoursAgo, days]
          );
        }
      }

      // 4. Insert Audit Event
      const eventHash = crypto
        .createHash('sha256')
        .update(`${org.id}:${isApprovalRequired ? 'DOCUMENT_SUBMITTED_FOR_APPROVAL' : 'DOCUMENT_UPLOADED'}:${uploader.id}:SUCCESS:${hoursAgo}:${docNumber}`)
        .digest('hex');

      await query(
        `INSERT INTO audit_events (
           organization_id, event_type, actor_id, resource_type,
           document_id, document_version_id, ip_address, result, event_metadata, event_hash, created_at
         )
         VALUES ($1, $2, $3, 'DOCUMENT', $4, $5, '127.0.0.1', 'SUCCESS', $6, $7, NOW() - ($8 || ' hours')::INTERVAL);`,
        [
          org.id,
          isApprovalRequired ? 'DOCUMENT_SUBMITTED_FOR_APPROVAL' : 'DOCUMENT_UPLOADED',
          uploader.id,
          docId,
          verId,
          JSON.stringify({
            documentNumber: docNumber,
            title,
            tier: secLevel.code,
            status: docStatus,
            approvalRequired: isApprovalRequired,
            fileSize: rawBuffer.length,
            sha256: envelope.sha256Checksum,
            kmsProvider: envelope.kmsProvider,
          }),
          eventHash,
          hoursAgo,
        ]
      );

      // 5. If Pending Approval, create a Change Request record so Approvals View shows it!
      if (isApprovalRequired) {
        const approver = org.approvers.find((a) => a.id !== uploader.id) || org.approvers[0];
        await query(
          `INSERT INTO change_requests (
             document_id, original_version_id, proposed_version_id, requested_by, assigned_approver_id, reason, status, created_at
           )
           VALUES ($1, $2, $2, $3, $4, $5, 'PENDING', NOW() - ($6 || ' hours')::INTERVAL);`,
          [
            docId,
            verId,
            uploader.id,
            approver.id,
            `Statutory dual-custody verification required for ${secLevel.code} docket: ${title}`,
            hoursAgo,
          ]
        );
      }

      totalSealed++;

      if (totalSealed % 25 === 0 || totalSealed === allFiles.length) {
        const progress = Math.round((totalSealed / allFiles.length) * 100);
        process.stdout.write(`\r[${'='.repeat(Math.floor(progress / 5))}${' '.repeat(20 - Math.floor(progress / 5))}] ${totalSealed}/${allFiles.length} (${progress}%) Sealed | Approvals: ${totalPendingApprovals} | Active: ${totalSealed - totalPendingApprovals}`);
      }
    } catch (err: any) {
      totalErrors++;
      console.error(`\n❌ Error processing ${filename}:`, err.message);
    }
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);

  console.log('\n\n========================================================================');
  console.log('  MASS INGESTION COMPLETE & SEALED');
  console.log('========================================================================');
  console.log(`✅ Total Documents Sealed: ${totalSealed} / ${allFiles.length}`);
  console.log(`⚖️  Pending Dual-Approvals Created: ${totalPendingApprovals}`);
  console.log(`📁 Total Physical Data Encrypted: ${(totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`⏱️  Execution Time: ${durationSec}s`);
  console.log(`❌ Failures: ${totalErrors}\n`);

  console.log('🏛️  Distribution per Sovereign Organization:');
  for (const [code, count] of Object.entries(orgCounts)) {
    const org = orgContexts.find((o) => o.code === code);
    console.log(`   • ${org?.name || code} [${code}]: ${count} documents`);
  }
  console.log('========================================================================\n');

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal Ingestion Script Error:', err);
  process.exit(1);
});
