import React, { useState } from 'react';
import {
  FolderHeart,
  Search,
  Calendar,
  User,
  CheckCircle2,
  FileText,
  Eye,
  Trash2,
  Lock,
  Unlock,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Settings,
  Pill,
  Sparkles
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { SavedConsultationRecord } from '../../types/clinical';
import { useToast } from '../ui/toast';

interface RecordsViewProps {
  records: SavedConsultationRecord[];
  vaultUnlocked: boolean;
  onUnlockVault: () => void;
  onLockVault: () => void;
  onSelectRecord: (record: SavedConsultationRecord) => void;
  onDeleteRecord: (id: string) => void;
  onStartNewConsultation: () => void;
  retentionDays: number;
  onUpdateRetentionDays: (days: number) => void;
}

export function RecordsView({
  records,
  vaultUnlocked,
  onUnlockVault,
  onLockVault,
  onSelectRecord,
  onDeleteRecord,
  onStartNewConsultation,
  retentionDays,
  onUpdateRetentionDays,
}: RecordsViewProps) {
  const { showSuccess } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<SavedConsultationRecord | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempRetention, setTempRetention] = useState(retentionDays);

  const filtered = records.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.metadata.patientName.toLowerCase().includes(q) ||
      r.metadata.patientId.toLowerCase().includes(q) ||
      r.metadata.language.toLowerCase().includes(q)
    );
  });

  const confirmDelete = () => {
    if (!recordToDelete) return;
    onDeleteRecord(recordToDelete.metadata.id);
    setRecordToDelete(null);
    showSuccess('Record Purged', 'Clinical note permanently deleted from encrypted storage.');
  };

  const handleSaveRetention = () => {
    onUpdateRetentionDays(tempRetention);
    setShowSettingsModal(false);
    showSuccess('Retention Updated', `Encrypted records auto-delete window set to ${tempRetention} days.`);
  };

  const getAutoDeleteDate = (createdAt: string, days: number) => {
    const d = new Date(createdAt);
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (createdAt: string, days: number) => {
    const expiry = new Date(createdAt).getTime() + days * 24 * 60 * 60 * 1000;
    const diff = expiry - new Date().getTime();
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return Math.max(0, daysLeft);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FolderHeart className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Encrypted Patient Records</h2>
            <Badge variant="teal" size="sm" className="gap-1">
              <Lock className="h-3 w-3" /> AES-GCM-256
            </Badge>
            <Badge variant="slate" size="sm">
              {records.length} Archived
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Encrypted client-side with Web Crypto API and PBKDF2. Auto-deleted after {retentionDays} days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsModal(true)}
            className="text-xs gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Retention ({retentionDays}d)</span>
          </Button>

          {vaultUnlocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onLockVault}
              className="text-xs gap-1.5 text-amber-800 border-amber-300 hover:bg-amber-50"
            >
              <Lock className="h-3.5 w-3.5" /> Lock Vault
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onUnlockVault}
              className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700"
            >
              <Unlock className="h-3.5 w-3.5" /> Unlock Vault
            </Button>
          )}

          <Button onClick={onStartNewConsultation} size="sm" className="text-xs font-semibold">
            New Consultation
          </Button>
        </div>
      </div>

      {/* Lock Status Alert */}
      {!vaultUnlocked && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-xs font-bold block">Encrypted Records Locked</strong>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Clinical text and transcripts are encrypted with AES-GCM. Enter your doctor passphrase to view full clinical details.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onUnlockVault}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0"
          >
            Enter Passphrase
          </Button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search records by patient name or ID, MRN, language..."
          className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full h-5 w-5 flex items-center justify-center font-bold"
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {searchQuery && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Found <strong className="text-slate-800">{filtered.length}</strong> {filtered.length === 1 ? 'record' : 'records'} matching "{searchQuery}"
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-teal-600 hover:underline font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Record Cards */}
      {filtered.length === 0 ? (
        <Card className="border-slate-200 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">No Saved Encrypted Records</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No records match your query. Try clearing the search.'
                : 'Approved clinical notes will be encrypted with AES-GCM and saved here automatically.'}
            </p>
          </div>
          {!searchQuery && (
            <Button onClick={onStartNewConsultation} size="sm">
              Start First Consultation
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((record) => {
            const m = record.metadata;
            const dateStr = new Date(m.approvedAt || m.consultationDate).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            );

            const autoDeleteDate = getAutoDeleteDate(
              m.approvedAt || m.consultationDate,
              retentionDays
            );
            const daysLeft = getDaysRemaining(
              m.approvedAt || m.consultationDate,
              retentionDays
            );

            return (
              <Card
                key={m.id}
                className="border-slate-200/90 hover:border-teal-400 hover:shadow-md transition-all group overflow-hidden"
              >
                <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                        {m.patientName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{m.patientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{m.patientId}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant="teal" size="sm" className="gap-1 font-semibold text-[10px]">
                        <Lock className="h-2.5 w-2.5" /> Encrypted
                      </Badge>
                      <Badge variant="emerald" size="sm" className="gap-1 font-semibold text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Signed
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs text-slate-600">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{dateStr}</span>
                    </span>
                    <Badge variant="slate" size="sm">
                      {m.language}
                    </Badge>
                  </div>

                  {/* Summary content preview or encrypted notice */}
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-700">Subjective & Problem:</div>
                    {vaultUnlocked ? (
                      <p className="text-slate-600 line-clamp-2 leading-relaxed font-sans">
                        {record.soapNote.soap.S[0]?.text || 'Encounter documented.'}
                      </p>
                    ) : (
                      <div className="p-2 rounded-lg bg-slate-100 text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">Ciphertext: AES-GCM-256 [Locked]</span>
                      </div>
                    )}
                  </div>

                  {/* Auto-retention expiry info */}
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="h-3 w-3 text-teal-600" />
                      <span>Auto-delete:</span>
                    </span>
                    <span className="font-medium text-slate-800">
                      {autoDeleteDate} ({daysLeft} days remaining)
                    </span>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {m.approvedBy || 'Dr. Demo, MD'}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(record)}
                        className="px-2 py-1 rounded text-slate-500 hover:text-red-700 hover:bg-red-50 text-xs transition-colors flex items-center gap-1 cursor-pointer font-medium"
                        title="Delete Now"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete now</span>
                      </button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          if (!vaultUnlocked) {
                            onUnlockVault();
                          } else {
                            onSelectRecord(record);
                          }
                        }}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{vaultUnlocked ? 'View Note' : 'Decrypt & View'}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Manual Delete Confirmation Dialog */}
      <Dialog open={Boolean(recordToDelete)} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle>Confirm Immediate Record Deletion</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to permanently delete the clinical record for{' '}
            <strong>{recordToDelete?.metadata.patientName}</strong> ({recordToDelete?.metadata.patientId})?
            This action cannot be undone and purges the AES-GCM encrypted ciphertext immediately.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setRecordToDelete(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Confirm Permanent Deletion</span>
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Retention Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-600" />
            <DialogTitle>Data Retention & Auto-Purge Policy</DialogTitle>
          </div>
          <DialogDescription>
            Configure automatic record destruction to comply with medical data privacy regulations.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4 text-xs">
          <label className="font-semibold text-slate-800 block">
            Auto-delete clinical records after:
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[7, 14, 30, 60, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTempRetention(days)}
                className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  tempRetention === days
                    ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Auto-Purge Mechanism:</div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              On every application load, ClinicNote AI scans the IndexedDB encrypted vault and permanently
              destroys all records whose creation timestamp exceeds the {tempRetention}-day window.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowSettingsModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveRetention} className="font-semibold">
            Save Policy
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
