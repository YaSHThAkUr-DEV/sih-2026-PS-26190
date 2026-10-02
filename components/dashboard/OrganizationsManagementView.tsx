'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ServiceSetupModal } from './ServiceSetupModal';
import { UiverseSearchBar } from '@/components/ui/UiverseSearchBar';
import { UserPhotoUpload } from '@/components/ui/UserPhotoUpload';

interface OrganizationsManagementViewProps {
  currentUserId?: string;
  currentUserRoles?: string[];
  currentUserPermissions?: string[];
  currentOrg?: {
    id: string;
    code: string;
    name: string;
  };
  onNavigateTab?: (tab: string) => void;
}

interface FleetOrganization {
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
}

function TablePagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  label = 'records',
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  if (totalItems <= pageSize && currentPage === 1) return null;

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="px-5 py-3.5 border-t border-[#D8DEEA]/70 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 flex items-center justify-between flex-wrap gap-2 text-xs">
      <span className="text-[#64748B] text-[11px] font-medium">
        Showing <b className="text-[#0F172A] font-semibold">{startIdx}–{endIdx}</b> of <b className="text-[#0F172A] font-semibold">{totalItems}</b> {label}
      </span>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[11px] font-semibold transition-all shadow-2xs"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((pageNum, idx, arr) => {
            const prev = arr[idx - 1];
            const hasGap = prev && pageNum - prev > 1;
            return (
              <React.Fragment key={pageNum}>
                {hasGap && <span className="px-1.5 text-[#94A3B8] text-xs font-semibold">...</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-2xs ${
                    currentPage === pageNum
                      ? 'bg-[#0F172A] text-white shadow-sm ring-1 ring-slate-900'
                      : 'bg-white hover:bg-slate-100 text-[#334155] border border-[#CBD5E1]'
                  }`}
                >
                  {pageNum}
                </button>
              </React.Fragment>
            );
          })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[11px] font-semibold transition-all shadow-2xs"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Category visual helper
function getCategoryBadgeConfig(categoryName?: string) {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('judic') || name.includes('court') || name.includes('tribunal')) {
    return {
      bg: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: 'gavel',
      accentColor: 'border-l-purple-600',
      tagColor: 'text-purple-700 bg-purple-100/70',
      gradient: 'from-purple-900/10 via-purple-600/5 to-transparent',
    };
  }
  if (name.includes('police') || name.includes('enforce') || name.includes('investig') || name.includes('cbi')) {
    return {
      bg: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: 'local_police',
      accentColor: 'border-l-blue-600',
      tagColor: 'text-blue-700 bg-blue-100/70',
      gradient: 'from-blue-900/10 via-blue-600/5 to-transparent',
    };
  }
  if (name.includes('secretariat') || name.includes('ministry') || name.includes('administr') || name.includes('central')) {
    return {
      bg: 'bg-amber-50 text-amber-900 border-amber-200',
      icon: 'assured_workload',
      accentColor: 'border-l-amber-600',
      tagColor: 'text-amber-700 bg-amber-100/70',
      gradient: 'from-amber-900/10 via-amber-600/5 to-transparent',
    };
  }
  if (name.includes('forensic') || name.includes('tech') || name.includes('cyber') || name.includes('lab')) {
    return {
      bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      icon: 'biotech',
      accentColor: 'border-l-cyan-600',
      tagColor: 'text-cyan-700 bg-cyan-100/70',
      gradient: 'from-cyan-900/10 via-cyan-600/5 to-transparent',
    };
  }
  if (name.includes('revenue') || name.includes('finance') || name.includes('customs') || name.includes('tax')) {
    return {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: 'account_balance_wallet',
      accentColor: 'border-l-emerald-600',
      tagColor: 'text-emerald-700 bg-emerald-100/70',
      gradient: 'from-emerald-900/10 via-emerald-600/5 to-transparent',
    };
  }
  return {
    bg: 'bg-slate-50 text-slate-800 border-slate-200',
    icon: 'domain',
    accentColor: 'border-l-slate-600',
    tagColor: 'text-slate-700 bg-slate-100',
    gradient: 'from-slate-900/10 via-slate-600/5 to-transparent',
  };
}

export default function OrganizationsManagementView({
  currentUserId,
  currentUserRoles = [],
  currentUserPermissions = [],
  currentOrg,
  onNavigateTab,
}: OrganizationsManagementViewProps) {
  const isSuperAdmin = currentUserRoles.includes('SUPER_ADMIN');

  // Main View Navigation: 'fleet' | 'inspector' | 'taxonomies'
  const [activeMainTab, setActiveMainTab] = useState<'fleet' | 'inspector' | 'taxonomies'>('fleet');

  // Inspector sub-tab: 'profile' | 'departments' | 'users' | 'vault' | 'exchanges'
  const [inspectorTab, setInspectorTab] = useState<'profile' | 'departments' | 'users' | 'vault' | 'exchanges'>('profile');

  // Inspector Pagination (Max 10 items per page)
  const [vaultPage, setVaultPage] = useState(1);
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [inboundPage, setInboundPage] = useState(1);
  const [outboundPage, setOutboundPage] = useState(1);
  const PAGE_SIZE = 10;

  // Fleet data
  const [fleetSummary, setFleetSummary] = useState<any>({});
  const [organizations, setOrganizations] = useState<FleetOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickChipFilter, setQuickChipFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'documents' | 'officers' | 'activity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');

  // Quick view drawer/modal
  const [quickViewOrg, setQuickViewOrg] = useState<FleetOrganization | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Selected Organization for Deep-Dive Inspector
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgDetails, setOrgDetails] = useState<any>(null);
  const [orgDetailsLoading, setOrgDetailsLoading] = useState(false);

  // Dynamic Taxonomies State
  const [taxonomies, setTaxonomies] = useState<any>({
    tiers: [],
    categories: [],
    regions: [],
    statutoryTemplates: [],
    priorityTiers: [],
    accessModes: [],
  });

  // Edit Org Profile Form
  const [editOrgForm, setEditOrgForm] = useState<any>({
    name: '',
    code: '',
    agencyCode: '',
    tierId: '',
    domainCategoryId: '',
    jurisdictionRegionId: '',
    nodalOfficerName: '',
    nodalOfficerEmail: '',
    nodalOfficerPhone: '',
    status: 'ACTIVE',
    isVerified: true,
  });

  // Add Department Modal Form
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', parentDepartmentId: '' });

  // Add User Modal Form
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    fullName: '',
    email: '',
    username: '',
    employeeCode: '',
    designation: 'Officer',
    password: 'Password@DMS2026!',
    departmentId: '',
    maxSecurityLevel: 3,
    roleCodes: ['OFFICER'],
    avatarUrl: null as string | null,
  });

  // Service Setup Modal State (Provisioning Wizard)
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'error' }>({
    show: false,
    message: '',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '' }), 4000);
  };

  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Organization code "${code}" copied to clipboard`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Load Fleet Summary & Taxonomies
  const fetchFleetData = useCallback(async () => {
    setLoading(true);
    try {
      const [fleetRes, taxRes] = await Promise.all([
        fetch('/api/collaboration/admin'),
        fetch('/api/collaboration/taxonomies'),
      ]);

      const fleetData = await fleetRes.json();
      const taxData = await taxRes.json();

      if (fleetData.fleetSummary) setFleetSummary(fleetData.fleetSummary);
      if (fleetData.organizations) setOrganizations(fleetData.organizations);
      if (taxData.taxonomies) setTaxonomies(taxData.taxonomies);
    } catch (err) {
      console.error('Failed to load fleet data', err);
      showToast('Failed to load fleet data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  // Load Deep-Dive Details when an Organization is Selected
  const loadOrgDetails = useCallback(async (orgId: string) => {
    setOrgDetailsLoading(true);
    try {
      const res = await fetch(`/api/collaboration/admin/organizations/${orgId}`);
      const data = await res.json();
      if (res.ok && data.organization) {
        setOrgDetails(data);
        const org = data.organization;
        setEditOrgForm({
          name: org.name || '',
          code: org.code || '',
          agencyCode: org.agencyCode || '',
          tierId: org.tierId || '',
          domainCategoryId: org.domainCategoryId || '',
          jurisdictionRegionId: org.jurisdictionRegionId || '',
          nodalOfficerName: org.nodalOfficerName || '',
          nodalOfficerEmail: org.nodalOfficerEmail || '',
          nodalOfficerPhone: org.nodalOfficerPhone || '',
          status: org.status || 'ACTIVE',
          isVerified: org.isVerified !== false,
        });
      } else {
        showToast(data.error || 'Failed to load organization details', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading organization details', 'error');
    } finally {
      setOrgDetailsLoading(false);
    }
  }, []);

  const handleSelectOrgToInspect = (orgId: string) => {
    setSelectedOrgId(orgId);
    setActiveMainTab('inspector');
    setInspectorTab('profile');
    setVaultPage(1);
    setAuditLogPage(1);
    setUsersPage(1);
    setInboundPage(1);
    setOutboundPage(1);
    loadOrgDetails(orgId);
  };

  // Handle Save Organization Profile
  const handleSaveOrgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) return;

    try {
      const res = await fetch(`/api/collaboration/admin/organizations/${selectedOrgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editOrgForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Organization updated successfully!', 'success');
        fetchFleetData();
        loadOrgDetails(selectedOrgId);
      } else {
        showToast(data.error || 'Failed to update organization', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving organization', 'error');
    }
  };

  // Handle Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !deptForm.name || !deptForm.code) return;

    try {
      const res = await fetch(`/api/collaboration/admin/organizations/${selectedOrgId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Department created successfully!', 'success');
        setDeptModalOpen(false);
        setDeptForm({ name: '', code: '', parentDepartmentId: '' });
        loadOrgDetails(selectedOrgId);
        fetchFleetData();
      } else {
        showToast(data.error || 'Failed to create department', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating department', 'error');
    }
  };

  // Handle Enroll User
  const handleEnrollUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !userForm.fullName || !userForm.email || !userForm.password) return;

    try {
      const res = await fetch(`/api/collaboration/admin/organizations/${selectedOrgId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'User enrolled successfully!', 'success');
        setUserModalOpen(false);
        setUserForm({
          fullName: '',
          email: '',
          username: '',
          employeeCode: '',
          designation: 'Officer',
          password: 'Password@DMS2026!',
          departmentId: '',
          maxSecurityLevel: 3,
          roleCodes: ['OFFICER'],
          avatarUrl: null,
        });
        loadOrgDetails(selectedOrgId);
        fetchFleetData();
      } else {
        showToast(data.error || 'Failed to enroll user', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error enrolling user', 'error');
    }
  };

  // Export Fleet Directory manifest as JSON/CSV
  const handleExportFleet = () => {
    try {
      const manifest = organizations.map((o) => ({
        id: o.id,
        name: o.name,
        code: o.code,
        agencyCode: o.agencyCode || '',
        category: o.categoryName || '',
        tier: o.tierName || '',
        region: o.regionName || '',
        stateCode: o.stateCode || '',
        isVerified: o.isVerified,
        status: o.status,
        officersCount: o.usersCount,
        departmentsCount: o.departmentsCount,
        vaultDocuments: o.documentsCount,
        nodalOfficer: o.nodalOfficerName || '',
        nodalEmail: o.nodalOfficerEmail || '',
        nodalPhone: o.nodalOfficerPhone || '',
      }));

      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nirman-dms-fleet-manifest-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Fleet manifest exported successfully!');
    } catch (e) {
      showToast('Failed to export fleet manifest', 'error');
    }
  };

  // Filter and Sort organizations for fleet directory
  const filteredOrgs = useMemo(() => {
    let result = organizations.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        o.agencyCode?.toLowerCase().includes(q) ||
        o.nodalOfficerName?.toLowerCase().includes(q) ||
        o.regionName?.toLowerCase().includes(q);

      const matchesTier = tierFilter === 'ALL' || o.tierName === tierFilter;
      const matchesCategory = categoryFilter === 'ALL' || o.categoryName === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'VERIFIED') matchesStatus = o.isVerified === true;
      if (statusFilter === 'PENDING') matchesStatus = o.isVerified === false;
      if (statusFilter === 'ACTIVE') matchesStatus = o.status === 'ACTIVE';

      // Quick chip filter
      let matchesChip = true;
      if (quickChipFilter === 'JUDICIAL') {
        const cat = (o.categoryName || '').toLowerCase();
        matchesChip = cat.includes('judic') || cat.includes('court');
      } else if (quickChipFilter === 'POLICE') {
        const cat = (o.categoryName || '').toLowerCase();
        matchesChip = cat.includes('police') || cat.includes('enforce') || cat.includes('cbi');
      } else if (quickChipFilter === 'SECRETARIAT') {
        const cat = (o.categoryName || '').toLowerCase();
        matchesChip = cat.includes('secretariat') || cat.includes('ministry') || cat.includes('admin');
      } else if (quickChipFilter === 'VERIFIED') {
        matchesChip = o.isVerified === true;
      } else if (quickChipFilter === 'ACTIVE_VAULT') {
        matchesChip = (o.documentsCount || 0) > 0;
      }

      return matchesSearch && matchesTier && matchesCategory && matchesStatus && matchesChip;
    });

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'code') cmp = a.code.localeCompare(b.code);
      else if (sortBy === 'documents') cmp = (a.documentsCount || 0) - (b.documentsCount || 0);
      else if (sortBy === 'officers') cmp = (a.usersCount || 0) - (b.usersCount || 0);
      else if (sortBy === 'activity') {
        const actA = (a.inboundRequestsCount || 0) + (a.outboundRequestsCount || 0);
        const actB = (b.inboundRequestsCount || 0) + (b.outboundRequestsCount || 0);
        cmp = actA - actB;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [organizations, searchQuery, tierFilter, categoryFilter, statusFilter, quickChipFilter, sortBy, sortOrder]);

  if (!isSuperAdmin) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 bg-white/95 backdrop-blur-xl rounded-[28px] p-8 lg:p-12 shadow-[0_12px_40px_rgba(15,23,42,0.08)] border border-rose-200/80 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <span className="material-symbols-outlined text-[34px]">lock</span>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-[#0F172A]">Sovereign Fleet Governance — Restricted</h2>
          <p className="text-xs text-[#64748B] max-w-lg mx-auto leading-relaxed">
            The Organizations Management module is strictly reserved for <strong>Apex System Super Administrators</strong>.
            Local Organization Administrators are restricted from managing other sovereign agencies and federation nodes.
          </p>
        </div>
        <div className="pt-3">
          <button
            onClick={() => onNavigateTab?.('overview')}
            className="px-6 py-2.5 rounded-full bg-[#0F172A] hover:bg-black text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            Return to Overview Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Toast Feedback */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl border backdrop-blur-md transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : 'bg-[#0F172A] text-white border-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-emerald-400">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP COMMAND HERO BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-[28px] p-6 lg:p-8 text-white border border-slate-700/60 shadow-[0_16px_48px_rgba(15,23,42,0.18)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner shrink-0">
              <span className="material-symbols-outlined text-[32px]">corporate_fare</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Sovereign Organization Fleet &amp; Node Governance
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  National Federation Grid
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-300 mt-1.5 max-w-3xl leading-relaxed">
                Central command plane to provision sovereign courts, police departments, secretariats, and enforce WORM cryptographic policies across all connected agencies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setSetupModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              <span>Provision Sovereign Entity</span>
            </button>

            <button
              onClick={handleExportFleet}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Export Fleet Directory as JSON"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Manifest</span>
            </button>

            <button
              onClick={fetchFleetData}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 flex items-center justify-center transition cursor-pointer"
              title="Refresh Fleet Telemetry"
            >
              <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Fleet KPI Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-6 pt-6 border-t border-slate-700/60 relative z-10">
          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agencies</span>
              <span className="material-symbols-outlined text-slate-400 text-[16px]">domain</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {fleetSummary.totalOrganizations || organizations.length}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Verified Nodes</span>
              <span className="material-symbols-outlined text-emerald-400 text-[16px]">verified</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {fleetSummary.verifiedNodes || 0}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Active Officers</span>
              <span className="material-symbols-outlined text-blue-400 text-[16px]">group</span>
            </div>
            <div className="text-2xl font-black text-blue-300 mt-1">
              {fleetSummary.totalActiveUsers || 0}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Vault Dossiers</span>
              <span className="material-symbols-outlined text-purple-400 text-[16px]">folder_special</span>
            </div>
            <div className="text-2xl font-black text-purple-300 mt-1">
              {fleetSummary.totalDocumentsInVaults || 0}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Requisitions</span>
              <span className="material-symbols-outlined text-amber-400 text-[16px]">sync_alt</span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">
              {fleetSummary.totalInterOrgRequisitions || 0}
            </div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Active Shares</span>
              <span className="material-symbols-outlined text-cyan-400 text-[16px]">share</span>
            </div>
            <div className="text-2xl font-black text-cyan-300 mt-1">
              {fleetSummary.activeInterOrgShares || 0}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="bg-white/90 backdrop-blur-xl rounded-[24px] p-2 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-2xl flex-wrap">
          <button
            onClick={() => setActiveMainTab('fleet')}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'fleet'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/80'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            <span>Fleet Directory</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeMainTab === 'fleet' ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-200 text-slate-700'
            }`}>
              {organizations.length}
            </span>
          </button>

          <button
            onClick={() => {
              if (!selectedOrgId && organizations.length > 0) {
                handleSelectOrgToInspect(organizations[0].id);
              } else {
                setActiveMainTab('inspector');
              }
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'inspector'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/80'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Organization Dossier &amp; Inspector</span>
            {selectedOrgId && (
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-500/30 text-blue-200 font-mono font-bold">
                {orgDetails?.organization?.code || 'ACTIVE'}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainTab('taxonomies')}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeMainTab === 'taxonomies'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/80'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">category</span>
            <span>Dynamic Taxonomies &amp; SLAs</span>
          </button>
        </div>

        {/* View Mode Switcher (When in Fleet Tab) */}
        {activeMainTab === 'fleet' && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-[11px] font-semibold text-[#64748B]">View:</span>
            <div className="flex items-center bg-[#f0f3ff] p-1 rounded-xl border border-[#D8DEEA]">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Executive Cards Grid"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Detailed Horizontal List"
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
                title="Dense Data Table"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                <span>Table</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ORGANIZATIONS FLEET DIRECTORY */}
      {/* ========================================================================= */}
      {activeMainTab === 'fleet' && (
        <div className="space-y-5">
          {/* Filter, Search & Quick Pills Toolbar */}
          <div className="bg-white rounded-[24px] p-5 border border-[#D8DEEA]/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex-1 max-w-xl">
                <UiverseSearchBar
                  placeholder="Search organization name, code (e.g. MH-HC-BOM), agency, nodal officer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                  compact
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Government Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="h-9 px-3.5 rounded-xl bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#0F172A] font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Government Tiers</option>
                  {taxonomies.tiers.map((t: any) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>

                {/* Domain Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-9 px-3.5 rounded-xl bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#0F172A] font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Domain Categories</option>
                  {taxonomies.categories.map((c: any) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 px-3.5 rounded-xl bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#0F172A] font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Node Statuses</option>
                  <option value="VERIFIED">Verified Nodes Only</option>
                  <option value="PENDING">Pending Verification</option>
                  <option value="ACTIVE">Active Operational</option>
                </select>

                {/* Sort dropdown */}
                <div className="flex items-center gap-1 bg-[#f0f3ff] p-0.5 rounded-xl border border-[#D8DEEA]">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="h-8 px-2.5 bg-transparent text-xs text-[#0F172A] font-semibold outline-none cursor-pointer"
                  >
                    <option value="name">Sort: Name</option>
                    <option value="code">Sort: Code</option>
                    <option value="documents">Sort: Vault Docs</option>
                    <option value="officers">Sort: Officers</option>
                    <option value="activity">Sort: Exchanges</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-[#0F172A] transition cursor-pointer"
                    title={`Toggle Sort Order (${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Instant Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#D8DEEA]/60 text-xs">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Quick Filters:</span>
              {[
                { id: 'ALL', label: 'All Entities' },
                { id: 'JUDICIAL', label: 'Judicial & Courts', icon: 'gavel' },
                { id: 'POLICE', label: 'Police & Law Enforcement', icon: 'local_police' },
                { id: 'SECRETARIAT', label: 'Secretariats & Ministries', icon: 'assured_workload' },
                { id: 'VERIFIED', label: 'Verified Nodes Only', icon: 'verified' },
                { id: 'ACTIVE_VAULT', label: 'With Active Vault Documents', icon: 'folder' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setQuickChipFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    quickChipFilter === chip.id
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-[#f0f3ff] text-[#475569] hover:bg-[#e2e8f0] border border-[#D8DEEA]'
                  }`}
                >
                  {chip.icon && <span className="material-symbols-outlined text-[14px]">{chip.icon}</span>}
                  <span>{chip.label}</span>
                </button>
              ))}

              {(searchQuery || tierFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'ALL' || quickChipFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTierFilter('ALL');
                    setCategoryFilter('ALL');
                    setStatusFilter('ALL');
                    setQuickChipFilter('ALL');
                  }}
                  className="px-2.5 py-1 text-rose-600 hover:text-rose-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  <span className="material-symbols-outlined text-[14px]">clear_all</span>
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Bar */}
          <div className="flex items-center justify-between px-2 text-xs text-[#64748B]">
            <span>
              Showing <b className="text-[#0F172A]">{filteredOrgs.length}</b> sovereign organizations
            </span>
            <span className="text-[11px] text-[#94A3B8]">
              Cryptographic KMS Envelope Sealed &bull; Multi-Tenant Isolated
            </span>
          </div>

          {/* ========================================================================= */}
          {/* VIEW MODE 1: EXECUTIVE CARDS GRID */}
          {/* ========================================================================= */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-[26px] p-6 border border-slate-200 animate-pulse space-y-4">
                    <div className="h-6 bg-slate-200 rounded-md w-1/3" />
                    <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-20 bg-slate-100 rounded-xl" />
                    <div className="h-9 bg-slate-200 rounded-full" />
                  </div>
                ))
              ) : filteredOrgs.length === 0 ? (
                <div className="col-span-full bg-white rounded-[26px] p-12 text-center border border-[#D8DEEA] space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <span className="material-symbols-outlined text-[32px]">domain_disabled</span>
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">No sovereign organizations match your filters</h3>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Try adjusting your search criteria, domain category, or clearing the quick filters.
                  </p>
                </div>
              ) : (
                filteredOrgs.map((org) => {
                  const isCurrentOrg = currentOrg?.id === org.id || currentOrg?.code === org.code;
                  const catBadge = getCategoryBadgeConfig(org.categoryName);

                  return (
                    <div
                      key={org.id}
                      className={`group bg-white rounded-[26px] p-6 border shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_36px_rgba(15,23,42,0.09)] transition-all duration-300 flex flex-col justify-between gap-5 relative overflow-hidden ${
                        isCurrentOrg
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-[#D8DEEA]/90 hover:border-slate-400'
                      }`}
                    >
                      {/* Top Category Accent Line */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${catBadge.gradient}`} />

                      <div className="space-y-4">
                        {/* Top Meta Bar */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={(e) => handleCopyCode(org.code, e)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-[#f0f3ff] hover:bg-blue-100 text-[#1E3A8A] border border-[#CBD5E1] flex items-center gap-1.5 transition cursor-pointer group/code"
                              title="Click to copy organization code"
                            >
                              <span className="material-symbols-outlined text-[13px] text-slate-400 group-hover/code:text-[#1E3A8A]">
                                {copiedCode === org.code ? 'done' : 'content_copy'}
                              </span>
                              <span>{org.code}</span>
                            </button>

                            {isCurrentOrg && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
                                Current Context
                              </span>
                            )}
                          </div>

                          {org.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Verified Node</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span>Pending Node</span>
                            </span>
                          )}
                        </div>

                        {/* Org Title & Domain Badge */}
                        <div className="space-y-1.5">
                          <h3 className="font-black text-base text-[#0F172A] leading-snug group-hover:text-blue-900 transition">
                            {org.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap text-[11px]">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border ${catBadge.bg}`}>
                              <span className="material-symbols-outlined text-[13px]">{catBadge.icon}</span>
                              <span>{org.categoryName || 'General Agency'}</span>
                            </span>
                            <span className="text-[#64748B] flex items-center gap-1 font-medium">
                              <span className="material-symbols-outlined text-[13px] text-slate-400">location_on</span>
                              <span>{org.regionName || 'National Sovereign'}</span>
                              {org.stateCode && (
                                <span className="font-mono text-[10px] text-[#94A3B8]">({org.stateCode})</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Key Telemetry Grid */}
                        <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-[#f8fafc] border border-[#E2E8F0] text-center text-xs">
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Officers</div>
                            <div className="font-black text-sm text-[#0F172A] font-mono">{org.usersCount || 0}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Depts</div>
                            <div className="font-black text-sm text-[#0F172A] font-mono">{org.departmentsCount || 0}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Vault</div>
                            <div className="font-black text-sm text-purple-700 font-mono">{org.documentsCount || 0}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Exchanges</div>
                            <div className="font-black text-sm text-blue-700 font-mono">
                              {(org.inboundRequestsCount || 0) + (org.outboundRequestsCount || 0)}
                            </div>
                          </div>
                        </div>

                        {/* Designated Nodal Officer Cardlet */}
                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                              {(org.nodalOfficerName || 'Nodal')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#0F172A] truncate">
                                {org.nodalOfficerName || 'Designated Registrar'}
                              </div>
                              <div className="text-[10px] text-[#64748B] font-mono truncate">
                                {org.nodalOfficerEmail || 'nodal@agency.gov.in'}
                              </div>
                            </div>
                          </div>
                          {org.nodalOfficerPhone && (
                            <span className="text-[10px] text-[#94A3B8] font-mono shrink-0">
                              {org.nodalOfficerPhone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-3 border-t border-[#E2E8F0] flex items-center gap-2">
                        <button
                          onClick={() => setQuickViewOrg(org)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Quick Summary Dossier"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Summary</span>
                        </button>
                        <button
                          onClick={() => handleSelectOrgToInspect(org.id)}
                          className="flex-1 py-2 rounded-xl bg-[#0F172A] hover:bg-blue-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm hover:shadow-md"
                        >
                          <span className="material-symbols-outlined text-[16px]">tune</span>
                          <span>Inspect &amp; Manage</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW MODE 2: DETAILED HORIZONTAL LIST CARDS */}
          {/* ========================================================================= */}
          {viewMode === 'list' && (
            <div className="space-y-3.5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-28" />
                ))
              ) : filteredOrgs.length === 0 ? (
                <div className="bg-white rounded-[24px] p-12 text-center border border-[#D8DEEA]">
                  <p className="text-xs text-[#64748B]">No organizations matched your filters.</p>
                </div>
              ) : (
                filteredOrgs.map((org) => {
                  const isCurrentOrg = currentOrg?.id === org.id || currentOrg?.code === org.code;
                  const catBadge = getCategoryBadgeConfig(org.categoryName);

                  return (
                    <div
                      key={org.id}
                      className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                        isCurrentOrg
                          ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/10'
                          : 'border-[#D8DEEA]/90 hover:border-slate-400'
                      }`}
                    >
                      {/* Left: Emblem & Details */}
                      <div className="flex items-start gap-4 min-w-0 max-w-xl">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${catBadge.bg} shadow-2xs`}>
                          <span className="material-symbols-outlined text-[24px]">{catBadge.icon}</span>
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={(e) => handleCopyCode(org.code, e)}
                              className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#f0f3ff] text-[#1E3A8A] border border-[#CBD5E1] flex items-center gap-1 hover:bg-blue-100 cursor-pointer"
                              title="Copy code"
                            >
                              <span>{org.code}</span>
                              <span className="material-symbols-outlined text-[11px]">content_copy</span>
                            </button>
                            <h3 className="font-bold text-sm text-[#0F172A] truncate">{org.name}</h3>
                            {isCurrentOrg && (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-600 text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#64748B]">
                            <span className="font-semibold">{org.categoryName || 'General'}</span>
                            <span>&bull;</span>
                            <span>{org.regionName || 'National'}</span>
                            {org.stateCode && <span className="font-mono text-[10px]">({org.stateCode})</span>}
                            <span>&bull;</span>
                            <span>Nodal: <b className="text-[#0F172A]">{org.nodalOfficerName || 'Not Set'}</b></span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Telemetry Chips */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                          <div className="text-[9px] font-bold text-[#64748B] uppercase">Officers</div>
                          <div className="font-black text-xs text-[#0F172A] font-mono">{org.usersCount || 0}</div>
                        </div>

                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                          <div className="text-[9px] font-bold text-[#64748B] uppercase">Depts</div>
                          <div className="font-black text-xs text-[#0F172A] font-mono">{org.departmentsCount || 0}</div>
                        </div>

                        <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
                          <div className="text-[9px] font-bold text-purple-700 uppercase">Vault</div>
                          <div className="font-black text-xs text-purple-900 font-mono">{org.documentsCount || 0}</div>
                        </div>

                        <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                          <div className="text-[9px] font-bold text-blue-700 uppercase">In / Out</div>
                          <div className="font-black text-xs text-blue-900 font-mono">
                            {org.inboundRequestsCount || 0} / {org.outboundRequestsCount || 0}
                          </div>
                        </div>

                        {org.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setQuickViewOrg(org)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-bold transition cursor-pointer"
                        >
                          Quick View
                        </button>
                        <button
                          onClick={() => handleSelectOrgToInspect(org.id)}
                          className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[15px]">tune</span>
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW MODE 3: DENSE DATA AUDIT TABLE */}
          {/* ========================================================================= */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-[#D8DEEA]/90 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider border-b border-[#D8DEEA]">
                    <tr>
                      <th className="py-3.5 px-4">Org Code</th>
                      <th className="py-3.5 px-4">Government Agency &amp; Nodal Authority</th>
                      <th className="py-3.5 px-3">Domain Category</th>
                      <th className="py-3.5 px-3">Jurisdiction</th>
                      <th className="py-3.5 px-2 text-center">Officers</th>
                      <th className="py-3.5 px-2 text-center">Depts</th>
                      <th className="py-3.5 px-2 text-center">Vault</th>
                      <th className="py-3.5 px-3 text-center">Exchanges</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-[#64748B]">
                          <span className="material-symbols-outlined text-[28px] animate-spin text-blue-600 block mb-2">
                            sync
                          </span>
                          Loading sovereign fleet directory...
                        </td>
                      </tr>
                    ) : filteredOrgs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-[#64748B]">
                          No organizations matched your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredOrgs.map((org) => {
                        const isCurrentOrg = currentOrg?.id === org.id || currentOrg?.code === org.code;
                        const catBadge = getCategoryBadgeConfig(org.categoryName);

                        return (
                          <tr
                            key={org.id}
                            className={`hover:bg-slate-50 transition ${
                              isCurrentOrg ? 'bg-blue-50/20 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => handleCopyCode(org.code, e)}
                                  className="font-mono font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 group/code cursor-pointer"
                                  title="Copy Org Code"
                                >
                                  <span>{org.code}</span>
                                  <span className="material-symbols-outlined text-[12px] opacity-0 group-hover/code:opacity-100 transition">
                                    content_copy
                                  </span>
                                </button>
                                {isCurrentOrg && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-sans font-bold bg-blue-600 text-white">
                                    Active
                                  </span>
                                )}
                              </div>
                              {org.agencyCode && (
                                <div className="text-[10px] text-[#94A3B8] font-mono">{org.agencyCode}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#0F172A]">{org.name}</div>
                              <div className="text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-[13px] text-slate-400">person</span>
                                <span>Nodal: {org.nodalOfficerName || 'Registrar General'}</span>
                                {org.nodalOfficerEmail && (
                                  <span className="text-[#94A3B8]">({org.nodalOfficerEmail})</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadge.bg}`}>
                                <span className="material-symbols-outlined text-[12px]">{catBadge.icon}</span>
                                <span>{org.categoryName || 'General'}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-3 whitespace-nowrap text-[#475569] text-[11px]">
                              <div className="font-semibold">{org.regionName || 'National'}</div>
                              {org.stateCode && (
                                <div className="text-[10px] font-mono text-[#94A3B8]">{org.stateCode}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-2 text-center font-bold font-mono text-[#0F172A]">
                              {org.usersCount || 0}
                            </td>

                            <td className="py-3.5 px-2 text-center font-bold font-mono text-[#0F172A]">
                              {org.departmentsCount || 0}
                            </td>

                            <td className="py-3.5 px-2 text-center font-bold font-mono text-purple-700">
                              {org.documentsCount || 0}
                            </td>

                            <td className="py-3.5 px-3 text-center whitespace-nowrap text-[11px]">
                              <span className="text-emerald-700 font-bold font-mono">{org.inboundRequestsCount || 0} In</span>
                              <span className="text-[#94A3B8] mx-1">/</span>
                              <span className="text-blue-700 font-bold font-mono">{org.outboundRequestsCount || 0} Out</span>
                            </td>

                            <td className="py-3.5 px-3 whitespace-nowrap">
                              {org.isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setQuickViewOrg(org)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                  title="Quick View Summary"
                                >
                                  <span className="material-symbols-outlined text-[15px]">visibility</span>
                                </button>
                                <button
                                  onClick={() => handleSelectOrgToInspect(org.id)}
                                  className="px-3 py-1 rounded-lg bg-[#0F172A] hover:bg-blue-900 text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                  title="Inspect & Configure Dossier"
                                >
                                  <span className="material-symbols-outlined text-[13px]">tune</span>
                                  <span>Inspect</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ORGANIZATION DEEP-DIVE INSPECTOR & CONFIGURATION */}
      {/* ========================================================================= */}
      {activeMainTab === 'inspector' && (
        <div className="space-y-6">
          {/* Org Switcher / Selection Header */}
          <div className="bg-white rounded-[26px] p-6 border border-[#D8DEEA]/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-blue-800 border border-blue-300/40 flex items-center justify-center font-mono font-black text-lg shrink-0 shadow-inner">
                {orgDetails?.organization?.code?.substring(0, 3) || 'ORG'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black text-[#0F172A]">
                    {orgDetails?.organization?.name || 'Select Sovereign Organization'}
                  </h2>
                  {orgDetails?.organization?.isVerified && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Verified Sovereign Node</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] font-mono">
                  Org Code: <b className="text-blue-700 font-bold">{orgDetails?.organization?.code}</b> &bull; Nodal Officer: <b>{orgDetails?.organization?.nodalOfficerName || 'Not Set'}</b> ({orgDetails?.organization?.nodalOfficerEmail || 'No Email'})
                </p>
              </div>
            </div>

            {/* Quick Org Selector Dropdown */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-[#64748B]">Switch Entity:</span>
              <select
                value={selectedOrgId || ''}
                onChange={(e) => handleSelectOrgToInspect(e.target.value)}
                className="h-10 px-4 rounded-xl bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#0F172A] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inspector Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-2xl w-fit border border-[#D8DEEA]/80 flex-wrap">
            {[
              { id: 'profile', label: 'Org Profile & Nodal', icon: 'badge' },
              { id: 'departments', label: `Departments (${orgDetails?.departments?.length || 0})`, icon: 'corporate_fare' },
              { id: 'users', label: `Officers & Clearance (${orgDetails?.users?.length || 0})`, icon: 'manage_accounts' },
              { id: 'vault', label: `Document Vault (${orgDetails?.documents?.length || 0})`, icon: 'folder' },
              { id: 'exchanges', label: `Exchanges & Audits (${(orgDetails?.inboundRequests?.length || 0) + (orgDetails?.outboundRequests?.length || 0) + (orgDetails?.auditLogs?.length || 0)})`, icon: 'sync_alt' },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setInspectorTab(sub.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  inspectorTab === sub.id
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-white/80'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{sub.icon}</span>
                <span>{sub.label}</span>
              </button>
            ))}
          </div>

          {/* Loading Indicator */}
          {orgDetailsLoading && (
            <div className="p-12 text-center text-[#64748B] bg-white rounded-2xl border border-slate-200">
              <span className="material-symbols-outlined text-[32px] animate-spin text-blue-600 block mb-2">
                sync
              </span>
              <span className="font-semibold text-xs">Retrieving complete sovereign organization dossier...</span>
            </div>
          )}

          {/* INSPECTOR SUB-TAB 1: ORG PROFILE & NODAL */}
          {!orgDetailsLoading && inspectorTab === 'profile' && orgDetails && (
            <form onSubmit={handleSaveOrgProfile} className="bg-white rounded-[26px] p-7 border border-[#D8DEEA]/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D8DEEA]/60">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-blue-700 text-[22px]">edit_square</span>
                  <h3 className="font-black text-base text-[#0F172A]">Organization Profile &amp; Federation Credentials</h3>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Changes</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#334155] mb-1.5">Government Body / Organization Name *</label>
                  <input
                    type="text"
                    value={editOrgForm.name}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                    required
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Organization Code *</label>
                  <input
                    type="text"
                    value={editOrgForm.code}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, code: e.target.value })}
                    required
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl font-mono text-xs text-[#0F172A] font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Agency Code</label>
                  <input
                    type="text"
                    value={editOrgForm.agencyCode}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, agencyCode: e.target.value })}
                    placeholder="e.g. JUD-HC-01"
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl font-mono text-xs text-[#0F172A] font-bold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Government Tier</label>
                  <select
                    value={editOrgForm.tierId}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, tierId: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold outline-none focus:bg-white"
                  >
                    <option value="">-- Select Tier --</option>
                    {taxonomies.tiers.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Domain Category</label>
                  <select
                    value={editOrgForm.domainCategoryId}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, domainCategoryId: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold outline-none focus:bg-white"
                  >
                    <option value="">-- Select Category --</option>
                    {taxonomies.categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Jurisdiction Region / State</label>
                  <select
                    value={editOrgForm.jurisdictionRegionId}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, jurisdictionRegionId: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold outline-none focus:bg-white"
                  >
                    <option value="">-- Select Region --</option>
                    {taxonomies.regions.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.state_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Operational Status</label>
                  <select
                    value={editOrgForm.status}
                    onChange={(e) => setEditOrgForm({ ...editOrgForm, status: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold outline-none focus:bg-white"
                  >
                    <option value="ACTIVE">ACTIVE - Operational</option>
                    <option value="SUSPENDED">SUSPENDED - Restricted</option>
                    <option value="DISABLED">DISABLED - Inactive</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2.5 font-bold text-[#0F172A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editOrgForm.isVerified}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, isVerified: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Verified Sovereign Node</span>
                  </label>
                </div>
              </div>

              {/* Nodal Officer Section */}
              <div className="pt-5 border-t border-[#D8DEEA]/60 space-y-4">
                <h4 className="font-bold text-xs text-[#64748B] uppercase tracking-wider">
                  Designated Nodal Officer (Legal &amp; Requisition Authority)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#334155] mb-1.5">Officer Name</label>
                    <input
                      type="text"
                      value={editOrgForm.nodalOfficerName}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, nodalOfficerName: e.target.value })}
                      placeholder="e.g. Registrar General"
                      className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#334155] mb-1.5">Officer Official Email</label>
                    <input
                      type="email"
                      value={editOrgForm.nodalOfficerEmail}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, nodalOfficerEmail: e.target.value })}
                      placeholder="e.g. registrar@mumbai.gov.in"
                      className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#334155] mb-1.5">Officer Phone</label>
                    <input
                      type="text"
                      value={editOrgForm.nodalOfficerPhone}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, nodalOfficerPhone: e.target.value })}
                      placeholder="+91-22-22670000"
                      className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* INSPECTOR SUB-TAB 2: DEPARTMENTS & WINGS */}
          {!orgDetailsLoading && inspectorTab === 'departments' && orgDetails && (
            <div className="space-y-4">
              <div className="bg-white rounded-[22px] p-5 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Departments &amp; Branches</h3>
                  <p className="text-xs text-[#64748B]">
                    Active wings configured under {orgDetails.organization?.name}
                  </p>
                </div>

                <button
                  onClick={() => setDeptModalOpen(true)}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Department</span>
                </button>
              </div>

              <div className="bg-white rounded-[22px] shadow-[0_2px_8px_rgba(15,23,42,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider border-b border-[#D8DEEA]">
                    <tr>
                      <th className="py-3 px-4">Department Code</th>
                      <th className="py-3 px-4">Department Name</th>
                      <th className="py-3 px-3">Parent Wing</th>
                      <th className="py-3 px-3 text-center">Members</th>
                      <th className="py-3 px-3 text-center">Vault Docs</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {orgDetails.departments?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#64748B]">
                          No departments found for this organization.
                        </td>
                      </tr>
                    ) : (
                      orgDetails.departments.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{d.code}</td>
                          <td className="py-3 px-4 font-bold text-[#0F172A]">{d.name}</td>
                          <td className="py-3 px-3 text-[#64748B]">{d.parentDepartmentName || 'Root Wing'}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold">{d.memberCount || 0}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold">{d.documentCount || 0}</td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INSPECTOR SUB-TAB 3: USERS & CLEARANCE */}
          {!orgDetailsLoading && inspectorTab === 'users' && orgDetails && (
            <div className="space-y-4">
              <div className="bg-white rounded-[22px] p-5 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Officers &amp; Security Clearance Registry</h3>
                  <p className="text-xs text-[#64748B]">
                    Registered personnel, designations, and max clearance ranks for {orgDetails.organization?.name}
                  </p>
                </div>

                <button
                  onClick={() => setUserModalOpen(true)}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>Enroll Officer</span>
                </button>
              </div>

              <div className="bg-white rounded-[22px] shadow-[0_2px_8px_rgba(15,23,42,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider border-b border-[#D8DEEA]">
                    <tr>
                      <th className="py-3 px-4">Officer Details</th>
                      <th className="py-3 px-3">Designation &amp; Department</th>
                      <th className="py-3 px-3">Clearance Tier</th>
                      <th className="py-3 px-3">Roles</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {orgDetails.users?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#64748B]">
                          No officers registered under this organization.
                        </td>
                      </tr>
                    ) : (
                      (orgDetails.users?.slice((usersPage - 1) * PAGE_SIZE, usersPage * PAGE_SIZE) || []).map((u: any) => {
                        const initials = (u.fullName || 'U')
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="relative w-8 h-8 rounded-full shrink-0">
                                  {u.avatarUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={u.avatarUrl}
                                      alt={u.fullName}
                                      className="w-8 h-8 rounded-full object-cover border border-[#D8DEEA] shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
                                      {initials}
                                    </div>
                                  )}
                                  {u.avatarUrl && (
                                    <span
                                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                                      title="AI Face Biometrics Enrolled"
                                    >
                                      <span className="material-symbols-outlined text-[8px] font-bold">check</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="font-bold text-[#0F172A] truncate">{u.fullName}</div>
                                  <div className="text-[11px] text-[#64748B] font-mono truncate">{u.email}</div>
                                  {u.employeeCode && (
                                    <div className="text-[10px] font-mono text-[#94A3B8]">ID: {u.employeeCode}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-bold text-[#0F172A]">{u.designation || 'Staff'}</div>
                              <div className="text-[11px] text-[#64748B]">{u.departmentName || 'General Wing'}</div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                  u.maxSecurityLevel >= 5
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : u.maxSecurityLevel >= 4
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}
                              >
                                T{u.maxSecurityLevel || 3} Clearance
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {u.roles?.map((r: any) => (
                                  <span
                                    key={r.id}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#f0f3ff] text-blue-800 border border-[#D8DEEA]"
                                  >
                                    {r.code}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <TablePagination
                  currentPage={usersPage}
                  totalItems={orgDetails.users?.length || 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setUsersPage}
                  label="officers"
                />
              </div>
            </div>
          )}

          {/* INSPECTOR SUB-TAB 4: DOCUMENT VAULT */}
          {!orgDetailsLoading && inspectorTab === 'vault' && orgDetails && (
            <div className="space-y-4">
              <div className="bg-white rounded-[22px] p-5 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-[#0F172A]">Local Vault Documents</h3>
                  <p className="text-xs text-[#64748B]">
                    Encrypted evidentiary dockets stored in {orgDetails.organization?.name}&apos;s local repository
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-[22px] shadow-[0_2px_8px_rgba(15,23,42,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider border-b border-[#D8DEEA]">
                    <tr>
                      <th className="py-3 px-4">Docket #</th>
                      <th className="py-3 px-4">Title &amp; Classification</th>
                      <th className="py-3 px-3">Security Tier</th>
                      <th className="py-3 px-3">Department &amp; Officer</th>
                      <th className="py-3 px-3">SHA-256 Hash</th>
                      <th className="py-3 px-4">Ingested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                    {orgDetails.documents?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#64748B]">
                          No documents stored in this organization&apos;s vault yet.
                        </td>
                      </tr>
                    ) : (
                      (orgDetails.documents?.slice((vaultPage - 1) * PAGE_SIZE, vaultPage * PAGE_SIZE) || []).map((doc: any) => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{doc.documentNumber}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0F172A]">{doc.title}</div>
                            <div className="text-[11px] text-[#64748B]">{doc.documentTypeName || 'General'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f3ff] text-blue-800 border border-[#D8DEEA]">
                              {doc.securityTier || 'T1'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#0F172A]">{doc.ownerName}</div>
                            <div className="text-[10px] text-[#64748B]">{doc.departmentName}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-[#94A3B8]">
                            {doc.sha256Hash ? `${doc.sha256Hash.substring(0, 12)}...` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-[#64748B] text-[11px]">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <TablePagination
                  currentPage={vaultPage}
                  totalItems={orgDetails.documents?.length || 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setVaultPage}
                  label="documents"
                />
              </div>
            </div>
          )}

          {/* INSPECTOR SUB-TAB 5: INTER-ORG EXCHANGES & AUDITS */}
          {!orgDetailsLoading && inspectorTab === 'exchanges' && orgDetails && (
            <div className="space-y-6">
              {/* Inbound Requisitions */}
              <div className="bg-white rounded-[24px] p-6 border border-[#D8DEEA]/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">call_received</span>
                  <span>Inbound Requisitions Received (Demands from other bodies)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Requisition #</th>
                        <th className="py-2.5 px-3">Requesting Government Body</th>
                        <th className="py-2.5 px-3">Document Demanded</th>
                        <th className="py-2.5 px-3">Urgency</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {orgDetails.inboundRequests?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#64748B]">
                            No inbound requisitions received by this organization.
                          </td>
                        </tr>
                      ) : (
                        (orgDetails.inboundRequests?.slice((inboundPage - 1) * PAGE_SIZE, inboundPage * PAGE_SIZE) || []).map((r: any, idx: number) => (
                          <tr key={`org-inbound-${r.id}-${idx}`} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.requestNumber}</td>
                            <td className="py-2.5 px-3 font-bold">{r.requestingOrgName} ({r.requestingOrgCode})</td>
                            <td className="py-2.5 px-3">{r.targetDocumentTitle || r.targetDocumentNumber}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>{r.urgency}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={inboundPage}
                  totalItems={orgDetails.inboundRequests?.length || 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setInboundPage}
                  label="inbound requisitions"
                />
              </div>

              {/* Outbound Requisitions */}
              <div className="bg-white rounded-[24px] p-6 border border-[#D8DEEA]/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-700 text-[20px]">call_made</span>
                  <span>Outbound Requisitions Sent (Filed by this body)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Requisition #</th>
                        <th className="py-2.5 px-3">Target Government Body</th>
                        <th className="py-2.5 px-3">Document Requested</th>
                        <th className="py-2.5 px-3">Urgency</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {orgDetails.outboundRequests?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#64748B]">
                            No outbound requisitions filed by this organization.
                          </td>
                        </tr>
                      ) : (
                        (orgDetails.outboundRequests?.slice((outboundPage - 1) * PAGE_SIZE, outboundPage * PAGE_SIZE) || []).map((r: any, idx: number) => (
                          <tr key={`org-outbound-${r.id}-${idx}`} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.requestNumber}</td>
                            <td className="py-2.5 px-3 font-bold">{r.targetOrgName} ({r.targetOrgCode})</td>
                            <td className="py-2.5 px-3">{r.targetDocumentTitle || r.targetDocumentNumber}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>{r.urgency}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={outboundPage}
                  totalItems={orgDetails.outboundRequests?.length || 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setOutboundPage}
                  label="outbound requisitions"
                />
              </div>

              {/* Institutional Administrative Audit Trail */}
              <div className="bg-white rounded-[24px] p-6 border border-[#D8DEEA]/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-700 text-[20px]">verified_user</span>
                    <span>Institutional Administrative &amp; Security Audit Trail</span>
                  </h3>
                  <span className="text-[11px] font-mono text-[#64748B] font-bold">
                    {orgDetails.auditLogs?.length || 0} Cryptographic Events
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] text-[#64748B] text-[10px] font-black uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor</th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th className="py-2.5 px-3">Resource</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3">Event Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {(!orgDetails.auditLogs || orgDetails.auditLogs.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-[#64748B]">
                            No administrative audit events recorded for this organization yet.
                          </td>
                        </tr>
                      ) : (
                        (orgDetails.auditLogs?.slice((auditLogPage - 1) * PAGE_SIZE, auditLogPage * PAGE_SIZE) || []).map((log: any, idx: number) => (
                          <tr key={`org-audit-${log.id || idx}`} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-[#64748B] whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#0F172A]">
                              <div>{log.actorName || 'System Administrator'}</div>
                              {log.actorDesignation && (
                                <div className="text-[10px] font-normal text-[#64748B]">{log.actorDesignation}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                              {log.eventType}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#475569]">
                              {log.resourceType || 'ORGANIZATION'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                log.result === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {log.result}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-[#94A3B8]">
                              {log.eventHash ? `${log.eventHash.substring(0, 14)}...` : 'SHA-256 Valid'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={auditLogPage}
                  totalItems={orgDetails.auditLogs?.length || 0}
                  pageSize={PAGE_SIZE}
                  onPageChange={setAuditLogPage}
                  label="audit events"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DYNAMIC TAXONOMIES & SLAS */}
      {/* ========================================================================= */}
      {activeMainTab === 'taxonomies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Statutory Grounds Templates */}
          <div className="bg-white rounded-[26px] p-6 lg:p-7 border border-[#D8DEEA]/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-blue-700 text-[22px]">gavel</span>
                <h3 className="font-black text-base text-[#0F172A]">Statutory Grounds &amp; Legal Templates</h3>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] text-xs">
              {taxonomies.statutoryTemplates.map((st: any) => (
                <div key={st.id} className="py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-[#0F172A] font-bold text-sm">{st.title}</strong>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f0f3ff] text-blue-800 border border-[#D8DEEA]">
                      {st.section_citation}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-semibold">{st.legal_act_name}</p>
                  <p className="text-[11px] text-[#334155] italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    &quot;{st.default_purpose_text}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Urgency SLAs */}
          <div className="bg-white rounded-[26px] p-6 lg:p-7 border border-[#D8DEEA]/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[22px]">timer</span>
                <h3 className="font-black text-base text-[#0F172A]">Dynamic Priority &amp; SLA Tiers</h3>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] text-xs">
              {taxonomies.priorityTiers.map((pt: any) => (
                <div key={pt.id} className="py-4 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-[#0F172A] font-bold text-sm block">{pt.name}</strong>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{pt.description}</p>
                  </div>
                  <span
                    className="px-3.5 py-1 rounded-full text-xs font-black font-mono shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: pt.badge_color ? `${pt.badge_color}18` : '#3b82f618',
                      color: pt.badge_color || '#3b82f6',
                      border: `1px solid ${pt.badge_color ? `${pt.badge_color}40` : '#3b82f640'}`,
                    }}
                  >
                    {pt.sla_hours}h SLA
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: QUICK VIEW SUMMARY MODAL */}
      {/* ========================================================================= */}
      {quickViewOrg && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-[28px] shadow-2xl p-6 lg:p-8 flex flex-col gap-5 border border-slate-200">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-mono font-bold text-base shrink-0 shadow-sm">
                  {quickViewOrg.code.substring(0, 3)}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0F172A]">{quickViewOrg.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-md border border-blue-200">
                      {quickViewOrg.code}
                    </span>
                    <span className="text-xs text-[#64748B]">{quickViewOrg.regionName || 'National'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQuickViewOrg(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase">Officers</div>
                <div className="text-base font-black text-[#0F172A] font-mono mt-0.5">{quickViewOrg.usersCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase">Depts</div>
                <div className="text-base font-black text-[#0F172A] font-mono mt-0.5">{quickViewOrg.departmentsCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-purple-700 uppercase">Vault Docs</div>
                <div className="text-base font-black text-purple-900 font-mono mt-0.5">{quickViewOrg.documentsCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-700 uppercase">Requisitions</div>
                <div className="text-base font-black text-blue-900 font-mono mt-0.5">
                  {(quickViewOrg.inboundRequestsCount || 0) + (quickViewOrg.outboundRequestsCount || 0)}
                </div>
              </div>
            </div>

            {/* Nodal Officer & Features */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                <div className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-700">badge</span>
                  <span>Designated Legal &amp; Nodal Authority</span>
                </div>
                <div className="text-[#334155] font-semibold pl-5">
                  {quickViewOrg.nodalOfficerName || 'Not Appointed'} &bull; {quickViewOrg.nodalOfficerEmail || 'No Email'}
                </div>
                {quickViewOrg.nodalOfficerPhone && (
                  <div className="text-[#64748B] font-mono text-[11px] pl-5">
                    Tel: {quickViewOrg.nodalOfficerPhone}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">shield_lock</span>
                  <span>Cryptographic Enclave &amp; Compliance</span>
                </div>
                <div className="text-[#475569] text-[11px] leading-relaxed pl-5">
                  Secured with AES-256 Envelope KMS Encryption, WORM Immutable Ledger storage, and Section 65B Electronic Evidence generation compliance.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setQuickViewOrg(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const orgId = quickViewOrg.id;
                  setQuickViewOrg(null);
                  handleSelectOrgToInspect(orgId);
                }}
                className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition"
              >
                <span className="material-symbols-outlined text-[16px]">tune</span>
                <span>Open Full Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD DEPARTMENT */}
      {/* ========================================================================= */}
      {deptModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl p-6 flex flex-col gap-4 border border-[#D8DEEA]">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">corporate_fare</span>
                <h3 className="text-sm font-black text-[#0F172A]">Add New Department</h3>
              </div>
              <button onClick={() => setDeptModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#334155] mb-1.5">Department Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cyber Forensics Wing"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  required
                  className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1.5">Department Code *</label>
                <input
                  type="text"
                  placeholder="e.g. CYBER-FOR"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  required
                  className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl font-mono uppercase text-xs text-[#0F172A] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8DEEA]/60">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8DEEA] text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold shadow-xs"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ENROLL OFFICER */}
      {/* ========================================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl p-6 flex flex-col gap-4 border border-[#D8DEEA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">person_add</span>
                <h3 className="text-sm font-black text-[#0F172A]">Enroll Officer into Organization</h3>
              </div>
              <button onClick={() => setUserModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEnrollUser} className="space-y-4 text-xs">
              <UserPhotoUpload
                value={userForm.avatarUrl}
                onChange={(photo) => setUserForm({ ...userForm, avatarUrl: photo })}
                name={userForm.fullName}
                label="Officer Photo & Face Biometrics"
                helperText="Upload official portrait for identification and automated biometric audit."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patil"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Official Email *</label>
                  <input
                    type="email"
                    placeholder="r.patil@mumbai.gov.in"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Employee / Service Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-BOM-042"
                    value={userForm.employeeCode}
                    onChange={(e) => setUserForm({ ...userForm, employeeCode: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl font-mono uppercase text-xs text-[#0F172A] font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Registrar"
                    value={userForm.designation}
                    onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                    className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Department</label>
                  <select
                    value={userForm.departmentId}
                    onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                    className="w-full h-10 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold outline-none focus:bg-white"
                  >
                    <option value="">-- Unassigned / General --</option>
                    {orgDetails?.departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#334155] mb-1.5">Max Security Clearance</label>
                  <select
                    value={userForm.maxSecurityLevel}
                    onChange={(e) => setUserForm({ ...userForm, maxSecurityLevel: Number(e.target.value) })}
                    className="w-full h-10 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-black outline-none focus:bg-white font-mono"
                  >
                    <option value={1}>T1 - Public Document Access</option>
                    <option value={2}>T2 - Internal Institutional</option>
                    <option value={3}>T3 - Confidential Regulatory</option>
                    <option value={4}>T4 - Secret Enforcement</option>
                    <option value={5}>T5 - Top Secret Sovereign</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#334155] mb-1.5">Temporary Password *</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                  className="w-full h-10 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-xl text-xs text-[#0F172A] font-semibold focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8DEEA]/60">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8DEEA] text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold shadow-xs"
                >
                  Enroll Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PROVISION SOVEREIGN ENTITY (WIZARD) */}
      {/* ========================================================================= */}
      <ServiceSetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        onSuccess={(result) => {
          setSetupModalOpen(false);
          fetchFleetData();
          showToast(`Organization "${result.organization.name}" provisioned successfully!`);
        }}
      />
    </div>
  );
}
