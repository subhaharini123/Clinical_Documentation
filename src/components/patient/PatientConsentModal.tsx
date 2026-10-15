import React, { useState } from 'react';
import { ShieldCheck, Bell, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { StoredPatient, updatePatientConsent, addAuditLogEntry } from '../../lib/store';
import { useToast } from '../ui/toast';

interface PatientConsentModalProps {
  open: boolean;
  patient: StoredPatient;
  onConsentComplete: (updatedPatient: StoredPatient) => void;
  language?: 'english' | 'tamil';
}

export function PatientConsentModal({
  open,
  patient,
  onConsentComplete,
  language = 'english',
}: PatientConsentModalProps) {
  const { showSuccess } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestNotification = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    }
  };

  const handleSubmit = async () => {
    if (!agreed) return;
    setIsSubmitting(true);
    try {
      const perm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      await updatePatientConsent(patient.id, true, perm as any);

      await addAuditLogEntry({
        action: 'Patient Consent Granted',
        user: patient.name,
        role: 'patient',
        details: `Patient consented to medicine reminders and adherence sharing with primary physician. Browser notifications: ${perm}`,
        patientId: patient.id,
      });

      const updated = {
        ...patient,
        consentGiven: true,
        consentDate: new Date().toISOString(),
        notificationPermission: perm as any,
      };

      showSuccess(
        language === 'tamil' ? 'ஒப்புதல் பதிவு செய்யப்பட்டது' : 'Consent Recorded',
        language === 'tamil'
          ? 'மருந்து நினைவூட்டல்கள் இப்போது இயக்கப்பட்டுள்ளன.'
          : 'Medicine reminders are now active on your device.'
      );

      onConsentComplete(updated);
    } catch (err: any) {
      console.error('Consent save failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} className="max-w-lg">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {language === 'tamil' ? 'நோயாளி பராமரிப்பு ஒப்புதல்' : 'Patient Care & Reminder Consent'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {language === 'tamil'
                ? 'உங்கள் ஆரோக்கியப் பயணத்தை மருத்துவர் மேற்பார்வையில் பாதுகாப்பாகத் தொடருங்கள்'
                : 'Stay on track with your prescription under your doctor’s clinical care'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="p-5 space-y-4 text-slate-700 text-sm">
        {/* Core Consent Statement */}
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200/90 text-teal-950 space-y-2">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm font-semibold leading-relaxed">
              {language === 'tamil' ? (
                <>
                  "எனது மருந்து நினைவூட்டல்களைப் பெறவும், நான் மருந்து எடுத்துக்கொள்வதை எனது மருத்துவரிடம் பகிர்ந்து கொள்ளவும் சம்மதிக்கிறேன்."
                </>
              ) : (
                <>
                  "I agree to medicine reminders and to share my adherence with my doctor."
                </>
              )}
            </div>
          </div>
        </div>

        {/* Browser Notifications Permission Explanation */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {language === 'tamil' ? 'உலாவி அறிவிப்பு அனுமதி' : 'Browser Notification Permission'}
            </h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {language === 'tamil'
              ? 'காலை, மதியம் மற்றும் இரவு மருந்துகளை சரியான நேரத்தில் நினைவூட்ட இந்த சாதனத்தில் அறிவிப்பு அனுமதியை வழங்கவும். உங்கள் மருத்துவர் உங்கள் முன்னேற்றத்தைக் கண்காணிக்க இது உதவும்.'
              : 'We will alert you at your scheduled medicine times (morning, afternoon, night) so you never miss a dose. Your doctor Dr. Demo can also check that your treatment is safely on track.'}
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-slate-500">
              Status:{' '}
              <strong className={notificationPermission === 'granted' ? 'text-teal-700' : 'text-amber-700'}>
                {notificationPermission.toUpperCase()}
              </strong>
            </span>
            {notificationPermission !== 'granted' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestNotification}
                className="text-xs gap-1.5 border-teal-300 text-teal-800 hover:bg-teal-50"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>{language === 'tamil' ? 'அனுமதி அளி' : 'Enable Notifications'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Checkbox agreement */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-xs font-medium text-slate-800">
            {language === 'tamil'
              ? 'நான் இந்த விதிமுறைகளைப் படித்து ஒப்புக்கொள்கிறேன். எனது மருத்துவர் Dr. Demo உடன் எனது மருந்தெடுப்பு விபரங்கள் பகிரப்படும்.'
              : 'I have read and agree. My medicine adherence status will be securely accessible to my primary care doctor.'}
          </span>
        </label>
      </div>

      <DialogFooter className="p-4 border-t border-slate-100 flex items-center justify-end gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!agreed || isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs"
        >
          {isSubmitting
            ? 'Saving...'
            : language === 'tamil'
            ? 'தொடர்க (Continue)'
            : 'Agree & Continue to Portal'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
