import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, Eye, EyeOff, Sparkles, Check } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { deriveKeyFromPassphrase } from '../../lib/crypto';
import { useToast } from '../ui/toast';

interface PassphraseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlockSuccess: (key: CryptoKey, passphrase: string) => void;
  title?: string;
  description?: string;
}

export function PassphraseModal({
  open,
  onOpenChange,
  onUnlockSuccess,
  title = 'Doctor Passphrase Authentication',
  description = 'Records are encrypted with AES-GCM 256-bit using PBKDF2 key derivation. Enter your physician passphrase to decrypt and view clinical documentation.',
}: PassphraseModalProps) {
  const { showSuccess, showError } = useToast();
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnlock = async (passToUse?: string) => {
    const finalPass = passToUse || passphrase;
    if (!finalPass.trim()) {
      showError('Passphrase Required', 'Please enter your physician passphrase.');
      return;
    }

    setIsProcessing(true);
    try {
      const derivedKey = await deriveKeyFromPassphrase(finalPass.trim());
      onUnlockSuccess(derivedKey, finalPass.trim());
      onOpenChange(false);
      showSuccess('Vault Unlocked', 'AES-GCM-256 decryption key initialized for this clinical session.');
    } catch (err: any) {
      showError('Decryption Key Derivation Failed', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseDemoPassphrase = () => {
    setPassphrase('drdemo2026');
    handleUnlock('drdemo2026');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base text-slate-900">{title}</DialogTitle>
            <DialogDescription className="text-xs">{description}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="py-3 space-y-4">
        {/* Security badge info */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Web Crypto API (Client-Side Zero-Knowledge)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Keys are derived locally in browser memory using PBKDF2 (100,000 rounds) and never transmitted in plaintext.
          </p>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Physician Passphrase
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleUnlock();
                }
              }}
              placeholder="Enter passphrase (or click Demo button below)"
              className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Quick Demo Helper */}
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={handleUseDemoPassphrase}
            className="text-xs text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            <span>Use default demo passphrase: <strong>drdemo2026</strong></span>
          </button>
        </div>
      </div>

      <DialogFooter className="flex items-center justify-between border-t border-slate-100 pt-3">
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => handleUnlock()}
          isLoading={isProcessing}
          className="gap-1.5 font-semibold"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Unlock Clinical Records</span>
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
