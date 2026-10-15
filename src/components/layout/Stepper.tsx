import { Check, ShieldCheck, Mic, FileText, CheckSquare, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

export type StepKey = 'consent' | 'record' | 'transcript' | 'review' | 'saved';

interface StepperProps {
  currentStep: StepKey;
  onStepClick: (step: StepKey) => void;
  canNavigateTo: (step: StepKey) => boolean;
}

const STEPS: Array<{ key: StepKey; label: string; icon: any; order: number }> = [
  { key: 'consent', label: '1. Consent', icon: ShieldCheck, order: 1 },
  { key: 'record', label: '2. Record', icon: Mic, order: 2 },
  { key: 'transcript', label: '3. Transcript', icon: FileText, order: 3 },
  { key: 'review', label: '4. Review', icon: CheckSquare, order: 4 },
  { key: 'saved', label: '5. Saved', icon: Save, order: 5 },
];

export function Stepper({ currentStep, onStepClick, canNavigateTo }: StepperProps) {
  const currentOrder = STEPS.find((s) => s.key === currentStep)?.order || 1;

  return (
    <nav aria-label="Progress Stepper" className="w-full py-2">
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {STEPS.map((step, idx) => {
          const isCompleted = step.order < currentOrder;
          const isCurrent = step.key === currentStep;
          const isClickable = canNavigateTo(step.key);
          const Icon = step.icon;

          return (
            <li key={step.key} className="flex-1 flex items-center">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group flex items-center gap-2 w-full p-2 rounded-lg text-left transition-all',
                  isClickable ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed opacity-60',
                  isCurrent && 'bg-teal-50/80 border border-teal-200'
                )}
              >
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-emerald-600 text-white',
                    isCurrent && 'bg-teal-600 text-white ring-2 ring-teal-600 ring-offset-2',
                    !isCompleted && !isCurrent && 'bg-slate-200 text-slate-600'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : <Icon className="h-3.5 w-3.5" />}
                </div>

                <div className="hidden lg:flex flex-col min-w-0">
                  <span
                    className={cn(
                      'text-xs font-medium truncate',
                      isCurrent ? 'text-teal-900 font-semibold' : 'text-slate-600'
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isCompleted ? 'Completed' : isCurrent ? 'In progress' : 'Pending'}
                  </span>
                </div>
              </button>

              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'hidden md:block h-0.5 w-4 lg:w-6 shrink-0 mx-1 rounded-full transition-colors',
                    step.order < currentOrder ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
