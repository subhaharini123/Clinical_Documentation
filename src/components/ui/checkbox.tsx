import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  label,
  description,
}: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className={cn('flex items-start gap-3 select-none', className)}>
      <button
        type="button"
        role="checkbox"
        id={inputId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (!disabled) onCheckedChange(!checked);
          }
        }}
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2',
          checked
            ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
            : 'border-slate-300 bg-white hover:border-slate-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
      </button>

      {(label || description) && (
        <div className="flex flex-col text-sm">
          {label && (
            <label
              htmlFor={inputId}
              className={cn(
                'font-medium text-slate-800 cursor-pointer',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
