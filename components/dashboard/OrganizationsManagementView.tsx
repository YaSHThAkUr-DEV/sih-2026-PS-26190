'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    <div className="px-4 py-3 border-t border-[#D8DEEA]/60 bg-white flex items-center justify-between flex-wrap gap-2 text-xs">
      <span className="text-[#6B7280] text-[11px]">
        Showing <b className="text-[#10141A]">{startIdx}–{endIdx}</b> of <b className="text-[#10141A]">{totalItems}</b> {label}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[11px] font-medium transition"
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((pageNum, idx, arr) => {
            const prev = arr[idx - 1];
            const hasGap = prev && pageNum - prev > 1;
            return (
              <React.Fragment key={pageNum}>
                {hasGap && <span className="px-1 text-[#9CA3AF] text-xs">...</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-full text-[11px] font-semibold cursor-pointer transition ${
                    currentPage === pageNum
                      ? 'bg-[#000000] text-white shadow-2xs'
                      : 'bg-white hover:bg-[#f0f3ff] text-[#151c27] border border-[#D8DEEA]'
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
          className="px-3 py-1 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-[11px] font-medium transition"
        >
          Next
        </button>
      </div>
    </div>
  );
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

  // Quick view summary modal
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

  // Export Fleet Directory manifest as JSON
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
      <div className="w-full max-w-4xl mx-auto mt-8 bg-white/90 backdrop-blur-xl rounded-[26px] p-8 lg:p-12 shadow-[0_8px_32px_rgba(16,20,26,0.06)] border border-red-200/80 text-center space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-xs">
          <span className="material-symbols-outlined text-[30px]">lock</span>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-[#151c27]">Sovereign Fleet Governance — Restricted</h2>
          <p className="text-xs text-[#6B7280] max-w-lg mx-auto leading-relaxed">
            The Organizations Management module is strictly reserved for <strong>Apex System Super Administrators</strong>.
            Local Organization Administrators are restricted from managing other sovereign agencies and federation nodes.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => onNavigateTab?.('overview')}
            className="px-5 py-2 rounded-full bg-[#151c27] hover:bg-black text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            Return to Overview Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Toast Feedback */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold shadow-2xl border transition-all ${
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

      {/* Main Container Card (Unified Glassmorphic Light Theme) */}
      <div className="bg-white/85 backdrop-blur-xl rounded-[26px] p-6 lg:p-8 shadow-[0_8px_32px_rgba(16,20,26,0.06)] border border-[#D8DEEA]/80 space-y-6">
        
        {/* Header Ribbon */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined text-[#3f5e93] text-[24px]">corporate_fare</span>
              <h1 className="text-xl lg:text-2xl font-bold text-[#10141A] tracking-tight">
                Organization Management &amp; Fleet Governance
              </h1>
              <span className="rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30">
                Sovereign Federation Grid
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Unified control plane to provision, inspect, configure security policies, and test sovereign government bodies across India.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportFleet}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] text-xs font-semibold border border-[#D8DEEA] flex items-center gap-1.5 transition cursor-pointer"
              title="Export Fleet Directory as JSON"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export Manifest</span>
            </button>

            <button
              onClick={fetchFleetData}
              disabled={loading}
              className="w-9 h-9 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] flex items-center justify-center transition cursor-pointer"
              title="Refresh Fleet Telemetry"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Fleet KPI Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Agencies</span>
            <div className="text-xl font-bold text-[#10141A] mt-1">
              {fleetSummary.totalOrganizations || organizations.length}
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Verified Nodes</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {fleetSummary.verifiedNodes || 0}
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Active Officers</span>
            <div className="text-xl font-bold text-[#3f5e93] mt-1">
              {fleetSummary.totalActiveUsers || 0}
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Vault Docs</span>
            <div className="text-xl font-bold text-purple-700 mt-1">
              {fleetSummary.totalDocumentsInVaults || 0}
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Requisitions</span>
            <div className="text-xl font-bold text-amber-700 mt-1">
              {fleetSummary.totalInterOrgRequisitions || 0}
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-3.5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Active Shares</span>
            <div className="text-xl font-bold text-indigo-700 mt-1">
              {fleetSummary.activeInterOrgShares || 0}
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Theme Pills) */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-full w-fit border border-[#D8DEEA]/80 flex-wrap">
            <button
              onClick={() => setActiveMainTab('fleet')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeMainTab === 'fleet'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">list_alt</span>
              <span>Organizations Fleet ({organizations.length})</span>
            </button>

            <button
              onClick={() => {
                if (!selectedOrgId && organizations.length > 0) {
                  handleSelectOrgToInspect(organizations[0].id);
                } else {
                  setActiveMainTab('inspector');
                }
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeMainTab === 'inspector'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Organization Inspector &amp; Configuration</span>
              {selectedOrgId && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white font-mono">
                  {orgDetails?.organization?.code || 'ACTIVE'}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveMainTab('taxonomies')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                activeMainTab === 'taxonomies'
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">category</span>
              <span>Dynamic Taxonomies &amp; SLAs</span>
            </button>
          </div>

          {/* View Mode Toggle (When in Fleet Tab) */}
          {activeMainTab === 'fleet' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#6B7280]">Layout:</span>
              <div className="flex items-center bg-[#f0f3ff] p-0.5 rounded-full border border-[#D8DEEA]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white shadow-xs text-[#10141A] font-semibold' : 'text-[#6B7280]'
                  }`}
                  title="Card Grid View"
                >
                  <span className="material-symbols-outlined text-[15px]">grid_view</span>
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'list' ? 'bg-white shadow-xs text-[#10141A] font-semibold' : 'text-[#6B7280]'
                  }`}
                  title="Horizontal List View"
                >
                  <span className="material-symbols-outlined text-[15px]">view_agenda</span>
                  <span>List</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                    viewMode === 'table' ? 'bg-white shadow-xs text-[#10141A] font-semibold' : 'text-[#6B7280]'
                  }`}
                  title="Table View"
                >
                  <span className="material-symbols-outlined text-[15px]">table_rows</span>
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
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-[22px] p-4 border border-[#D8DEEA]/80 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex-1 max-w-md">
                  <UiverseSearchBar
                    placeholder="Search agency name, org code (e.g. MH-HC-BOM, DL-POL-NZ), nodal officer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                    compact
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Government Tier Filter */}
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="h-8 px-3 rounded-full bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#151c27] font-medium outline-none focus:bg-white"
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
                    className="h-8 px-3 rounded-full bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#151c27] font-medium outline-none focus:bg-white"
                  >
                    <option value="ALL">All Domain Categories</option>
                    {taxonomies.categories.map((c: any) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  {/* Node Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 px-3 rounded-full bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#151c27] font-medium outline-none focus:bg-white"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="VERIFIED">Verified Only</option>
                    <option value="PENDING">Pending Only</option>
                    <option value="ACTIVE">Active</option>
                  </select>

                  {/* Sort dropdown */}
                  <div className="flex items-center gap-1 bg-[#f0f3ff] p-0.5 rounded-full border border-[#D8DEEA]">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="h-7 px-2.5 bg-transparent text-xs text-[#151c27] font-medium outline-none cursor-pointer"
                    >
                      <option value="name">Sort: Name</option>
                      <option value="code">Sort: Code</option>
                      <option value="documents">Sort: Vault Docs</option>
                      <option value="officers">Sort: Officers</option>
                      <option value="activity">Sort: Exchanges</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-[#151c27] transition cursor-pointer"
                      title="Toggle Sort Order"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#D8DEEA]/50 text-xs">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mr-1">Quick:</span>
                {[
                  { id: 'ALL', label: 'All Agencies' },
                  { id: 'JUDICIAL', label: 'Judicial Courts', icon: 'gavel' },
                  { id: 'POLICE', label: 'Law Enforcement', icon: 'local_police' },
                  { id: 'SECRETARIAT', label: 'Secretariats', icon: 'assured_workload' },
                  { id: 'VERIFIED', label: 'Verified Nodes', icon: 'verified' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => setQuickChipFilter(chip.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                      quickChipFilter === chip.id
                        ? 'bg-[#000000] text-white shadow-2xs font-semibold'
                        : 'bg-[#f0f3ff] text-[#45474b] hover:bg-white border border-[#D8DEEA]'
                    }`}
                  >
                    {chip.icon && <span className="material-symbols-outlined text-[13px]">{chip.icon}</span>}
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
                    className="px-2 py-0.5 text-rose-600 hover:text-rose-700 font-semibold text-[11px] flex items-center gap-0.5 cursor-pointer ml-auto"
                  >
                    <span className="material-symbols-outlined text-[13px]">clear_all</span>
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* View Mode: Card Grid */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-[22px] p-5 border border-[#D8DEEA]/80 animate-pulse space-y-3">
                      <div className="h-5 bg-slate-200 rounded-md w-1/3" />
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-16 bg-slate-100 rounded-xl" />
                      <div className="h-8 bg-slate-200 rounded-full" />
                    </div>
                  ))
                ) : filteredOrgs.length === 0 ? (
                  <div className="col-span-full bg-white rounded-[22px] p-10 text-center border border-[#D8DEEA]/80 space-y-2">
                    <p className="text-xs text-[#6B7280]">No organizations matched your filters.</p>
                  </div>
                ) : (
                  filteredOrgs.map((org) => {
                    const isCurrentOrg = currentOrg?.id === org.id || currentOrg?.code === org.code;
                    return (
                      <div
                        key={org.id}
                        className={`bg-white rounded-[22px] p-5 border shadow-xs flex flex-col justify-between gap-4 transition hover:shadow-md ${
                          isCurrentOrg ? 'border-[#3f5e93] ring-1 ring-[#3f5e93]/30' : 'border-[#D8DEEA]/80'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <button
                                onClick={(e) => handleCopyCode(org.code, e)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f0f3ff] hover:bg-blue-100 text-[#3f5e93] border border-[#D8DEEA] flex items-center gap-1 cursor-pointer transition"
                                title="Click to copy Org Code"
                              >
                                <span>{org.code}</span>
                                <span className="material-symbols-outlined text-[11px] text-slate-400">
                                  {copiedCode === org.code ? 'done' : 'content_copy'}
                                </span>
                              </button>
                              <h3 className="font-bold text-sm text-[#10141A] mt-1.5 leading-snug">{org.name}</h3>
                            </div>
                            {org.isVerified ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 shrink-0">
                                Verified Node
                              </span>
                            ) : (
                              <span className="text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 shrink-0">
                                Pending Node
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#6B7280]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                {org.categoryIcon || 'category'}
                              </span>
                              <span>{org.categoryName || 'General'}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">location_on</span>
                              <span>{org.regionName || 'National'}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 p-2.5 rounded-xl bg-[#f0f3ff]/60 border border-[#D8DEEA]/60 text-center text-xs">
                            <div>
                              <div className="text-[10px] text-[#6B7280] font-semibold">Officers</div>
                              <div className="font-bold text-[#10141A] font-mono">{org.usersCount || 0}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#6B7280] font-semibold">Depts</div>
                              <div className="font-bold text-[#10141A] font-mono">{org.departmentsCount || 0}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#6B7280] font-semibold">Vault</div>
                              <div className="font-bold text-purple-700 font-mono">{org.documentsCount || 0}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-[#6B7280] font-semibold">Exchanges</div>
                              <div className="font-bold text-[#3f5e93] font-mono">
                                {(org.inboundRequestsCount || 0) + (org.outboundRequestsCount || 0)}
                              </div>
                            </div>
                          </div>

                          {/* Nodal Officer Snippet */}
                          <div className="text-[11px] text-[#6B7280] flex items-center justify-between gap-1 p-2 rounded-lg bg-[#f0f3ff]/40 border border-[#D8DEEA]/40">
                            <span className="truncate">Nodal: <b>{org.nodalOfficerName || 'Registrar'}</b></span>
                            {org.nodalOfficerEmail && (
                              <span className="text-[10px] font-mono text-[#9CA3AF] truncate max-w-[120px]">
                                {org.nodalOfficerEmail}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#D8DEEA]/50 flex items-center gap-2">
                          <button
                            onClick={() => setQuickViewOrg(org)}
                            className="px-3 py-1.5 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] text-xs font-semibold border border-[#D8DEEA] transition cursor-pointer"
                          >
                            Summary
                          </button>
                          <button
                            onClick={() => handleSelectOrgToInspect(org.id)}
                            className="flex-1 py-1.5 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[15px]">tune</span>
                            <span>Inspect &amp; Manage</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* View Mode: Horizontal List */}
            {viewMode === 'list' && (
              <div className="space-y-3">
                {filteredOrgs.map((org) => {
                  const isCurrentOrg = currentOrg?.id === org.id || currentOrg?.code === org.code;
                  return (
                    <div
                      key={org.id}
                      className={`bg-white rounded-[20px] p-4 border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:shadow-md ${
                        isCurrentOrg ? 'border-[#3f5e93] ring-1 ring-[#3f5e93]/30' : 'border-[#D8DEEA]/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 max-w-lg">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            {org.categoryIcon || 'corporate_fare'}
                          </span>
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.2 rounded-md font-mono text-[10px] font-bold bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA]">
                              {org.code}
                            </span>
                            <h3 className="font-bold text-xs text-[#10141A] truncate">{org.name}</h3>
                          </div>
                          <div className="text-[11px] text-[#6B7280] flex items-center gap-2 flex-wrap">
                            <span>{org.categoryName || 'General'}</span>
                            <span>•</span>
                            <span>{org.regionName || 'National'}</span>
                            <span>•</span>
                            <span>Nodal: <b>{org.nodalOfficerName || 'Registrar'}</b></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        <div className="px-3 py-1 rounded-lg bg-[#f0f3ff]/60 border border-[#D8DEEA]/60 text-center">
                          <div className="text-[9px] text-[#6B7280] font-semibold">Officers</div>
                          <div className="font-bold text-[#10141A] font-mono">{org.usersCount || 0}</div>
                        </div>

                        <div className="px-3 py-1 rounded-lg bg-[#f0f3ff]/60 border border-[#D8DEEA]/60 text-center">
                          <div className="text-[9px] text-[#6B7280] font-semibold">Vault</div>
                          <div className="font-bold text-purple-700 font-mono">{org.documentsCount || 0}</div>
                        </div>

                        <div className="px-3 py-1 rounded-lg bg-[#f0f3ff]/60 border border-[#D8DEEA]/60 text-center">
                          <div className="text-[9px] text-[#6B7280] font-semibold">In / Out</div>
                          <div className="font-bold text-[#3f5e93] font-mono">
                            {org.inboundRequestsCount || 0}/{org.outboundRequestsCount || 0}
                          </div>
                        </div>

                        {org.isVerified ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200">
                            Pending
                          </span>
                        )}

                        <button
                          onClick={() => setQuickViewOrg(org)}
                          className="px-3 py-1.5 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] text-xs font-semibold border border-[#D8DEEA] transition cursor-pointer"
                        >
                          Summary
                        </button>

                        <button
                          onClick={() => handleSelectOrgToInspect(org.id)}
                          className="px-3.5 py-1.5 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[14px]">tune</span>
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Mode: Table */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-[20px] shadow-[0_2px_8px_rgba(16,20,26,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider border-b border-[#D8DEEA]/60">
                      <tr>
                        <th className="py-3 px-4">Org Code</th>
                        <th className="py-3 px-4">Government Body &amp; Nodal Officer</th>
                        <th className="py-3 px-3">Domain Category</th>
                        <th className="py-3 px-3">Jurisdiction</th>
                        <th className="py-3 px-2 text-center">Officers</th>
                        <th className="py-3 px-2 text-center">Depts</th>
                        <th className="py-3 px-2 text-center">Vault</th>
                        <th className="py-3 px-3 text-center">Exchanges</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8DEEA]/40 text-[#10141A]">
                      {loading ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-[#6B7280]">
                            <span className="material-symbols-outlined text-[24px] animate-spin text-[#3f5e93] block mb-1">
                              sync
                            </span>
                            Loading organizations directory...
                          </td>
                        </tr>
                      ) : filteredOrgs.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-10 text-center text-[#6B7280]">
                            No organizations matched your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredOrgs.map((org) => {
                          const isCurrentOrg = currentOrg?.id === org.id || currentOrg?.code === org.code;
                          return (
                            <tr
                              key={org.id}
                              className={`hover:bg-[#f0f3ff]/50 transition ${
                                isCurrentOrg ? 'bg-[rgba(131,162,219,0.06)]' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4 font-mono font-bold text-[#3f5e93] whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{org.code}</span>
                                  {isCurrentOrg && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-sans font-semibold bg-[#3f5e93] text-white">
                                      Active
                                    </span>
                                  )}
                                </div>
                                {org.agencyCode && (
                                  <div className="text-[10px] text-[#9CA3AF] font-mono">{org.agencyCode}</div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-bold text-[#10141A]">{org.name}</div>
                                <div className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                                  <span className="material-symbols-outlined text-[13px] text-[#9CA3AF]">person</span>
                                  <span>Nodal: {org.nodalOfficerName || 'Registrar General'}</span>
                                  {org.nodalOfficerEmail && (
                                    <span className="text-[#9CA3AF]">({org.nodalOfficerEmail})</span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA]">
                                  <span className="material-symbols-outlined text-[12px]">
                                    {org.categoryIcon || 'account_balance'}
                                  </span>
                                  <span>{org.categoryName || 'General'}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-3 whitespace-nowrap text-[#45474b] text-[11px]">
                                <div className="font-semibold">{org.regionName || 'National'}</div>
                                {org.stateCode && (
                                  <div className="text-[10px] font-mono text-[#9CA3AF]">{org.stateCode}</div>
                                )}
                              </td>

                              <td className="py-3.5 px-2 text-center font-semibold font-mono text-[#10141A]">
                                {org.usersCount || 0}
                              </td>

                              <td className="py-3.5 px-2 text-center font-semibold font-mono text-[#10141A]">
                                {org.departmentsCount || 0}
                              </td>

                              <td className="py-3.5 px-2 text-center font-semibold font-mono text-[#10141A]">
                                {org.documentsCount || 0}
                              </td>

                              <td className="py-3.5 px-3 text-center whitespace-nowrap text-[11px]">
                                <span className="text-emerald-700 font-bold font-mono">{org.inboundRequestsCount || 0} In</span>
                                <span className="text-[#9CA3AF] mx-1">/</span>
                                <span className="text-[#3f5e93] font-bold font-mono">{org.outboundRequestsCount || 0} Out</span>
                              </td>

                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {org.isVerified ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Verified</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>Pending</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setQuickViewOrg(org)}
                                    className="p-1 rounded-full hover:bg-[#f0f3ff] text-[#6B7280] hover:text-[#10141A] transition cursor-pointer"
                                    title="Quick Summary"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                  </button>
                                  <button
                                    onClick={() => handleSelectOrgToInspect(org.id)}
                                    className="px-3 py-1 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                    title="Inspect & Configure"
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
            <div className="bg-white rounded-[22px] p-5 border border-[#D8DEEA]/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 flex items-center justify-center font-mono font-bold text-base shrink-0">
                  {orgDetails?.organization?.code?.substring(0, 3) || 'ORG'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#10141A]">
                      {orgDetails?.organization?.name || 'Select Organization'}
                    </h2>
                    {orgDetails?.organization?.isVerified && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                        Verified Sovereign Node
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6B7280] font-mono mt-0.5">
                    Org Code: <b className="text-[#3f5e93]">{orgDetails?.organization?.code}</b> • Nodal Officer: <b>{orgDetails?.organization?.nodalOfficerName || 'Not Set'}</b> ({orgDetails?.organization?.nodalOfficerEmail || 'No Email'})
                  </p>
                </div>
              </div>

              {/* Quick Org Selector Dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[#6B7280]">Select Entity:</span>
                <select
                  value={selectedOrgId || ''}
                  onChange={(e) => handleSelectOrgToInspect(e.target.value)}
                  className="h-9 px-3.5 rounded-full bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#151c27] font-semibold outline-none focus:bg-white"
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
            <div className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-full w-fit border border-[#D8DEEA]/80 flex-wrap">
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    inspectorTab === sub.id
                      ? 'bg-[#000000] text-white shadow-xs'
                      : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{sub.icon}</span>
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>

            {/* Loading Indicator */}
            {orgDetailsLoading && (
              <div className="p-12 text-center text-[#6B7280]">
                <span className="material-symbols-outlined text-[28px] animate-spin text-[#3f5e93] block mb-2">
                  sync
                </span>
                <span>Retrieving complete organization dossier...</span>
              </div>
            )}

            {/* INSPECTOR SUB-TAB 1: ORG PROFILE & NODAL */}
            {!orgDetailsLoading && inspectorTab === 'profile' && orgDetails && (
              <form onSubmit={handleSaveOrgProfile} className="bg-white rounded-[22px] p-6 border border-[#D8DEEA]/80 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#D8DEEA]/60">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#3f5e93] text-[20px]">edit_square</span>
                    <h3 className="font-bold text-sm text-[#10141A]">Organization Profile &amp; Federation Credentials</h3>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#000000] hover:bg-[#1a1f2c] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Changes</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-[#45474b] mb-1">Government Body / Organization Name *</label>
                    <input
                      type="text"
                      value={editOrgForm.name}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, name: e.target.value })}
                      required
                      className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#45474b] mb-1">Organization Code *</label>
                    <input
                      type="text"
                      value={editOrgForm.code}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, code: e.target.value })}
                      required
                      className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full font-mono text-xs text-[#151c27] uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#45474b] mb-1">Agency Code</label>
                    <input
                      type="text"
                      value={editOrgForm.agencyCode}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, agencyCode: e.target.value })}
                      placeholder="e.g. JUD-HC-01"
                      className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full font-mono text-xs text-[#151c27] uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#45474b] mb-1">Government Tier</label>
                    <select
                      value={editOrgForm.tierId}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, tierId: e.target.value })}
                      className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white"
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
                    <label className="block font-semibold text-[#45474b] mb-1">Domain Category</label>
                    <select
                      value={editOrgForm.domainCategoryId}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, domainCategoryId: e.target.value })}
                      className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white"
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
                    <label className="block font-semibold text-[#45474b] mb-1">Jurisdiction Region / State</label>
                    <select
                      value={editOrgForm.jurisdictionRegionId}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, jurisdictionRegionId: e.target.value })}
                      className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white"
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
                    <label className="block font-semibold text-[#45474b] mb-1">Operational Status</label>
                    <select
                      value={editOrgForm.status}
                      onChange={(e) => setEditOrgForm({ ...editOrgForm, status: e.target.value })}
                      className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white"
                    >
                      <option value="ACTIVE">ACTIVE - Operational</option>
                      <option value="SUSPENDED">SUSPENDED - Restricted</option>
                      <option value="DISABLED">DISABLED - Inactive</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <label className="flex items-center gap-2 font-semibold text-[#151c27] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editOrgForm.isVerified}
                        onChange={(e) => setEditOrgForm({ ...editOrgForm, isVerified: e.target.checked })}
                        className="w-4 h-4 rounded text-[#3f5e93] focus:ring-[#3f5e93]"
                      />
                      <span>Verified Federation Sovereign Node</span>
                    </label>
                  </div>
                </div>

                {/* Nodal Officer Section */}
                <div className="pt-4 border-t border-[#D8DEEA]/60 space-y-3">
                  <h4 className="font-bold text-xs text-[#10141A] uppercase tracking-wider text-[#6B7280]">
                    Designated Nodal Officer (Legal &amp; Requisition Authority)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-[#45474b] mb-1">Officer Name</label>
                      <input
                        type="text"
                        value={editOrgForm.nodalOfficerName}
                        onChange={(e) => setEditOrgForm({ ...editOrgForm, nodalOfficerName: e.target.value })}
                        placeholder="e.g. Registrar General"
                        className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#45474b] mb-1">Officer Official Email</label>
                      <input
                        type="email"
                        value={editOrgForm.nodalOfficerEmail}
                        onChange={(e) => setEditOrgForm({ ...editOrgForm, nodalOfficerEmail: e.target.value })}
                        placeholder="e.g. registrar@mumbai.gov.in"
                        className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#45474b] mb-1">Officer Phone</label>
                      <input
                        type="text"
                        value={editOrgForm.nodalOfficerPhone}
                        onChange={(e) => setEditOrgForm({ ...editOrgForm, nodalOfficerPhone: e.target.value })}
                        placeholder="+91-22-22670000"
                        className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93]"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* INSPECTOR SUB-TAB 2: DEPARTMENTS & WINGS */}
            {!orgDetailsLoading && inspectorTab === 'departments' && orgDetails && (
              <div className="space-y-4">
                <div className="bg-white rounded-[20px] p-4 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#10141A]">Departments &amp; Branches</h3>
                    <p className="text-xs text-[#6B7280]">
                      Active wings configured under {orgDetails.organization?.name}
                    </p>
                  </div>

                  <button
                    onClick={() => setDeptModalOpen(true)}
                    className="px-4 py-1.5 bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Add Department</span>
                  </button>
                </div>

                <div className="bg-white rounded-[20px] shadow-[0_2px_8px_rgba(16,20,26,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider border-b border-[#D8DEEA]/60">
                      <tr>
                        <th className="py-3 px-4">Department Code</th>
                        <th className="py-3 px-4">Department Name</th>
                        <th className="py-3 px-3">Parent Department</th>
                        <th className="py-3 px-3 text-center">Active Members</th>
                        <th className="py-3 px-3 text-center">Vault Docs</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8DEEA]/40 text-[#10141A]">
                      {orgDetails.departments?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                            No departments found for this organization.
                          </td>
                        </tr>
                      ) : (
                        orgDetails.departments.map((d: any) => (
                          <tr key={d.id} className="hover:bg-[#f0f3ff]/40 transition">
                            <td className="py-3 px-4 font-mono font-bold text-[#3f5e93]">{d.code}</td>
                            <td className="py-3 px-4 font-semibold text-[#10141A]">{d.name}</td>
                            <td className="py-3 px-3 text-[#6B7280]">{d.parentDepartmentName || 'Root'}</td>
                            <td className="py-3 px-3 text-center font-mono font-semibold">{d.memberCount || 0}</td>
                            <td className="py-3 px-3 text-center font-mono font-semibold">{d.documentCount || 0}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                <div className="bg-white rounded-[20px] p-4 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="font-bold text-sm text-[#10141A]">Officers &amp; Clearance Registry</h3>
                    <p className="text-xs text-[#6B7280]">
                      Registered personnel, designations, and max clearance ranks for {orgDetails.organization?.name}
                    </p>
                  </div>

                  <button
                    onClick={() => setUserModalOpen(true)}
                    className="px-4 py-1.5 bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>Enroll Officer</span>
                  </button>
                </div>

                <div className="bg-white rounded-[20px] shadow-[0_2px_8px_rgba(16,20,26,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider border-b border-[#D8DEEA]/60">
                      <tr>
                        <th className="py-3 px-4">Officer Details</th>
                        <th className="py-3 px-3">Designation &amp; Department</th>
                        <th className="py-3 px-3">Security Clearance</th>
                        <th className="py-3 px-3">Roles</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8DEEA]/40 text-[#10141A]">
                      {orgDetails.users?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#6B7280]">
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
                            <tr key={u.id} className="hover:bg-[#f0f3ff]/40 transition">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="relative w-8 h-8 rounded-full shrink-0">
                                    {u.avatarUrl ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img
                                        src={u.avatarUrl}
                                        alt={u.fullName}
                                        className="w-8 h-8 rounded-full object-cover border border-[#D8DEEA] shadow-2xs"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-[#10141A] text-white flex items-center justify-center font-bold text-[11px] shadow-2xs">
                                        {initials}
                                      </div>
                                    )}
                                    {u.avatarUrl && (
                                      <span
                                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                                        title="AI Face Recognition Enrolled"
                                      >
                                        <span className="material-symbols-outlined text-[8px] font-bold">check</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <div className="font-bold text-[#10141A] truncate">{u.fullName}</div>
                                    <div className="text-[11px] text-[#6B7280] font-mono truncate">{u.email}</div>
                                    {u.employeeCode && (
                                      <div className="text-[10px] font-mono text-[#9CA3AF]">ID: {u.employeeCode}</div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-semibold text-[#10141A]">{u.designation || 'Staff'}</div>
                                <div className="text-[11px] text-[#6B7280]">{u.departmentName || 'General Wing'}</div>
                              </td>

                              <td className="py-3 px-3">
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

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {u.roles?.map((r: any) => (
                                    <span
                                      key={r.id}
                                      className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA]"
                                    >
                                      {r.code}
                                    </span>
                                  ))}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                <div className="bg-white rounded-[20px] p-4 border border-[#D8DEEA]/80 shadow-xs flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#10141A]">Local Vault Documents</h3>
                    <p className="text-xs text-[#6B7280]">
                      Showing encrypted dockets stored in {orgDetails.organization?.name}&apos;s local repository (max 10 per page)
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-[20px] shadow-[0_2px_8px_rgba(16,20,26,0.03)] border border-[#D8DEEA]/80 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider border-b border-[#D8DEEA]/60">
                      <tr>
                        <th className="py-3 px-4">Docket #</th>
                        <th className="py-3 px-4">Title &amp; Classification</th>
                        <th className="py-3 px-3">Security Tier</th>
                        <th className="py-3 px-3">Department &amp; Officer</th>
                        <th className="py-3 px-3">SHA-256 Hash</th>
                        <th className="py-3 px-4">Uploaded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8DEEA]/40 text-[#10141A]">
                      {orgDetails.documents?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                            No documents stored in this organization&apos;s vault yet.
                          </td>
                        </tr>
                      ) : (
                        (orgDetails.documents?.slice((vaultPage - 1) * PAGE_SIZE, vaultPage * PAGE_SIZE) || []).map((doc: any) => (
                          <tr key={doc.id} className="hover:bg-[#f0f3ff]/40 transition">
                            <td className="py-3 px-4 font-mono font-bold text-[#3f5e93]">{doc.documentNumber}</td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#10141A]">{doc.title}</div>
                              <div className="text-[11px] text-[#6B7280]">{doc.documentTypeName || 'General'}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA]">
                                {doc.securityTier || 'T1'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-[#10141A]">{doc.ownerName}</div>
                              <div className="text-[10px] text-[#6B7280]">{doc.departmentName}</div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-[#9CA3AF]">
                              {doc.sha256Hash ? `${doc.sha256Hash.substring(0, 10)}...` : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-[#6B7280] text-[11px]">
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
                <div className="bg-white rounded-[20px] p-5 border border-[#D8DEEA]/80 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm text-[#10141A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-700 text-[18px]">call_received</span>
                    <span>Inbound Requisitions Received (Demands from other bodies)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Requisition #</th>
                          <th className="py-2.5 px-3">Requesting Government Body</th>
                          <th className="py-2.5 px-3">Document Demanded</th>
                          <th className="py-2.5 px-3">Urgency</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8DEEA]/40">
                        {orgDetails.inboundRequests?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                              No inbound requisitions received by this organization.
                            </td>
                          </tr>
                        ) : (
                          (orgDetails.inboundRequests?.slice((inboundPage - 1) * PAGE_SIZE, inboundPage * PAGE_SIZE) || []).map((r: any, idx: number) => (
                            <tr key={`org-inbound-${r.id}-${idx}`} className="hover:bg-[#f0f3ff]/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#3f5e93]">{r.requestNumber}</td>
                              <td className="py-2.5 px-3 font-semibold">{r.requestingOrgName} ({r.requestingOrgCode})</td>
                              <td className="py-2.5 px-3">{r.targetDocumentTitle || r.targetDocumentNumber}</td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                  <span>{r.urgency}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
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
                <div className="bg-white rounded-[20px] p-5 border border-[#D8DEEA]/80 shadow-xs space-y-3">
                  <h3 className="font-bold text-sm text-[#10141A] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#3f5e93] text-[18px]">call_made</span>
                    <span>Outbound Requisitions Sent (Filed by this body)</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Requisition #</th>
                          <th className="py-2.5 px-3">Target Government Body</th>
                          <th className="py-2.5 px-3">Document Requested</th>
                          <th className="py-2.5 px-3">Urgency</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8DEEA]/40">
                        {orgDetails.outboundRequests?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-[#6B7280]">
                              No outbound requisitions filed by this organization.
                            </td>
                          </tr>
                        ) : (
                          (orgDetails.outboundRequests?.slice((outboundPage - 1) * PAGE_SIZE, outboundPage * PAGE_SIZE) || []).map((r: any, idx: number) => (
                            <tr key={`org-outbound-${r.id}-${idx}`} className="hover:bg-[#f0f3ff]/40">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#3f5e93]">{r.requestNumber}</td>
                              <td className="py-2.5 px-3 font-semibold">{r.targetOrgName} ({r.targetOrgCode})</td>
                              <td className="py-2.5 px-3">{r.targetDocumentTitle || r.targetDocumentNumber}</td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                  <span>{r.urgency}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
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
                <div className="bg-white rounded-[20px] p-5 border border-[#D8DEEA]/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#10141A] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#3f5e93] text-[18px]">verified_user</span>
                      <span>Institutional Administrative &amp; Security Audit Trail</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#6B7280] font-semibold">
                      {orgDetails.auditLogs?.length || 0} Chained Events
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Actor</th>
                          <th className="py-2.5 px-3">Event Type</th>
                          <th className="py-2.5 px-3">Resource</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3">Event Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8DEEA]/40">
                        {(!orgDetails.auditLogs || orgDetails.auditLogs.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-[#6B7280]">
                              No administrative audit events recorded for this organization yet.
                            </td>
                          </tr>
                        ) : (
                          (orgDetails.auditLogs?.slice((auditLogPage - 1) * PAGE_SIZE, auditLogPage * PAGE_SIZE) || []).map((log: any, idx: number) => (
                            <tr key={`org-audit-${log.id || idx}`} className="hover:bg-[#f0f3ff]/40">
                              <td className="py-2.5 px-3 font-mono text-[#6B7280] whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-[#10141A]">
                                <div>{log.actorName || 'System Administrator'}</div>
                                {log.actorDesignation && (
                                  <div className="text-[10px] font-normal text-[#6B7280]">{log.actorDesignation}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-[#3f5e93]">
                                {log.eventType}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[#45474b]">
                                {log.resourceType || 'ORGANIZATION'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.result === 'SUCCESS'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}>
                                  {log.result}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-[#9CA3AF]">
                                {log.eventHash ? `${log.eventHash.substring(0, 12)}...` : 'SHA-256 Valid'}
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
            <div className="bg-white rounded-[22px] p-6 border border-[#D8DEEA]/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D8DEEA]/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#3f5e93] text-[20px]">gavel</span>
                  <h3 className="font-bold text-sm text-[#10141A]">Statutory Grounds &amp; Legal Templates</h3>
                </div>
              </div>

              <div className="divide-y divide-[#D8DEEA]/40 text-xs">
                {taxonomies.statutoryTemplates.map((st: any) => (
                  <div key={st.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-[#10141A] font-semibold">{st.title}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA]">
                        {st.section_citation}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] font-medium">{st.legal_act_name}</p>
                    <p className="text-[11px] text-[#45474b] italic bg-[#f0f3ff]/40 p-2 rounded-xl border border-[#D8DEEA]/50">
                      &quot;{st.default_purpose_text}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgency SLAs */}
            <div className="bg-white rounded-[22px] p-6 border border-[#D8DEEA]/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#D8DEEA]/60">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">timer</span>
                  <h3 className="font-bold text-sm text-[#10141A]">Dynamic Priority &amp; SLA Tiers</h3>
                </div>
              </div>

              <div className="divide-y divide-[#D8DEEA]/40 text-xs">
                {taxonomies.priorityTiers.map((pt: any) => (
                  <div key={pt.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-[#10141A] font-semibold block">{pt.name}</strong>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{pt.description}</p>
                    </div>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold font-mono shrink-0 shadow-2xs"
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: QUICK VIEW SUMMARY MODAL */}
      {/* ========================================================================= */}
      {quickViewOrg && (
        <div className="fixed inset-0 z-50 bg-[#10141A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[26px] shadow-2xl p-6 flex flex-col gap-4 border border-[#D8DEEA]">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                  {quickViewOrg.code.substring(0, 3)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10141A]">{quickViewOrg.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] font-bold text-[#3f5e93] bg-[#f0f3ff] px-2 py-0.2 rounded-md border border-[#D8DEEA]">
                      {quickViewOrg.code}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">{quickViewOrg.regionName || 'National'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQuickViewOrg(null)}
                className="text-[#9CA3AF] hover:text-[#10141A] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-[#f0f3ff]/60 border border-[#D8DEEA]/60 text-center text-xs">
              <div>
                <div className="text-[10px] font-bold text-[#6B7280] uppercase">Officers</div>
                <div className="text-sm font-bold text-[#10141A] font-mono mt-0.5">{quickViewOrg.usersCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#6B7280] uppercase">Depts</div>
                <div className="text-sm font-bold text-[#10141A] font-mono mt-0.5">{quickViewOrg.departmentsCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-purple-700 uppercase">Vault Docs</div>
                <div className="text-sm font-bold text-purple-700 font-mono mt-0.5">{quickViewOrg.documentsCount || 0}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-[#3f5e93] uppercase">Exchanges</div>
                <div className="text-sm font-bold text-[#3f5e93] font-mono mt-0.5">
                  {(quickViewOrg.inboundRequestsCount || 0) + (quickViewOrg.outboundRequestsCount || 0)}
                </div>
              </div>
            </div>

            {/* Nodal Officer & Compliance Details */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#f0f3ff]/50 border border-[#D8DEEA]/60 space-y-0.5">
                <div className="font-bold text-[#10141A] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#3f5e93]">badge</span>
                  <span>Designated Legal &amp; Nodal Authority</span>
                </div>
                <div className="text-[#45474b] pl-5">
                  {quickViewOrg.nodalOfficerName || 'Not Appointed'} • {quickViewOrg.nodalOfficerEmail || 'No Email'}
                </div>
                {quickViewOrg.nodalOfficerPhone && (
                  <div className="text-[#6B7280] font-mono text-[10px] pl-5">
                    Tel: {quickViewOrg.nodalOfficerPhone}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#f0f3ff]/30 border border-[#D8DEEA]/40 space-y-1">
                <div className="font-bold text-[#10141A] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">shield_lock</span>
                  <span>Cryptographic Enclave &amp; Compliance</span>
                </div>
                <div className="text-[#6B7280] text-[11px] leading-relaxed pl-5">
                  Secured with AES-256 Envelope KMS Encryption, WORM Immutable Ledger storage, and Section 65B Electronic Evidence compliance.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8DEEA]/60">
              <button
                type="button"
                onClick={() => setQuickViewOrg(null)}
                className="px-4 py-1.5 rounded-full border border-[#D8DEEA] text-xs font-semibold text-[#151c27] hover:bg-[#f0f3ff] transition cursor-pointer"
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
                className="px-4 py-1.5 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">tune</span>
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
        <div className="fixed inset-0 z-50 bg-[#10141A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[26px] shadow-2xl p-6 flex flex-col gap-4 border border-[#D8DEEA]">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3f5e93]">corporate_fare</span>
                <h3 className="text-sm font-bold text-[#10141A]">Add New Department</h3>
              </div>
              <button onClick={() => setDeptModalOpen(false)} className="text-[#9CA3AF] hover:text-[#10141A]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#45474b] mb-1">Department Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Cyber Forensics Wing"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  required
                  className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#45474b] mb-1">Department Code *</label>
                <input
                  type="text"
                  placeholder="e.g. CYBER-FOR"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  required
                  className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full font-mono uppercase text-xs text-[#151c27] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D8DEEA]/60">
                <button
                  type="button"
                  onClick={() => setDeptModalOpen(false)}
                  className="px-4 py-1.5 rounded-full border border-[#D8DEEA] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-full bg-[#000000] text-white text-xs font-semibold shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-[#10141A]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[26px] shadow-2xl p-6 flex flex-col gap-4 border border-[#D8DEEA] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3f5e93]">person_add</span>
                <h3 className="text-sm font-bold text-[#10141A]">Enroll Officer into Organization</h3>
              </div>
              <button onClick={() => setUserModalOpen(false)} className="text-[#9CA3AF] hover:text-[#10141A]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEnrollUser} className="space-y-3.5 text-xs">
              <UserPhotoUpload
                value={userForm.avatarUrl}
                onChange={(photo) => setUserForm({ ...userForm, avatarUrl: photo })}
                name={userForm.fullName}
                label="Officer Photo & Face Biometrics"
                helperText="Upload official portrait for identification and upcoming AI Face Recognition."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patil"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    required
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Official Email *</label>
                  <input
                    type="email"
                    placeholder="r.patil@mumbai.gov.in"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Employee / Service Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-BOM-042"
                    value={userForm.employeeCode}
                    onChange={(e) => setUserForm({ ...userForm, employeeCode: e.target.value })}
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full font-mono uppercase text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Registrar"
                    value={userForm.designation}
                    onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                    className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#45474b] mb-1">Department</label>
                  <select
                    value={userForm.departmentId}
                    onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                    className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white"
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
                  <label className="block font-semibold text-[#45474b] mb-1">Max Security Clearance</label>
                  <select
                    value={userForm.maxSecurityLevel}
                    onChange={(e) => setUserForm({ ...userForm, maxSecurityLevel: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] outline-none focus:bg-white font-mono font-bold"
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
                <label className="block font-semibold text-[#45474b] mb-1">Temporary Password *</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                  className="w-full h-9 px-3.5 bg-[#f0f3ff] border border-[#D8DEEA] rounded-full text-xs text-[#151c27] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D8DEEA]/60">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-1.5 rounded-full border border-[#D8DEEA] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-full bg-[#000000] text-white text-xs font-semibold shadow-xs"
                >
                  Enroll Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
