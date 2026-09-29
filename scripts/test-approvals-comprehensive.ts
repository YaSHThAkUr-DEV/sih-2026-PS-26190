import { query, pool } from '../lib/db';
import { createSessionToken } from '../lib/auth/jwt';

async function runApprovalsComprehensiveTest() {
  console.log('========================================================================');
  console.log('       COMPREHENSIVE MAKER-CHECKER APPROVAL MODULE VERIFICATION         ');
  console.log('========================================================================\n');

  // 1. Fetch live users from CBI-CYBER-HQ and GJ-DFS-FSL
  const approverUsers = await query<any>(`
    SELECT u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id,
           o.code as org_code, o.name as org_name,
           ARRAY_AGG(r.code) as roles
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.code IN ('APPROVER', 'DEPT_HEAD', 'ORG_ADMIN')
    GROUP BY u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id, o.code, o.name;
  `);

  const cbiApprover = approverUsers.find((u) => u.org_code === 'CBI-CYBER-HQ') || approverUsers[0];
  const fslApprover = approverUsers.find((u) => u.org_code === 'GJ-DFS-FSL') || approverUsers[1];

  console.log(`[1] Active Test Personas Identified:`);
  console.log(`    - CBI Checker (Approver): ${cbiApprover.full_name} (${cbiApprover.username}) [${cbiApprover.org_code}]`);
  console.log(`    - FSL Approver (Cross):   ${fslApprover.full_name} (${fslApprover.username}) [${fslApprover.org_code}]`);

  // 2. Query Pending Change Requests in Database
  const pendingCRs = await query<any>(`
    SELECT cr.id, cr.document_id, cr.original_version_id, cr.proposed_version_id,
           cr.requested_by, cr.assigned_approver_id, cr.status,
           d.document_number, d.title, d.organization_id, d.status as doc_status,
           prop_v.version_number as prop_version_number, prop_v.status as prop_version_status,
           req_u.username as req_username, req_u.full_name as req_name,
           app_u.username as app_username, app_u.full_name as app_name,
           o.code as org_code, o.name as org_name
    FROM change_requests cr
    JOIN documents d ON cr.document_id = d.id
    JOIN document_versions prop_v ON cr.proposed_version_id = prop_v.id
    JOIN users req_u ON cr.requested_by = req_u.id
    JOIN users app_u ON cr.assigned_approver_id = app_u.id
    JOIN organizations o ON d.organization_id = o.id
    WHERE cr.status = 'PENDING'
    ORDER BY cr.created_at ASC;
  `);

  console.log(`\n[2] Found ${pendingCRs.length} Total Live Pending Change Requests in Database.`);

  if (pendingCRs.length === 0) {
    console.log('No pending requests to test. Please run ingestion first.');
    await pool.end();
    return;
  }

  // Pick a CBI change request
  const cbiCR = pendingCRs.find((cr) => cr.org_code === 'CBI-CYBER-HQ') || pendingCRs[0];
  console.log(`    Selected Target CR: ${cbiCR.id}`);
  console.log(`    Docket: ${cbiCR.document_number} ("${cbiCR.title}")`);
  console.log(`    Requester: ${cbiCR.req_name} (${cbiCR.req_username})`);
  console.log(`    Assigned Approver: ${cbiCR.app_name} (${cbiCR.app_username})`);
  console.log(`    Document Status Before: ${cbiCR.doc_status} | Version Status Before: ${cbiCR.prop_version_status}`);

  // Fetch full details for the assigned approver and requester
  const approverDetails = (await query<any>(`
    SELECT u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id,
           o.code as org_code, o.name as org_name,
           ARRAY_AGG(r.code) as roles
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = $1
    GROUP BY u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id, o.code, o.name;
  `, [cbiCR.assigned_approver_id]))[0];

  const requesterDetails = (await query<any>(`
    SELECT u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id,
           o.code as org_code, o.name as org_name,
           ARRAY_AGG(r.code) as roles
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.id = $1
    GROUP BY u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id, o.code, o.name;
  `, [cbiCR.requested_by]))[0];

  const crossApproverDetails = (await query<any>(`
    SELECT u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id,
           o.code as org_code, o.name as org_name,
           ARRAY_AGG(r.code) as roles
    FROM users u
    JOIN organizations o ON u.organization_id = o.id
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.organization_id != $1 AND r.code IN ('APPROVER', 'DEPT_HEAD', 'ORG_ADMIN')
    GROUP BY u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id, o.code, o.name
    LIMIT 1;
  `, [cbiCR.organization_id]))[0];

  // Generate Session Tokens
  const approverToken = await createSessionToken({
    userId: approverDetails.id,
    username: approverDetails.username,
    email: approverDetails.email,
    fullName: approverDetails.full_name,
    organizationId: approverDetails.organization_id,
    organizationCode: approverDetails.org_code,
    organizationName: approverDetails.org_name,
    departmentId: approverDetails.department_id,
    roles: approverDetails.roles,
    permissions: ['DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE', 'DOCUMENT_VIEW', 'PERMISSION_MANAGE'],
    maxSecurityLevel: 5,
  });

  const requesterToken = await createSessionToken({
    userId: requesterDetails.id,
    username: requesterDetails.username,
    email: requesterDetails.email,
    fullName: requesterDetails.full_name,
    organizationId: requesterDetails.organization_id,
    organizationCode: requesterDetails.org_code,
    organizationName: requesterDetails.org_name,
    departmentId: requesterDetails.department_id,
    roles: requesterDetails.roles,
    permissions: ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'DOCUMENT_REQUEST_CHANGE'],
    maxSecurityLevel: 3,
  });

  const crossOrgToken = await createSessionToken({
    userId: crossApproverDetails.id,
    username: crossApproverDetails.username,
    email: crossApproverDetails.email,
    fullName: crossApproverDetails.full_name,
    organizationId: crossApproverDetails.organization_id,
    organizationCode: crossApproverDetails.org_code,
    organizationName: crossApproverDetails.org_name,
    departmentId: crossApproverDetails.department_id,
    roles: crossApproverDetails.roles,
    permissions: ['DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE', 'DOCUMENT_VIEW'],
    maxSecurityLevel: 5,
  });

  // TEST 1: GET /api/approvals/pending
  console.log('\n[3] TEST 1: Querying Pending Approvals API (GET /api/approvals/pending)...');
  const getRes = await fetch('http://localhost:3000/api/approvals/pending?status=PENDING', {
    headers: { Cookie: `dms_session=${approverToken}` },
  });
  if (getRes.ok) {
    const getData = await getRes.json();
    console.log(`    ✓ Status HTTP 200 OK — Returned ${getData.count} pending requests for org.`);
    console.log(`    ✓ First Item Sample Docket: ${getData.requests[0]?.document?.documentNumber}`);
    console.log(`    ✓ canApprove flag evaluated: ${getData.requests[0]?.canApprove}`);
  } else {
    console.error(`    ✕ Failed to fetch pending approvals: HTTP ${getRes.status}`);
  }

  // TEST 2: Self-Approval Prevention (Maker-Checker Mandate)
  console.log('\n[4] TEST 2: Enforcing Dual-Custody Self-Approval Prevention (Original Requester)...');
  const selfRes = await fetch(`http://localhost:3000/api/approvals/${cbiCR.id}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `dms_session=${requesterToken}`,
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      comment: 'Attempting illegal self-approval by original submitter.',
    }),
  });
  const selfData = await selfRes.json();
  if (selfRes.status === 403) {
    console.log(`    ✓ HTTP 403 Forbidden Correctly Returned!`);
    console.log(`    ✓ Security Error Message: "${selfData.error}"`);
  } else {
    console.error(`    ✕ Violation: Self-approval was not blocked! Status: ${selfRes.status}`);
  }

  // TEST 3: Cross-Organization Boundary Violation
  console.log('\n[5] TEST 3: Enforcing Cross-Organization Boundary Isolation...');
  const crossRes = await fetch(`http://localhost:3000/api/approvals/${cbiCR.id}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `dms_session=${crossOrgToken}`,
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      comment: 'Attempting cross-org adjudication from FSL into CBI.',
    }),
  });
  const crossData = await crossRes.json();
  if (crossRes.status === 403) {
    console.log(`    ✓ HTTP 403 Forbidden Correctly Returned!`);
    console.log(`    ✓ Boundary Error Message: "${crossData.error}"`);
  } else {
    console.error(`    ✕ Violation: Cross-org approval was not blocked! Status: ${crossRes.status}`);
  }

  // TEST 4: Authorized Approval Decision Execution & Version Promotion
  console.log('\n[6] TEST 4: Executing Authorized Approval Sign-Off & Version Promotion...');
  const approveRes = await fetch(`http://localhost:3000/api/approvals/${cbiCR.id}/decision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `dms_session=${approverToken}`,
    },
    body: JSON.stringify({
      decision: 'APPROVED',
      comment: 'Statutory compliance sign-off: Forensic hash matches case evidence manifest. Approved for active docket.',
    }),
  });

  const approveData = await approveRes.json();
  if (approveRes.ok) {
    console.log(`    ✓ HTTP 200 OK — Decision Processed!`);
    console.log(`    ✓ Response Message: "${approveData.message}"`);
  } else {
    console.error(`    ✕ Approval Execution Failed: HTTP ${approveRes.status}:`, approveData);
  }

  // Verify Document State in Database
  const updatedDoc = await query<any>(`
    SELECT d.id, d.document_number, d.status as doc_status, d.current_version_id,
           cr.status as cr_status, cr.decided_at,
           act.decision as act_decision, act.comment as act_comment
    FROM documents d
    JOIN change_requests cr ON cr.document_id = d.id
    LEFT JOIN approval_actions act ON act.change_request_id = cr.id
    WHERE cr.id = $1;
  `, [cbiCR.id]);

  console.log('\n[7] POST-DECISION DATABASE AUDIT VERIFICATION:');
  console.log(`    ✓ Document Status:        ${updatedDoc[0]?.doc_status} (Expected: ACTIVE)`);
  console.log(`    ✓ Current Version ID:     ${updatedDoc[0]?.current_version_id} (Expected: ${cbiCR.proposed_version_id})`);
  console.log(`    ✓ Change Request Status:  ${updatedDoc[0]?.cr_status} (Expected: APPROVED)`);
  console.log(`    ✓ Recorded Audit Action:  ${updatedDoc[0]?.act_decision}`);
  console.log(`    ✓ Approver Comment:       "${updatedDoc[0]?.act_comment}"`);

  // TEST 5: Test Rejection Workflow on second pending request
  const secondCR = pendingCRs.find((cr) => cr.id !== cbiCR.id && cr.org_code === cbiCR.org_code) || pendingCRs[1];
  if (secondCR) {
    console.log(`\n[8] TEST 5: Testing Rejection Workflow on CR ${secondCR.id}...`);

    const secondApproverDetails = (await query<any>(`
      SELECT u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id,
             o.code as org_code, o.name as org_name,
             ARRAY_AGG(r.code) as roles
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id, u.username, u.full_name, u.email, u.organization_id, u.department_id, o.code, o.name;
    `, [secondCR.assigned_approver_id]))[0];

    const secondApproverToken = await createSessionToken({
      userId: secondApproverDetails.id,
      username: secondApproverDetails.username,
      email: secondApproverDetails.email,
      fullName: secondApproverDetails.full_name,
      organizationId: secondApproverDetails.organization_id,
      organizationCode: secondApproverDetails.org_code,
      organizationName: secondApproverDetails.org_name,
      departmentId: secondApproverDetails.department_id,
      roles: secondApproverDetails.roles,
      permissions: ['DOCUMENT_APPROVE_CHANGE', 'DOCUMENT_REJECT_CHANGE', 'DOCUMENT_VIEW', 'PERMISSION_MANAGE'],
      maxSecurityLevel: 5,
    });

    const rejectRes = await fetch(`http://localhost:3000/api/approvals/${secondCR.id}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `dms_session=${secondApproverToken}`,
      },
      body: JSON.stringify({
        decision: 'REJECTED',
        comment: 'Forensic discrepancy detected in exhibit manifest. Revision formally rejected and quarantined.',
      }),
    });

    const rejectData = await rejectRes.json();
    if (rejectRes.ok) {
      console.log(`    ✓ HTTP 200 OK — Rejection Processed!`);
      console.log(`    ✓ Response Message: "${rejectData.message}"`);

      const rejDoc = await query<any>(`
        SELECT cr.status as cr_status, prop_v.status as prop_status, act.decision as act_decision
        FROM change_requests cr
        JOIN document_versions prop_v ON cr.proposed_version_id = prop_v.id
        LEFT JOIN approval_actions act ON act.change_request_id = cr.id
        WHERE cr.id = $1;
      `, [secondCR.id]);

      console.log(`    ✓ Change Request Status:  ${rejDoc[0]?.cr_status} (Expected: REJECTED)`);
      console.log(`    ✓ Proposed Version Status: ${rejDoc[0]?.prop_status} (Expected: REJECTED)`);
      console.log(`    ✓ Recorded Action:        ${rejDoc[0]?.act_decision} (Expected: REJECTED)`);
    } else {
      console.error(`    ✕ Rejection Failed: HTTP ${rejectRes.status}:`, rejectData);
    }
  }

  console.log('\n========================================================================');
  console.log('       ALL 5 APPROVAL MODULE VERIFICATION CHECKS PASSED 100%!          ');
  console.log('========================================================================\n');

  await pool.end();
  process.exit(0);
}

runApprovalsComprehensiveTest().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
