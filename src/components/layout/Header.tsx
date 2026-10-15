import { Activity, ShieldAlert, Sparkles, LogOut } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Stepper, StepKey } from './Stepper';
import { MainNavTab } from './Sidebar';

interface HeaderProps {
  currentStep: StepKey;
  onStepClick: (step: StepKey) => void;
  canNavigateTo: (step: StepKey) => boolean;
  activeTab: MainNavTab;
  onLogout?: () => void;
  doctorName?: string;
}

export function Header({
  currentStep,
  onStepClick,
  canNavigateTo,
  activeTab,
  onLogout,
  doctorName,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top brand and doctor profile bar */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm ring-4 ring-teal-50">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
                  ClinicNote AI
                </h1>
                <Badge variant="teal" size="sm" className="hidden sm:inline-flex gap-1 font-mono text-[10px]">
                  <Sparkles className="h-2.5 w-2.5 text-teal-600" />
                  Gemini Flash 3.8
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                Consent-Based Clinical Documentation Assistant
              </p>
            </div>
          </div>

          {/* Stepper embedded in header on desktop/tablet if in consultation tab */}
          {activeTab === 'consultation' && (
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <Stepper
                currentStep={currentStep}
                onStepClick={onStepClick}
                canNavigateTo={canNavigateTo}
              />
            </div>
          )}

          {/* Right side: Demo badge & Doctor Avatar */}
          <div className="flex items-center gap-3">
            <Badge
              variant="amber"
              size="sm"
              className="px-2.5 py-1 text-[11px] font-medium border-amber-300/80 bg-amber-50/80 text-amber-900 gap-1.5"
            >
              <ShieldAlert className="h-3 w-3 text-amber-600 shrink-0" />
              <span className="hidden xs:inline">Demo mode: </span>synthetic data only
            </Badge>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="relative">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-teal-600 to-teal-500 flex items-center justify-center text-white font-semibold text-xs shadow-xs border border-white">
                  DD
                </div>
                <span
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                  title="Attending Clinician Online"
                />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {doctorName || 'Dr. Demo, MD'}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">
                  General Practice
                </span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 ml-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Log out of Clinician Workstation"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stepper on mobile viewport if in consultation tab */}
        {activeTab === 'consultation' && (
          <div className="md:hidden py-1 border-t border-slate-100">
            <Stepper
              currentStep={currentStep}
              onStepClick={onStepClick}
              canNavigateTo={canNavigateTo}
            />
          </div>
        )}
      </div>
    </header>
  );
}
