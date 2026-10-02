'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UiverseSearchBar } from '@/components/ui/UiverseSearchBar';

interface FederationAuditViewProps {
  currentUserId?: string;
  currentUserRoles?: string[];
  currentUserPermissions?: string[];
  currentUserClearance?: number;
  currentOrg?: {
    id: string;
    code: string;
    name: string;
  };
}

interface AuditLogItem {
  id: string;
  action: string;
  ipAddress: string;
  userAgent?: string;
  eventHash: string;
  blockchainAnchored: boolean;
  blockchainTx?: string;
  watermarkSnapshot?: any;
  createdAt: string;

  documentId: string;
  documentNumber: string;
  documentTitle: string;
  securityTierCode: string;
  securityTierRank: number;

  shareId?: string;
  shareNumber?: string;
  shareExpiresAt?: string;

  accessingUserId: string;
  accessingUserName: string;
  accessingUserDesignation?: string;
  accessingUserEmpCode?: string;
  requestingOrgId: string;
  requestingOrgName: string;
  requestingOrgCode: string;

  sourceOrgId?: string;
  sourceOrgName?: string;
  sourceOrgCode?: string;
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
    <div className="px-5 py-3.5 border-t border-[#D8DEEA]/60 bg-white flex items-center justify-between flex-wrap gap-2 text-xs">
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

export default function FederationAuditView({
  currentUserId,
  currentUserRoles = [],
  currentUserPermissions = [],
  currentUserClearance = 5,
  currentOrg,
}: FederationAuditViewProps) {
  const isSuperAdmin = currentUserRoles.includes('SUPER_ADMIN');
  const canExport =
    isSuperAdmin ||
    currentUserPermissions.includes('INTER_ORG_AUDIT_EXPORT') ||
    currentUserPermissions.includes('AUDIT_EXPORT') ||
    currentUserPermissions.includes('PERMISSION_MANAGE');

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<{
    totalAccessEvents?: number;
    viewEvents?: number;
    downloadEvents?: number;
    activeRequestingAgencies?: number;
    uniqueDocumentsAccessed?: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'feed'>('table');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'error' }>({
    show: false,
    message: '',
  });

  const PAGE_SIZE = 10;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const handleCopy = (text: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`${label} copied to clipboard`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collaboration/audit?action=${actionFilter}&limit=100`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch federation audit logs', err);
      showToast('Failed to fetch federation audit telemetry', 'error');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchAuditLogs();
    setCurrentPage(1);
  }, [fetchAuditLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchFilter.trim()) return logs;
    const q = searchFilter.toLowerCase().trim();
    return logs.filter((l) => {
      return (
        l.documentNumber?.toLowerCase().includes(q) ||
        l.documentTitle?.toLowerCase().includes(q) ||
        l.accessingUserName?.toLowerCase().includes(q) ||
        l.accessingUserEmpCode?.toLowerCase().includes(q) ||
        l.requestingOrgName?.toLowerCase().includes(q) ||
        l.requestingOrgCode?.toLowerCase().includes(q) ||
        l.sourceOrgName?.toLowerCase().includes(q) ||
        l.sourceOrgCode?.toLowerCase().includes(q) ||
        l.eventHash?.toLowerCase().includes(q) ||
        l.blockchainTx?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.ipAddress?.toLowerCase().includes(q)
      );
    });
  }, [logs, searchFilter]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
      const timePart = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
      return { datePart, timePart };
    } catch {
      return { datePart: dateStr, timePart: '' };
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('PREVIEW') || act.includes('STREAM') || act.includes('VIEW')) {
      return {
        label: 'Watermarked Stream',
        icon: 'visibility',
        colorClass: 'bg-sky-50 text-[#3f5e93] border-sky-200/80',
      };
    }
    if (act.includes('DOWNLOAD_WATERMARKED') || act.includes('CERT')) {
      return {
        label: 'Certified Download',
        icon: 'verified_user',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      };
    }
    if (act.includes('DOWNLOAD_ORIGINAL') || act.includes('RAW')) {
      return {
        label: 'Raw Binary Access',
        icon: 'download_for_offline',
        colorClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
      };
    }
    if (act.includes('DISPATCH') || act.includes('TRANSFER')) {
      return {
        label: 'Direct Dispatch',
        icon: 'send',
        colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      };
    }
    return {
      label: action.replace(/_/g, ' '),
      icon: 'shield',
      colorClass: 'bg-[#f0f3ff] text-[#10141A] border-[#D8DEEA]',
    };
  };

  const getTierBadge = (tierCode?: string, rank?: number) => {
    const code = tierCode || (rank ? `T${rank}` : 'T1');
    const r = rank || parseInt(code.replace(/\D/g, '') || '1', 10);

    if (r >= 5) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (r >= 4) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (r >= 3) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (r >= 2) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

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

      {/* Main Container Card (Glassmorphic Light Theme) */}
      <div className="bg-white/85 backdrop-blur-xl rounded-[26px] p-6 lg:p-8 shadow-[0_8px_32px_rgba(16,20,26,0.06)] border border-[#D8DEEA]/80 space-y-6">
        
        {/* Header Ribbon */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined text-[#3f5e93] text-[24px]">shield_lock</span>
              <h1 className="text-xl lg:text-2xl font-bold text-[#10141A] tracking-tight">
                Cross-Org Audit 360 &amp; Chain of Custody
              </h1>
              <span className="rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30">
                Section 65B Certified
              </span>
              <span className="rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ledger Anchored
              </span>
            </div>
            <p className="text-xs text-[#6B7280]">
              Real-time cross-agency access telemetry, high-clearance vigilance heartbeats, and immutable blockchain attestation under Section 65B Bharatiya Sakshya Adhiniyam 2023.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canExport && (
              <button
                onClick={() => {
                  window.location.href = '/api/auditor/export';
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] border border-[#D8DEEA] text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Download Legal Audit Manifest"
              >
                <span className="material-symbols-outlined text-[16px] text-[#3f5e93]">download</span>
                <span>Export Manifest</span>
              </button>
            )}

            <button
              onClick={() => fetchAuditLogs()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] border border-[#D8DEEA] text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Refresh Audit Telemetry"
            >
              <span className={`material-symbols-outlined text-[16px] text-[#3f5e93] ${loading ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Authority Verification Status Ribbon */}
        <div className="p-3.5 rounded-[18px] bg-white border border-[#D8DEEA]/60 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#3f5e93] text-[18px]">verified_user</span>
              <span className="text-[#6B7280]">Inspecting Authority:</span>
              <span className="font-semibold text-[#10141A]">{currentOrg?.name || 'National Digital Governance Authority'}</span>
            </div>
            <span className="text-[#D8DEEA]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#9CA3AF] text-[16px]">security</span>
              <span className="text-[#6B7280]">Vigilance Clearance:</span>
              <span className="font-semibold text-[#10141A] bg-[#f0f3ff] px-2 py-0.5 rounded-full border border-[#D8DEEA] text-[11px]">
                Level {currentUserClearance}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/50 shadow-2xs">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>WORM Storage Seal Active</span>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Exchange Events</span>
            <div className="text-2xl font-bold text-[#10141A] mt-1">
              {stats.totalAccessEvents || logs.length || 0}
            </div>
            <div className="text-[11px] text-[#3f5e93] font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">link</span>
              <span>Cryptographically Chained</span>
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Watermarked Streams</span>
            <div className="text-2xl font-bold text-[#3f5e93] mt-1">
              {stats.viewEvents || 0}
            </div>
            <div className="text-[11px] text-[#6B7280] font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">visibility</span>
              <span>Ephemeral Decryptions</span>
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Certified Downloads</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {stats.downloadEvents || 0}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>Sec 65B Certified</span>
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Active Agencies</span>
            <div className="text-2xl font-bold text-purple-700 mt-1">
              {stats.activeRequestingAgencies || 0}
            </div>
            <div className="text-[11px] text-[#6B7280] font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">corporate_fare</span>
              <span>Sovereign Nodes</span>
            </div>
          </div>

          <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA]/70 rounded-[18px] p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Classified Records</span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {stats.uniqueDocumentsAccessed || 0}
            </div>
            <div className="text-[11px] text-[#6B7280] font-medium mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">folder_special</span>
              <span>T1–T5 Vault Items</span>
            </div>
          </div>
        </div>

        {/* Action Filter Toolbar & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Action Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#f0f3ff] rounded-full w-fit border border-[#D8DEEA]/80 flex-wrap">
            {[
              { id: 'ALL', label: 'All Events' },
              { id: 'VIEW_PREVIEW', label: 'Watermarked Streams' },
              { id: 'DOWNLOAD_WATERMARKED', label: 'Certified Downloads' },
              { id: 'DOWNLOAD_ORIGINAL', label: 'Raw Binaries' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  actionFilter === tab.id
                    ? 'bg-[#000000] text-white shadow-xs'
                    : 'text-[#45474b] hover:text-[#10141A] hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input & Layout Switcher */}
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <div className="flex-1">
              <UiverseSearchBar
                placeholder="Search officer, document, org code, or hash..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                onClear={() => setSearchFilter('')}
                compact
              />
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center bg-[#f0f3ff] p-0.5 rounded-full border border-[#D8DEEA] shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-[#10141A]' : 'text-[#6B7280]'
                }`}
                title="Structured Table View"
              >
                <span className="material-symbols-outlined text-[15px]">table_rows</span>
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('feed')}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === 'feed' ? 'bg-white shadow-xs text-[#10141A]' : 'text-[#6B7280]'
                }`}
                title="Event Cards Feed"
              >
                <span className="material-symbols-outlined text-[15px]">view_agenda</span>
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: STRUCTURED TABLE (Spacious, Clean, Perfectly Aligned) */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-[22px] shadow-[0_2px_8px_rgba(16,20,26,0.03)] border border-[#D8DEEA]/80 overflow-hidden flex flex-col justify-between">
            <div className="w-full overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f3ff]/60 text-[#6B7280] text-[10px] font-bold uppercase tracking-wider border-b border-[#D8DEEA]/60">
                  <tr>
                    <th className="py-3 px-4">Event &amp; Timestamp</th>
                    <th className="py-3 px-4">Accessing Entity</th>
                    <th className="py-3 px-4">Target Record</th>
                    <th className="py-3 px-3">Clearance &amp; IP</th>
                    <th className="py-3 px-4 text-right">Blockchain Attestation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DEEA]/40 text-[#10141A]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-[#6B7280]">
                        <span className="material-symbols-outlined text-[26px] animate-spin text-[#3f5e93] block mb-2">
                          sync
                        </span>
                        <span className="text-xs font-medium">Loading sovereign audit telemetry stream...</span>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-[#6B7280]">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className="material-symbols-outlined text-[28px] text-[#9CA3AF]">manage_search</span>
                          <span className="font-semibold text-xs text-[#10141A]">No custody events found</span>
                          <span className="text-[11px] text-[#9CA3AF]">
                            {searchFilter ? 'Try clearing or modifying your search query.' : 'No events logged for this filter category.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const { datePart, timePart } = formatTimestamp(log.createdAt);
                      const actionBadge = getActionBadge(log.action);
                      const tierBadgeClass = getTierBadge(log.securityTierCode, log.securityTierRank);

                      return (
                        <tr key={log.id} className="hover:bg-[#f0f3ff]/40 transition group">
                          {/* 1. Event & Timestamp */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${actionBadge.colorClass}`}
                              >
                                <span className="material-symbols-outlined text-[13px]">{actionBadge.icon}</span>
                                <span>{actionBadge.label}</span>
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B7280] mt-1">
                              {datePart} · <span className="font-mono">{timePart}</span>
                            </div>
                          </td>

                          {/* 2. Accessing Entity */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="font-bold text-[#10141A] text-xs">{log.accessingUserName}</div>
                            <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>{log.requestingOrgName}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(log.requestingOrgCode, 'Org Code', e)}
                                className="px-1.5 py-0.2 rounded-full font-mono text-[10px] font-bold bg-[#f0f3ff] hover:bg-blue-100 text-[#3f5e93] border border-[#D8DEEA] flex items-center gap-0.5 transition cursor-pointer"
                                title="Copy organization code"
                              >
                                <span>{log.requestingOrgCode}</span>
                                <span className="material-symbols-outlined text-[10px] text-slate-400">
                                  {copiedText === log.requestingOrgCode ? 'done' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                          </td>

                          {/* 3. Target Record */}
                          <td className="py-3.5 px-4 align-middle max-w-xs">
                            <div className="font-semibold text-[#10141A] text-xs truncate" title={log.documentTitle}>
                              {log.documentTitle}
                            </div>
                            <div className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-0.5">
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-[#151c27]">
                                {log.documentNumber}
                              </span>
                              <span className="text-[#9CA3AF]">from</span>
                              <span className="font-medium text-[#10141A] truncate">{log.sourceOrgCode || log.sourceOrgName || 'VAULT'}</span>
                            </div>
                          </td>

                          {/* 4. Clearance & IP */}
                          <td className="py-3.5 px-3 align-middle">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierBadgeClass}`}>
                                {log.securityTierCode || `Tier ${log.securityTierRank || 1}`}
                              </span>
                              <span className="font-mono text-[11px] text-[#6B7280]">{log.ipAddress}</span>
                            </div>
                          </td>

                          {/* 5. Attestation & Proof */}
                          <td className="py-3.5 px-4 align-middle text-right">
                            <div className="inline-flex items-center gap-2">
                              {log.blockchainTx ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopy(log.blockchainTx!, 'Blockchain Tx Hash', e)}
                                  className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200 transition cursor-pointer"
                                  title="Click to copy full Blockchain Transaction Hash"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                                  <span>{log.blockchainTx.substring(0, 8)}...</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                  <span className="material-symbols-outlined text-[11px] text-amber-600">pending</span>
                                  <span>WORM Anchored</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedLog(log)}
                                className="px-3 py-1 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] text-xs font-semibold cursor-pointer transition shadow-2xs inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px] text-[#3f5e93]">visibility</span>
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

            {/* Table Pagination */}
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setCurrentPage(p)}
              label="custody events"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: CARDS / ACTIVITY STREAM FEED (Modern, Card-Based Layout) */}
        {/* ========================================================================= */}
        {viewMode === 'feed' && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[20px] p-5 border border-[#D8DEEA]/80 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
              ))
            ) : filteredLogs.length === 0 ? (
              <div className="bg-white rounded-[22px] p-10 text-center border border-[#D8DEEA]/80 space-y-2">
                <span className="material-symbols-outlined text-[28px] text-[#9CA3AF]">manage_search</span>
                <p className="text-xs text-[#6B7280]">No custody events match the current criteria.</p>
              </div>
            ) : (
              paginatedLogs.map((log) => {
                const { datePart, timePart } = formatTimestamp(log.createdAt);
                const actionBadge = getActionBadge(log.action);
                const tierBadgeClass = getTierBadge(log.securityTierCode, log.securityTierRank);

                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-[20px] p-4.5 border border-[#D8DEEA]/80 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Officer & Event info */}
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#f0f3ff] text-[#3f5e93] border border-[#D8DEEA] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">{actionBadge.icon}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${actionBadge.colorClass}`}>
                            {actionBadge.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierBadgeClass}`}>
                            {log.securityTierCode || `Tier ${log.securityTierRank || 1}`}
                          </span>
                          <span className="text-[11px] text-[#6B7280]">
                            {datePart} at {timePart}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-xs font-bold text-[#10141A]">{log.accessingUserName}</strong>
                          <span className="text-[11px] text-[#6B7280]">({log.requestingOrgName})</span>
                          <span className="text-[#9CA3AF] text-xs">accessed</span>
                          <span className="text-xs font-semibold text-[#10141A] bg-[#f0f3ff] px-2 py-0.5 rounded-md border border-[#D8DEEA]/60">
                            {log.documentTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#6B7280] pt-0.5 flex-wrap">
                          <span>Doc No: <b className="font-mono text-[#10141A]">{log.documentNumber}</b></span>
                          <span>•</span>
                          <span>Source: <b className="text-[#10141A]">{log.sourceOrgName || log.sourceOrgCode || 'Vault'}</b></span>
                          <span>•</span>
                          <span>IP: <b className="font-mono text-[#10141A]">{log.ipAddress}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Blockchain Proof & Actions */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                      {log.blockchainTx ? (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(log.blockchainTx!, 'Blockchain Tx Hash', e)}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 transition cursor-pointer"
                          title="Copy Blockchain Tx"
                        >
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                          <span>{log.blockchainTx.substring(0, 8)}...</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <span className="material-symbols-outlined text-[12px] text-amber-600">pending</span>
                          <span>WORM Sealed</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-3.5 py-1.5 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold shadow-xs cursor-pointer transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        <span>Inspect Proof</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination for Feed */}
            <div className="bg-white rounded-[20px] border border-[#D8DEEA]/80 overflow-hidden shadow-xs">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredLogs.length}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => setCurrentPage(p)}
                label="custody events"
              />
            </div>
          </div>
        )}
      </div>

      {/* Proof Inspection Modal (Unified Glassmorphic Light Theme) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10141A]/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[26px] w-full max-w-2xl border border-[#D8DEEA] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#D8DEEA]/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-[rgba(131,162,219,0.14)] text-[#3f5e93] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">lock_clock</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#10141A]">Tamper-Evident Custody Manifest</h3>
                  <p className="text-xs text-[#6B7280]">Cryptographic Chain-of-Custody · Section 65B BSA 2023 Admissible</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full hover:bg-[#f0f3ff] text-[#6B7280] hover:text-[#10141A] flex items-center justify-center cursor-pointer transition"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto text-xs flex flex-col gap-3.5">
              {/* Event Digest */}
              <div className="p-3.5 bg-[#f0f3ff]/70 border border-[#D8DEEA] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] uppercase text-[10px] font-bold tracking-wider">
                    SHA-256 Event Digest
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(selectedLog.eventHash, 'Event Digest', e)}
                    className="text-[11px] font-semibold text-[#3f5e93] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedText === selectedLog.eventHash ? 'done' : 'content_copy'}
                    </span>
                    <span>{copiedText === selectedLog.eventHash ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[#10141A] font-mono text-[11px] break-all font-semibold bg-white p-2 rounded-xl border border-[#D8DEEA]/60">
                  {selectedLog.eventHash}
                </p>
              </div>

              {/* Blockchain Ledger Tx */}
              <div className="p-3.5 bg-[#f0f3ff]/70 border border-[#D8DEEA] rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280] uppercase text-[10px] font-bold tracking-wider">
                    Blockchain Ledger Transaction Hash
                  </span>
                  {selectedLog.blockchainTx && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(selectedLog.blockchainTx!, 'Blockchain Tx', e)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {copiedText === selectedLog.blockchainTx ? 'done' : 'content_copy'}
                      </span>
                      <span>{copiedText === selectedLog.blockchainTx ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <p className="text-emerald-800 font-mono text-[11px] break-all font-semibold bg-white p-2 rounded-xl border border-emerald-200/80">
                  {selectedLog.blockchainTx || 'BLOCKCHAIN_ANCHOR_PENDING (Locally WORM-Sealed)'}
                </p>
              </div>

              {/* Forensic Watermark Snapshot */}
              <div className="p-3.5 bg-[#f0f3ff]/70 border border-[#D8DEEA] rounded-2xl space-y-1">
                <span className="text-[#6B7280] uppercase text-[10px] font-bold tracking-wider">
                  Forensic Watermark Snapshot &amp; Access Context
                </span>
                <p className="text-[#10141A] text-[11px] leading-relaxed bg-white p-2.5 rounded-xl border border-[#D8DEEA]/60">
                  {selectedLog.watermarkSnapshot?.watermarkText ||
                    `Rendered with officer ID ${selectedLog.accessingUserId?.substring(0, 8)}, IP ${selectedLog.ipAddress}, and verified timestamp.`}
                </p>
              </div>

              {/* Two-Column Provenance Summary */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-white border border-[#D8DEEA] rounded-2xl space-y-1">
                  <span className="text-[#6B7280] text-[10px] uppercase font-bold tracking-wider">Requesting Agency</span>
                  <div className="font-bold text-[#10141A] text-xs">{selectedLog.requestingOrgName}</div>
                  <div className="text-[11px] text-[#3f5e93] font-mono font-semibold">{selectedLog.requestingOrgCode}</div>
                </div>

                <div className="p-3.5 bg-white border border-[#D8DEEA] rounded-2xl space-y-1">
                  <span className="text-[#6B7280] text-[10px] uppercase font-bold tracking-wider">Accessing Officer</span>
                  <div className="font-bold text-[#10141A] text-xs">{selectedLog.accessingUserName}</div>
                  <div className="text-[11px] text-[#6B7280]">
                    {selectedLog.accessingUserDesignation || 'Gazetted Officer'}
                    {selectedLog.accessingUserEmpCode && ` · (${selectedLog.accessingUserEmpCode})`}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#D8DEEA]/60 bg-[#f0f3ff]/40">
              <div className="text-[11px] text-[#6B7280] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                <span>Cryptographically verifiable on sovereign nodes</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold shadow-xs cursor-pointer transition"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
