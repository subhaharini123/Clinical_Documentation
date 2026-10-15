import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mic,
  FileText,
  Lock,
  Download,
  Filter,
  Search,
  Eye,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AuditLogEntry, AuditActionType } from '../../types/clinical';
import { useToast } from '../ui/toast';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
}

export function AuditLogView({ auditLogs }: AuditLogViewProps) {
  const { showSuccess } = useToast();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const ACTION_FILTER_OPTIONS: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Actions' },
    { id: 'consent given', label: 'Consent Given' },
    { id: 'recording started', label: 'Recording Started' },
    { id: 'note generated', label: 'Note Generated' },
    { id: 'flag confirmed', label: 'Flag Confirmed' },
    { id: 'note edited', label: 'Note Edited' },
    { id: 'approved', label: 'Approved' },
    { id: 'viewed', label: 'Viewed (Decrypted)' },
    { id: 'deleted', label: 'Deleted' },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    // Type match
    const matchesType =
      filterType === 'all' ||
      log.type === filterType ||
      (filterType === 'consent given' && log.type === 'consent') ||
      (filterType === 'recording started' && log.type === 'recording') ||
      (filterType === 'note generated' && (log.type === 'generation' || log.type === 'transcription')) ||
      (filterType === 'flag confirmed' && log.type === 'confirmation') ||
      (filterType === 'note edited' && log.type === 'edit') ||
      (filterType === 'approved' && log.type === 'approval');

    // Search query match
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.id.toLowerCase().includes(q);

    return matchesType && matchesSearch;
  });

  const getActionBadge = (type: AuditLogEntry['type']) => {
    switch (type) {
      case 'consent given':
      case 'consent':
        return <Badge variant="teal">Consent Given</Badge>;
      case 'recording started':
      case 'recording':
        return <Badge variant="slate">Recording Started</Badge>;
      case 'recording stopped':
        return <Badge variant="slate">Recording Stopped</Badge>;
      case 'note generated':
      case 'generation':
        return <Badge variant="teal">Note Generated</Badge>;
      case 'flag confirmed':
      case 'confirmation':
        return <Badge variant="emerald">Flag Confirmed</Badge>;
      case 'note edited':
      case 'edit':
        return <Badge variant="amber">Note Edited</Badge>;
      case 'approved':
      case 'approval':
        return <Badge variant="emerald">Approved & Signed</Badge>;
      case 'viewed':
        return <Badge variant="default">Viewed (Decrypted)</Badge>;
      case 'deleted':
        return <Badge variant="red">Deleted</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Category', 'User (Actor)', 'Details', 'Audit ID'];
    const rows = filteredLogs.map((log) => [
      `"${new Date(log.timestamp).toISOString()}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      `"${log.type}"`,
      `"${log.actor}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.id}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinicnote-audit-trail-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showSuccess('Audit CSV Exported', 'Downloaded audit trail for compliance verification.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Compliance & Audit Log</h2>
            <Badge variant="teal" size="sm">
              {auditLogs.length} Total Events
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable chronicle of patient consent, recording lifecycle, AI drafts, flag confirmations, clinician edits, views, and deletions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="gap-1.5 text-xs font-semibold"
        >
          <Download className="h-3.5 w-3.5" /> Export as CSV
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Action Type Filter Pill Bar */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs flex-1">
          {ACTION_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilterType(opt.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterType === opt.id
                  ? 'bg-white text-teal-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Free-text search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Filterable Table */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
              Audit Event Records ({filteredLogs.length} Matching)
            </CardTitle>
            <span className="text-[11px] text-slate-400">Chronological • UTC & Local ISO</span>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold">
                <th className="py-3 px-4 w-44">Timestamp</th>
                <th className="py-3 px-4 w-44">Action / Category</th>
                <th className="py-3 px-4 w-36">User (Actor)</th>
                <th className="py-3 px-4">Event Details & Evidence</th>
                <th className="py-3 px-4 w-28 text-right font-mono text-[10px]">Event ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit events match current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => {
                  const d = new Date(entry.timestamp);
                  const formattedTime = d.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const formattedDate = d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{formattedDate}</div>
                        <div className="text-[10px] text-slate-400">{formattedTime}</div>
                      </td>

                      {/* Action Category Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getActionBadge(entry.type)}
                          <div className="text-[11px] font-bold text-slate-800 truncate">
                            {entry.action}
                          </div>
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {entry.actor}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 text-slate-700 leading-relaxed font-sans">
                        {entry.details}
                      </td>

                      {/* Event ID */}
                      <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                        {entry.id.split('-').slice(-2).join('-')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
