import { Controller, type Control, type FieldErrors, type Path } from "react-hook-form";
import { CurrencyInput } from "./CurrencyInput";
import { FieldShell, fieldInputClassName } from "./FieldShell";
import type { ExpenseApplicationFormValues } from "../../lib/form/types";

interface PlanCardProps {
  title: string;
  baseName: `transportPlans.${number}` | `accommodationPlans.${number}`;
  startKey: "departureAt" | "checkInAt";
  endKey: "arrivalAt" | "checkOutAt";
  amountMode: "budget" | "actual";
  control: Control<ExpenseApplicationFormValues>;
  errors: FieldErrors<ExpenseApplicationFormValues>;
  highlightLabel?: string;
  onRemove?: () => void;
  dateLabels: {
    start: string;
    end: string;
  };
}

const readError = (error: unknown) => {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return undefined;
};

export function PlanCard({
  title,
  baseName,
  startKey,
  endKey,
  amountMode,
  control,
  errors,
  highlightLabel,
  onRemove,
  dateLabels,
}: PlanCardProps) {
  const fieldErrors = (baseName.startsWith("transport")
    ? errors.transportPlans?.[Number(baseName.split(".")[1])]
    : errors.accommodationPlans?.[Number(baseName.split(".")[1])]) as
    | Partial<Record<string, { message?: string }>>
    | undefined;

  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        <div className="flex items-center gap-2">
          {highlightLabel ? (
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-800">
              {highlightLabel}
            </span>
          ) : null}
          {onRemove ? (
            <button
              className="rounded-full border border-rose-200 px-3 py-1 text-sm text-rose-500 transition hover:bg-rose-50"
              type="button"
              onClick={onRemove}
            >
              删除
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FieldShell
          error={readError(fieldErrors?.[startKey])}
          label={dateLabels.start}
        >
          <Controller
            control={control}
            name={`${baseName}.${startKey}` as Path<ExpenseApplicationFormValues>}
            render={({ field }) => (
              <input {...field} className={fieldInputClassName} type="date" value={typeof field.value === "string" ? field.value : ""} />
            )}
          />
        </FieldShell>

        <FieldShell
          error={readError(fieldErrors?.[endKey])}
          label={dateLabels.end}
        >
          <Controller
            control={control}
            name={`${baseName}.${endKey}` as Path<ExpenseApplicationFormValues>}
            render={({ field }) => (
              <input {...field} className={fieldInputClassName} type="date" value={typeof field.value === "string" ? field.value : ""} />
            )}
          />
        </FieldShell>

        <FieldShell error={readError(fieldErrors?.vendor)} label="服务商">
          <Controller
            control={control}
            name={`${baseName}.vendor` as Path<ExpenseApplicationFormValues>}
            render={({ field }) => (
              <input
                {...field}
                className={fieldInputClassName}
                placeholder="例如：国航 / 携程 / 酒店官网"
                value={typeof field.value === "string" ? field.value : ""}
              />
            )}
          />
        </FieldShell>

        <FieldShell error={readError(fieldErrors?.quoteAt)} label="报价日期">
          <Controller
            control={control}
            name={`${baseName}.quoteAt` as Path<ExpenseApplicationFormValues>}
            render={({ field }) => (
              <input {...field} className={fieldInputClassName} type="date" value={typeof field.value === "string" ? field.value : ""} />
            )}
          />
        </FieldShell>

        {amountMode === "budget" ? (
          <FieldShell error={readError(fieldErrors?.budgetAmount)} label="预算金额">
            <Controller
              control={control}
              name={`${baseName}.budgetAmount` as Path<ExpenseApplicationFormValues>}
              render={({ field }) => (
                <CurrencyInput value={typeof field.value === "number" ? field.value : undefined} onChange={field.onChange} />
              )}
            />
          </FieldShell>
        ) : (
          <FieldShell error={readError(fieldErrors?.actualAmount)} label="实际金额">
            <Controller
              control={control}
              name={`${baseName}.actualAmount` as Path<ExpenseApplicationFormValues>}
              render={({ field }) => (
                <CurrencyInput value={typeof field.value === "number" ? field.value : undefined} onChange={field.onChange} />
              )}
            />
          </FieldShell>
        )}
      </div>
    </div>
  );
}
