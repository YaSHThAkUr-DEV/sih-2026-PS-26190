'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UiverseSearchBar } from '@/components/ui/UiverseSearchBar';

interface ApprovalsViewProps {
  currentUser: any;
  onDecisionMade: () => void;
  onReturnToOverview?: () => void;
}

interface ChangeRequestItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  decidedAt?: string;
  document: {
    id: string;
    documentNumber: string;
    title: string;
    department: string;
    departmentCode: string;
    securityTier: string;
    securityTierName: string;
    type: string;
  };
  requester: {
    id: string;
    name: string;
    designation: string;
    isCurrentOfficer: boolean;
  };
  assignedApprover: {
    id: string;
    name: string;
    designation: string;
  };
  originalVersion: {
    id: string | null;
    versionNumber: number;
    fileName: string;
    fileSize: number;
    sha256: string;
    isInitialSubmission?: boolean;
  };
  proposedVersion: {
    id: string;
    versionNumber: number;
    fileName: string;
    fileSize: number;
    sha256: string;
  };
  lastDecision?: {
    decision: string;
    comment: string;
    timestamp: string;
    approverName?: string;
  } | null;
  canApprove: boolean;
  selfApprovalBlocked: boolean;
}

export default function SensitiveApprovalsView({
  currentUser,
  onDecisionMade,
  onReturnToOverview,
}: ApprovalsViewProps) {
  const [requests, setRequests] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'T5' | 'T4' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Decision Form State
  const [justification, setJustification] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [signingProgress, setSigningProgress] = useState(0);
  const [signingStep, setSigningStep] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const param = activeFilter === 'COMPLETED' ? 'COMPLETED' : 'ALL';
      const res = await fetch(`/api/approvals/pending?status=${param}`);
      if (res.ok) {
        const data = await res.json();
        const list: ChangeRequestItem[] = data.requests || [];
        setRequests(list);
        if (list.length > 0) {
          // If previously selected request still exists, keep it; otherwise select the first
          if (!selectedRequestId || !list.some((r) => r.id === selectedRequestId)) {
            setSelectedRequestId(list[0].id);
          }
        } else {
          setSelectedRequestId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeFilter]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      let matchesFilter = true;
      if (activeFilter === 'T5') matchesFilter = r.document.securityTier === 'T5' && r.status === 'PENDING';
      else if (activeFilter === 'T4') matchesFilter = r.document.securityTier === 'T4' && r.status === 'PENDING';
      else if (activeFilter === 'COMPLETED') matchesFilter = r.status !== 'PENDING';
      else matchesFilter = r.status === 'PENDING';

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.document.documentNumber.toLowerCase().includes(q) ||
        r.document.title.toLowerCase().includes(q) ||
        r.requester.name.toLowerCase().includes(q) ||
        r.proposedVersion.sha256.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [requests, activeFilter, searchQuery]);

  // If active request not in filtered list, pick the first in filtered list
  const activeRequest = useMemo(() => {
    if (!filteredRequests.length) return null;
    const found = filteredRequests.find((r) => r.id === selectedRequestId);
    return found || filteredRequests[0];
  }, [filteredRequests, selectedRequestId]);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedHash(label);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const handleExecuteDecision = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!activeRequest) return;
    if (!justification.trim()) {
      setErrorAlert('Approver justification comment is mandatory for statutory Maker-Checker compliance.');
      return;
    }

    setIsDeciding(true);
    setErrorAlert(null);
    setModalOpen(true);
    setSigningProgress(20);
    setSigningStep('Verifying authority clearance and credentials...');

    try {
      setTimeout(() => {
        setSigningProgress(55);
        setSigningStep(
          decision === 'APPROVED'
            ? `Promoting approved revision v${activeRequest.proposedVersion.versionNumber} to active document docket...`
            : 'Formally quarantining rejected revision in audit ledger...'
        );
      }, 500);

      const res = await fetch(`/api/approvals/${activeRequest.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          comment: justification.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Decision execution failed');
      }

      setSigningProgress(90);
      setSigningStep('Anchoring cryptographic audit signature to blockchain ledger...');

      setTimeout(() => {
        setSigningProgress(100);
        setSigningStep(
          decision === 'APPROVED'
            ? 'Revision successfully sanctioned & promoted to active docket.'
            : 'Revision formally rejected and archived.'
        );
      }, 700);

      setTimeout(() => {
        setModalOpen(false);
        setIsDeciding(false);
        setJustification('');
        onDecisionMade();
        fetchApprovals();
      }, 1400);
    } catch (err: any) {
      setIsDeciding(false);
      setModalOpen(false);
      setErrorAlert(err.message || 'An error occurred during approval adjudication.');
    }
  };

  // Counts for tabs
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const t5PendingCount = requests.filter((r) => r.document.securityTier === 'T5' && r.status === 'PENDING').length;
  const t4PendingCount = requests.filter((r) => r.document.securityTier === 'T4' && r.status === 'PENDING').length;
  const completedCount = requests.filter((r) => r.status !== 'PENDING').length;

  return (
    <div className="flex flex-col gap-6 max-w-[1720px] mx-auto w-full font-sans text-[#151c27]">
      {/* 1. Header Banner */}
      <section className="bg-white/90 backdrop-blur-xl rounded-[26px] shadow-[0_8px_32px_rgba(16,20,26,0.06)] border border-[#D8DEEA]/80 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 text-[11px] font-mono font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#3f5e93]"></span>
              MAKER-CHECKER GOVERNANCE
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0f3ff] text-[#151c27] font-mono text-[11px]">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
              STATUTORY DUAL-CUSTODY
            </span>
          </div>

          <h1 className="text-xl font-bold text-[#151c27] tracking-tight">
            Sensitive Approvals &amp; Maker-Checker Queue
          </h1>
          <p className="text-xs text-[#45474b]">
            Multi-tier revision review, cryptographic checksum verification, and dual-custody governance. All high-security docket modifications require designated Approver sign-off.
          </p>
        </div>

        {/* Active Approver Credentials Badge */}
        <div className="bg-[#f0f3ff]/70 border border-[#D8DEEA] rounded-2xl p-4 flex items-center gap-3.5 shadow-xs shrink-0">
          <div className="w-11 h-11 rounded-full bg-[#000000] text-white flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[22px]">draw</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#151c27] truncate">
                {currentUser?.fullName || 'Approving Authority'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(131,162,219,0.14)] text-[#3f5e93] font-mono">
                {currentUser?.roles?.[0] || 'APPROVER'}
              </span>
            </div>
            <span className="text-[11px] text-[#45474b] truncate">
              {currentUser?.designation || 'Designated Section Approver'}
            </span>
            <div className="flex items-center gap-2 mt-1 font-mono text-[10px]">
              <span className="text-[#3f5e93] flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[13px]">shield</span> Clearance Level {currentUser?.maxSecurityLevel ?? 4}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Triage Toolbar & Filter Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-[26px] border border-[#D8DEEA]/80 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-[#000000] text-white shadow-xs'
                : 'bg-[#f0f3ff] text-[#45474b] hover:bg-[#e2e8f8]'
            }`}
          >
            <span>All Pending</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('T5')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'T5'
                ? 'bg-[#000000] text-white shadow-xs'
                : 'bg-[#f0f3ff] text-[#45474b] hover:bg-[#e2e8f8]'
            }`}
          >
            <span>Tier 5 Top Secret</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[rgba(206,105,105,0.14)] text-[#ca6666] text-[10px] font-mono font-bold">
              {t5PendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('T4')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'T4'
                ? 'bg-[#000000] text-white shadow-xs'
                : 'bg-[#f0f3ff] text-[#45474b] hover:bg-[#e2e8f8]'
            }`}
          >
            <span>Tier 4 Secret</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
              {t4PendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('COMPLETED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              activeFilter === 'COMPLETED'
                ? 'bg-[#000000] text-white shadow-xs'
                : 'bg-[#f0f3ff] text-[#45474b] hover:bg-[#e2e8f8]'
            }`}
          >
            <span>Audit History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="min-w-[260px]">
            <UiverseSearchBar
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docket, officer, SHA..."
              onClear={() => setSearchQuery('')}
              compact
            />
          </div>
          <button
            onClick={fetchApprovals}
            title="Refresh Queue"
            className="w-9 h-9 rounded-full bg-[#f0f3ff] hover:bg-[#e2e8f8] border border-[#D8DEEA] flex items-center justify-center text-[#45474b] transition cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>
      </div>

      {errorAlert && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-red-600 text-[18px] shrink-0">error</span>
          <div>
            <div className="font-bold">Dual-Custody Adjudication Block</div>
            <div>{errorAlert}</div>
          </div>
        </div>
      )}

      {/* 3. Empty State if No Requests */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-[26px] border border-[#D8DEEA]/80 p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[32px]">task_alt</span>
          </div>
          <h3 className="text-base font-bold text-[#151c27]">
            {activeFilter === 'COMPLETED' ? 'No Historical Approvals Found' : 'Approvals Queue Cleared'}
          </h3>
          <p className="text-xs text-[#9CA3AF] max-w-md">
            {activeFilter === 'COMPLETED'
              ? 'No finalized change requests found for the selected filter.'
              : 'All staged change requests have been adjudicated and committed to the immutable audit ledger.'}
          </p>
          {activeFilter !== 'ALL' ? (
            <button
              onClick={() => setActiveFilter('ALL')}
              className="mt-2 px-5 py-2 bg-[#000000] text-white text-xs font-semibold rounded-full hover:bg-[#181c22] transition cursor-pointer"
            >
              View All Pending
            </button>
          ) : (
            onReturnToOverview && (
              <button
                onClick={onReturnToOverview}
                className="mt-2 px-5 py-2 bg-[#000000] text-white text-xs font-semibold rounded-full hover:bg-[#181c22] transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            )
          )}
        </div>
      ) : (
        /* 4. Master-Detail Queue & Review Layout */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Queue List (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2 text-xs font-bold text-[#45474b]">
              <span>QUEUE ITEMS ({filteredRequests.length})</span>
              <span className="text-[11px] font-mono text-[#9CA3AF]">SELECT TO REVIEW</span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[780px] overflow-y-auto pr-1">
              {filteredRequests.map((req) => {
                const isSelected = activeRequest?.id === req.id;
                const isT5 = req.document.securityTier === 'T5';
                const isT4 = req.document.securityTier === 'T4';

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-[#f0f3ff] border-[#3f5e93] shadow-md ring-2 ring-[#3f5e93]/20'
                        : 'bg-white hover:bg-[#f8faff] border-[#D8DEEA]/80 hover:border-[#D8DEEA]'
                    }`}
                  >
                    {/* Top Row: Docket + Tier + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#3f5e93] bg-white border border-[#D8DEEA] px-2 py-0.5 rounded-md">
                          {req.document.documentNumber}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isT5
                              ? 'bg-[rgba(206,105,105,0.14)] text-[#ca6666] border border-[#CE6969]/30'
                              : isT4
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {req.document.securityTier}
                        </span>
                      </div>

                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          req.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-red-100 text-red-900 border border-red-300'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-bold text-[#151c27] line-clamp-1">
                      {req.document.title}
                    </h3>

                    {/* Officer + Version + Department */}
                    <div className="flex items-center justify-between text-[11px] text-[#45474b]">
                      <span className="truncate max-w-[170px]">
                        By: <strong className="text-[#151c27]">{req.requester.name}</strong>
                      </span>
                      <span className="font-mono text-[10px] bg-white border border-[#D8DEEA] px-1.5 py-0.2 rounded text-[#3f5e93]">
                        v{req.proposedVersion.versionNumber}.0
                      </span>
                    </div>

                    {/* Dual Custody Indicator */}
                    {req.status === 'PENDING' && (
                      <div className="flex items-center gap-1 text-[10px]">
                        {req.selfApprovalBlocked ? (
                          <span className="text-amber-700 flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[12px]">lock</span>
                            Self-Approval Blocked (Maker)
                          </span>
                        ) : req.canApprove ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            Ready for Your Sign-off
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            Pending Other Approver
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Review & Adjudication Console (8 cols) */}
          {activeRequest && (
            <div className="xl:col-span-8 flex flex-col gap-5">
              {/* Header Target Strip */}
              <div className="bg-white rounded-[26px] shadow-xs border border-[#D8DEEA]/80 p-6 flex flex-col gap-3.5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[rgba(206,105,105,0.14)] text-[#ca6666] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[26px]">policy</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3f5e93] bg-[rgba(131,162,219,0.14)] border border-[#83A2DB]/30 px-2.5 py-0.5 rounded-full">
                          {activeRequest.document.documentNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[rgba(206,105,105,0.14)] text-[#ca6666] border border-[#CE6969]/30 uppercase tracking-wide flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          {activeRequest.document.securityTier} {activeRequest.document.securityTierName}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[#45474b] uppercase">
                          {activeRequest.document.type}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {activeRequest.document.department}
                        </span>
                      </div>

                      <h2 className="text-base font-bold text-[#151c27] mt-1">
                        {activeRequest.document.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#45474b] mt-1">
                        <span>
                          Created:{' '}
                          <strong className="font-mono text-[#151c27]">
                            {new Date(activeRequest.createdAt).toISOString().replace('T', ' ').substring(0, 19)} UTC
                          </strong>
                        </span>
                        <span>
                          Submitting Officer:{' '}
                          <strong className="text-[#151c27]">
                            {activeRequest.requester.name} ({activeRequest.requester.designation})
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className={`px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shrink-0 self-start lg:self-center border ${
                    activeRequest.status === 'PENDING'
                      ? 'bg-amber-50 border-amber-200'
                      : activeRequest.status === 'APPROVED'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <span className={`material-symbols-outlined text-[20px] ${
                      activeRequest.status === 'PENDING'
                        ? 'text-amber-700'
                        : activeRequest.status === 'APPROVED'
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}>
                      {activeRequest.status === 'PENDING' ? 'alarm' : activeRequest.status === 'APPROVED' ? 'verified' : 'cancel'}
                    </span>
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        activeRequest.status === 'PENDING'
                          ? 'text-amber-800'
                          : activeRequest.status === 'APPROVED'
                          ? 'text-emerald-800'
                          : 'text-red-800'
                      }`}>
                        {activeRequest.status === 'PENDING' ? 'Maker-Checker Queue' : `Status: ${activeRequest.status}`}
                      </span>
                      <span className="text-xs text-slate-800">
                        {activeRequest.status === 'PENDING'
                          ? 'Dual sign-off required to promote'
                          : activeRequest.decidedAt
                          ? `Decided on ${new Date(activeRequest.decidedAt).toLocaleDateString()}`
                          : 'Adjudication complete'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Dual Dossier Diff Engine */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* LEFT PANE: Currently Sealed Version */}
                <div className="bg-white rounded-[26px] shadow-xs border border-[#D8DEEA]/80 p-5 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between pb-2 bg-[#f0f3ff] p-3 rounded-2xl border border-[#D8DEEA]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3f5e93]"></span>
                        <span className="text-xs font-bold text-[#151c27] uppercase">
                          {activeRequest.originalVersion.isInitialSubmission ? 'Initial Ingest Docket' : 'Current Active Version'}
                        </span>
                        <span className="font-mono text-xs bg-white border border-[#D8DEEA] px-2 py-0.5 rounded-full text-[#3f5e93] font-bold">
                          v{activeRequest.originalVersion.versionNumber}.0
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">verified_user</span> Baseline
                      </span>
                    </div>

                    {/* File Card */}
                    <div className="p-3.5 bg-[#f0f3ff]/50 border border-[#D8DEEA]/60 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-white border border-[#D8DEEA] flex items-center justify-center text-[#3f5e93] shadow-xs shrink-0">
                          <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#151c27] truncate">
                            {activeRequest.originalVersion.fileName}
                          </span>
                          <span className="text-[11px] text-[#45474b] font-mono">
                            Size: {(activeRequest.originalVersion.fileSize / (1024 * 1024)).toFixed(2)} MB • AES-256-GCM
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SHA Monospace Checksum Box */}
                    <div className="flex flex-col gap-1.5 bg-[#f0f3ff]/40 border border-[#D8DEEA]/60 p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#45474b] uppercase tracking-wider">
                          Baseline SHA-256 Checksum
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeRequest.originalVersion.sha256, 'orig')}
                          className="text-[10px] text-[#3f5e93] hover:underline font-mono cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          {copiedHash === 'orig' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-[#151c27] break-all select-all bg-white border border-[#D8DEEA] p-2 rounded-xl">
                        {activeRequest.originalVersion.sha256}
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANE: Proposed Revision */}
                <div className="bg-white rounded-[26px] shadow-xs border border-amber-300 p-5 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between pb-2 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                        <span className="text-xs font-bold text-amber-950 uppercase">Proposed Revision</span>
                        <span className="font-mono text-xs bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full text-amber-900 font-bold">
                          v{activeRequest.proposedVersion.versionNumber}.0
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                        {activeRequest.status === 'PENDING' ? 'Awaiting Sign-off' : activeRequest.status}
                      </span>
                    </div>

                    {/* File Card */}
                    <div className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">difference</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#151c27] truncate">
                            {activeRequest.proposedVersion.fileName}
                          </span>
                          <span className="text-[11px] text-[#45474b] font-mono">
                            Size: {(activeRequest.proposedVersion.fileSize / (1024 * 1024)).toFixed(2)} MB • Staged
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SHA Monospace Proposed Checksum Box */}
                    <div className="flex flex-col gap-1.5 bg-amber-50/40 border border-amber-200 p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                          Proposed SHA-256 Digest
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeRequest.proposedVersion.sha256, 'prop')}
                          className="text-[10px] text-amber-800 hover:underline font-mono cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          {copiedHash === 'prop' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-[#151c27] break-all select-all bg-white border border-amber-300 p-2 rounded-xl">
                        {activeRequest.proposedVersion.sha256}
                      </div>
                    </div>

                    {/* Requester's Justification */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#45474b] uppercase">Requester Justification</span>
                      <p className="text-xs text-[#151c27] bg-[#f0f3ff]/60 border border-[#D8DEEA] p-3 rounded-2xl leading-relaxed italic">
                        "{activeRequest.reason}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Approver Decision Console OR Audit Attestation Card */}
              {activeRequest.status === 'PENDING' ? (
                <div className="bg-white rounded-[26px] shadow-xs border border-[#D8DEEA]/80 p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#000000] text-white flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">draw</span>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#151c27]">Approver Adjudication Console</h3>
                        <p className="text-[11px] text-[#45474b]">
                          Dual-Custody Section Head / Approver Verification
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[rgba(131,162,219,0.14)] text-[#3f5e93] border border-[#83A2DB]/30 uppercase">
                      AUDIT LEDGER ENFORCED
                    </span>
                  </div>

                  {/* Justification Textarea */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#45474b]">
                      Decision Notes &amp; Statutory Justification <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      disabled={isDeciding || !activeRequest.canApprove}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder={
                        activeRequest.canApprove
                          ? 'Enter mandatory statutory justification, forensic verification details, and sign-off remarks...'
                          : activeRequest.selfApprovalBlocked
                          ? 'Maker-checker rules prohibit the submitting officer from signing off on their own request.'
                          : 'You do not have the required approval clearance for this docket.'
                      }
                      className="w-full p-3.5 bg-[#f0f3ff] border border-[#D8DEEA] text-xs text-[#151c27] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3f5e93] leading-relaxed font-medium placeholder:text-[#9CA3AF] disabled:opacity-60"
                    ></textarea>
                  </div>

                  {/* Dual Custody Warning / Notice */}
                  {activeRequest.selfApprovalBlocked && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                      <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0">gavel</span>
                      <span>
                        <strong>Dual-Custody Mandate:</strong> You are logged in as the submitting officer ({activeRequest.requester.name}). Statutory regulations prohibit self-approval. A designated Section Approver or Head must sign off.
                      </span>
                    </div>
                  )}

                  {!activeRequest.canApprove && !activeRequest.selfApprovalBlocked && (
                    <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2.5 text-xs text-slate-700">
                      <span className="material-symbols-outlined text-[18px] text-slate-500 shrink-0">info</span>
                      <span>
                        This change request is assigned to <strong>{activeRequest.assignedApprover.name}</strong> ({activeRequest.assignedApprover.designation}). Your current account does not hold designated approval clearance.
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isDeciding || !activeRequest.canApprove}
                      onClick={() => handleExecuteDecision('REJECTED')}
                      className="h-10 px-5 rounded-full bg-[rgba(206,105,105,0.14)] hover:bg-[rgba(206,105,105,0.25)] border border-[#CE6969]/30 text-[#ca6666] text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      <span>Reject Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeciding || !activeRequest.canApprove}
                      onClick={() => handleExecuteDecision('APPROVED')}
                      className="btn-uiverse btn-uiverse-primary h-10 px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Approve &amp; Promote Revision</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Completed Request Audit Card */
                <div className="bg-white rounded-[26px] shadow-xs border border-[#D8DEEA]/80 p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#D8DEEA]/60">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center shadow-xs ${
                        activeRequest.status === 'APPROVED' ? 'bg-emerald-600' : 'bg-red-600'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {activeRequest.status === 'APPROVED' ? 'verified' : 'cancel'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#151c27]">Official Audit Attestation Ledger</h3>
                        <p className="text-[11px] text-[#45474b]">
                          Finalized Decision &amp; Blockchain Provenance Record
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      activeRequest.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-red-100 text-red-900 border border-red-300'
                    }`}>
                      {activeRequest.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#f0f3ff] rounded-2xl border border-[#D8DEEA]">
                      <span className="text-[10px] font-bold text-[#45474b] uppercase block">Adjudicating Authority</span>
                      <span className="font-bold text-[#151c27]">
                        {activeRequest.lastDecision?.approverName || activeRequest.assignedApprover.name || 'Designated Approver'}
                      </span>
                    </div>

                    <div className="p-3 bg-[#f0f3ff] rounded-2xl border border-[#D8DEEA]">
                      <span className="text-[10px] font-bold text-[#45474b] uppercase block">Decision Timestamp</span>
                      <span className="font-mono text-[#151c27]">
                        {activeRequest.lastDecision?.timestamp
                          ? new Date(activeRequest.lastDecision.timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                          : activeRequest.decidedAt
                          ? new Date(activeRequest.decidedAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
                          : 'Recorded'}
                      </span>
                    </div>
                  </div>

                  {activeRequest.lastDecision?.comment && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#45474b] uppercase">Approver Remarks</span>
                      <p className="text-xs text-[#151c27] bg-[#f0f3ff] border border-[#D8DEEA] p-3 rounded-2xl leading-relaxed">
                        "{activeRequest.lastDecision.comment}"
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">lock</span>
                    <span>
                      Immutable audit attestation recorded with SHA-256 payload and anchored to ledger.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verification Feedback Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10141A]/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[26px] max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-[#D8DEEA]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#3f5e93] text-[24px] animate-spin">sync</span>
                <h3 className="text-sm font-bold text-[#151c27]">Processing Adjudication Sign-Off</h3>
              </div>
              <span className="font-mono text-[10px] text-[#9CA3AF]">DMS-WORKFLOW</span>
            </div>
            <p className="text-xs text-[#45474b]">
              Validating clearance credentials, updating document version pointers, and committing audit ledger...
            </p>
            <div className="bg-[#10141A] text-white p-3.5 rounded-2xl font-mono text-[11px] space-y-1">
              <div className="text-slate-400">&gt; Validating approver role &amp; clearance...</div>
              <div className="text-slate-400">&gt; Computing SHA-256 version integrity...</div>
              <div className="text-emerald-400 font-bold">&gt; {signingStep}</div>
            </div>
            <div className="w-full bg-[#E9ECF4] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#000000] h-full transition-all duration-300 rounded-full"
                style={{ width: `${signingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
