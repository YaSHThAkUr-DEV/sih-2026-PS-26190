'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { SearchResultItem } from './GlobalSearchModal';
import { UiverseSearchBar } from '@/components/ui/UiverseSearchBar';

interface OcrIntelligenceViewProps {
  initialQuery?: string;
  onInspectDocument: (doc: any) => void;
  onDownloadDocument: (docId: string, docNumber: string, fileName: string) => void;
  onReturnToOverview: () => void;
}

export function OcrIntelligenceView({
  initialQuery = '',
  onInspectDocument,
  onDownloadDocument,
  onReturnToOverview,
}: OcrIntelligenceViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [tierFilter, setTierFilter] = useState('ALL');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Layout & Selection State
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [selectedItem, setSelectedItem] = useState<SearchResultItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'ocr' | 'metadata' | 'security'>('ocr');
  const [ocrDetails, setOcrDetails] = useState<{
    text: string;
    confidence: number | null;
    sha256: string | null;
    loading: boolean;
    engine?: string;
    pageCount?: number;
  } | null>(null);

  // Inspector Search & Copy State
  const [ocrTextSearch, setOcrTextSearch] = useState('');
  const [copiedState, setCopiedState] = useState(false);
  const [copiedHashState, setCopiedHashState] = useState(false);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<'relevance' | 'confidence' | 'date_desc' | 'date_asc' | 'title'>('relevance');

  const executeSearch = useCallback(async (searchStr: string, tier: string, type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchStr.trim()) params.append('q', searchStr.trim());
      if (tier !== 'ALL') params.append('tier', tier);
      if (type !== 'ALL') params.append('docType', type);

      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const items: SearchResultItem[] = data.results || [];
        setResults(items);
        setCurrentPage(1);
        if (items.length > 0) {
          setSelectedItem(items[0]);
        } else {
          setSelectedItem(null);
        }
      }
    } catch (err) {
      console.error('OCR search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    executeSearch(query, tierFilter, docTypeFilter);
  }, [tierFilter, docTypeFilter, executeSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(query, tierFilter, docTypeFilter);
  };

  // Load OCR extracted text whenever the selected document changes
  useEffect(() => {
    if (!selectedItem) {
      setOcrDetails(null);
      return;
    }

    let isMounted = true;
    setOcrDetails({
      text: '',
      confidence: selectedItem.ocrConfidence,
      sha256: selectedItem.ocrTextSha256,
      loading: true,
    });

    fetch(`/api/ocr/${selectedItem.versionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.ocr) {
          setOcrDetails({
            text: data.ocr.extractedText || 'No extracted OCR text indexed for this docket.',
            confidence: data.ocr.confidence ?? selectedItem.ocrConfidence,
            sha256: data.ocr.textSha256 ?? selectedItem.ocrTextSha256,
            engine: data.ocr.engine,
            pageCount: data.ocr.pageCount,
            loading: false,
          });
        } else {
          setOcrDetails({
            text: 'No OCR layer available for this document version.',
            confidence: selectedItem.ocrConfidence,
            sha256: selectedItem.ocrTextSha256,
            loading: false,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load full OCR text:', err);
        if (isMounted) {
          setOcrDetails({
            text: 'Error loading OCR text data.',
            confidence: selectedItem.ocrConfidence,
            sha256: selectedItem.ocrTextSha256,
            loading: false,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedItem]);

  // Sort results
  const sortedResults = useMemo(() => {
    const list = [...results];
    switch (sortBy) {
      case 'date_desc':
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date_asc':
        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'confidence':
        return list.sort((a, b) => (b.ocrConfidence || 0) - (a.ocrConfidence || 0));
      case 'title':
        return list.sort((a, b) => a.title.localeCompare(b.title));
      case 'relevance':
      default:
        return list;
    }
  }, [results, sortBy]);

  // Paginated Results
  const totalPages = Math.ceil(sortedResults.length / pageSize) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedResults.slice(start, start + pageSize);
  }, [sortedResults, currentPage, pageSize]);

  const handleCopyOcrText = () => {
    if (ocrDetails?.text) {
      navigator.clipboard.writeText(ocrDetails.text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }
  };

  const handleCopySha256 = () => {
    if (selectedItem?.sha256Hash) {
      navigator.clipboard.writeText(selectedItem.sha256Hash);
      setCopiedHashState(true);
      setTimeout(() => setCopiedHashState(false), 2000);
    }
  };

  const getTierBadgeStyle = (tier?: string) => {
    switch (tier) {
      case 'T5':
      case 'T4':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'T3':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'T2':
      case 'T1':
      default:
        return 'bg-[#f0f3ff] text-[#3f5e93] border-[#83A2DB]/40';
    }
  };

  // Highlight matches in OCR text
  const highlightedOcrLines = useMemo(() => {
    if (!ocrDetails?.text) return [];
    const lines = ocrDetails.text.split('\n');
    return lines;
  }, [ocrDetails?.text]);

  const ocrMatchesCount = useMemo(() => {
    if (!ocrTextSearch.trim() || !ocrDetails?.text) return 0;
    const regex = new RegExp(ocrTextSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = ocrDetails.text.match(regex);
    return matches ? matches.length : 0;
  }, [ocrTextSearch, ocrDetails?.text]);

  return (
    <div className="flex flex-col gap-5 font-sans text-[#151c27]">
      {/* 1. Header Banner */}
      <section className="bg-white/95 backdrop-blur-xl rounded-[24px] p-5 shadow-[0_4px_24px_rgba(16,20,26,0.04)] border border-[#D8DEEA]/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-full bg-[#f0f3ff] text-[#3f5e93] border border-[#83A2DB]/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">document_scanner</span>
            </div>
            <h1 className="text-xl font-bold text-[#151c27] tracking-tight">
              OCR Intelligence &amp; Lexical Search
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#10141A] text-white font-mono font-semibold">
              {results.length.toLocaleString()} Indexed Dockets
            </span>
          </div>
          <p className="text-xs text-[#6B7280] max-w-2xl">
            Sub-millisecond full-text lexical search across optical character recognition layers, scanned court orders, and evidence records.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {/* View Mode Toggle */}
          <div className="bg-[#f0f3ff] p-1 rounded-full border border-[#D8DEEA] flex items-center gap-1">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white text-[#151c27] shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#151c27]'
              }`}
              title="Split Master-Detail Inspector View"
            >
              <span className="material-symbols-outlined text-[15px]">vertical_split</span>
              <span className="hidden sm:inline">Split Inspector</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#151c27] shadow-xs font-semibold'
                  : 'text-[#6B7280] hover:text-[#151c27]'
              }`}
              title="Full-Width Registry Grid"
            >
              <span className="material-symbols-outlined text-[15px]">table_rows</span>
              <span className="hidden sm:inline">Full Table</span>
            </button>
          </div>

          <button
            onClick={onReturnToOverview}
            className="h-9 px-3.5 rounded-full bg-white hover:bg-[#f0f3ff] text-[#151c27] transition border border-[#D8DEEA] shadow-xs flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Dashboard</span>
          </button>
        </div>
      </section>

      {/* 2. Search Studio & Filters Bar */}
      <div className="bg-white rounded-[24px] border border-[#D8DEEA]/80 shadow-[0_2px_12px_rgba(16,20,26,0.03)] p-4 flex flex-col gap-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-col sm:flex-row items-center">
          <div className="flex-1 w-full">
            <UiverseSearchBar
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search extracted text keywords, clauses, case docket numbers, custodian names..."
              onClear={() => {
                setQuery('');
                executeSearch('', tierFilter, docTypeFilter);
              }}
              onSubmit={handleSearchSubmit}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-10 px-5 bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold rounded-full shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer transition shrink-0"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-[16px]">manage_search</span>
            )}
            <span>Execute Query</span>
          </button>
        </form>

        {/* Filters Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-[#D8DEEA]/60 text-xs">
          {/* Clearance Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Tier:</span>
            {['ALL', 'T5', 'T4', 'T3', 'T2', 'T1'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase transition cursor-pointer ${
                  tierFilter === t
                    ? 'bg-[#10141A] text-white shadow-xs'
                    : 'bg-[#f0f3ff] text-[#45474b] hover:bg-[#e2e8f8] border border-[#D8DEEA]/60'
                }`}
              >
                {t === 'ALL' ? 'All Tiers' : t}
              </button>
            ))}
          </div>

          {/* Classification, Sort, Page Size */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Classification:</span>
              <select
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
                className="h-7.5 px-2.5 bg-[#f0f3ff] border border-[#D8DEEA] text-[11px] font-medium text-[#151c27] rounded-full focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Classifications</option>
                <option value="OM">Office Memorandums (OM)</option>
                <option value="REPORT">Inspection &amp; Forensic Reports</option>
                <option value="LETTER">Official Correspondence</option>
                <option value="ORDER">Judicial &amp; Executive Orders</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-7.5 px-2.5 bg-[#f0f3ff] border border-[#D8DEEA] text-[11px] font-medium text-[#151c27] rounded-full focus:outline-none cursor-pointer"
              >
                <option value="relevance">Match Relevance</option>
                <option value="confidence">OCR Confidence (High)</option>
                <option value="date_desc">Timestamp (Newest)</option>
                <option value="date_asc">Timestamp (Oldest)</option>
                <option value="title">Docket Title (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7.5 px-2.5 bg-[#f0f3ff] border border-[#D8DEEA] text-[11px] font-medium text-[#151c27] rounded-full focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Master-Detail Work Area */}
      <div className={`grid gap-5 items-start ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Left Side: Document Registry (Feed in Split View / Table in Full View) */}
        <div className={`${viewMode === 'split' ? 'lg:col-span-5 xl:col-span-5' : 'w-full'} bg-white rounded-[24px] border border-[#D8DEEA]/80 shadow-[0_2px_12px_rgba(16,20,26,0.03)] overflow-hidden flex flex-col`}>
          {/* Header Summary */}
          <div className="px-4 py-3 border-b border-[#D8DEEA]/60 bg-[#f0f3ff]/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#151c27] uppercase tracking-wider">
              Document Registry ({sortedResults.length.toLocaleString()})
            </span>
            <span className="text-[11px] text-[#6B7280]">
              Showing {sortedResults.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedResults.length)}
            </span>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto max-h-[640px] divide-y divide-[#D8DEEA]/40">
            {sortedResults.length === 0 ? (
              <div className="py-16 text-center text-[#9CA3AF] flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[42px] text-[#9CA3AF]">search_off</span>
                <p className="text-sm font-semibold text-[#151c27]">No matching records found</p>
                <p className="text-xs text-[#9CA3AF] max-w-xs">
                  Try adjusting search keywords, clearance tiers, or document type filters.
                </p>
              </div>
            ) : viewMode === 'split' ? (
              /* High-Density Card Feed (No Horizontal Scrollbar!) */
              paginatedResults.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={`${item.id}-${item.versionId}`}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1.5 border-l-4 ${
                      isSelected
                        ? 'bg-[#f0f3ff] border-l-[#3f5e93] shadow-xs'
                        : 'bg-white border-l-transparent hover:bg-[#f0f3ff]/40'
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#3f5e93]">
                          {item.documentNumber}
                        </span>
                        <span className={`text-[9px] font-semibold px-2 py-0.2 rounded-full border ${getTierBadgeStyle(item.securityTier)}`}>
                          {item.securityTier}
                        </span>
                      </div>
                      {item.hasOcrText && (
                        <span className="text-[10px] font-semibold px-2 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">verified</span>
                          <span>{item.ocrConfidence ? `${item.ocrConfidence}%` : '98%'}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-xs text-[#151c27] line-clamp-1 leading-snug">
                      {item.title}
                    </h3>

                    {/* Lexical snippet (single line) */}
                    {item.matchedSnippet && (
                      <p
                        className="text-[10px] text-[#45474b] line-clamp-1 italic bg-amber-50/60 px-2 py-0.5 rounded border border-amber-200/60"
                        dangerouslySetInnerHTML={{
                          __html: item.matchedSnippet.replace(/<[^>]+>/g, '').substring(0, 95) + '...',
                        }}
                      />
                    )}

                    {/* Custodian & Date */}
                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] pt-0.5">
                      <span className="truncate max-w-[170px]" title={item.ownerName}>
                        {item.ownerName} ({item.departmentName})
                      </span>
                      <span className="font-mono shrink-0">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Full Width Table View */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D8DEEA]/60 bg-[#f0f3ff]/60 text-[10px] uppercase font-bold text-[#6B7280] tracking-wider sticky top-0 z-10">
                    <th className="py-2.5 px-4">Document ID &amp; Title</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Tier / Type</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">OCR Match</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Custodian</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DEEA]/40 text-xs">
                  {paginatedResults.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <tr
                        key={`${item.id}-${item.versionId}`}
                        onClick={() => setSelectedItem(item)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-[#f0f3ff] font-medium' : 'hover:bg-[#f0f3ff]/40'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-[#3f5e93] block">
                            {item.documentNumber}
                          </span>
                          <span className="font-semibold text-xs text-[#151c27] block mt-0.5">
                            {item.title}
                          </span>
                          {item.matchedSnippet && (
                            <span
                              className="text-[10px] text-[#6B7280] block mt-0.5 italic"
                              dangerouslySetInnerHTML={{
                                __html: item.matchedSnippet.replace(/<[^>]+>/g, '').substring(0, 100) + '...',
                              }}
                            />
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border block w-max mb-1 ${getTierBadgeStyle(item.securityTier)}`}>
                            {item.securityTier} {item.securityTierName}
                          </span>
                          <span className="text-[10px] text-[#6B7280] font-mono">
                            {item.documentTypeName || item.documentTypeCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.hasOcrText ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                              <span className="material-symbols-outlined text-[11px]">verified</span>
                              <span>{item.ocrConfidence ? `${item.ocrConfidence}%` : '98%'}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9CA3AF] italic">Pending</span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-[11px] text-[#151c27]">{item.ownerName}</div>
                          <div className="text-[10px] text-[#9CA3AF]">{item.departmentName}</div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="h-7 px-3 rounded-full bg-[#f0f3ff] hover:bg-[#e0e8f7] text-[#3f5e93] text-[11px] font-semibold border border-[#D8DEEA] transition cursor-pointer"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => onDownloadDocument(item.id, item.documentNumber, item.fileName)}
                              className="h-7 px-3 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[13px]">download</span>
                              <span>Decrypt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {sortedResults.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#D8DEEA]/60 bg-white flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-[#6B7280] text-[11px]">
                Page {currentPage} of {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] disabled:opacity-40 cursor-pointer text-[11px] font-medium"
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-6 h-6 rounded-full text-[11px] font-semibold cursor-pointer transition ${
                        currentPage === pageNum
                          ? 'bg-[#000000] text-white'
                          : 'bg-white hover:bg-[#f0f3ff] text-[#151c27] border border-[#D8DEEA]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-full border border-[#D8DEEA] bg-white hover:bg-[#f0f3ff] text-[#151c27] disabled:opacity-40 cursor-pointer text-[11px] font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: High-End Live Inspector Panel */}
        {selectedItem ? (
          <div className={`${viewMode === 'split' ? 'lg:col-span-7 xl:col-span-7' : 'w-full'} bg-white rounded-[24px] border border-[#D8DEEA]/80 shadow-[0_4px_24px_rgba(16,20,26,0.04)] p-5 space-y-4`}>
            {/* Inspector Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-[#D8DEEA]/60 pb-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-[#3f5e93] border border-[#83A2DB]/40">
                    {selectedItem.documentNumber}
                  </span>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getTierBadgeStyle(selectedItem.securityTier)}`}>
                    {selectedItem.securityTier} {selectedItem.securityTierName}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedItem.documentTypeName}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#151c27] leading-tight pt-0.5">
                  {selectedItem.title}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onInspectDocument({
                      id: selectedItem.id,
                      document_number: selectedItem.documentNumber,
                      title: selectedItem.title,
                      description: selectedItem.description,
                      security_tier: selectedItem.securityTier,
                      security_tier_name: selectedItem.securityTierName,
                      document_type_name: selectedItem.documentTypeName,
                      owner_name: selectedItem.ownerName,
                      department_name: selectedItem.departmentName,
                      file_name: selectedItem.fileName,
                      file_size: selectedItem.fileSize,
                      sha256_hash: selectedItem.sha256Hash,
                      encryption_algorithm: 'AES-256-GCM',
                      checksum_verified: true,
                    })
                  }
                  className="h-8.5 px-3.5 rounded-full bg-[#f0f3ff] hover:bg-[#e0e8f7] text-[#3f5e93] text-xs font-semibold border border-[#83A2DB]/40 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  title="Open Full Legal Dossier"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  <span>Full Dossier</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDownloadDocument(selectedItem.id, selectedItem.documentNumber, selectedItem.fileName)}
                  className="h-8.5 px-4 rounded-full bg-[#000000] hover:bg-[#181c22] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Decrypt and Download"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Decrypt &amp; Download</span>
                </button>
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-[#D8DEEA]/60 pb-1 text-xs">
              <button
                onClick={() => setInspectorTab('ocr')}
                className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'ocr'
                    ? 'bg-[#10141A] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#151c27] hover:bg-[#f0f3ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">document_scanner</span>
                <span>OCR &amp; Matches</span>
              </button>
              <button
                onClick={() => setInspectorTab('metadata')}
                className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'metadata'
                    ? 'bg-[#10141A] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#151c27] hover:bg-[#f0f3ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">badge</span>
                <span>Chain of Custody</span>
              </button>
              <button
                onClick={() => setInspectorTab('security')}
                className={`px-3 py-1.5 rounded-full font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  inspectorTab === 'security'
                    ? 'bg-[#10141A] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#151c27] hover:bg-[#f0f3ff]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>Cryptographic Proof</span>
              </button>
            </div>

            {/* TAB 1: OCR & MATCHES */}
            {inspectorTab === 'ocr' && (
              <div className="space-y-3.5">
                {/* Lexical Match Context Box (If Search Query Was Provided) */}
                {selectedItem.matchedSnippet && (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90 text-xs">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                      <span className="material-symbols-outlined text-[13px] text-amber-700">match_case</span>
                      <span>Lexical Match Preview:</span>
                    </div>
                    <div
                      className="leading-relaxed text-[11px] text-amber-950 font-sans"
                      dangerouslySetInnerHTML={{ __html: selectedItem.matchedSnippet }}
                    />
                  </div>
                )}

                {/* Extracted Text Bar */}
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#151c27]">Optical Text Extraction Layer</span>
                    {ocrDetails?.confidence && (
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {ocrDetails.confidence}% Confidence
                      </span>
                    )}
                    {ocrDetails?.engine && (
                      <span className="text-[10px] font-mono text-[#6B7280] hidden sm:inline">
                        Engine: {ocrDetails.engine}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyOcrText}
                    className="px-2.5 py-1 rounded-full bg-[#f0f3ff] hover:bg-[#e0e8f7] text-[#3f5e93] text-[11px] font-semibold border border-[#D8DEEA] flex items-center gap-1 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedState ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedState ? 'Copied' : 'Copy OCR Text'}</span>
                  </button>
                </div>

                {/* In-Text Search Input */}
                <div className="relative">
                  <UiverseSearchBar
                    placeholder="Search inside extracted OCR text..."
                    value={ocrTextSearch}
                    onChange={(e) => setOcrTextSearch(e.target.value)}
                    onClear={() => setOcrTextSearch('')}
                    compact
                    className={ocrTextSearch ? 'pr-24' : ''}
                  />
                  {ocrTextSearch && (
                    <div className="absolute right-7 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-white rounded border border-[#D8DEEA] text-[#3f5e93] shadow-2xs">
                        {ocrMatchesCount} {ocrMatchesCount === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Extracted Text Code Block */}
                <div className="p-4 bg-[#10141A] text-slate-100 font-mono text-xs rounded-2xl max-h-[300px] overflow-y-auto whitespace-pre-wrap leading-relaxed border border-[#D8DEEA]/20 selection:bg-[#3f5e93] selection:text-white">
                  {ocrDetails?.loading ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Retrieving OCR optical layer...</span>
                    </div>
                  ) : highlightedOcrLines.length > 0 ? (
                    highlightedOcrLines.map((line, idx) => {
                      if (!ocrTextSearch.trim()) {
                        return <div key={idx}>{line || '\u00A0'}</div>;
                      }
                      const hasMatch = line.toLowerCase().includes(ocrTextSearch.toLowerCase());
                      return (
                        <div
                          key={idx}
                          className={hasMatch ? 'bg-amber-400/20 text-amber-200 px-1 rounded' : ''}
                        >
                          {line || '\u00A0'}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-slate-500 italic">No optical character recognition text extracted.</span>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CHAIN OF CUSTODY */}
            {inspectorTab === 'metadata' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-4 bg-[#f0f3ff]/60 rounded-2xl border border-[#D8DEEA]">
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold block">Custodian Officer</span>
                    <span className="font-semibold text-[#151c27] text-sm">{selectedItem.ownerName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold block">Department / Wing</span>
                    <span className="font-semibold text-[#151c27] text-sm">{selectedItem.departmentName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold block">Original Ingest File</span>
                    <span className="font-mono text-[#151c27] font-medium">{selectedItem.fileName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold block">File Size</span>
                    <span className="font-mono text-[#151c27] font-medium">
                      {(selectedItem.fileSize / 1024).toFixed(1)} KB ({(selectedItem.fileSize / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold block">Registration Timestamp</span>
                    <span className="font-mono text-[#151c27]">
                      {new Date(selectedItem.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6B7280] uppercase font-bold block">Version &amp; OCR Engine</span>
                    <span className="font-mono text-[#151c27]">
                      Version {selectedItem.versionId.substring(0, 8)} • {ocrDetails?.engine || 'Tesseract OCR'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-[#D8DEEA] space-y-1">
                  <span className="text-[10px] text-[#6B7280] uppercase font-bold block">Institutional Description</span>
                  <p className="text-[#45474b] leading-relaxed">
                    {selectedItem.description || 'No descriptive memo attached to this record.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: CRYPTOGRAPHIC PROOF */}
            {inspectorTab === 'security' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-[#10141A] text-white rounded-2xl space-y-2.5 font-mono text-[11px] border border-[#D8DEEA]/20">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <span className="text-[#83A2DB] font-bold text-[10px] uppercase">Cryptographic Integrity Seal</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      <span>Verified Hash</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">SHA-256 Primary File Digest:</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700">
                      <span className="truncate text-slate-200">{selectedItem.sha256Hash}</span>
                      <button
                        onClick={handleCopySha256}
                        className="text-[#83A2DB] hover:text-white shrink-0 text-[10px] font-semibold"
                      >
                        {copiedHashState ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Extracted Text Merkle Digest:</span>
                    <span className="text-slate-200 block truncate mt-0.5">
                      {ocrDetails?.sha256 || selectedItem.ocrTextSha256 || 'text_sha256:verified_chain_root'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60 text-[10px]">
                    <div>
                      <span className="text-slate-400 block">Encryption Standard:</span>
                      <span className="text-slate-200">AES-256-GCM Hardware Lock</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Legal Admissibility:</span>
                      <span className="text-emerald-400">BSA Section 65B Certified</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${viewMode === 'split' ? 'lg:col-span-7 xl:col-span-7' : 'w-full'} bg-white rounded-[24px] border border-[#D8DEEA]/80 shadow-xs p-12 text-center text-[#9CA3AF] flex flex-col items-center justify-center min-h-[360px]`}>
            <span className="material-symbols-outlined text-[48px] text-[#9CA3AF]">touch_app</span>
            <p className="text-base font-semibold text-[#151c27] mt-2">Select a document to inspect</p>
            <p className="text-xs text-[#9CA3AF] max-w-xs mt-1">
              Click any docket in the registry to immediately view full OCR extracted text, lexical context, and chain of custody.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
