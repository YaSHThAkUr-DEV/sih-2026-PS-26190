'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import OrganizationsManagementView from '@/components/dashboard/OrganizationsManagementView';
import { UiverseSearchBar } from '@/components/ui/UiverseSearchBar';
import dynamic from 'next/dynamic';

const ShaderGradientBackground = dynamic(
  () => import('@/components/auth/ShaderGradientBackground'),
  { ssr: false }
);

interface TestOrgUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  employeeCode?: string;
  designation?: string;
  status: string;
  maxSecurityLevel: number;
  departmentName?: string;
  departmentCode?: string;
  roles: Array<{ id: string; name: string; code: string }>;
}

interface TestFleetOrg {
  id: string;
  name: string;
  code: string;
  agencyCode?: string;
  status: string;
  isVerified: boolean;
  nodalOfficerName?: string;
  nodalOfficerEmail?: string;
  nodalOfficerPhone?: string;
  features?: any;
  createdAt: string;
  tierName?: string;
  tierColor?: string;
  categoryName?: string;
  categoryIcon?: string;
  regionName?: string;
  stateCode?: string;
  usersCount: number;
  departmentsCount: number;
  documentsCount: number;
  inboundRequestsCount: number;
  outboundRequestsCount: number;
  users: TestOrgUser[];
  defaultPasswordHint: string;
}

export default function FederationAdminStandalonePage() {
  const router = useRouter();

  // Active Main Tab: 'test-accounts' | 'simulator' | 'fleet-admin'
  const [activeTab, setActiveTab] = useState<'test-accounts' | 'simulator' | 'fleet-admin'>('test-accounts');

  // Test Fleet Data
  const [fleetOrgs, setFleetOrgs] = useState<TestFleetOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Currently Authenticated Session
  const [currentUser, setCurrentUser] = useState<any>(null);

  // New Login ID Creation Form Modal
  const [createLoginModalOpen, setCreateLoginModalOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [loginForm, setLoginForm] = useState({
    fullName: '',
    email: '',
    username: '',
    employeeCode: '',
    designation: 'Staff Officer',
    password: 'Password@DMS2026!',
    departmentId: '',
    maxSecurityLevel: 3,
    roleCodes: ['OFFICER'],
  });

  // Requisition Simulator Form
  const [simulatorForm, setSimulatorForm] = useState({
    requestingOrgId: '',
    targetOrgId: '',
    subjectTitle: 'Requisition of Cyber Forensic Evidence & FIR Docket for Crime Investigation',
    referenceCaseNumber: 'CR-SPEC-2026/894',
    statutoryPurpose: 'Required for judicial trial and criminal investigation under Section 91 of Bharatiya Nagarik Suraksha Sanhita (BNSS) / CrPC.',
    requestedAccessDays: 7,
    priorityTierId: '',
  });
  const [simulatingReq, setSimulatingReq] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'error' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '' }), 4000);
  };

  // Load Current Session & Test Fleet
  const [apexAdmin, setApexAdmin] = useState<any>({
    id: 'b767ebd0-6c72-4061-a6cb-874cd04e34ac',
    username: 'admin',
    fullName: 'Principal Systems Administrator',
    email: 'admin@dms.gov.in',
    designation: 'Apex Sovereign Authority & System Super Admin',
    maxSecurityLevel: 5,
    role: 'SUPER_ADMIN',
    defaultPasswordHint: 'Password@DMS2026!',
    organizationId: '978d8253-2430-46a3-b6db-373ceffa7452',
  });

  const loadFleetData = useCallback(async () => {
    setLoading(true);
    try {
      const [fleetRes, sessionRes] = await Promise.all([
        fetch('/api/collaboration/admin/test-fleet'),
        fetch('/api/auth/session'),
      ]);

      const fleetData = await fleetRes.json();
      if (fleetData.organizations) setFleetOrgs(fleetData.organizations);
      if (fleetData.apexSuperAdmin) setApexAdmin(fleetData.apexSuperAdmin);

      if (sessionRes.ok) {
        const sessData = await sessionRes.json();
        if (sessData.user) setCurrentUser(sessData.user);
      }
    } catch (err) {
      console.error('Failed to load test fleet data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleetData();
  }, [loadFleetData]);

  // 1-Click Session Switcher
  const handleSwitchSession = async (orgId: string, userId?: string) => {
    try {
      const res = await fetch(`/api/collaboration/admin/organizations/${orgId || 'apex'}/switch-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Switched session to ${data.switchedTo?.fullName} (${data.switchedTo?.organizationName})`, 'success');
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        showToast(data.error || 'Failed to switch session', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error switching session', 'error');
    }
  };

  // Handle Create New Login ID
  const handleCreateLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrgId || !loginForm.fullName || !loginForm.email || !loginForm.password) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/collaboration/admin/organizations/${targetOrgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Login ID created successfully for ${loginForm.fullName}!`, 'success');
        setCreateLoginModalOpen(false);
        setLoginForm({
          fullName: '',
          email: '',
          username: '',
          employeeCode: '',
          designation: 'Staff Officer',
          password: 'Password@DMS2026!',
          departmentId: '',
          maxSecurityLevel: 3,
          roleCodes: ['OFFICER'],
        });
        loadFleetData();
      } else {
        showToast(data.error || 'Failed to create login ID', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  // Handle Quick Pre-fill Role Templates
  const handleApplyRoleTemplate = (template: string) => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const org = fleetOrgs.find((o) => o.id === targetOrgId) || fleetOrgs[0];
    const orgCodeClean = (org?.code || 'ORG').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    switch (template) {
      case 'judge':
        setLoginForm({
          ...loginForm,
          fullName: `Hon'ble Justice K. V. Sharma`,
          email: `justice.sharma.${randomNum}@${orgCodeClean}.gov.in`,
          employeeCode: `JUD-${orgCodeClean.toUpperCase()}-${randomNum}`,
          designation: 'High Court Judge / Bench President',
          maxSecurityLevel: 5,
          roleCodes: ['ADMIN', 'OFFICER'],
        });
        break;
      case 'acp_cyber':
        setLoginForm({
          ...loginForm,
          fullName: `ACP Vikramaditya Singh (Cyber Wing)`,
          email: `acp.vikram.${randomNum}@${orgCodeClean}.gov.in`,
          employeeCode: `POL-${orgCodeClean.toUpperCase()}-${randomNum}`,
          designation: 'Assistant Commissioner of Police',
          maxSecurityLevel: 4,
          roleCodes: ['DEPT_HEAD', 'OFFICER'],
        });
        break;
      case 'collector':
        setLoginForm({
          ...loginForm,
          fullName: `District Collector Rajeshwar Rao, IAS`,
          email: `collector.rao.${randomNum}@${orgCodeClean}.gov.in`,
          employeeCode: `IAS-${orgCodeClean.toUpperCase()}-${randomNum}`,
          designation: 'District Magistrate & Collector',
          maxSecurityLevel: 4,
          roleCodes: ['DEPT_HEAD', 'OFFICER'],
        });
        break;
      case 'cbi_sp':
        setLoginForm({
          ...loginForm,
          fullName: `SP Devendra Rathore, IPS`,
          email: `sp.rathore.${randomNum}@${orgCodeClean}.gov.in`,
          employeeCode: `CBI-SP-${randomNum}`,
          designation: 'Superintendent of Police (Special Crimes)',
          maxSecurityLevel: 5,
          roleCodes: ['DEPT_HEAD', 'OFFICER'],
        });
        break;
      default:
        setLoginForm({
          ...loginForm,
          fullName: `Officer Rohit Verma`,
          email: `r.verma.${randomNum}@${orgCodeClean}.gov.in`,
          employeeCode: `EMP-${orgCodeClean.toUpperCase()}-${randomNum}`,
          designation: 'Staff Officer',
          maxSecurityLevel: 3,
          roleCodes: ['OFFICER'],
        });
    }
  };

  // Copy Credentials Helper
  const copyCredentials = (email: string, pass: string, name: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${pass}`);
    showToast(`Copied credentials for ${name}`);
  };

  // Filter Orgs and Users
  const filteredOrgs = useMemo(() => {
    return fleetOrgs
      .map((org) => {
        const matchOrg = selectedOrgFilter === 'ALL' || org.id === selectedOrgFilter;
        if (!matchOrg) return null;

        const filteredUsers = org.users.filter((u) => {
          const matchRole =
            roleFilter === 'ALL' ||
            u.roles.some((r) => r.code === roleFilter || r.name?.toUpperCase().includes(roleFilter.toUpperCase()));

          const matchSearch =
            !searchQuery ||
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.departmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.roles.some((r) => r.code.toLowerCase().includes(searchQuery.toLowerCase()) || r.name.toLowerCase().includes(searchQuery.toLowerCase()));

          return matchRole && matchSearch;
        });

        if (filteredUsers.length === 0 && searchQuery && !org.name.toLowerCase().includes(searchQuery.toLowerCase()) && !org.code.toLowerCase().includes(searchQuery.toLowerCase())) {
          return null;
        }

        return {
          ...org,
          users: filteredUsers,
        };
      })
      .filter(Boolean) as TestFleetOrg[];
  }, [fleetOrgs, searchQuery, selectedOrgFilter, roleFilter]);

  const ROLE_FILTER_CHIPS = [
    { code: 'ALL', label: 'All Roles', count: fleetOrgs.reduce((acc, o) => acc + o.usersCount, 0) },
    { code: 'SUPER_ADMIN', label: 'Super Admin', count: 1 },
    { code: 'ORG_ADMIN', label: 'Org Admin', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'ORG_ADMIN')).length, 0) },
    { code: 'DEPT_HEAD', label: 'Dept Head / Judge / Director', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'DEPT_HEAD')).length, 0) },
    { code: 'INVESTIGATING_OFFICER', label: 'Investigating Officer / Inspector', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'INVESTIGATING_OFFICER')).length, 0) },
    { code: 'FORENSIC_EXPERT', label: 'Forensic Scientist', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'FORENSIC_EXPERT')).length, 0) },
    { code: 'APPROVER', label: 'Dual Approver', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'APPROVER')).length, 0) },
    { code: 'AUDITOR', label: 'Auditor & Vigilance', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'AUDITOR')).length, 0) },
    { code: 'RECORD_KEEPER', label: 'Malkhana / Record Keeper', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'RECORD_KEEPER')).length, 0) },
    { code: 'CLERK', label: 'Clerk & Operator', count: fleetOrgs.reduce((acc, o) => acc + o.users.filter(u => u.roles.some(r => r.code === 'CLERK')).length, 0) },
  ];

  return (
    <div className="min-h-screen bg-[#f0f3ff] text-[#151c27] flex flex-col font-sans relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <ShaderGradientBackground />
      </div>

      {/* Top Universal Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#D8DEEA]/80 px-6 py-3.5 shadow-[0_4px_20px_rgba(16,20,26,0.04)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <img
              src="/nirman-logo.png"
              alt="NIRMAN DMS"
              className="w-9 h-9 object-contain rounded-xl shadow-xs bg-white p-0.5 border border-slate-200 group-hover:scale-105 transition"
            />
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-[#151c27]">
                NIRMAN <span className="text-amber-600">DMS</span>
              </span>
              <span className="text-[9px] font-extrabold text-emerald-700 tracking-wider uppercase">
                Inter-Org Sovereign Grid
              </span>
            </div>
          </Link>

          <div className="h-5 w-px bg-[#D8DEEA] mx-2 hidden sm:block" />

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#000000] text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Inter-Agency Test Suite &amp; Demo Credentials</span>
          </span>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f0f3ff] border border-[#D8DEEA] text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[#6B7280]">Active Session:</span>
              <b className="text-[#10141A]">{currentUser.fullName}</b>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-[#000000] text-white">
                {currentUser.organization?.code || (currentUser.roles?.includes('SUPER_ADMIN') ? 'SUPER_ADMIN' : 'ORG')}
              </span>
            </div>
          )}

          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-full bg-white hover:bg-[#f0f3ff] border border-[#D8DEEA] text-xs font-semibold text-[#151c27] transition shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            <span>Open Dashboard</span>
          </Link>

          <button
            onClick={loadFleetData}
            className="w-9 h-9 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] flex items-center justify-center transition cursor-pointer"
            title="Refresh Fleet Data"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Toast */}
        {toast.show && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold shadow-2xl border transition-all animate-bounce ${
              toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700'
                : 'bg-[#10141A] text-white border-[#D8DEEA]/40'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Hero Banner */}
        <div className="bg-white/85 backdrop-blur-xl rounded-[26px] p-6 lg:p-8 shadow-[0_8px_32px_rgba(16,20,26,0.06)] border border-[#D8DEEA]/80 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="material-symbols-outlined text-[#3f5e93] text-[26px]">hub</span>
                <h1 className="text-2xl font-black text-[#10141A] tracking-tight">
                  Sovereign Inter-Agency Test Suite &amp; Live Demo Credentials
                </h1>
                <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200">
                  5 Sovereign Nodes Active
                </span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Access 5 authentic government organizations, 50 pre-configured statutory officer profiles (Judiciary, Police CID, CBI, Forensic Labs, Collectorate), and 1-click test login launcher.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setTargetOrgId(fleetOrgs[0]?.id || '');
                  setCreateLoginModalOpen(true);
                }}
                className="px-4 py-2 rounded-full bg-[#000000] text-white hover:bg-[#181c22] text-xs font-semibold shadow-[0_4px_12px_rgba(16,20,26,0.22)] flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Create Custom Test Login</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-full w-fit border border-[#D8DEEA]/80 flex-wrap">
            <button
              onClick={() => setActiveTab('test-accounts')}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'test-accounts'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              <span>Test Accounts &amp; Demo Credentials ({fleetOrgs.reduce((acc, o) => acc + o.usersCount, 0) + (apexAdmin ? 1 : 0)} Total Accounts)</span>
            </button>

            <button
              onClick={() => setActiveTab('fleet-admin')}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'fleet-admin'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
              <span>Apex Fleet Management Console</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TEST ACCOUNTS & 1-CLICK LOGIN SWITCHER */}
        {/* ========================================================================= */}
        {activeTab === 'test-accounts' && (
          <div className="space-y-6">
            {/* APEX SYSTEM SUPER ADMIN HERO CARD */}
            {apexAdmin && (
              <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-[24px] p-6 text-white shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                      Apex Authority
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-900/80 text-purple-200 border border-purple-400/40">
                      ROLE: SUPER_ADMIN
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-200 border border-emerald-400/40">
                      CLEARANCE: T5 (SOVEREIGN)
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>{apexAdmin.fullName}</span>
                      <span className="text-amber-400 text-xs font-normal">(@{apexAdmin.username})</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-0.5">
                      National Digital Governance Authority • Sovereign Multi-Agency Controller
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono pt-1 text-slate-300 flex-wrap">
                    <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                      Email: <b className="text-white">{apexAdmin.email}</b>
                    </span>
                    <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                      Password: <b className="text-amber-300">{apexAdmin.defaultPasswordHint}</b>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 relative z-10 w-full md:w-auto">
                  <button
                    onClick={() => handleSwitchSession(apexAdmin.organizationId, apexAdmin.id)}
                    className="flex-1 md:flex-initial px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>⚡ Login as Apex Super Admin</span>
                  </button>

                  <button
                    onClick={() => copyCredentials(apexAdmin.email, apexAdmin.defaultPasswordHint, apexAdmin.fullName)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition cursor-pointer"
                    title="Copy Super Admin Credentials"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                </div>
              </div>
            )}

            {/* Filter and Quick Search */}
            <div className="bg-white rounded-[22px] p-5 border border-[#D8DEEA]/80 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 max-w-md">
                  <UiverseSearchBar
                    placeholder="Search by officer name, role, department, or jurisdiction..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                    compact
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedOrgFilter}
                    onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    className="h-9 px-3.5 rounded-full bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#151c27] font-semibold outline-none focus:bg-white"
                  >
                    <option value="ALL">All 5 Organizations ({fleetOrgs.length})</option>
                    {fleetOrgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#D8DEEA]/50">
                <span className="text-[11px] font-bold text-[#6B7280] uppercase mr-1">Filter Role:</span>
                {ROLE_FILTER_CHIPS.map((chip) => {
                  const isActive = roleFilter === chip.code;
                  return (
                    <button
                      key={chip.code}
                      onClick={() => setRoleFilter(chip.code)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isActive
                          ? 'bg-[#10141A] text-white shadow-xs'
                          : 'bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#45474b] border border-[#D8DEEA]'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-white text-[#6B7280]'}`}>
                        {chip.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Organizations Grid with Active Logins */}
            <div className="space-y-6">
              {filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-white/95 rounded-[24px] p-6 border border-[#D8DEEA]/80 shadow-sm space-y-4 transition hover:border-[#3f5e93]/50"
                >
                  {/* Organization Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D8DEEA]/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                        {org.code.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-[#10141A]">{org.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA]">
                            {org.code}
                          </span>
                          {org.isVerified && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                              Verified Node
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">
                            {org.users.length} Officers
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          {org.tierName || 'State Government Directorate'} • Domain: {org.categoryName || 'General'} • Jurisdiction: {org.regionName || 'National'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTargetOrgId(org.id);
                        setCreateLoginModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#f0f3ff] hover:bg-[#e2e8f8] border border-[#D8DEEA] text-xs font-semibold text-[#151c27] flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                    >
                      <span className="material-symbols-outlined text-[15px] text-[#3f5e93]">add</span>
                      <span>Add Custom Login</span>
                    </button>
                  </div>

                  {/* Users Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {org.users.map((u) => {
                      const primaryRole = u.roles[0]?.code || 'OFFICER';
                      const roleColorMap: Record<string, string> = {
                        ORG_ADMIN: 'bg-purple-100 text-purple-900 border-purple-200',
                        DEPT_HEAD: 'bg-blue-100 text-blue-900 border-blue-200',
                        INVESTIGATING_OFFICER: 'bg-amber-100 text-amber-900 border-amber-200',
                        FORENSIC_EXPERT: 'bg-emerald-100 text-emerald-900 border-emerald-200',
                        APPROVER: 'bg-indigo-100 text-indigo-900 border-indigo-200',
                        AUDITOR: 'bg-teal-100 text-teal-900 border-teal-200',
                        RECORD_KEEPER: 'bg-slate-200 text-slate-800 border-slate-300',
                        CLERK: 'bg-gray-100 text-gray-700 border-gray-200',
                        OFFICER: 'bg-blue-50 text-blue-800 border-blue-100',
                      };

                      return (
                        <div
                          key={u.id}
                          className="bg-[#f0f3ff]/50 rounded-[18px] p-4 border border-[#D8DEEA]/70 flex flex-col justify-between gap-3 hover:bg-white hover:border-[#83A2DB]/70 hover:shadow-md transition duration-200 shadow-2xs"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-xs text-[#10141A]">{u.fullName}</div>
                                <div className="text-[11px] text-[#6B7280]">{u.designation || 'Officer'}</div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono shrink-0 ${
                                  u.maxSecurityLevel >= 5
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : u.maxSecurityLevel >= 4
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}
                              >
                                T{u.maxSecurityLevel || 3}
                              </span>
                            </div>

                            {/* Role and Department Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {u.roles.map((r) => (
                                <span
                                  key={r.id || r.code}
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono border ${roleColorMap[r.code] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
                                >
                                  {r.name || r.code}
                                </span>
                              ))}

                              {u.departmentCode && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-white text-slate-600 border border-slate-200">
                                  {u.departmentCode}
                                </span>
                              )}
                            </div>

                            {/* Credential Box */}
                            <div className="space-y-1 text-[11px] font-mono bg-white/80 p-2.5 rounded-xl border border-[#D8DEEA]/60 text-[#45474b]">
                              <div className="truncate flex items-center justify-between gap-1">
                                <span className="text-[#9CA3AF]">User:</span>
                                <b className="text-[#10141A] truncate">{u.email}</b>
                              </div>
                              <div className="flex items-center justify-between text-[10px]">
                                <span>Pass: <b className="text-[#3f5e93]">{org.defaultPasswordHint}</b></span>
                                {u.employeeCode && <span className="text-slate-500 font-bold">{u.employeeCode}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-1 border-t border-[#D8DEEA]/40">
                            <button
                              onClick={() => handleSwitchSession(org.id, u.id)}
                              className="flex-1 py-1.5 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                              title="Log In as this officer and open Dashboard"
                            >
                              <span className="material-symbols-outlined text-[14px]">bolt</span>
                              <span>⚡ Login &amp; Open</span>
                            </button>

                            <button
                              onClick={() => copyCredentials(u.email, org.defaultPasswordHint, u.fullName)}
                              className="p-1.5 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#45474b] hover:text-[#10141A] transition cursor-pointer"
                              title="Copy Credentials"
                            >
                              <span className="material-symbols-outlined text-[15px]">content_copy</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FULL FLEET ADMINISTRATION SUITE */}
        {/* ========================================================================= */}
        {activeTab === 'fleet-admin' && (
          <div>
            {!currentUser?.roles?.includes('SUPER_ADMIN') && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">shield</span>
                  <div>
                    <b>Apex Super Admin Clearance Required for Modifications</b>
                    <p className="text-[11px] text-amber-700">Currently logged in as a local organizational user. Click below to elevate to Apex Super Admin.</p>
                  </div>
                </div>
                {apexAdmin && (
                  <button
                    onClick={() => handleSwitchSession(apexAdmin.organizationId, apexAdmin.id)}
                    className="px-4 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition shrink-0 cursor-pointer"
                  >
                    ⚡ Switch to Apex Super Admin
                  </button>
                )}
              </div>
            )}

            <OrganizationsManagementView
              currentUserId={currentUser?.id}
              currentUserRoles={currentUser?.roles}
              currentOrg={currentUser?.organization}
              onNavigateTab={(tab) => {
                if (tab === 'test-accounts') setActiveTab('test-accounts');
              }}
            />
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: CREATE TEST LOGIN ID */}
      {/* ========================================================================= */}
      {createLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#10141A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[26px] shadow-2xl p-6 flex flex-col gap-4 border border-[#D8DEEA]">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[rgba(131,162,219,0.14)] text-[#3f5e93] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10141A]">Create Test Login ID</h3>
                  <p className="text-xs text-[#6B7280]">Provision custom credentials into any organization for testing</p>
                </div>
              </div>
              <button onClick={() => setCreateLoginModalOpen(false)} className="text-[#9CA3AF] hover:text-[#10141A]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Template Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                Quick Role Presets
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'judge', label: 'High Court Judge (T5)', icon: 'gavel' },
                  { id: 'acp_cyber', label: 'ACP Cyber Crime (T4)', icon: 'local_police' },
                  { id: 'collector', label: 'District Collector (T4)', icon: 'account_balance' },
                  { id: 'cbi_sp', label: 'CBI Superintendent (T5)', icon: 'shield' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyRoleTemplate(preset.id)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f0f3ff] hover:bg-[#e2e8f8] border border-[#D8DEEA] text-[#3f5e93] flex items-center gap-1 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#45474b] mb-1">Target Organization *</label>
                <select
                  value={targetOrgId}
                  onChange={(e) => setTargetOrgId(e.target.value)}
                  required
                  className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] font-semibold outline-none focus:bg-white"
                >
                  {fleetOrgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Full Officer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Inspector Ramesh Mane"
                    value={loginForm.fullName}
                    onChange={(e) => setLoginForm({ ...loginForm, fullName: e.target.value })}
                    required
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Login Email Address *</label>
                  <input
                    type="email"
                    placeholder="r.mane@police.gov.in"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Cyber Investigator"
                    value={loginForm.designation}
                    onChange={(e) => setLoginForm({ ...loginForm, designation: e.target.value })}
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Employee Service Code</label>
                  <input
                    type="text"
                    placeholder="e.g. POL-CYB-094"
                    value={loginForm.employeeCode}
                    onChange={(e) => setLoginForm({ ...loginForm, employeeCode: e.target.value })}
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full font-mono uppercase text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Clearance Tier</label>
                  <select
                    value={loginForm.maxSecurityLevel}
                    onChange={(e) => setLoginForm({ ...loginForm, maxSecurityLevel: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white font-mono font-bold"
                  >
                    <option value={1}>T1 - Public Clearance</option>
                    <option value={2}>T2 - Institutional Clearance</option>
                    <option value={3}>T3 - Confidential Regulatory</option>
                    <option value={4}>T4 - Secret Enforcement</option>
                    <option value={5}>T5 - Top Secret Sovereign</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Password *</label>
                  <input
                    type="text"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full font-mono text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8DEEA]/60">
                <button
                  type="button"
                  onClick={() => setCreateLoginModalOpen(false)}
                  className="px-4 py-1.5 rounded-full border border-[#D8DEEA] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-full bg-[#000000] text-white text-xs font-semibold shadow-xs"
                >
                  Create &amp; Add Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
