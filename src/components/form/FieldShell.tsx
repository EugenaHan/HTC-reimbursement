import clsx from "clsx";
import type { PropsWithChildren, ReactNode } from "react";

interface FieldShellProps extends PropsWithChildren {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  rightSlot?: ReactNode;
}

export function FieldShell({ label, htmlFor, required, hint, error, rightSlot, children }: FieldShellProps) {
  return (
    <label className="block space-y-2" htmlFor={htmlFor}>
      <span className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-ink-800">
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </span>
        {rightSlot}
      </span>
      {children}
      {error ? (
        <span className="text-sm text-rose-500">{error}</span>
      ) : hint ? (
        <span className="text-sm text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const fieldInputClassName = clsx(
  "w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 text-sm text-ink-900 outline-none transition",
  "placeholder:text-ink-300 focus:border-ink-400 focus:bg-white focus:shadow-focus",
);
