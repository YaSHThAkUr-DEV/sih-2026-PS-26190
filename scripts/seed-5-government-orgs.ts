import { Client } from 'pg';
import bcrypt from 'bcryptjs';

async function seedFiveGovernmentOrganizations() {
  console.log('========================================================================');
  console.log('  NIRMAN DMS: SEEDING 5 REALISTIC SOVEREIGN INDIAN GOVT ORGANIZATIONS  ');
  console.log('========================================================================\n');

  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'dms_db',
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    // -------------------------------------------------------------------------
    // 1. ALL SYSTEM & FEDERATION PERMISSIONS
    // -------------------------------------------------------------------------
    console.log('[1/7] Ensuring Standard & Federation System Permissions...');
    const permissions = [
      { code: 'DOCUMENT_CREATE', desc: 'Create and upload official evidentiary documents' },
      { code: 'DOCUMENT_VIEW', desc: 'View decrypted evidentiary files within security clearance' },
      { code: 'DOCUMENT_DOWNLOAD', desc: 'Download decrypted or watermarked binaries' },
      { code: 'DOCUMENT_EDIT', desc: 'Edit document metadata, tags, and classification' },
      { code: 'DOCUMENT_DELETE', desc: 'Soft-delete non-immutable docket records' },
      { code: 'DOCUMENT_RESTORE', desc: 'Restore archived or expunged records' },
      { code: 'DOCUMENT_REQUEST_CHANGE', desc: 'Submit controlled change request under Maker-Checker' },
      { code: 'DOCUMENT_APPROVE_CHANGE', desc: 'Sanction and approve sensitive document changes / transfers' },
      { code: 'DOCUMENT_REJECT_CHANGE', desc: 'Reject controlled document change or transfer requests' },
      { code: 'AUDIT_VIEW', desc: 'View institutional immutable audit trail logs' },
      { code: 'USER_PROFILE_AUDIT_VIEW', desc: 'Inspect individual officer access histories and telemetry' },
      { code: 'PERMISSION_MANAGE', desc: 'Configure local role and permission assignments' },
      { code: 'USER_MANAGE', desc: 'Enroll, inspect, and manage institutional personnel' },
      { code: 'DEPARTMENT_MANAGE', desc: 'Configure departments, sections, and bench units' },
      { code: 'RETENTION_MANAGE', desc: 'Configure statutory retention schedules and legal holds' },
      { code: 'BLOCKCHAIN_VIEW', desc: 'Inspect Hyperledger Fabric immutable ledger blocks' },
      { code: 'BLOCKCHAIN_ANCHOR', desc: 'Anchor Merkle root digests to blockchain ledger' },
      { code: 'BLOCKCHAIN_VERIFY', desc: 'Cryptographically verify document hashes on ledger' },
      { code: 'INTER_ORG_VIEW', desc: 'Browse the Sovereign Federation inter-agency directory' },
      { code: 'INTER_ORG_REQUEST', desc: 'Submit formal statutory document requisitions to other agencies' },
      { code: 'INTER_ORG_DISPATCH', desc: 'Approve and dispatch certified records to requisitioning agencies' },
      { code: 'INTER_ORG_RESPOND', desc: 'Review, accept, or reject inbound inter-agency requests' },
      { code: 'INTER_ORG_AUDIT_VIEW', desc: 'Inspect cross-agency dual-custody exchange audit logs' },
      { code: 'INTER_ORG_AUDIT_EXPORT', desc: 'Export certified statutory audit reports' },
      { code: 'FEDERATION_VIEW', desc: 'View sovereign federation network topology' },
      { code: 'FEDERATION_MANAGE', desc: 'Govern sovereign federation nodes and inter-agency SLAs' },
    ];

    const permMap: Record<string, string> = {};
    for (const p of permissions) {
      const res = await client.query(
        `INSERT INTO permissions (code, description)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, code;`,
        [p.code, p.desc]
      );
      permMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log(`  ✓ ${Object.keys(permMap).length} Permissions verified.`);

    // -------------------------------------------------------------------------
    // 2. DYNAMIC TAXONOMIES (Tiers, Categories, Regions, Priority, Access Modes)
    // -------------------------------------------------------------------------
    console.log('\n[2/7] Seeding Dynamic Sovereign Taxonomies...');
    
    // Tiers
    const tiers = [
      { code: 'CENTRAL_GOV', name: 'Central Government Ministry / Apex Body', level: 1, color: '#3b82f6', desc: 'Federal ministries, departments, and apex statutory institutions' },
      { code: 'STATE_GOV', name: 'State Government Directorate / Secretariat', level: 2, color: '#6366f1', desc: 'State secretariats, directorates, and divisional commissionerates' },
      { code: 'UT_ADMIN', name: 'Union Territory Administration', level: 2, color: '#8b5cf6', desc: 'Administrations of Union Territories' },
      { code: 'LOCAL_BODY', name: 'Municipal Corporation / Civic Authority', level: 3, color: '#10b981', desc: 'Urban local bodies and municipal councils' },
    ];
    const tierMap: Record<string, string> = {};
    for (const t of tiers) {
      const res = await client.query(
        `INSERT INTO taxonomy_organization_tiers (code, name, description, hierarchy_level, badge_color)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, badge_color = EXCLUDED.badge_color
         RETURNING id, code;`,
        [t.code, t.name, t.desc, t.level, t.color]
      );
      tierMap[res.rows[0].code] = res.rows[0].id;
    }

    // Domain Categories
    const categories = [
      { code: 'JUDICIARY', name: 'Judiciary & High Courts', icon: 'gavel', color: '#8b5cf6', desc: 'Supreme Court, High Courts, Tribunals & Registries' },
      { code: 'LAW_ENFORCEMENT', name: 'Law Enforcement & Police', icon: 'local_police', color: '#ef4444', desc: 'State Police, Special Investigation Units, Anti-Terror Squads, CBI' },
      { code: 'FORENSIC_LAB', name: 'Forensic Science Laboratories (FSL)', icon: 'biotech', color: '#06b6d4', desc: 'Central & State Forensic Laboratories, Cyber Forensics & DNA' },
      { code: 'CIVIL_ADMIN', name: 'Civil Administration & Revenue', icon: 'account_balance', color: '#10b981', desc: 'District Collectorates, General Administration & Land Records' },
      { code: 'REGULATORY', name: 'Vigilance & Regulatory Commissions', icon: 'policy', color: '#f59e0b', desc: 'Central Vigilance Commission, Lokayukta' },
    ];
    const catMap: Record<string, string> = {};
    for (const c of categories) {
      const res = await client.query(
        `INSERT INTO taxonomy_domain_categories (code, name, icon_name, badge_color, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, icon_name = EXCLUDED.icon_name
         RETURNING id, code;`,
        [c.code, c.name, c.icon, c.color, c.desc]
      );
      catMap[res.rows[0].code] = res.rows[0].id;
    }

    // Regions
    const regions = [
      { type: 'COUNTRY', code: 'IND', name: 'Republic of India', stateCode: null, parentCode: null },
      { type: 'STATE', code: 'IND_MH', name: 'Maharashtra', stateCode: 'MH', parentCode: 'IND' },
      { type: 'STATE', code: 'IND_DL', name: 'National Capital Territory of Delhi', stateCode: 'DL', parentCode: 'IND' },
      { type: 'STATE', code: 'IND_GJ', name: 'Gujarat', stateCode: 'GJ', parentCode: 'IND' },
      { type: 'DISTRICT', code: 'IND_MH_MUM', name: 'Mumbai City & Suburban', stateCode: 'MH', parentCode: 'IND_MH' },
      { type: 'DISTRICT', code: 'IND_DL_NZ', name: 'New Delhi Range', stateCode: 'DL', parentCode: 'IND_DL' },
      { type: 'DISTRICT', code: 'IND_GJ_AMD', name: 'Ahmedabad District', stateCode: 'GJ', parentCode: 'IND_GJ' },
    ];
    const regionMap: Record<string, string> = {};
    for (const r of regions) {
      const parentId = r.parentCode ? regionMap[r.parentCode] || null : null;
      const res = await client.query(
        `INSERT INTO taxonomy_jurisdiction_regions (parent_id, region_type, code, name, state_code)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (region_type, code) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, code;`,
        [parentId, r.type, r.code, r.name, r.stateCode]
      );
      regionMap[res.rows[0].code] = res.rows[0].id;
    }

    // Priority Tiers
    const priorityTiers = [
      { code: 'COURT_MANDATE', name: 'Court Mandate / Bail Order', sla: 2, color: '#ef4444', desc: 'Direct judicial order with strict immediate production timeline', reqJust: true },
      { code: 'URGENT_WARRANT', name: 'Urgent Evidentiary Warrant', sla: 24, color: '#f97316', desc: 'Time-sensitive criminal case, seizure, or bail hearing', reqJust: true },
      { code: 'HIGH_PRIORITY', name: 'High Priority Investigation', sla: 48, color: '#eab308', desc: 'Vigilance inquiry, legislative question, or compliance deadline', reqJust: false },
      { code: 'ROUTINE', name: 'Standard Routine Requisition', sla: 168, color: '#3b82f6', desc: 'Regular inter-departmental verification and record sharing (7 Days)', reqJust: false },
    ];
    for (const pt of priorityTiers) {
      await client.query(
        `INSERT INTO taxonomy_priority_tiers (code, name, sla_hours, badge_color, description, requires_justification)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, sla_hours = EXCLUDED.sla_hours, badge_color = EXCLUDED.badge_color;`,
        [pt.code, pt.name, pt.sla, pt.color, pt.desc, pt.reqJust]
      );
    }

    // Access Modes
    const accessModes = [
      { code: 'VIEW_ONLY_WATERMARKED', name: 'Ephemeral Watermarked View Only', raw: false, watermarked: true, view: true },
      { code: 'FULL_CERTIFIED_DOWNLOAD', name: 'Full Certified Binary Download with Section 65B Certificate', raw: true, watermarked: true, view: true },
    ];
    for (const am of accessModes) {
      await client.query(
        `INSERT INTO taxonomy_access_modes (code, name, allow_raw_download, allow_watermarked_pdf, allow_browser_view)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;`,
        [am.code, am.name, am.raw, am.watermarked, am.view]
      );
    }
    console.log('  ✓ Dynamic Taxonomies ready.');

    // -------------------------------------------------------------------------
    // 3. DEFINE THE 5 REALISTIC INDIAN GOVERNMENT ORGANIZATIONS & 10+ USERS EACH
    // -------------------------------------------------------------------------
    const defaultPasswordHash = await bcrypt.hash('Password@DMS2026!', 10);

    const organizationsData = [
      // -----------------------------------------------------------------------
      // ORG 1: High Court of Judicature at Bombay
      // -----------------------------------------------------------------------
      {
        code: 'MH-HC-BOM',
        name: 'High Court of Judicature at Bombay',
        agencyCode: 'MH-JUD-HC-001',
        tierCode: 'STATE_GOV',
        catCode: 'JUDICIARY',
        regionCode: 'IND_MH_MUM',
        nodalName: 'Registrar General (Judicial-I)',
        nodalEmail: 'registrar.general@bombayhighcourt.nic.in',
        nodalPhone: '+91-22-22676767',
        features: {
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
        },
        departments: [
          { name: 'Criminal Appellate & Constitutional Writ Registry', code: 'CRIM_WRIT' },
          { name: 'Original Side & Commercial Disputes Division', code: 'ORIG_SIDE' },
          { name: 'Judicial Evidence & Section 65B Certification Vault', code: 'JUD_VAULT' },
        ],
        docTypes: [
          { code: 'WRIT_PETITION', name: 'Criminal & Constitutional Writ Petition' },
          { code: 'BAIL_ORDER', name: 'Judicial Bail Sanction Order' },
          { code: 'JUDGMENT', name: 'Certified Final High Court Judgment & Decree' },
          { code: 'SECTION_65B_CERT', name: 'Section 65B Electronic Evidence Certificate' },
          { code: 'CAUSALIST_ROSTER', name: 'Daily Judicial Causelist & Bench Roster' },
        ],
        retentionPolicies: [
          { name: 'Permanent Judicial Precedents & Judgments', schedule_code: 'SCH_PERM_JUD', retention_days: null, permanent: true, deletion_requires_approval: true, action_on_expiry: 'Permanent Custody Sealed', statutory_framework: 'High Court Rules & Public Records Act', description: 'Certified judgments and sovereign precedents' },
          { name: 'Criminal Trial Exhibits & Electronic Evidence Hold', schedule_code: 'SCH_CRIM_30Y', retention_days: 10950, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Comprehensive Archival Review', statutory_framework: 'Bharatiya Sakshya Adhiniyam / Indian Evidence Act', description: 'Trial evidence and digital exhibits' },
          { name: 'Interlocutory Applications & Daily Causelists', schedule_code: 'SCH_MISC_7Y', retention_days: 2555, permanent: false, deletion_requires_approval: false, action_on_expiry: 'Automatic Archive', statutory_framework: 'Administrative Guidelines', description: 'Routine administrative listings and daily causelists' },
        ],
        users: [
          { username: 'hc_admin', name: 'Sanjay Deshmukh (High Court IT Director)', email: 'admin@bombayhighcourt.nic.in', role: 'ORG_ADMIN', designation: 'Director (Judicial IT Infrastructure)', level: 5, dept: 'CRIM_WRIT', code: 'HC-IT-001' },
          { username: 'justice_pb_deshmukh', name: "Hon'ble Justice P. B. Deshmukh", email: 'justice.deshmukh@bombayhighcourt.nic.in', role: 'DEPT_HEAD', designation: 'High Court Senior Judge & Bench President', level: 5, dept: 'CRIM_WRIT', code: 'HC-JUD-001' },
          { username: 'registrar_kv_sharma', name: 'Shri K. V. Sharma', email: 'registrar.sharma@bombayhighcourt.nic.in', role: 'DEPT_HEAD', designation: 'Registrar (Judicial-I)', level: 5, dept: 'CRIM_WRIT', code: 'HC-REG-012' },
          { username: 'addl_registrar_patil', name: 'Smt. Sunita Patil', email: 'addl.registrar@bombayhighcourt.nic.in', role: 'APPROVER', designation: 'Additional Registrar (Original Side)', level: 4, dept: 'ORIG_SIDE', code: 'HC-REG-034' },
          { username: 'bench_officer_kulkarni', name: 'Rajesh Kulkarni', email: 'r.kulkarni@bombayhighcourt.nic.in', role: 'INVESTIGATING_OFFICER', designation: 'Senior Bench Dealing Officer', level: 3, dept: 'ORIG_SIDE', code: 'HC-BO-099' },
          { username: 'court_master_joshi', name: 'Adv. Ananya Joshi', email: 'ananya.joshi@bombayhighcourt.nic.in', role: 'OFFICER', designation: 'Court Master & Decree Officer', level: 3, dept: 'ORIG_SIDE', code: 'HC-CM-104' },
          { username: 'evidence_officer_nair', name: 'Dr. Priya Nair', email: 'priya.nair@bombayhighcourt.nic.in', role: 'FORENSIC_EXPERT', designation: 'Section 65B Digital Evidence Certification Officer', level: 4, dept: 'JUD_VAULT', code: 'HC-CERT-015' },
          { username: 'archivist_sawant', name: 'Prakash Sawant', email: 'p.sawant@bombayhighcourt.nic.in', role: 'RECORD_KEEPER', designation: 'Chief Records Custodian & Archivist', level: 3, dept: 'JUD_VAULT', code: 'HC-ARC-022' },
          { username: 'hc_vigilance_shinde', name: 'D. R. Shinde', email: 'vigilance@bombayhighcourt.nic.in', role: 'AUDITOR', designation: 'High Court Chief Vigilance Officer', level: 5, dept: 'JUD_VAULT', code: 'HC-VIG-005' },
          { username: 'judicial_clerk_mehta', name: 'Rohan Mehta', email: 'rohan.mehta@bombayhighcourt.nic.in', role: 'CLERK', designation: 'Judicial Registry Assistant', level: 2, dept: 'CRIM_WRIT', code: 'HC-CLK-188' },
        ],
      },

      // -----------------------------------------------------------------------
      // ORG 2: Central Bureau of Investigation — Cyber Crime Branch
      // -----------------------------------------------------------------------
      {
        code: 'CBI-CYBER-HQ',
        name: 'Central Bureau of Investigation (Cyber & Special Crimes)',
        agencyCode: 'CBI-CYBER-007',
        tierCode: 'CENTRAL_GOV',
        catCode: 'LAW_ENFORCEMENT',
        regionCode: 'IND_DL_NZ',
        nodalName: 'Joint Director (Cyber Crime Zone)',
        nodalEmail: 'nodal.cyber@cbi.gov.in',
        nodalPhone: '+91-11-24362755',
        features: {
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
        },
        departments: [
          { name: 'Special Crimes Branch (SCB-I)', code: 'SCB' },
          { name: 'Cyber Forensics & Mobile Extraction Wing (C-DID)', code: 'CYBER_FORENSICS' },
          { name: 'Interpol National Central Bureau (NCB-India)', code: 'INTERPOL_NCB' },
        ],
        docTypes: [
          { code: 'CBI_FIR', name: 'Special Crime Regular Case FIR (RC)' },
          { code: 'SEIZURE_MEMO', name: 'Hardware & Digital Evidence Seizure Memo' },
          { code: 'FORENSIC_REPORT', name: 'Bit-Stream Disk & Memory Forensics Extraction' },
          { code: 'CHARGESHEET', name: 'CBI Special Court Prosecution Chargesheet' },
          { code: 'INTERPOL_NOTICE', name: 'Interpol Red/Blue Corner Notice Requisition' },
        ],
        retentionPolicies: [
          { name: 'Terror & High Financial Fraud Trial Records', schedule_code: 'SCH_CBI_TERROR', retention_days: 18250, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Permanent Archival Vault', statutory_framework: 'Delhi Special Police Establishment Act', description: 'CBI Special Court Trial Records' },
          { name: 'Forensic Hardware Disk Images & Bit-Streams', schedule_code: 'SCH_CBI_EVIDENCE', retention_days: 9125, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Cryptographic Zeroization Review', statutory_framework: 'IT Act 2000 & BSA 2023', description: 'Classified raw bitstream physical images' },
          { name: 'Preliminary Inquiry (PE) Non-Cognizable Files', schedule_code: 'SCH_CBI_PE', retention_days: 3650, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Department Head Review & Expunge', statutory_framework: 'CBI Crime Manual 2026', description: 'Preliminary inquiry dockets' },
        ],
        users: [
          { username: 'cbi_admin', name: 'Rajiv Mathur (Director CBI IT)', email: 'admin.cyber@cbi.gov.in', role: 'ORG_ADMIN', designation: 'Director (Cyber & Telecom Infrastructure)', level: 5, dept: 'CYBER_FORENSICS', code: 'CBI-DIR-009' },
          { username: 'sp_devendra_rathore', name: 'SP Devendra Rathore, IPS', email: 'sp.rathore@cbi.gov.in', role: 'DEPT_HEAD', designation: 'Superintendent of Police (Special Crimes)', level: 5, dept: 'SCB', code: 'CBI-SP-044' },
          { username: 'dsp_meenakshi_sundaram', name: 'DSP Meenakshi Sundaram', email: 'dsp.meenakshi@cbi.gov.in', role: 'APPROVER', designation: 'Deputy Superintendent of Police (Cyber Squad)', level: 4, dept: 'SCB', code: 'CBI-DSP-082' },
          { username: 'inspector_alok_verma', name: 'Inspector Alok Verma (IO)', email: 'alok.verma@cbi.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Senior Investigating Officer (Lead IO)', level: 3, dept: 'SCB', code: 'CBI-INSP-119' },
          { username: 'inspector_rohit_kaushik', name: 'Inspector Rohit Kaushik', email: 'rohit.kaushik@cbi.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Financial Crimes & Crypto Tracing Specialist', level: 3, dept: 'SCB', code: 'CBI-INSP-142' },
          { username: 'dr_sk_tandon', name: 'Dr. S. K. Tandon (Chief Forensic Scientist)', email: 'sk.tandon@cbi.gov.in', role: 'FORENSIC_EXPERT', designation: 'Chief Digital Forensic Scientist', level: 5, dept: 'CYBER_FORENSICS', code: 'CBI-SCI-003' },
          { username: 'analyst_richa_sengupta', name: 'Richa Sengupta', email: 'richa.sengupta@cbi.gov.in', role: 'FORENSIC_EXPERT', designation: 'Memory & Malware Extraction Analyst', level: 4, dept: 'CYBER_FORENSICS', code: 'CBI-ANL-038' },
          { username: 'interpol_liaison_khan', name: 'Farhan Khan', email: 'farhan.khan@cbi.gov.in', role: 'OFFICER', designation: 'Interpol International Extradition Liaison Officer', level: 4, dept: 'INTERPOL_NCB', code: 'CBI-NCB-017' },
          { username: 'cbi_cvo_singh', name: 'DIG R. S. Singh, IPS', email: 'cvo.singh@cbi.gov.in', role: 'AUDITOR', designation: 'Chief Vigilance & Compliance Officer', level: 5, dept: 'INTERPOL_NCB', code: 'CBI-CVO-002' },
          { username: 'custodian_suresh_nair', name: 'Suresh Nair', email: 'suresh.nair@cbi.gov.in', role: 'RECORD_KEEPER', designation: 'Central Evidence Vault Custodian', level: 3, dept: 'CYBER_FORENSICS', code: 'CBI-CUST-055' },
        ],
      },

      // -----------------------------------------------------------------------
      // ORG 3: Maharashtra Police — Crime Investigation Department (CID)
      // -----------------------------------------------------------------------
      {
        code: 'MH-POL-CID',
        name: 'Maharashtra Police (State Crime Investigation Department)',
        agencyCode: 'MH-POL-CID-022',
        tierCode: 'STATE_GOV',
        catCode: 'LAW_ENFORCEMENT',
        regionCode: 'IND_MH_MUM',
        nodalName: 'Additional Director General of Police (CID)',
        nodalEmail: 'adgp.cid@mahapolice.gov.in',
        nodalPhone: '+91-22-22026636',
        features: {
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
        },
        departments: [
          { name: 'State Cyber Police Station & Intelligence Cell', code: 'CYBER_HQ' },
          { name: 'Homicide & Organized Crime Special Squad', code: 'HOMICIDE_SQUAD' },
          { name: 'State Crime Records Bureau (SCRB) & Evidence Malkhana', code: 'SCRB_ARCHIVES' },
        ],
        docTypes: [
          { code: 'POLICE_FIR', name: 'Cognizable First Information Report (FIR)' },
          { code: 'CASE_DIARY', name: 'Investigating Officer Confidential Case Diary' },
          { code: 'PANCH_NAMA', name: 'Spot & Seizure Panchnama Record' },
          { code: 'BALLISTICS_REPORT', name: 'Ballistics & Physical Crime Scene Telemetry' },
          { code: 'PROSECUTION_SANCTION', name: 'Government Prosecution Sanction Order' },
        ],
        retentionPolicies: [
          { name: 'MCOCA / Heinous Crimes Evidence Retention', schedule_code: 'SCH_MCOCA_40Y', retention_days: 14600, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Permanent Custody Sealed', statutory_framework: 'Maharashtra Control of Organised Crime Act', description: 'Major criminal case records' },
          { name: 'General Cognizable Offence Case Diaries', schedule_code: 'SCH_MAHPOL_20Y', retention_days: 7300, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Comprehensive Archival Review', statutory_framework: 'Maharashtra Police Manual', description: 'Investigating officer station diaries' },
          { name: 'Non-Cognizable (NC) & Preventive Petitions', schedule_code: 'SCH_MAHPOL_5Y', retention_days: 1825, permanent: false, deletion_requires_approval: false, action_on_expiry: 'Automatic Archive', statutory_framework: 'State Police Administrative Code', description: 'Routine community petitions and non-cognizable records' },
        ],
        users: [
          { username: 'mahapol_admin', name: 'DIG Vivek Bhonsle, IPS', email: 'admin.cid@mahapolice.gov.in', role: 'ORG_ADMIN', designation: 'DIG (Police Wireless & IT Infrastructure)', level: 5, dept: 'CYBER_HQ', code: 'MAH-IT-008' },
          { username: 'acp_vikramaditya_singh', name: 'ACP Vikramaditya Singh', email: 'acp.vikram@mahapolice.gov.in', role: 'DEPT_HEAD', designation: 'Assistant Commissioner of Police (Cyber)', level: 5, dept: 'CYBER_HQ', code: 'MAH-ACP-019' },
          { username: 'pi_santosh_kadam', name: 'Senior PI Santosh Kadam', email: 'santosh.kadam@mahapolice.gov.in', role: 'APPROVER', designation: 'Senior Police Inspector (Homicide Wing)', level: 4, dept: 'HOMICIDE_SQUAD', code: 'MAH-SPI-045' },
          { username: 'pi_ramesh_mane', name: 'Police Inspector Ramesh Mane', email: 'ramesh.mane@mahapolice.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Lead Investigating Officer (IO)', level: 3, dept: 'HOMICIDE_SQUAD', code: 'MAH-PI-078' },
          { username: 'api_sneha_patil', name: 'API Sneha Patil', email: 'sneha.patil@mahapolice.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Assistant Police Inspector (Digital Tracing)', level: 3, dept: 'CYBER_HQ', code: 'MAH-API-112' },
          { username: 'psi_amol_chavan', name: 'PSI Amol Chavan', email: 'amol.chavan@mahapolice.gov.in', role: 'OFFICER', designation: 'Police Sub-Inspector (Field Investigation)', level: 2, dept: 'HOMICIDE_SQUAD', code: 'MAH-PSI-204' },
          { username: 'forensic_anita_wagh', name: 'Dr. Anita Wagh', email: 'anita.wagh@mahapolice.gov.in', role: 'FORENSIC_EXPERT', designation: 'Cyber Forensics Analyst & Audio-Video Expert', level: 4, dept: 'CYBER_HQ', code: 'MAH-FSL-033' },
          { username: 'scrb_auditor_thorat', name: 'SP Dilip Thorat, IPS', email: 'dilip.thorat@mahapolice.gov.in', role: 'AUDITOR', designation: 'Superintendent of Police (Vigilance & SCRB)', level: 5, dept: 'SCRB_ARCHIVES', code: 'MAH-SP-012' },
          { username: 'malkhana_custodian_kale', name: 'HC Shivaji Kale', email: 'shivaji.kale@mahapolice.gov.in', role: 'RECORD_KEEPER', designation: 'Head Constable (Malkhana Evidence Custodian)', level: 3, dept: 'SCRB_ARCHIVES', code: 'MAH-HC-554' },
          { username: 'duty_operator_more', name: 'Nilesh More', email: 'nilesh.more@mahapolice.gov.in', role: 'CLERK', designation: 'General Diary Station House Assistant', level: 1, dept: 'SCRB_ARCHIVES', code: 'MAH-CLK-911' },
        ],
      },

      // -----------------------------------------------------------------------
      // ORG 4: Directorate of Forensic Science Laboratories, Gujarat
      // -----------------------------------------------------------------------
      {
        code: 'GJ-DFS-FSL',
        name: 'Directorate of Forensic Science Laboratories (Gujarat State)',
        agencyCode: 'GJ-FSL-LAB-019',
        tierCode: 'STATE_GOV',
        catCode: 'FORENSIC_LAB',
        regionCode: 'IND_GJ_AMD',
        nodalName: 'Director General of Forensic Sciences',
        nodalEmail: 'director.dfsl@gujarat.gov.in',
        nodalPhone: '+91-79-23256251',
        features: {
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
        },
        departments: [
          { name: 'Digital & Mobile Forensics Examination Wing', code: 'DIGITAL_FORENSICS' },
          { name: 'DNA Profiling & Biological Evidence Division', code: 'TOXICOLOGY_DNA' },
          { name: 'Ballistics, Physics & Tool Marks Division', code: 'BALLISTICS_PHYSICS' },
        ],
        docTypes: [
          { code: 'FSL_CERTIFICATE', name: 'Statutory Forensic Examination Certificate' },
          { code: 'CHAIN_OF_CUSTODY_LOG', name: 'Physical & Cryptographic Chain of Custody Log' },
          { code: 'DNA_REPORT', name: 'STR DNA Profiling & Match Analysis Dossier' },
          { code: 'BALLISTICS_CHART', name: 'Firearms Ballistics Trajectory & Toolmarks Report' },
          { code: 'SECTION_65B_FORENSIC', name: 'Expert Section 65B Electronic Seal Telemetry' },
        ],
        retentionPolicies: [
          { name: 'DNA Databanks & Capital Crimes Forensic Dossiers', schedule_code: 'SCH_FSL_DNA50Y', retention_days: 18250, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Permanent Custody Sealed', statutory_framework: 'DNA Technology Use & Application Act', description: 'DNA profiles and biological exhibit logs' },
          { name: 'Digital Forensic Extraction Images & Certifications', schedule_code: 'SCH_FSL_DIG25Y', retention_days: 9125, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Comprehensive Archival Review', statutory_framework: 'ISO 17025 Forensics Standards', description: 'Certified mobile and disk extraction images' },
          { name: 'Routine Chemical & Alcohol Toxicity Slips', schedule_code: 'SCH_FSL_TOX10Y', retention_days: 3650, permanent: false, deletion_requires_approval: false, action_on_expiry: 'Automatic Archive', statutory_framework: 'FSL Procedural Code', description: 'Routine toxicology certificates' },
        ],
        users: [
          { username: 'fsl_admin', name: 'Ketan Trivedi (CIO FSL Gujarat)', email: 'admin.dfsl@gujarat.gov.in', role: 'ORG_ADMIN', designation: 'Chief Information Officer (LIMS & Infrastructure)', level: 5, dept: 'DIGITAL_FORENSICS', code: 'GJ-FSL-001' },
          { username: 'director_hn_mehta', name: 'Dr. H. N. Mehta', email: 'director.mehta@gujarat.gov.in', role: 'DEPT_HEAD', designation: 'Director General of Forensic Sciences', level: 5, dept: 'DIGITAL_FORENSICS', code: 'GJ-FSL-DIR' },
          { username: 'joint_dir_vasavada', name: 'Dr. Kalpesh Vasavada', email: 'kalpesh.vasavada@gujarat.gov.in', role: 'APPROVER', designation: 'Joint Director (Biology, Serology & DNA)', level: 5, dept: 'TOXICOLOGY_DNA', code: 'GJ-FSL-JD01' },
          { username: 'senior_sc_shukla', name: 'Dr. Bhavesh Shukla', email: 'bhavesh.shukla@gujarat.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Senior Scientific Officer (Mobile Forensics)', level: 4, dept: 'DIGITAL_FORENSICS', code: 'GJ-FSL-SSO3' },
          { username: 'scientific_tanvi_shah', name: 'Smt. Tanvi Shah', email: 'tanvi.shah@gujarat.gov.in', role: 'FORENSIC_EXPERT', designation: 'Scientific Officer (Cloud & Memory Forensics)', level: 3, dept: 'DIGITAL_FORENSICS', code: 'GJ-FSL-SO12' },
          { username: 'dna_expert_pandya', name: 'Dr. Chirag Pandya', email: 'chirag.pandya@gujarat.gov.in', role: 'FORENSIC_EXPERT', designation: 'Lead DNA Profiling & Sequencing Analyst', level: 4, dept: 'TOXICOLOGY_DNA', code: 'GJ-FSL-DNA04' },
          { username: 'ballistics_solanki', name: 'Shri J. M. Solanki', email: 'jm.solanki@gujarat.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Assistant Director (Ballistics & Explosives)', level: 4, dept: 'BALLISTICS_PHYSICS', code: 'GJ-FSL-BAL02' },
          { username: 'lab_qa_auditor_patel', name: 'Dr. Jagdish Patel', email: 'jagdish.patel@gujarat.gov.in', role: 'AUDITOR', designation: 'ISO 17025 Quality Assurance & Audit Head', level: 5, dept: 'DIGITAL_FORENSICS', code: 'GJ-FSL-AUD' },
          { username: 'specimen_custodian_dave', name: 'Kirit Dave', email: 'kirit.dave@gujarat.gov.in', role: 'RECORD_KEEPER', designation: 'Chief Specimen Vault & Exhibit Custodian', level: 3, dept: 'TOXICOLOGY_DNA', code: 'GJ-FSL-CUST' },
          { username: 'lab_assistant_parmar', name: 'Chetan Parmar', email: 'chetan.parmar@gujarat.gov.in', role: 'CLERK', designation: 'Inward Exhibit & Docket Assistant', level: 2, dept: 'BALLISTICS_PHYSICS', code: 'GJ-FSL-CLK' },
        ],
      },

      // -----------------------------------------------------------------------
      // ORG 5: District Collectorate & Revenue Secretariat, Mumbai
      // -----------------------------------------------------------------------
      {
        code: 'MH-REV-MUM',
        name: 'District Collectorate & Revenue Secretariat (Mumbai City)',
        agencyCode: 'MH-REV-DIST-005',
        tierCode: 'STATE_GOV',
        catCode: 'CIVIL_ADMIN',
        regionCode: 'IND_MH_MUM',
        nodalName: 'District Magistrate & Collector (Mumbai)',
        nodalEmail: 'collector.mumbai@maharashtra.gov.in',
        nodalPhone: '+91-22-22661231',
        features: {
          feature_approvals: true,
          feature_section_65b: true,
          feature_retention_holds: true,
          feature_blockchain: true,
          feature_deep_ocr: true,
          feature_inter_org_collaboration: true,
        },
        departments: [
          { name: 'Land Records, City Survey & 7/12 Title Registry', code: 'LAND_REVENUE' },
          { name: 'Magisterial Law & Order Executive Branch', code: 'MAGISTERIAL' },
          { name: 'Statutory Land Acquisition & Disaster Infrastructure', code: 'ACQUISITION_DISASTER' },
        ],
        docTypes: [
          { code: 'EXTRACT_712', name: 'Certified 7/12 & Property Card Land Title Extract' },
          { code: 'ACQUISITION_AWARD', name: 'Gazette Land Acquisition Sanction Award' },
          { code: 'EXECUTIVE_ORDER', name: 'District Magistrate Prohibitory & Magisterial Order' },
          { code: 'MUTATION_LEDGER', name: 'Certified Revenue Mutation & Succession Ledger' },
          { code: 'STAMP_DUTY_AUDIT', name: 'Annual District Stamp Duty & Valuation Assessment' },
        ],
        retentionPolicies: [
          { name: 'Permanent Historical Land Titles & Cadastral Maps', schedule_code: 'SCH_REV_PERM', retention_days: null, permanent: true, deletion_requires_approval: true, action_on_expiry: 'Permanent Custody Sealed (Zero Deletion Allowed)', statutory_framework: 'Maharashtra Land Revenue Code 1966', description: 'Original land titles, city surveys, property cards' },
          { name: 'Government Land Acquisition Sanction Awards', schedule_code: 'SCH_REV_ACQ50Y', retention_days: 18250, permanent: false, deletion_requires_approval: true, action_on_expiry: 'Comprehensive Archival Review', statutory_framework: 'Right to Fair Compensation & Transparency (RFCTLARR) Act', description: 'Gazette notifications and compensation awards' },
          { name: 'Temporary Magisterial Executive Orders & Notices', schedule_code: 'SCH_REV_MAG7Y', retention_days: 2555, permanent: false, deletion_requires_approval: false, action_on_expiry: 'Automatic Archive', statutory_framework: 'Bharatiya Nagarik Suraksha Sanhita (BNSS)', description: 'Prohibitory notices and executive orders' },
        ],
        users: [
          { username: 'mumbai_collector_admin', name: 'Shri Milind Borikar, IAS', email: 'admin.collector@maharashtra.gov.in', role: 'ORG_ADMIN', designation: 'Resident Additional Collector (Revenue & IT)', level: 5, dept: 'LAND_REVENUE', code: 'MUM-RAC-001' },
          { username: 'collector_nitin_shinde', name: 'Dr. Nitin Shinde, IAS', email: 'collector.mumbai@maharashtra.gov.in', role: 'DEPT_HEAD', designation: 'District Magistrate & Collector (Mumbai City)', level: 5, dept: 'MAGISTERIAL', code: 'MUM-DM-001' },
          { username: 'sdm_ananya_roy', name: 'Smt. Ananya Roy, IAS', email: 'sdm.mumbai@maharashtra.gov.in', role: 'APPROVER', designation: 'Sub-Divisional Magistrate (City Division)', level: 4, dept: 'MAGISTERIAL', code: 'MUM-SDM-004' },
          { username: 'tahsildar_suryavanshi', name: 'Shri Sanjay Suryavanshi', email: 'tahsildar.suryavanshi@maharashtra.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Executive Tahsildar (Land Title Sanctions)', level: 3, dept: 'LAND_REVENUE', code: 'MUM-TAH-018' },
          { username: 'naib_tahsildar_joshi', name: 'Smt. Madhavi Joshi', email: 'madhavi.joshi@maharashtra.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Naib Tahsildar (Mutation & Title Verification)', level: 3, dept: 'LAND_REVENUE', code: 'MUM-NTAH-029' },
          { username: 'surveyor_deshpande', name: 'Nitin Deshpande', email: 'nitin.deshpande@maharashtra.gov.in', role: 'OFFICER', designation: 'Cadastral & City Survey Officer', level: 3, dept: 'LAND_REVENUE', code: 'MUM-SURV-055' },
          { username: 'acquisition_officer_kadre', name: 'Vijay Kadre', email: 'vijay.kadre@maharashtra.gov.in', role: 'INVESTIGATING_OFFICER', designation: 'Competent Authority Land Acquisition (CALA)', level: 3, dept: 'ACQUISITION_DISASTER', code: 'MUM-CALA-012' },
          { username: 'revenue_auditor_mahajan', name: 'R. C. Mahajan', email: 'rc.mahajan@maharashtra.gov.in', role: 'AUDITOR', designation: 'Chief Revenue Inspector & Stamp Auditor', level: 5, dept: 'LAND_REVENUE', code: 'MUM-AUD-007' },
          { username: 'archivist_salunkhe', name: 'Balasaheb Salunkhe', email: 'b.salunkhe@maharashtra.gov.in', role: 'RECORD_KEEPER', designation: 'Historical Land Records & Modi Script Archivist', level: 3, dept: 'LAND_REVENUE', code: 'MUM-ARC-033' },
          { username: 'talathi_gavade', name: 'Mahesh Gavade', email: 'mahesh.gavade@maharashtra.gov.in', role: 'CLERK', designation: 'Revenue Talathi (Saza Officer)', level: 1, dept: 'LAND_REVENUE', code: 'MUM-TAL-102' },
        ],
      },
    ];

    // -------------------------------------------------------------------------
    // 4. PROVISION EACH ORGANIZATION, DEPARTMENTS, TYPES, ROLES, POLICIES, USERS
    // -------------------------------------------------------------------------
    console.log('\n[3/7] Provisioning 5 Sovereign Organizations & Infrastructure...');

    for (const orgData of organizationsData) {
      console.log(`\n  -> Provisioning Organization: ${orgData.name} (${orgData.code})...`);

      // 1. Organization Record
      const orgRes = await client.query(
        `INSERT INTO organizations (
           name, code, agency_code, status, tier_id, domain_category_id,
           jurisdiction_region_id, is_verified_federation_node, nodal_officer_name,
           nodal_officer_email, nodal_officer_phone, features, custom_metadata
         )
         VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6, true, $7, $8, $9, $10, $11)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           agency_code = EXCLUDED.agency_code,
           is_verified_federation_node = true,
           nodal_officer_name = EXCLUDED.nodal_officer_name,
           nodal_officer_email = EXCLUDED.nodal_officer_email,
           features = EXCLUDED.features
         RETURNING id, code;`,
        [
          orgData.name,
          orgData.code,
          orgData.agencyCode,
          tierMap[orgData.tierCode] || null,
          catMap[orgData.catCode] || null,
          regionMap[orgData.regionCode] || null,
          orgData.nodalName,
          orgData.nodalEmail,
          orgData.nodalPhone,
          JSON.stringify(orgData.features),
          JSON.stringify({ total_storage_quota_bytes: 100 * 1024 * 1024 * 1024 }),
        ]
      );
      const orgId = orgRes.rows[0].id;

      // 2. Security Clearance Levels (T1 to T5) with Dual Custody
      const secLevels = [
        { code: 'T1', name: 'Public / Unclassified', rank: 1, approval_required: false, encryption_required: false, audit_level: 1 },
        { code: 'T2', name: 'Internal Institutional', rank: 2, approval_required: false, encryption_required: true, audit_level: 2 },
        { code: 'T3', name: 'Confidential Case Record', rank: 3, approval_required: false, encryption_required: true, audit_level: 3 },
        { code: 'T4', name: 'Secret Dual-Custody Docket', rank: 4, approval_required: true, encryption_required: true, audit_level: 4 },
        { code: 'T5', name: 'Top Secret Sovereign Compartment', rank: 5, approval_required: true, encryption_required: true, audit_level: 5 },
      ];
      for (const s of secLevels) {
        await client.query(
          `INSERT INTO security_levels (organization_id, code, name, rank, approval_required, encryption_required, audit_level)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (organization_id, code) DO UPDATE SET
             approval_required = EXCLUDED.approval_required,
             encryption_required = EXCLUDED.encryption_required;`,
          [orgId, s.code, s.name, s.rank, s.approval_required, s.encryption_required, s.audit_level]
        );
      }

      // 3. Departments
      const deptMap: Record<string, string> = {};
      for (const d of orgData.departments) {
        const dRes = await client.query(
          `INSERT INTO departments (organization_id, name, code, status)
           VALUES ($1, $2, $3, 'ACTIVE')
           ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
           RETURNING id, code;`,
          [orgId, d.name, d.code]
        );
        deptMap[dRes.rows[0].code] = dRes.rows[0].id;
      }

      // 4. Document Types
      for (const dt of orgData.docTypes) {
        await client.query(
          `INSERT INTO document_types (organization_id, code, name, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name;`,
          [orgId, dt.code, dt.name, `Statutory Evidence Docket: ${dt.name}`]
        );
      }

      // 5. Retention Policies
      for (const rp of orgData.retentionPolicies) {
        await client.query(
          `INSERT INTO retention_policies (
             organization_id, name, schedule_code, retention_days, permanent,
             deletion_requires_approval, action_on_expiry, statutory_framework, description
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING;`,
          [
            orgId,
            rp.name,
            rp.schedule_code,
            rp.retention_days,
            rp.permanent,
            rp.deletion_requires_approval,
            rp.action_on_expiry,
            rp.statutory_framework,
            rp.description,
          ]
        );
      }

      // 6. Configured Roles for this Organization
      const orgRoles = [
        {
          code: 'ORG_ADMIN',
          name: 'Organization Administrator',
          desc: 'Internal institutional policy, user governance, and department administration',
          is_system: true,
          perms: [
            'DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT', 'DOCUMENT_DELETE',
            'DOCUMENT_RESTORE', 'DOCUMENT_REQUEST_CHANGE', 'DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE',
            'AUDIT_VIEW', 'USER_PROFILE_AUDIT_VIEW', 'PERMISSION_MANAGE', 'USER_MANAGE', 'DEPARTMENT_MANAGE',
            'RETENTION_MANAGE', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_ANCHOR', 'BLOCKCHAIN_VERIFY',
            'INTER_ORG_VIEW', 'INTER_ORG_REQUEST', 'INTER_ORG_DISPATCH', 'INTER_ORG_RESPOND',
            'INTER_ORG_AUDIT_VIEW', 'INTER_ORG_AUDIT_EXPORT',
          ],
        },
        {
          code: 'DEPT_HEAD',
          name: 'Department Head & Senior Approver',
          desc: 'Review, approve, and sanction sensitive T4/T5 dockets and cross-agency transfers',
          is_system: true,
          perms: [
            'DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT',
            'DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE', 'DOCUMENT_REQUEST_CHANGE',
            'AUDIT_VIEW', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY',
            'INTER_ORG_VIEW', 'INTER_ORG_REQUEST', 'INTER_ORG_DISPATCH', 'INTER_ORG_RESPOND',
            'INTER_ORG_AUDIT_VIEW',
          ],
        },
        {
          code: 'APPROVER',
          name: 'Sanctioning Authority & Registrar',
          desc: 'Statutory Maker-Checker verifying officer for judicial bail and sanctions',
          is_system: false,
          perms: [
            'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE',
            'DOCUMENT_REQUEST_CHANGE', 'AUDIT_VIEW', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY',
            'INTER_ORG_VIEW', 'INTER_ORG_RESPOND',
          ],
        },
        {
          code: 'INVESTIGATING_OFFICER',
          name: 'Executive Dealing / Case Officer',
          desc: 'Upload evidence, draft petitions, submit controlled change requests and requisitions',
          is_system: false,
          perms: [
            'DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT',
            'DOCUMENT_REQUEST_CHANGE', 'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY',
            'INTER_ORG_VIEW', 'INTER_ORG_REQUEST',
          ],
        },
        {
          code: 'FORENSIC_EXPERT',
          name: 'Digital Forensics & Evidence Specialist',
          desc: 'Conduct Deep OCR parsing, verify Section 65B hashes, and attest forensic integrity',
          is_system: false,
          perms: [
            'DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EDIT',
            'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_ANCHOR', 'BLOCKCHAIN_VERIFY',
            'INTER_ORG_VIEW',
          ],
        },
        {
          code: 'AUDITOR',
          name: 'Compliance & Vigilance Auditor',
          desc: 'Independent inspection of immutable audit trails, Merkle proofs, and access logs',
          is_system: true,
          perms: [
            'AUDIT_VIEW', 'USER_PROFILE_AUDIT_VIEW', 'DOCUMENT_VIEW',
            'BLOCKCHAIN_VIEW', 'BLOCKCHAIN_VERIFY', 'INTER_ORG_AUDIT_VIEW', 'INTER_ORG_AUDIT_EXPORT',
          ],
        },
        {
          code: 'RECORD_KEEPER',
          name: 'Archivist & Evidence Locker Custodian',
          desc: 'Manage statutory legal holds, permanent vaults, and record retrievals',
          is_system: false,
          perms: [
            'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_RESTORE', 'RETENTION_MANAGE',
            'AUDIT_VIEW',
          ],
        },
        {
          code: 'OFFICER',
          name: 'General Executive / Desk Officer',
          desc: 'Basic document upload, viewing, and standard change requests',
          is_system: false,
          perms: [
            'DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_REQUEST_CHANGE',
          ],
        },
        {
          code: 'CLERK',
          name: 'Registry Associate / Assistant',
          desc: 'Inward registry indexing and read-only viewing of institutional dockets',
          is_system: false,
          perms: [
            'DOCUMENT_VIEW', 'DOCUMENT_CREATE',
          ],
        },
      ];

      const roleMap: Record<string, string> = {};
      for (const r of orgRoles) {
        const rRes = await client.query(
          `INSERT INTO roles (organization_id, code, name, description, is_system_role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
           RETURNING id, code;`,
          [orgId, r.code, r.name, r.desc, r.is_system]
        );
        roleMap[rRes.rows[0].code] = rRes.rows[0].id;

        // Map Permissions to Role
        for (const pCode of r.perms) {
          if (permMap[pCode]) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
              [roleMap[r.code], permMap[pCode]]
            );
          }
        }
      }

      // 7. Seed 10 Authentic Users for this Organization
      for (const u of orgData.users) {
        const deptId = deptMap[u.dept] || Object.values(deptMap)[0];
        
        // Upsert user
        const uRes = await client.query(
          `INSERT INTO users (
             organization_id, department_id, username, email, password_hash,
             full_name, employee_code, designation, status, max_security_level
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9)
           ON CONFLICT (organization_id, email) DO UPDATE SET
             department_id = EXCLUDED.department_id,
             username = EXCLUDED.username,
             password_hash = EXCLUDED.password_hash,
             full_name = EXCLUDED.full_name,
             employee_code = EXCLUDED.employee_code,
             designation = EXCLUDED.designation,
             max_security_level = EXCLUDED.max_security_level,
             status = 'ACTIVE'
           RETURNING id, username;`,
          [
            orgId,
            deptId,
            u.username,
            u.email,
            defaultPasswordHash,
            u.name,
            u.code,
            u.designation,
            u.level,
          ]
        );
        const userId = uRes.rows[0].id;

        // Assign Role
        const roleId = roleMap[u.role] || roleMap['OFFICER'];
        if (roleId) {
          await client.query(
            `DELETE FROM user_roles WHERE user_id = $1;`,
            [userId]
          );
          await client.query(
            `INSERT INTO user_roles (user_id, role_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING;`,
            [userId, roleId]
          );
        }
      }
      console.log(`  ✓ Created ${orgData.users.length} Officers with T1-T5 clearances for ${orgData.name}`);
    }

    // -------------------------------------------------------------------------
    // 5. ENSURE GLOBAL APEX SUPER-ADMIN EXISTS
    // -------------------------------------------------------------------------
    console.log('\n[4/7] Ensuring Global Apex Super Administrator Account...');
    
    // Check if DEMO / Apex Org exists, otherwise assign to first organization
    const apexOrgRes = await client.query(`SELECT id FROM organizations WHERE code = 'DEMO' LIMIT 1;`);
    let apexOrgId = apexOrgRes.rows[0]?.id;
    if (!apexOrgId) {
      const firstOrgRes = await client.query(`SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1;`);
      apexOrgId = firstOrgRes.rows[0]?.id;
    }

    const apexDeptRes = await client.query(`SELECT id FROM departments WHERE organization_id = $1 LIMIT 1;`, [apexOrgId]);
    const apexDeptId = apexDeptRes.rows[0]?.id || null;

    // Ensure SUPER_ADMIN role exists on apex org
    const superRoleRes = await client.query(
      `INSERT INTO roles (organization_id, code, name, description, is_system_role)
       VALUES ($1, 'SUPER_ADMIN', 'Apex System Super Administrator', 'Highest system control across all sovereign government nodes', true)
       ON CONFLICT (organization_id, code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id;`,
      [apexOrgId]
    );
    const superRoleId = superRoleRes.rows[0].id;

    // Map all permissions to SUPER_ADMIN role
    for (const pId of Object.values(permMap)) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
        [superRoleId, pId]
      );
    }

    // Upsert super admin user
    const superUserRes = await client.query(
      `INSERT INTO users (
         organization_id, department_id, username, email, password_hash,
         full_name, employee_code, designation, status, max_security_level
       )
       VALUES ($1, $2, 'admin', 'admin@dms.gov.in', $3, 'Principal Systems Administrator', 'APEX-GOV-001', 'Chief Information Security Officer & Apex Super Admin', 'ACTIVE', 5)
       ON CONFLICT (organization_id, email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         status = 'ACTIVE',
         max_security_level = 5
       RETURNING id;`,
      [apexOrgId, apexDeptId, defaultPasswordHash]
    );
    const superUserId = superUserRes.rows[0].id;

    await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [superUserId, superRoleId]);
    console.log('  ✓ Verified Apex Super Admin: admin / admin@dms.gov.in (Password: Password@DMS2026!)');

    await client.query('COMMIT');

    console.log('\n========================================================================');
    console.log('  ✅ SUCCESS: 5 SOVEREIGN ORGANIZATIONS & 50+ OFFICERS SEEDED CLEANLY!  ');
    console.log('========================================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ SEEDING FAILED WITH ERROR:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seedFiveGovernmentOrganizations().catch((e) => {
  console.error(e);
  process.exit(1);
});
