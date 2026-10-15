import React, { useState } from 'react';
import {
  FlaskConical,
  Search,
  ArrowUpDown,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Pill,
  Check,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MEDICINE_DATASET, MedicineEntry, DEMO_SAFETY_DISCLAIMER } from '../../data/medicines';
import { evaluateMedicineSafety, MedicineSafetyReport } from '../../lib/medicineSafety';
import { PREDEFINED_SCENARIOS, PredefinedScenario, runScenario } from '../../lib/medicineSafetyTests';
import { useToast } from '../ui/toast';

export function MedicineSafetyLabView() {
  const { showSuccess } = useToast();

  // Dataset table state
  const [datasetSearch, setDatasetSearch] = useState('');
  const [sortField, setSortField] = useState<keyof MedicineEntry>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Active scenario testing state
  const [selectedScenario, setSelectedScenario] = useState<PredefinedScenario>(PREDEFINED_SCENARIOS[0]);
  const [activeReport, setActiveReport] = useState<MedicineSafetyReport>(() =>
    runScenario(PREDEFINED_SCENARIOS[0])
  );

  // Custom testing form state
  const [customMedicine, setCustomMedicine] = useState('Paracetamol');
  const [customDose, setCustomDose] = useState('500 mg');
  const [customFrequency, setCustomFrequency] = useState('Three times a day (TDS)');
  const [customDuration, setCustomDuration] = useState('5 days');
  const [customAllergies, setCustomAllergies] = useState('Penicillin');
  const [customReport, setCustomReport] = useState<MedicineSafetyReport | null>(null);

  // Handle Scenario Click
  const handleSelectScenario = (sc: PredefinedScenario) => {
    setSelectedScenario(sc);
    const report = runScenario(sc);
    setActiveReport(report);
    showSuccess('Scenario Evaluated', `Ran deterministic checks for ${sc.title}`);
  };

  // Handle Custom Form Evaluation
  const handleEvaluateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const report = evaluateMedicineSafety(
      customMedicine,
      customDose,
      customFrequency,
      customDuration,
      customAllergies
    );
    setCustomReport(report);
    showSuccess('Safety Checks Complete', `Evaluated ${customMedicine} against local dataset.`);
  };

  // Sort & Filter Dataset Table
  const filteredDataset = MEDICINE_DATASET.filter((entry) => {
    const q = datasetSearch.toLowerCase();
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.cls.toLowerCase().includes(q) ||
      entry.brands.some((b) => b.toLowerCase().includes(q)) ||
      (entry.lookalike && entry.lookalike.toLowerCase().includes(q))
    );
  }).sort((a, b) => {
    const valA = a[sortField] || '';
    const valB = b[sortField] || '';
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? (valA as any) - (valB as any) : (valB as any) - (valA as any);
  });

  const toggleSort = (field: keyof MedicineEntry) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSafetyReportCard = (report: MedicineSafetyReport, title: string) => (
    <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-4 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h4 className="text-base font-bold text-slate-900">
              {report.rawMedicineName}
            </h4>
            {report.match.entry ? (
              <Badge variant="teal" size="sm">
                {report.match.entry.cls}
              </Badge>
            ) : (
              <Badge variant="amber" size="sm">
                Unlisted Medication
              </Badge>
            )}
          </div>
        </div>

        {/* Overall Status Badge */}
        {report.isBlock ? (
          <Badge variant="red" size="md" className="font-bold gap-1 bg-red-100 text-red-900 border-red-300">
            <AlertOctagon className="h-4 w-4" /> BLOCK (Allergy Conflict)
          </Badge>
        ) : report.hasRedFlags ? (
          <Badge variant="red" size="md" className="font-bold gap-1">
            <AlertOctagon className="h-4 w-4" /> Critical Flag (Exceeds Max)
          </Badge>
        ) : report.allergyCheck.status === 'caution' ? (
          <Badge variant="amber" size="md" className="font-bold gap-1">
            <AlertTriangle className="h-4 w-4" /> Caution (Cross-Reactivity)
          </Badge>
        ) : (
          <Badge variant="emerald" size="md" className="font-bold gap-1">
            <CheckCircle2 className="h-4 w-4" /> Passed Deterministic Checks
          </Badge>
        )}
      </div>

      {/* Matching & Recognition Note */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {report.match.matchType === 'exact' && (
          <span className="p-1.5 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            ✓ Exact match: {report.match.entry?.name}
          </span>
        )}
        {report.match.matchType === 'brand' && (
          <span className="p-1.5 px-2.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
            ✓ Brand match: {report.match.matchedName}
          </span>
        )}
        {report.match.matchType === 'fuzzy' && (
          <span className="p-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>{report.match.fuzzyNote}</span>
          </span>
        )}
        {report.match.matchType === 'none' && (
          <span className="p-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 font-semibold">
            ⚠ Not in demo dataset, verify manually
          </span>
        )}
      </div>

      {/* Safety Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Check 1: Single Dose */}
        <div className={`p-3 rounded-xl border ${
          report.doseCheck.severity === 'red'
            ? 'bg-red-50/70 border-red-200 text-red-950'
            : report.doseCheck.severity === 'amber'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between font-bold mb-1">
            <span className="flex items-center gap-1">
              <Pill className="h-3.5 w-3.5" />
              <span>Single Dose Check</span>
            </span>
            <span className="uppercase text-[10px] tracking-wide font-mono">
              [{report.doseCheck.label}]
            </span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">{report.doseCheck.detail}</p>
        </div>

        {/* Check 2: Daily Total Dose */}
        <div className={`p-3 rounded-xl border ${
          report.dailyDoseCheck.severity === 'red'
            ? 'bg-red-50/70 border-red-200 text-red-950'
            : report.dailyDoseCheck.severity === 'amber'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between font-bold mb-1">
            <span>Daily Cumulative Check</span>
            <span className="uppercase text-[10px] tracking-wide font-mono">
              [{report.dailyDoseCheck.label}]
            </span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">{report.dailyDoseCheck.detail}</p>
        </div>

        {/* Check 3: Allergy Conflict */}
        <div className={`p-3 rounded-xl border ${
          report.allergyCheck.severity === 'red'
            ? 'bg-red-50/90 border-red-300 text-red-950'
            : report.allergyCheck.severity === 'amber'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between font-bold mb-1">
            <span>Allergy / Cross-Reactivity</span>
            <span className="uppercase text-[10px] tracking-wide font-mono">
              [{report.allergyCheck.label}]
            </span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90">{report.allergyCheck.detail}</p>
        </div>

        {/* Check 4: Look-Alike Warning */}
        <div className={`p-3 rounded-xl border ${
          report.lookalikeCheck.hasLookalike
            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between font-bold mb-1">
            <span>Look-Alike (LASA) Warning</span>
            <span className="uppercase text-[10px] tracking-wide font-mono">
              {report.lookalikeCheck.hasLookalike ? '[ALERT]' : '[CLEAR]'}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {report.lookalikeCheck.hasLookalike
              ? report.lookalikeCheck.label
              : 'No known high-risk look-alike pair in demo dataset.'}
          </p>
        </div>
      </div>

      {/* Reference Line */}
      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span className="font-mono text-[11px]">{report.referenceText}</span>
        <span className="text-[10px] text-slate-400 italic">
          Demo reference data, not clinical advice
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Deterministic Medicine Safety Lab
            </h2>
            <Badge variant="teal" size="sm">
              Non-AI Pure TypeScript Guardrails
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            The AI only extracts raw medicine text from speech. All dose bounds, allergy blocks, and look-alike checks are executed by deterministic code.
          </p>
        </div>

        <Badge variant="amber" size="sm">
          {DEMO_SAFETY_DISCLAIMER}
        </Badge>
      </div>

      {/* SECTION 1: Try a Scenario (8 Scenarios from Prompt) */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5 text-teal-600 fill-current" />
              <span>Interactive Scenarios (Click to test live)</span>
            </CardTitle>
            <span className="text-[11px] text-slate-400">8 Pre-loaded Clinical Scenarios</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PREDEFINED_SCENARIOS.map((sc) => {
              const isSelected = selectedScenario.id === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer space-y-1 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/80 text-teal-950 ring-2 ring-teal-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs truncate">{sc.title}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">{sc.expectedOutcome}</div>
                </button>
              );
            })}
          </div>

          {/* Active Live Result */}
          {renderSafetyReportCard(
            activeReport,
            `Scenario Result: ${selectedScenario.title}`
          )}
        </CardContent>
      </Card>

      {/* SECTION 2: Custom Clinical Medicine Checker */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardHeader className="py-3 bg-slate-50/70 border-b border-slate-100">
          <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
            Custom Medicine Safety Checker
          </CardTitle>
          <CardDescription className="text-xs">
            Test any drug name (including speech typos or brands), dosage, frequency, and patient allergies.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <form onSubmit={handleEvaluateCustom} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Medicine Name */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine Name (Generic, Brand, or Typo)
                </label>
                <input
                  type="text"
                  value={customMedicine}
                  onChange={(e) => setCustomMedicine(e.target.value)}
                  placeholder="e.g. Metaformin, Dolo, Amoxicillin"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  required
                />
              </div>

              {/* Dose */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dose
                </label>
                <input
                  type="text"
                  value={customDose}
                  onChange={(e) => setCustomDose(e.target.value)}
                  placeholder="e.g. 500 mg, 2 puffs"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  required
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frequency
                </label>
                <input
                  type="text"
                  value={customFrequency}
                  onChange={(e) => setCustomFrequency(e.target.value)}
                  placeholder="e.g. TDS, moonu time, SOS"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              {/* Patient Allergies */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Allergies
                </label>
                <input
                  type="text"
                  value={customAllergies}
                  onChange={(e) => setCustomAllergies(e.target.value)}
                  placeholder="e.g. penicillin, nsaid"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" className="gap-1.5 font-semibold text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Run Safety Check</span>
              </Button>
            </div>
          </form>

          {customReport && renderSafetyReportCard(customReport, 'Custom Clinical Formulation Result')}
        </CardContent>
      </Card>

      {/* SECTION 3: Searchable, Sortable Reference Dataset Table (25 Entries) */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-xs uppercase tracking-wider text-slate-700">
                Deterministic Drug Safety Reference Dataset ({MEDICINE_DATASET.length} Medicines)
              </CardTitle>
              <CardDescription className="text-xs">
                Contains adult single dose bounds [min, max], daily ceiling, allergy groups, and high-risk look-alikes.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={datasetSearch}
                onChange={(e) => setDatasetSearch(e.target.value)}
                placeholder="Search generic, brand, or class..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold">
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Generic Name</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Common Brands</th>
                <th
                  onClick={() => toggleSort('cls')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Drug Class</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Allergy Group</th>
                <th className="py-3 px-4">Usual Single Dose</th>
                <th className="py-3 px-4">Daily Max</th>
                <th className="py-3 px-4">Look-Alike (LASA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDataset.map((med, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-900">{med.name}</td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {med.brands.join(', ')}
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge variant="slate" size="sm">
                      {med.cls}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4">
                    {med.grp ? (
                      <Badge variant="red" size="sm" className="font-mono">
                        {med.grp}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 font-mono text-[10px]">null</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-700">
                    {med.single[0]} - {med.single[1]} {med.unit}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                    {med.daily} {med.unit}/day
                  </td>
                  <td className="py-2.5 px-4">
                    {med.lookalike ? (
                      <Badge variant="amber" size="sm" className="gap-1 font-bold">
                        <AlertTriangle className="h-3 w-3" /> {med.lookalike}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 font-mono text-[10px]">null</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Mandatory Clinical Disclaimer Footer */}
      <footer className="text-center py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-500 space-y-0.5">
        <p className="font-semibold text-slate-700">
          Checks run locally in code, not by AI. {DEMO_SAFETY_DISCLAIMER}
        </p>
        <p className="text-[11px] text-slate-400">
          Doctor-in-the-loop review and digital signature required before any medication is dispensed or committed to health records.
        </p>
      </footer>
    </div>
  );
}
