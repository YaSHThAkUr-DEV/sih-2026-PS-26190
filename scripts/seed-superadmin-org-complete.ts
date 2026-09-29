import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, query } from '../lib/db';
import { EnvelopeEncryptionService } from '../lib/crypto/envelope';
import { putEncryptedObject, BUCKET_NAME } from '../lib/storage/minio';
import { invalidateCache } from '../lib/cache/redis';

function generateTitleAndDescription(filename: string, index: number): { title: string; description: string } {
  const baseName = path.basename(filename, path.extname(filename));

  const apexTopics = [
    { title: 'National Sovereign Encryption & Post-Quantum Cryptography Architecture', desc: 'Apex directive mandating AES-256-GCM and post-quantum key encapsulation algorithms for critical national infrastructure.' },
    { title: 'Inter-Agency Digital Evidence Interoperability Standard (BSA 2023)', desc: 'Standard operating procedure for cross-departmental digital chain of custody and Section 65B electronic record attestation.' },
    { title: 'Cabinet Committee on Security (CCS) Critical Vault Governance Directive', desc: 'Classified national security directive governing dual-custody Maker-Checker protocols and WORM storage locks.' },
    { title: 'National Cyber Emergency Response Protocol & Threat Telemetry Standard', desc: 'Standardized telemetry extraction guidelines, memory bitstream isolation, and zero-trust perimeter enforcement.' },
    { title: 'Sovereign Digital Asset Ledger & Blockchain Verification Guideline', desc: 'Technical specifications for Merkle root anchoring across Hyperledger Fabric nodes for tamper-proof evidentiary sealing.' },
    { title: 'Statutory Retention & Controlled Zeroization Protocol for Government Records', desc: 'Apex governance policy defining statutory retention lifecycles, permanent preservation holds, and dual-key cryptographic shredding.' },
    { title: 'Inter-State Law Enforcement & High Court Record Highway Exchange MoU', desc: 'Statutory multilateral memorandum of understanding establishing real-time secure document exchange channels.' },
    { title: 'Apex Vigilance & Automated Multi-Departmental Audit Inspection Framework', desc: 'Comprehensive guidelines for continuous cryptographic telemetry monitoring, immutable audit logging, and risk indexing.' },
  ];

  if (index < apexTopics.length) {
    return {
      title: `${apexTopics[index].title} #NDGA-2026-${String(index + 1).padStart(3, '0')}`,
      description: apexTopics[index].desc,
    };
  }

  if (baseName.startsWith('Financial_Audit_')) {
    const num = baseName.replace('Financial_Audit_', '');
    return {
      title: `Apex Digital Governance Consolidated Financial Audit Statement #${num}`,
      description: `Comprehensive national infrastructure balance sheet, certified capital allocation audit, and statutory ledger attestations.`,
    };
  }

  if (baseName.startsWith('Forensic_Report_CR_')) {
    const num = baseName.replace('Forensic_Report_CR_', '');
    return {
      title: `National Cyber Defense Forensic Analysis & Bitstream Verification Report #${num}`,
      description: `Hardware extraction telemetries, SHA-256 binary disk image verification, and Section 65B certified telemetry.`,
    };
  }

  if (baseName.startsWith('Land_Acquisition_Award_')) {
    const num = baseName.replace('Land_Acquisition_Award_', '');
    return {
      title: `National Data Center & Disaster Recovery Infrastructure Sanction Award #${num}`,
      description: `Competent Authority capital allocation, infrastructure boundary maps, and environmental clearance schedules.`,
    };
  }

  if (baseName.startsWith('Invoice_')) {
    const num = baseName.replace('Invoice_', '');
    return {
      title: `High-Security HSM Hardware & Sovereign Server Procurement Invoice #${num}`,
      description: `Certified FIPS 140-3 Level 4 hardware security module procurement requisition, line-item disbursements, and tax deductions.`,
    };
  }

  if (baseName.startsWith('Employee_ID_')) {
    const num = baseName.replace('Employee_ID_', '');
    return {
      title: `Apex Digital Authority Gazetted Officer Security Clearance Dossier #${num}`,
      description: `Biometric credential dossier, cryptographic badge verification, and authorized Top-Secret clearance credential.`,
    };
  }

  if (baseName.startsWith('COURT_')) {
    const hex = baseName.replace('COURT_', '').slice(0, 8);
    return {
      title: `Apex Judicial Advisory & Digital Evidence Admissibility Ruling #${hex.toUpperCase()}`,
      description: `High Court certified constitutional bench directive, digital evidence statutory guideline, and authentic court seal transcript.`,
    };
  }

  if (baseName.startsWith('SLA_')) {
    const hex = baseName.replace('SLA_', '').slice(0, 8);
    return {
      title: `Sovereign Cloud Infrastructure & High-Availability Service Level Agreement #${hex.toUpperCase()}`,
      description: `Multi-jurisdictional government cloud SLA guarantee, 99.999% uptime benchmarks, failover parameters, and liability caps.`,
    };
  }

  if (baseName.startsWith('RFP_')) {
    const hex = baseName.replace('RFP_', '').slice(0, 8);
    return {
      title: `National Post-Quantum Cryptographic Key Management System RFP #${hex.toUpperCase()}`,
      description: `Competitive national tender for next-generation quantum-resistant encryption key distribution and HSM infrastructure.`,
    };
  }

  return {
    title: `Sovereign Governance Record: ${baseName.replace(/_/g, ' ')} #${String(index + 1).padStart(3, '0')}`,
    description: `Official statutory record maintained under National Digital Governance Authority sovereign archives.`,
  };
}

async function main() {
  console.log('========================================================================');
  console.log('  NIRMAN DMS: INITIALIZE & DESIGN SUPER ADMIN ORGANIZATION (DEMO)       ');
  console.log('========================================================================\n');

  // 1. Find or Ensure DEMO Organization
  console.log('[1/10] Verifying National Digital Governance Authority (DEMO) Organization...');
  let orgRes = await query<any>(`SELECT * FROM organizations WHERE code = 'DEMO'`);
  let orgId: string;

  const defaultPasswordHash = await bcrypt.hash('Password@DMS2026!', 10);

  // Get Tiers, Categories, Regions
  const centralTier = await query<any>(`SELECT id FROM taxonomy_organization_tiers WHERE code = 'CENTRAL_GOV' LIMIT 1`);
  const regCategory = await query<any>(`SELECT id FROM taxonomy_domain_categories WHERE code = 'REGULATORY' OR code = 'CIVIL_ADMIN' LIMIT 1`);
  const delhiRegion = await query<any>(`SELECT id FROM taxonomy_jurisdiction_regions WHERE code = 'IND_DL_NZ' OR code = 'IND_DL' OR code = 'IND' LIMIT 1`);

  if (orgRes.length === 0) {
    const newOrg = await query<any>(
      `INSERT INTO organizations (
         name, code, agency_code, tier_id, domain_category_id, jurisdiction_region_id,
         nodal_officer_name, nodal_officer_email, nodal_officer_phone, status,
         is_verified_federation_node, features
       )
       VALUES ($1, 'DEMO', 'GOV-NDGA-APEX-001', $2, $3, $4, $5, $6, $7, 'ACTIVE', true, $8)
       RETURNING *;`,
      [
        'National Digital Governance Authority',
        centralTier[0]?.id || null,
        regCategory[0]?.id || null,
        delhiRegion[0]?.id || null,
        'Dr. K. Raghavan, IAS (Director General)',
        'director.general@dms.gov.in',
        '+91-11-23098800',
        JSON.stringify({
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
          feature_federation: true,
          feature_super_admin: true,
        }),
      ]
    );
    orgId = newOrg[0].id;
    console.log(`  ✓ Created DEMO Org (ID: ${orgId})`);
  } else {
    orgId = orgRes[0].id;
    await query(
      `UPDATE organizations SET 
         name = 'National Digital Governance Authority',
         agency_code = 'GOV-NDGA-APEX-001',
         tier_id = COALESCE($2, tier_id),
         domain_category_id = COALESCE($3, domain_category_id),
         jurisdiction_region_id = COALESCE($4, jurisdiction_region_id),
         nodal_officer_name = 'Dr. K. Raghavan, IAS (Director General)',
         nodal_officer_email = 'director.general@dms.gov.in',
         nodal_officer_phone = '+91-11-23098800',
         status = 'ACTIVE',
         is_verified_federation_node = true,
         features = $5
       WHERE id = $1;`,
      [
        orgId,
        centralTier[0]?.id || null,
        regCategory[0]?.id || null,
        delhiRegion[0]?.id || null,
        JSON.stringify({
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
          feature_federation: true,
          feature_super_admin: true,
        }),
      ]
    );
    console.log(`  ✓ Updated DEMO Org (ID: ${orgId})`);
  }

  // 2. Setup 4 Specialized Departments in DEMO
  console.log('\n[2/10] Configuring Specialized Apex Departments...');
  const departmentsData = [
    { code: 'NDGA_CRYPTO', name: 'Apex Cryptographic Command & Key Security' },
    { code: 'NDGA_CYBER', name: 'National Cyber Defense & Threat Intelligence' },
    { code: 'NDGA_POLICY', name: 'Sovereign Digital Policy & Statutory Standards' },
    { code: 'NDGA_FED', name: 'Inter-Agency Federation & Highway Operations' },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of departmentsData) {
    const res = await query<any>(
      `INSERT INTO departments (organization_id, code, name, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE'
       RETURNING id, code;`,
      [orgId, d.code, d.name]
    );
    deptMap[res[0].code] = res[0].id;
    console.log(`  ✓ Department: ${d.name} (${d.code})`);
  }

  // 3. Setup Security Levels (T1 to T5)
  console.log('\n[3/10] Ensuring Security Clearance Hierarchy (T1 to T5)...');
  const secLevelsData = [
    { code: 'T1', name: 'Unclassified / Public', rank: 1, approval_required: false, encryption_required: false, audit_level: 1 },
    { code: 'T2', name: 'Restricted / Official', rank: 2, approval_required: false, encryption_required: true, audit_level: 2 },
    { code: 'T3', name: 'Confidential', rank: 3, approval_required: false, encryption_required: true, audit_level: 3 },
    { code: 'T4', name: 'Secret / Sensitive', rank: 4, approval_required: true, encryption_required: true, audit_level: 4 },
    { code: 'T5', name: 'Top Secret / Apex National Security', rank: 5, approval_required: true, encryption_required: true, audit_level: 5 },
  ];

  const secLevelMap: Record<string, string> = {};
  for (const s of secLevelsData) {
    const res = await query<any>(
      `INSERT INTO security_levels (organization_id, code, name, rank, approval_required, encryption_required, audit_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (organization_id, code) DO UPDATE SET 
         name = EXCLUDED.name, rank = EXCLUDED.rank, approval_required = EXCLUDED.approval_required
       RETURNING id, code;`,
      [orgId, s.code, s.name, s.rank, s.approval_required, s.encryption_required, s.audit_level]
    );
    secLevelMap[res[0].code] = res[0].id;
  }
  console.log(`  ✓ 5 Security Levels initialized (T1 to T5).`);

  // 4. Setup Document Types in DEMO
  console.log('\n[4/10] Configuring Apex Document Types...');
  const docTypesData = [
    { code: 'APEX_DIRECTIVE', name: 'Sovereign National Digital Governance Directive' },
    { code: 'CABINET_NOTE', name: 'Cabinet Committee on Security Classified Note' },
    { code: 'CRIT_INFRA_SPEC', name: 'Critical Information Infrastructure Security Standard' },
    { code: 'VIGILANCE_SANCTION', name: 'Apex Vigilance & Anti-Corruption Statutory Sanction' },
    { code: 'CRYPTO_STANDARD', name: 'National Post-Quantum Cryptography & WORM Standard' },
    { code: 'INTER_AGENCY_MOU', name: 'Cross-Agency Data Sharing Protocol & Federation MoU' },
  ];

  const docTypeMap: Record<string, string> = {};
  for (const dt of docTypesData) {
    const res = await query<any>(
      `INSERT INTO document_types (organization_id, code, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, code;`,
      [orgId, dt.code, dt.name, `Official Apex Record: ${dt.name}`]
    );
    docTypeMap[res[0].code] = res[0].id;
    console.log(`  ✓ Document Type: ${dt.name} (${dt.code})`);
  }

  // 5. Setup Roles & Permissions
  console.log('\n[5/10] Configuring System Roles & Mapping Permissions...');
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Apex System Super Administrator', desc: 'Full root access, system settings, and sovereign federation governance', is_system: true },
    { code: 'ORG_ADMIN', name: 'National Authority Administrator', desc: 'Authority policy and institutional governance', is_system: true },
    { code: 'DEPT_HEAD', name: 'Directorate Head / Senior Approver', desc: 'Can review, approve, and verify sensitive records & cross-org transfers', is_system: true },
    { code: 'APPROVER', name: 'Designated Checker & Sanctioning Officer', desc: 'Authorized dual-custody maker-checker review authority', is_system: true },
    { code: 'INVESTIGATING_OFFICER', name: 'Executive Dealing Officer / Maker', desc: 'Can upload, draft revisions, and requisition case records', is_system: false },
    { code: 'AUDITOR', name: 'Apex Statutory & Vigilance Auditor', desc: 'Read-only access to audit trails, chain of custody, and compliance logs', is_system: true },
    { code: 'FORENSIC_EXPERT', name: 'Lead Cryptographic & Hardware Forensic Specialist', desc: 'HSM key management and Section 65B certification', is_system: false },
    { code: 'RECORD_KEEPER', name: 'Chief Sovereign Vault Custodian', desc: 'WORM lifecycle, retention holds, and archival control', is_system: false },
    { code: 'CLERK', name: 'Administrative Dealing Assistant', desc: 'Routine filing and registry assistance', is_system: false },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const res = await query<any>(
      `INSERT INTO roles (organization_id, code, name, description, is_system_role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
       RETURNING id, code;`,
      [orgId, r.code, r.name, r.desc, r.is_system]
    );
    roleMap[res[0].code] = res[0].id;
  }

  // Map ALL permissions to SUPER_ADMIN, ORG_ADMIN, DEPT_HEAD
  const allPerms = await query<any>('SELECT id, code FROM permissions');
  for (const p of allPerms) {
    await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['SUPER_ADMIN'], p.id]);
    await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['ORG_ADMIN'], p.id]);
  }

  // Maker-Checker & Approver permissions
  const approverPermCodes = ['DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE', 'AUDIT_VIEW', 'INTER_ORG_VIEW', 'INTER_ORG_DISPATCH', 'INTER_ORG_RESPOND', 'RETENTION_MANAGE', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY'];
  for (const code of approverPermCodes) {
    const p = allPerms.find((x: any) => x.code === code);
    if (p) {
      await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['DEPT_HEAD'], p.id]);
      await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['APPROVER'], p.id]);
    }
  }

  // Maker permissions
  const makerPermCodes = ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT', 'DOCUMENT_REQUEST_CHANGE', 'INTER_ORG_VIEW', 'INTER_ORG_REQUEST', 'BLOCKCHAIN_VIEW'];
  for (const code of makerPermCodes) {
    const p = allPerms.find((x: any) => x.code === code);
    if (p) {
      await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['INVESTIGATING_OFFICER'], p.id]);
    }
  }

  // Auditor permissions
  const auditorPermCodes = ['DOCUMENT_VIEW', 'AUDIT_VIEW', 'USER_PROFILE_AUDIT_VIEW', 'INTER_ORG_AUDIT_VIEW', 'INTER_ORG_AUDIT_EXPORT', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY', 'FEDERATION_VIEW'];
  for (const code of auditorPermCodes) {
    const p = allPerms.find((x: any) => x.code === code);
    if (p) {
      await query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [roleMap['AUDITOR'], p.id]);
    }
  }
  console.log(`  ✓ System roles & permissions mapped.`);

  // 6. Setup 11 Diverse Users in DEMO
  console.log('\n[6/10] Enrolling 11 Realistic Super Admin & Apex Officers in DEMO...');
  const usersData = [
    {
      username: 'admin',
      name: 'Principal Systems Administrator',
      email: 'admin@dms.gov.in',
      role: 'SUPER_ADMIN',
      designation: 'Chief Information Security Officer & Apex Super Admin',
      level: 5,
      dept: 'NDGA_CRYPTO',
      code: 'GOV-SUPER-001',
    },
    {
      username: 'director_dr_raghavan',
      name: 'Dr. K. Raghavan, IAS',
      email: 'director.general@dms.gov.in',
      role: 'ORG_ADMIN',
      designation: 'Director General & National Governance Secretary',
      level: 5,
      dept: 'NDGA_POLICY',
      code: 'NDGA-EXEC-001',
    },
    {
      username: 'ciso_priya_sharma',
      name: 'Smt. Priya Sharma, IPS',
      email: 'priya.sharma@dms.gov.in',
      role: 'APPROVER',
      designation: 'National CISO & Cryptographic Operations Head',
      level: 5,
      dept: 'NDGA_CRYPTO',
      code: 'NDGA-CISO-002',
    },
    {
      username: 'joint_dir_cyber_kapoor',
      name: 'Vikram Kapoor',
      email: 'vikram.kapoor@dms.gov.in',
      role: 'INVESTIGATING_OFFICER',
      designation: 'Joint Director (Threat Intelligence & Cyber Response)',
      level: 4,
      dept: 'NDGA_CYBER',
      code: 'NDGA-CYBER-003',
    },
    {
      username: 'compliance_head_iyer',
      name: 'Adv. Meenakshi Iyer',
      email: 'meenakshi.iyer@dms.gov.in',
      role: 'AUDITOR',
      designation: 'Chief Statutory Compliance & Section 65B Officer',
      level: 4,
      dept: 'NDGA_POLICY',
      code: 'NDGA-COMP-004',
    },
    {
      username: 'senior_architect_menon',
      name: 'Arun Menon',
      email: 'arun.menon@dms.gov.in',
      role: 'INVESTIGATING_OFFICER',
      designation: 'Principal Cloud Infrastructure & Federation Architect',
      level: 4,
      dept: 'NDGA_FED',
      code: 'NDGA-ARCH-005',
    },
    {
      username: 'forensic_lead_bhatia',
      name: 'Dr. Siddharth Bhatia',
      email: 'siddharth.bhatia@dms.gov.in',
      role: 'FORENSIC_EXPERT',
      designation: 'Lead Hardware HSM & Post-Quantum Security Analyst',
      level: 4,
      dept: 'NDGA_CRYPTO',
      code: 'NDGA-HSM-006',
    },
    {
      username: 'records_custodian_singh',
      name: 'Hardeep Singh',
      email: 'hardeep.singh@dms.gov.in',
      role: 'RECORD_KEEPER',
      designation: 'Chief Sovereign Vault Custodian & WORM Officer',
      level: 3,
      dept: 'NDGA_CRYPTO',
      code: 'NDGA-VAULT-007',
    },
    {
      username: 'policy_analyst_gupta',
      name: 'Ananya Gupta',
      email: 'ananya.gupta@dms.gov.in',
      role: 'INVESTIGATING_OFFICER',
      designation: 'Senior Digital Governance & BNSS Legal Analyst',
      level: 3,
      dept: 'NDGA_POLICY',
      code: 'NDGA-LAW-008',
    },
    {
      username: 'operations_officer_joshi',
      name: 'Rahul Joshi',
      email: 'rahul.joshi@dms.gov.in',
      role: 'CLERK',
      designation: 'Federation Highway Exchange Dealing Assistant',
      level: 2,
      dept: 'NDGA_FED',
      code: 'NDGA-OPS-009',
    },
    {
      username: 'security_auditor_das',
      name: 'Tanmoy Das',
      email: 'tanmoy.das@dms.gov.in',
      role: 'AUDITOR',
      designation: 'Apex Independent Systems & Blockchain Auditor',
      level: 5,
      dept: 'NDGA_CYBER',
      code: 'NDGA-AUDIT-010',
    },
  ];

  const userMap: Record<string, string> = {};
  for (const u of usersData) {
    const deptId = deptMap[u.dept] || Object.values(deptMap)[0];
    const res = await query<any>(
      `INSERT INTO users (
         organization_id, department_id, employee_code, username, full_name,
         email, designation, password_hash, max_security_level, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
       ON CONFLICT (organization_id, email) DO UPDATE SET
         username = EXCLUDED.username, full_name = EXCLUDED.full_name,
         designation = EXCLUDED.designation, password_hash = EXCLUDED.password_hash,
         max_security_level = EXCLUDED.max_security_level, status = 'ACTIVE'
       RETURNING id, username;`,
      [orgId, deptId, u.code, u.username, u.name, u.email, u.designation, defaultPasswordHash, u.level]
    );
    const userId = res[0].id;
    userMap[u.username] = userId;

    // Assign Role
    if (roleMap[u.role]) {
      await query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [userId, roleMap[u.role]]
      );
    }
    console.log(`  ✓ Enrolled User: ${u.username} (${u.name}) — Level ${u.level}`);
  }

  // 7. Setup 5 Statutory Retention Schedules for DEMO
  console.log('\n[7/10] Establishing Statutory Retention Schedules...');
  const retentionSchedules = [
    {
      name: 'Sovereign Cabinet Records & Apex National Directives',
      schedule_code: 'SCH_APEX_PERM',
      retention_days: null,
      permanent: true,
      deletion_requires_approval: true,
      action_on_expiry: 'Permanent Sovereign Vault Sealed',
      statutory_framework: 'Public Records Act 1993 / Cabinet Secretariat Directives',
      description: 'Permanent retention for apex digital governance directives, national security decrees, and constitutional mandates.',
    },
    {
      name: 'Critical Information Infrastructure & Cryptographic Standard Hold',
      schedule_code: 'SCH_CRIT_30Y',
      retention_days: 10950, // 30 Years
      permanent: false,
      deletion_requires_approval: true,
      action_on_expiry: 'Joint Dual-Custody Review & Cryptographic Zeroization',
      statutory_framework: 'Information Technology Act / National Cyber Security Policy',
      description: '30-year retention for hardware HSM specifications, root certificate authorities, and core network topology blueprints.',
    },
    {
      name: 'Inter-Agency Federation Protocols & Cross-Border MoUs',
      schedule_code: 'SCH_POLICY_10Y',
      retention_days: 3650, // 10 Years
      permanent: false,
      deletion_requires_approval: true,
      action_on_expiry: 'Maker-Checker Review & Controlled Archive',
      statutory_framework: 'Inter-Agency Data Governance Code 2024',
      description: '10-year retention for statutory inter-agency highway agreements, bilateral sharing protocols, and SLA schedules.',
    },
    {
      name: 'Statutory Public Records & Financial Compliance Ledger',
      schedule_code: 'SCH_AUDIT_7Y',
      retention_days: 2555, // 7 Years
      permanent: false,
      deletion_requires_approval: true,
      action_on_expiry: 'Maker-Checker Review & Cryptographic Zeroization',
      statutory_framework: 'Comptroller & Auditor General (CAG) Rules / General Financial Rules (GFR)',
      description: '7-year statutory retention for fiscal balance sheets, procurement audit manifests, and tax withholding vouchers.',
    },
    {
      name: 'Operational Telemetry & Cyber Incident Logs',
      schedule_code: 'SCH_OPS_3Y',
      retention_days: 1095, // 3 Years
      permanent: false,
      deletion_requires_approval: false,
      action_on_expiry: 'Automated Cryptographic Expungement',
      statutory_framework: 'CERT-In Cyber Security Directions 2022',
      description: '3-year retention for routine network access telemetry, firewall transaction logs, and ephemeral session receipts.',
    },
  ];

  const policyMap: Record<string, string> = {};
  for (const p of retentionSchedules) {
    const res = await query<any>(
      `INSERT INTO retention_policies (
         organization_id, name, schedule_code, retention_days, permanent,
         deletion_requires_approval, action_on_expiry, statutory_framework, description
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (organization_id, name) DO UPDATE SET
         schedule_code = EXCLUDED.schedule_code, retention_days = EXCLUDED.retention_days,
         permanent = EXCLUDED.permanent, statutory_framework = EXCLUDED.statutory_framework
       RETURNING id, schedule_code;`,
      [
        orgId,
        p.name,
        p.schedule_code,
        p.retention_days,
        p.permanent,
        p.deletion_requires_approval,
        p.action_on_expiry,
        p.statutory_framework,
        p.description,
      ]
    );
    policyMap[res[0].schedule_code] = res[0].id;
    console.log(`  ✓ Retention Policy: ${p.name} (${p.schedule_code})`);
  }

  // 8. Ingest EXACTLY 77 Documents into DEMO
  console.log('\n[8/10] Ingesting Exactly 77 Encrypted Evidentiary Documents into DEMO Vault...');
  const sourceDir = path.join(process.cwd(), 'docments');
  const allFiles = fs.readdirSync(sourceDir).filter((f) => !f.startsWith('.'));
  console.log(`  Found ${allFiles.length} files in docments/. Selecting 77 files...`);

  // Target exactly 77 files
  const selectedFiles = allFiles.slice(0, 77);

  // Clean existing DEMO documents to ensure crisp 77 count
  try {
    const existingDemoDocs = await query<any>(`SELECT id FROM documents WHERE organization_id = $1`, [orgId]);
    const demoDocIds = existingDemoDocs.map((d: any) => d.id);
    if (demoDocIds.length > 0) {
      await query(`DELETE FROM inter_org_shares WHERE document_id = ANY($1::uuid[])`, [demoDocIds]);
      await query(`DELETE FROM inter_org_requests WHERE target_document_id = ANY($1::uuid[])`, [demoDocIds]);
      await query(`DELETE FROM approval_actions WHERE change_request_id IN (SELECT id FROM change_requests WHERE document_id = ANY($1::uuid[]))`);
      await query(`DELETE FROM change_requests WHERE document_id = ANY($1::uuid[])`, [demoDocIds]);
      await query(`DELETE FROM deletion_requests WHERE document_id = ANY($1::uuid[])`, [demoDocIds]);
      await query(`DELETE FROM retention_records WHERE document_id = ANY($1::uuid[])`, [demoDocIds]);
      await query(`DELETE FROM ocr_results WHERE document_version_id IN (SELECT id FROM document_versions WHERE document_id = ANY($1::uuid[]))`);
      await query(`UPDATE documents SET current_version_id = NULL WHERE organization_id = $1`, [orgId]);
      await query(`DELETE FROM document_versions WHERE document_id = ANY($1::uuid[])`, [demoDocIds]);
      await query(`DELETE FROM documents WHERE organization_id = $1`, [orgId]);
      console.log(`  ✓ Reset existing DEMO documents for exact 77-file ingest.`);
    }
  } catch (err: any) {
    console.warn('  ⚠️ Note during DEMO docs cleanup:', err.message);
  }

  const deptIdsList = Object.values(deptMap);
  const docTypeIdsList = Object.values(docTypeMap);
  const secLevelsList = Object.values(secLevelMap);
  const policyIdsList = Object.values(policyMap);
  const uploaderUserIds = [
    userMap['admin'],
    userMap['director_dr_raghavan'],
    userMap['ciso_priya_sharma'],
    userMap['joint_dir_cyber_kapoor'],
    userMap['senior_architect_menon'],
    userMap['forensic_lead_bhatia'],
    userMap['policy_analyst_gupta'],
  ];

  const createdDocIds: string[] = [];
  const createdVersionIds: string[] = [];

  for (let i = 0; i < selectedFiles.length; i++) {
    const filename = selectedFiles[i];
    const filePath = path.join(sourceDir, filename);
    const rawBuffer = fs.readFileSync(filePath);
    const mimeType = filename.endsWith('.pdf')
      ? 'application/pdf'
      : filename.endsWith('.png')
      ? 'image/png'
      : 'application/octet-stream';

    const deptId = deptIdsList[i % deptIdsList.length];
    const docTypeId = docTypeIdsList[i % docTypeIdsList.length];
    const policyId = policyIdsList[i % policyIdsList.length];

    // Security Tier Distribution: Natural distribution across T1-T5
    let secLevelId: string;
    let secRank = (i % 5) + 1;
    if (secRank === 1) secLevelId = secLevelMap['T1'];
    else if (secRank === 2) secLevelId = secLevelMap['T2'];
    else if (secRank === 3) secLevelId = secLevelMap['T3'];
    else if (secRank === 4) secLevelId = secLevelMap['T4'];
    else secLevelId = secLevelMap['T5'];

    const uploaderId = uploaderUserIds[i % uploaderUserIds.length];
    const { title, description } = generateTitleAndDescription(filename, i);

    const docNumber = `NDGA-APEX-2026-${String(i + 1).padStart(4, '0')}`;
    const envelope = await EnvelopeEncryptionService.encryptDocument(rawBuffer, docNumber);

    const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `documents/${docNumber}/v1_${Date.now()}_${sanitizedFileName}.enc`;

    try {
      await putEncryptedObject(objectKey, envelope.encryptedPayload, {
        'x-dms-doc-number': docNumber,
        'x-dms-sha256': envelope.sha256Checksum,
        'x-dms-kms-provider': envelope.kmsProvider,
        'x-dms-algo': envelope.cipherAlgorithm,
      });
    } catch (e) {}

    // Spread over past 180 days
    const hoursAgo = Math.floor((selectedFiles.length - i) * 36) + (i % 12);

    // 1. Insert Document
    const docRes = await query<any>(
      `INSERT INTO documents (
         organization_id, document_number, title, description,
         document_type_id, department_id, security_level_id, retention_policy_id,
         owner_id, status, created_by, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', $9, NOW() - ($10 || ' hours')::INTERVAL, NOW() - ($10 || ' hours')::INTERVAL)
       RETURNING id;`,
      [
        orgId,
        docNumber,
        title,
        description,
        docTypeId,
        deptId,
        secLevelId,
        policyId,
        uploaderId,
        hoursAgo,
      ]
    );
    const docId = docRes[0].id;
    createdDocIds.push(docId);

    // 2. Insert Version 1.0
    const vaultRef = JSON.stringify({
      iv: envelope.iv,
      authTag: envelope.authTag,
      wrappedDek: envelope.wrappedDek,
      kmsProvider: envelope.kmsProvider,
      cipherAlgorithm: envelope.cipherAlgorithm,
    });

    const vRes = await query<any>(
      `INSERT INTO document_versions (
         document_id, version_number, status, created_by, created_at,
         file_name, mime_type, file_size, sha256_hash,
         encryption_algorithm, key_wrap_algorithm, vault_key_reference,
         minio_bucket, minio_object_key, checksum_verified
       )
       VALUES ($1, 1, 'ACTIVE', $2, NOW() - ($3 || ' hours')::INTERVAL, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       RETURNING id;`,
      [
        docId,
        uploaderId,
        hoursAgo,
        filename,
        mimeType,
        rawBuffer.length,
        envelope.sha256Checksum,
        envelope.cipherAlgorithm,
        'AES-256-GCM-KWP',
        vaultRef,
        BUCKET_NAME,
        objectKey,
      ]
    );
    const versionId = vRes[0].id;
    createdVersionIds.push(versionId);

    // Update document's current_version_id
    await query(`UPDATE documents SET current_version_id = $1 WHERE id = $2`, [versionId, docId]);

    // 3. Insert Retention Record
    // Make ~13 records have Active Legal / Preservation Holds
    const isLegalHold = i % 6 === 1; // Exactly 13 holds
    const isDisposalStaged = !isLegalHold && (i % 15 === 3); // Staged for disposal

    let holdOrder: string | null = null;
    let holdAuth: string | null = null;
    let holdReason: string | null = null;
    let holdBy: string | null = null;

    if (isLegalHold) {
      holdOrder = `NSC-APEX-2026-HOLD-${String(i + 10).padStart(3, '0')}`;
      holdAuth = 'National Security Council & Apex High Court Mandate';
      holdReason = 'Statutory preservation lock enforced under Bharatiya Sakshya Adhiniyam / Public Records Act for ongoing sovereign evidentiary custody.';
      holdBy = userMap['ciso_priya_sharma'];
    }

    await query<any>(
      `INSERT INTO retention_records (
         document_id, retention_policy_id, retention_start_at, retention_end_at,
         legal_hold, status, created_at,
         legal_hold_order_number, legal_hold_authority, legal_hold_reason,
         legal_hold_by, legal_hold_applied_at
       )
       VALUES (
         $1, $2, NOW() - ($3 || ' hours')::INTERVAL,
         NOW() + INTERVAL '7 years',
         $4, $5, NOW() - ($3 || ' hours')::INTERVAL,
         $6, $7, $8, $9, ${isLegalHold ? `NOW() - (${hoursAgo} || ' hours')::INTERVAL` : 'NULL'}
       );`,
      [
        docId,
        policyId,
        hoursAgo,
        isLegalHold,
        isLegalHold ? 'FROZEN' : isDisposalStaged ? 'DISPOSAL_STAGED' : 'STANDARD',
        holdOrder,
        holdAuth,
        holdReason,
        holdBy,
      ]
    );

    // If disposal staged, insert a deletion request
    if (isDisposalStaged) {
      await query(
        `INSERT INTO deletion_requests (
           document_id, requested_by, reason, status, requested_at, shred_method
         )
         VALUES ($1, $2, $3, 'PENDING_APPROVAL', NOW() - INTERVAL '2 days', 'CRYPTOGRAPHIC_KEY_ZEROIZATION');`,
        [
          docId,
          userMap['records_custodian_singh'],
          'Statutory retention schedule elapsed. Proposed for dual-custody cryptographic zeroization and certificate issuance.',
        ]
      );
    }

    // 4. OCR Intelligence
    const ocrSnippet = `GOVERNMENT OF INDIA - NATIONAL DIGITAL GOVERNANCE AUTHORITY (APEX COMMAND)\n` +
      `DOCKET NO: ${docNumber}\n` +
      `TITLE: ${title}\n` +
      `CLASSIFICATION: LEVEL ${secRank} / TIER T${secRank}\n` +
      `DATE OF SEALING: 2026-03-15 | STATUTORY COMPLIANCE: SECTION 65B BSA 2023\n` +
      `SUMMARY: ${description}\n` +
      `CRYPTOGRAPHIC HASH (SHA-256): ${envelope.sha256Checksum}\n` +
      `AUTHORITY: Apex Cryptographic Command, New Delhi Range (IND_DL_NZ).\n` +
      `This electronic document is cryptographically verified and anchored on Hyperledger Fabric.`;

    await query(
      `INSERT INTO ocr_results (document_version_id, extracted_text, text_sha256, language, confidence, created_at, updated_at)
       VALUES ($1, $2, $3, 'eng', $4, NOW() - ($5 || ' hours')::INTERVAL, NOW() - ($5 || ' hours')::INTERVAL)
       ON CONFLICT (document_version_id) DO NOTHING;`,
      [
        versionId,
        ocrSnippet,
        crypto.createHash('sha256').update(ocrSnippet).digest('hex'),
        96.5 + (i % 4) * 0.8,
        hoursAgo,
      ]
    );
  }

  console.log(`  ✓ Successfully sealed ${createdDocIds.length} documents into DEMO vault.`);

  // 9. Create 8 Maker-Checker Sensitive Approval Change Requests in DEMO
  console.log('\n[9/10] Creating 8 Pending Maker-Checker Revision & Elevation Requests in DEMO...');
  const approverId = userMap['ciso_priya_sharma'];
  const makerId = userMap['joint_dir_cyber_kapoor'];

  for (let k = 0; k < 8; k++) {
    const targetDocId = createdDocIds[k * 9];
    const origVersionId = createdVersionIds[k * 9];

    if (!targetDocId || !origVersionId) continue;

    // Create a proposed version v2.0
    const propVRes = await query<any>(
      `INSERT INTO document_versions (
         document_id, version_number, status, created_by, created_at,
         file_name, mime_type, file_size, sha256_hash,
         encryption_algorithm, key_wrap_algorithm, vault_key_reference,
         minio_bucket, minio_object_key, checksum_verified
       )
       VALUES ($1, 2, 'PENDING_APPROVAL', $2, NOW() - INTERVAL '1 day', $3, 'application/pdf', 85400, $4, 'AES-256-GCM', 'AES-256-GCM-KWP', '{"kmsProvider":"LOCAL"}', $5, $6, true)
       RETURNING id;`,
      [
        targetDocId,
        makerId,
        `Revised_Directive_v2_${k + 1}.pdf`,
        crypto.randomBytes(32).toString('hex'),
        BUCKET_NAME,
        `documents/NDGA-APEX-2026-000${k + 1}/v2_proposed.enc`,
      ]
    );
    const propVersionId = propVRes[0].id;

    const reasons = [
      'Statutory revision updating post-quantum key encapsulation parameters under BNSS 2023 guidelines.',
      'Elevation of docket security tier from T3 (Confidential) to T5 (Top Secret) following Inter-Agency Advisory.',
      'Annual policy re-certification and incorporation of new Cyber Security Directives.',
      'Amendment to annexure tables containing certified Section 65B forensic hash signatures.',
      'Controlled metadata redaction and sanctioning for inter-agency judicial production.',
      'Revision of Disaster Recovery SLA parameters and multi-region failover tolerances.',
      'Re-calibration of cryptographic HSM key rotation schedules for sovereign root nodes.',
      'Statutory update to compliance annexure pursuant to High Court Constitutional Bench order.',
    ];

    await query(
      `INSERT INTO change_requests (
         document_id, original_version_id, proposed_version_id, requested_by,
         assigned_approver_id, reason, status, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW() - INTERVAL '12 hours')
       ON CONFLICT DO NOTHING;`,
      [
        targetDocId,
        origVersionId,
        propVersionId,
        makerId,
        approverId,
        reasons[k % reasons.length],
      ]
    );
  }
  console.log(`  ✓ 8 Maker-Checker change requests created and awaiting dual-custody approval.`);

  // 10. Create 15+ Inter-Organization Highway Requests & Shares
  console.log('\n[10/10] Establishing Sovereign Inter-Agency Collaboration Highway (16 Requisitions)...');
  const otherOrgs = await query<any>(`SELECT id, code, name FROM organizations WHERE code != 'DEMO'`);
  const priorityTiers = await query<any>(`SELECT id, code FROM taxonomy_priority_tiers`);
  const accessModes = await query<any>(`SELECT id, code FROM taxonomy_access_modes`);

  const pCourt = priorityTiers.find((p: any) => p.code === 'COURT_MANDATE')?.id || priorityTiers[0]?.id;
  const pUrgent = priorityTiers.find((p: any) => p.code === 'URGENT_WARRANT')?.id || priorityTiers[0]?.id;
  const pHigh = priorityTiers.find((p: any) => p.code === 'HIGH_PRIORITY')?.id || priorityTiers[0]?.id;
  const pRoutine = priorityTiers.find((p: any) => p.code === 'ROUTINE')?.id || priorityTiers[0]?.id;

  const modeWatermark = accessModes.find((a: any) => a.code === 'VIEW_ONLY_WATERMARKED')?.id || accessModes[0]?.id;
  const modeCert = accessModes.find((a: any) => a.code === 'FULL_CERTIFIED_DOWNLOAD')?.id || accessModes[0]?.id;

  let reqSeq = 100;

  for (const o of otherOrgs) {
    // 1. Outbound from DEMO to other org
    const reqNumOut = `REQ-NDGA-${o.code}-${++reqSeq}`;
    const outReqRes = await query<any>(
      `INSERT INTO inter_org_requests (
         request_number, requesting_org_id, requesting_user_id, target_org_id,
         priority_tier_id, reference_case_number, subject_title,
         custom_statutory_purpose, custom_legal_provisions, requested_access_days,
         sla_deadline, status, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 30, NOW() + INTERVAL '48 hours', 'APPROVED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day')
       ON CONFLICT (request_number) DO NOTHING
       RETURNING id;`,
      [
        reqNumOut,
        orgId,
        userMap['joint_dir_cyber_kapoor'],
        o.id,
        pCourt,
        `APEX-REF-2026-${o.code}-09`,
        `Statutory Evidentiary Requisition for Apex Sovereign Audit (${o.name})`,
        'Inter-Agency requisition of certified institutional records and telemetry under Section 65B BSA 2023.',
        'Bharatiya Sakshya Adhiniyam 2023, Section 65B & Public Records Act',
      ]
    );

    // 2. Inbound from other org to DEMO
    const reqNumIn = `REQ-${o.code}-NDGA-${++reqSeq}`;
    const inReqRes = await query<any>(
      `INSERT INTO inter_org_requests (
         request_number, requesting_org_id, requesting_user_id, target_org_id,
         priority_tier_id, reference_case_number, subject_title,
         custom_statutory_purpose, custom_legal_provisions, requested_access_days,
         sla_deadline, status, created_at, updated_at, target_document_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 14, NOW() + INTERVAL '24 hours', 'PENDING_REVIEW', NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 hours', $10)
       ON CONFLICT (request_number) DO NOTHING
       RETURNING id;`,
      [
        reqNumIn,
        o.id,
        userMap['admin'], // fallback user
        orgId,
        pUrgent,
        `CRIM-DIV-${o.code}-2026-88`,
        `Formal Requisition for National Cryptographic Key Standard & WORM Manifest`,
        `Formal requisition submitted by ${o.name} for official trial evidence and Section 65B attestation.`,
        'Information Technology Act & Judicial Precedent Protocol',
        createdDocIds[0],
      ]
    );

    // 3. Create active Inter-Org Share for the outbound approved request
    if (outReqRes.length > 0 && createdDocIds.length > 0) {
      const shareDocId = createdDocIds[reqSeq % createdDocIds.length];
      const shareVerId = createdVersionIds[reqSeq % createdVersionIds.length];
      const shareNumber = `SHR-NDGA-${o.code}-${reqSeq}`;
      const tokenHash = crypto.randomBytes(32).toString('hex');

      await query(
        `INSERT INTO inter_org_shares (
           share_number, request_id, document_id, document_version_id,
           source_org_id, target_org_id, access_mode_id, is_watermarked,
           token_hash, view_count, download_count, starts_at, expires_at,
           created_by_user_id, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, 3, 1, NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days', $9, NOW() - INTERVAL '2 days')
         ON CONFLICT (share_number) DO NOTHING;`,
        [
          shareNumber,
          outReqRes[0].id,
          shareDocId,
          shareVerId,
          orgId,
          o.id,
          modeCert,
          tokenHash,
          userMap['admin'],
        ]
      );
    }
  }
  console.log(`  ✓ 16 Inter-Organization requisitions & active secure shares established.`);

  // 11. Create Blockchain Ledger Anchors & Audit Events
  console.log('\n[11/10] Anchoring Sovereign Merkle Roots to Hyperledger Fabric Blockchain & Logging Audit Trail...');
  for (let m = 0; m < 20; m++) {
    const docId = createdDocIds[m];
    const verId = createdVersionIds[m];
    const eventHash = crypto.randomBytes(32).toString('hex');
    const txId = `0x${crypto.randomBytes(32).toString('hex')}`;

    const auditRes = await query<any>(
      `INSERT INTO audit_events (
         organization_id, event_type, actor_id, resource_type, resource_id,
         document_id, document_version_id, result, event_metadata, event_hash, created_at
       )
       VALUES ($1, $2, $3, 'DOCUMENT', $4, $4, $5, 'SUCCESS', $6, $7, NOW() - ($8 || ' hours')::INTERVAL)
       RETURNING id;`,
      [
        orgId,
        m % 3 === 0 ? 'FILE_UPLOAD' : m % 3 === 1 ? 'BLOCKCHAIN_ANCHOR' : 'DEK_UNWRAP_STREAM',
        userMap['admin'],
        docId,
        verId,
        JSON.stringify({
          action: 'SOVEREIGN_SEAL',
          docNumber: `NDGA-APEX-2026-${String(m + 1).padStart(4, '0')}`,
          channel: 'dms-federation-channel',
          txId,
        }),
        eventHash,
        m * 4 + 1,
      ]
    );

    // Blockchain record
    await query(
      `INSERT INTO blockchain_records (
         audit_event_id, network_name, channel_name, chaincode_name,
         transaction_id, payload_hash, ledger_status, submitted_at, confirmed_at
       )
       VALUES ($1, 'Hyperledger Fabric Sovereign Consortium', 'dms-federation-channel', 'dms-evidence-contract', $2, $3, 'CONFIRMED', NOW() - ($4 || ' hours')::INTERVAL, NOW() - ($4 || ' hours')::INTERVAL)
       ON CONFLICT DO NOTHING;`,
      [
        auditRes[0].id,
        txId,
        eventHash,
        m * 4 + 1,
      ]
    );
  }
  console.log(`  ✓ 20 Blockchain Merkle root blocks confirmed on Hyperledger Fabric ledger.`);

  // 12. Create Notifications for Super Admin
  console.log('\n[12/10] Seeding System Notifications & Security Alerts...');
  const notifs = [
    { title: 'Urgent Inter-Agency Requisition Received', msg: 'High Court of Judicature at Bombay requested Section 65B certified telemetry for Docket #NDGA-APEX-2026-0001.', sev: 'high' },
    { title: 'Maker-Checker Dual Custody Review Required', msg: 'Joint Director Vikram Kapoor submitted Revision v2.0 for Top-Secret Docket #NDGA-APEX-2026-0009 awaiting your sanction.', sev: 'warning' },
    { title: 'Preservation Lock Active (WORM Immutable)', msg: 'Preservation Lock #NSC-APEX-2026-HOLD-001 successfully anchored on Hyperledger Fabric consortium ledger.', sev: 'info' },
    { title: 'Consortium Node Health: All 6 Sovereign Nodes Synced', msg: 'Hyperledger Fabric consensus verified with 100% block integrity across Central, High Court, CBI, Police, FSL & Revenue nodes.', sev: 'info' },
  ];

  for (const n of notifs) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, severity, created_at)
       VALUES ($1, 'SYSTEM', $2, $3, $4, NOW() - INTERVAL '2 hours');`,
      [userMap['admin'], n.title, n.msg, n.sev]
    );
  }
  console.log(`  ✓ Alerts & Notifications populated.`);

  // Invalidate Redis Caches
  try {
    await invalidateCache('dms:*');
    await invalidateCache('collab:*');
    await invalidateCache('taxonomy:*');
    await invalidateCache('user:*');
    await invalidateCache('org:*');
  } catch (e) {}

  // Final Summary
  const demoDocsCount = await query<any>(`SELECT count(*) as count FROM documents WHERE organization_id = $1`, [orgId]);
  const demoUsersCount = await query<any>(`SELECT count(*) as count FROM users WHERE organization_id = $1`, [orgId]);
  const demoHoldsCount = await query<any>(`SELECT count(*) as count FROM retention_records rr JOIN documents d ON rr.document_id = d.id WHERE d.organization_id = $1 AND rr.legal_hold = true`, [orgId]);
  const demoReqsCount = await query<any>(`SELECT count(*) as count FROM change_requests cr JOIN documents d ON cr.document_id = d.id WHERE d.organization_id = $1 AND cr.status = 'PENDING'`, [orgId]);
  const demoInterOrgCount = await query<any>(`SELECT count(*) as count FROM inter_org_requests WHERE requesting_org_id = $1 OR target_org_id = $1`, [orgId]);

  console.log('\n========================================================================');
  console.log('  🏛️  SUPER ADMIN ORGANIZATION (DEMO) INITIALIZATION COMPLETE!          ');
  console.log('========================================================================');
  console.log(`  🏢  Organization:        National Digital Governance Authority (DEMO)`);
  console.log(`  👤  Users Enrolled:      ${demoUsersCount[0].count} Officers (Clearance Levels 1 to 5)`);
  console.log(`  📁  Documents Ingested:  ${demoDocsCount[0].count} Evidentiary Records (100% AES-256-GCM + MinIO)`);
  console.log(`  🔒  Active WORM Holds:   ${demoHoldsCount[0].count} Preservation Locks Enforced`);
  console.log(`  ✍️  Maker-Checker Queue: ${demoReqsCount[0].count} Pending Sensitive Change Requests`);
  console.log(`  🌐  Inter-Org Reqs:      ${demoInterOrgCount[0].count} Sovereign Highway Requests`);
  console.log('------------------------------------------------------------------------');
  console.log('  🔑  SUPER ADMIN LOGIN:');
  console.log('      • Username:          admin');
  console.log('      • Password:          Password@DMS2026!');
  console.log('      • Role:              SUPER_ADMIN (Apex Clearance Level 5)');
  console.log('========================================================================\n');

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
