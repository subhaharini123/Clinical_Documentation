import { LayoutDashboard, PlusCircle, FolderHeart, History, BarChart3, ShieldCheck, Stethoscope, FlaskConical, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

export type MainNavTab = 'dashboard' | 'consultation' | 'records' | 'patients' | 'safety-lab' | 'audit' | 'evaluation';

interface SidebarProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  recordsCount: number;
  auditCount: number;
  patientsCount?: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  recordsCount,
  auditCount,
  patientsCount = 1,
}: SidebarProps) {
  const navItems: Array<{
    id: MainNavTab;
    label: string;
    icon: any;
    badge?: number;
    description: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Metrics, time saved & activity',
    },
    {
      id: 'consultation',
      label: 'Consultation',
      icon: PlusCircle,
      description: 'Start live or sample encounter',
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: Users,
      badge: patientsCount,
      description: 'Assigned patients & prescriptions',
    },
    {
      id: 'records',
      label: 'Patient Records',
      icon: FolderHeart,
      badge: recordsCount,
      description: 'Approved clinical SOAP notes',
    },
    {
      id: 'safety-lab',
      label: 'Medicine Safety Lab',
      icon: FlaskConical,
      description: 'Deterministic dose, allergy & LASA lab',
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History,
      badge: auditCount,
      description: 'Compliance & timestamp log',
    },
    {
      id: 'evaluation',
      label: 'Safety & Evaluation',
      icon: BarChart3,
      description: 'LASA & negation verification tests',
    },
  ];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 p-4 shrink-0 justify-between select-none">
        <div className="space-y-6">
          <div className="px-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Clinical Workspace
            </span>
          </div>

          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition-all cursor-pointer',
                    isActive
                      ? 'bg-teal-50 text-teal-900 font-semibold shadow-xs ring-1 ring-teal-200/80'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-teal-600 stroke-[2.2]' : 'text-slate-400'
                      )}
                    />
                    <div className="truncate">
                      <div className="leading-tight">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        'ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-semibold',
                        isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Clinical Disclaimer in Sidebar */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-teal-800 font-semibold text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span>Doctor-in-the-Loop Safeguard</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Documentation assistant only. Does not diagnose. Clinician approval required before EHR commit.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-around px-2 py-1.5 shadow-lg"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition-colors relative flex-1 cursor-pointer',
                isActive ? 'text-teal-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 h-4 w-4 bg-teal-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5">{item.label.replace('New ', '')}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
