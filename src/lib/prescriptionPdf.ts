import { SoapNote } from '../types/clinical';
import { StoredPrescription, StoredMedication } from './store';

export interface PrescriptionPdfData {
  doctorName?: string;
  doctorSpecialty?: string;
  clinicName?: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  patientMrn?: string;
  patientAllergies?: string[];
  date: string;
  isDraft: boolean;
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
    evidence?: string;
    instructions?: string;
  }>;
  diagnosis?: string[];
  advice?: string;
}

export function generatePrescriptionHtml(data: PrescriptionPdfData): string {
  const medRows = data.medications
    .map(
      (m, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${idx + 1}. ${m.name}</td>
        <td style="padding: 10px 12px; color: #334155;">${m.dose || 'Not specified'}</td>
        <td style="padding: 10px 12px; color: #334155;">${m.frequency || 'Not specified'}</td>
        <td style="padding: 10px 12px; color: #334155;">${m.duration || 'Not specified'}</td>
        <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #0f766e;">${m.evidence || 'N/A'}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Prescription - ${data.patientName}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #0d9488;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .clinic-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f766e;
      margin: 0;
    }
    .clinic-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .doctor-meta {
      text-align: right;
    }
    .doctor-name {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .doctor-spec {
      font-size: 12px;
      color: #64748b;
    }
    .watermark {
      background: #fef2f2;
      border: 1px dashed #ef4444;
      color: #b91c1c;
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 18px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .patient-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      font-size: 13px;
    }
    .patient-box strong {
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      display: block;
    }
    .rx-symbol {
      font-size: 28px;
      font-weight: 900;
      color: #0d9488;
      margin-bottom: 8px;
      font-family: serif;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
    .signature-area {
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 220px;
      border-top: 1px solid #0f172a;
      text-align: center;
      padding-top: 6px;
      font-size: 12px;
      color: #475569;
    }
    .disclaimer {
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      margin-top: 40px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="clinic-title">${data.clinicName || 'ClinicNote AI Health Centre'}</h1>
      <div class="clinic-sub">Department of General Medicine & Family Health</div>
    </div>
    <div class="doctor-meta">
      <h3 class="doctor-name">${data.doctorName || 'Dr. Demo, MBBS, MD'}</h3>
      <div class="doctor-spec">${data.doctorSpecialty || 'General Practice'} • Reg # 48291</div>
    </div>
  </div>

  ${data.isDraft ? '<div class="watermark">⚠ DRAFT: DOCTOR MUST VERIFY AND SIGN BEFORE DISPENSING</div>' : ''}

  <div class="patient-box">
    <div>
      <strong>Patient Name</strong>
      <span>${data.patientName}</span>
    </div>
    <div>
      <strong>Age / Gender / MRN</strong>
      <span>${data.patientAge || '45'} Y / ${data.patientGender || 'Adult'} • ${data.patientMrn || 'CHN-2026-0842'}</span>
    </div>
    <div>
      <strong>Date</strong>
      <span>${data.date}</span>
    </div>
    <div>
      <strong>Known Allergies</strong>
      <span style="color: ${data.patientAllergies?.length ? '#dc2626' : '#16a34a'}; font-weight: 600;">
        ${data.patientAllergies?.length ? data.patientAllergies.join(', ') : 'None documented'}
      </span>
    </div>
    ${data.diagnosis?.length ? `
    <div style="grid-column: span 2;">
      <strong>Diagnosis / Clinical Impression</strong>
      <span>${data.diagnosis.join('; ')}</span>
    </div>` : ''}
  </div>

  <div class="rx-symbol">℞</div>

  <table>
    <thead>
      <tr>
        <th>Medicine Name</th>
        <th>Dose</th>
        <th>Frequency / Timing</th>
        <th>Duration</th>
        <th>Evidence Line</th>
      </tr>
    </thead>
    <tbody>
      ${medRows}
    </tbody>
  </table>

  ${data.advice ? `
    <div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 10px 14px; margin-bottom: 24px; font-size: 13px;">
      <strong style="color: #0f766e; display: block; margin-bottom: 4px;">Clinician Advice & Return Instructions:</strong>
      ${data.advice}
    </div>
  ` : ''}

  <div class="signature-area">
    <div style="font-size: 11px; color: #64748b;">
      Generated via ClinicNote AI Verified Clinical Workflow.<br>
      Grounding verified with transcript evidence.
    </div>
    <div class="signature-line">
      ${data.doctorName || 'Dr. Demo'}<br>
      <span style="font-size: 10px; color: #94a3b8;">Authorized Medical Practitioner</span>
    </div>
  </div>

  <div class="disclaimer">
    This clinical document is generated for patient care. Synthetic reference dataset for evaluation. Not clinical advice without licensed medical review.
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print in new window
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;
}

export function downloadPrescriptionPdf(data: PrescriptionPdfData): void {
  const html = generatePrescriptionHtml(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
