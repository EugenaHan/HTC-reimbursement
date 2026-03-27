import { Controller, useWatch, type Control, type FieldErrors, type Path } from "react-hook-form";
import { CurrencyInput } from "./CurrencyInput";
import { FieldShell, fieldInputClassName } from "./FieldShell";
import { formatCurrency, getLowestBudgetOption } from "../../lib/form/calculations";
import type { ApplicationType, ExpenseApplicationFormValues } from "../../lib/form/types";

interface ComparisonGroupCardProps {
  title: string;
  baseName: `transportGroups.${number}` | `accommodationGroups.${number}`;
  control: Control<ExpenseApplicationFormValues>;
  errors: FieldErrors<ExpenseApplicationFormValues>;
  applicationType: ApplicationType;
  collapsed: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  labelLabel: string;
  startLabel: string;
  endLabel: string;
  optionFieldLabel: string;
  optionPlaceholder: string;
  startKey: "departureAt" | "checkInAt";
  endKey: "arrivalAt" | "checkOutAt";
}

const readError = (error: unknown) => {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return undefined;
};

export function ComparisonGroupCard({
  title,
  baseName,
  control,
  errors,
  applicationType,
  collapsed,
  onToggle,
  onRemove,
  labelLabel,
  startLabel,
  endLabel,
  optionFieldLabel,
  optionPlaceholder,
  startKey,
  endKey,
}: ComparisonGroupCardProps) {
  const groupValue = useWatch({
    control,
    name: baseName as Path<ExpenseApplicationFormValues>,
  }) as
    | {
        label?: string;
        departureAt?: string;
        arrivalAt?: string;
        checkInAt?: string;
        checkOutAt?: string;
        options?: Array<{ vendor?: string; budgetAmount?: number; actualAmount?: number }>;
      }
    | undefined;

  const groupErrors = (baseName.startsWith("transport")
    ? errors.transportGroups?.[Number(baseName.split(".")[1])]
    : errors.accommodationGroups?.[Number(baseName.split(".")[1])]) as
    | {
        label?: { message?: string };
        departureAt?: { message?: string };
        arrivalAt?: { message?: string };
        checkInAt?: { message?: string };
        checkOutAt?: { message?: string };
        options?: Array<{
          vendor?: { message?: string };
          budgetAmount?: { message?: string };
          actualAmount?: { message?: string };
          message?: string;
        }>;
      }
    | undefined;

  const watchedOptions = (groupValue?.options ?? []).map((option) => ({
    vendor: option.vendor ?? "",
    budgetAmount: option.budgetAmount,
    actualAmount: option.actualAmount,
  }));
  const lowestOption = applicationType === "trip" ? getLowestBudgetOption(watchedOptions) : null;
  const optionCount = applicationType === "trip" ? 3 : 1;
  const summaryParts = [
    groupValue?.label?.trim(),
    groupValue?.[startKey] ? `${startLabel} ${String(groupValue[startKey]).split("-").join(".")}` : "",
    groupValue?.[endKey] ? `${endLabel} ${String(groupValue[endKey]).split("-").join(".")}` : "",
  ].filter(Boolean);

  return (
    <div className="rounded-3xl border border-ink-100 bg-ink-50/60">
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <button
            className="text-left text-base font-semibold text-ink-900 transition hover:text-ink-700"
            type="button"
            onClick={onToggle}
          >
            {collapsed ? "展开" : "收起"} {title}
          </button>
          {summaryParts.length ? (
            <p className="text-sm text-ink-500">{summaryParts.join(" | ")}</p>
          ) : (
            <p className="text-sm text-ink-400">
              先填写该条的目的地和共享日期，再录入{applicationType === "trip" ? " 3 个比价方案" : " 1 条实际明细"}。
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {lowestOption ? (
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-800">
              最低价：方案 {lowestOption.index + 1} {formatCurrency(lowestOption.amount, false)}
            </span>
          ) : null}
          {onRemove ? (
            <button
              className="rounded-full border border-rose-200 px-3 py-1 text-sm text-rose-500 transition hover:bg-rose-50"
              type="button"
              onClick={onRemove}
            >
              删除本组
            </button>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <FieldShell error={readError(groupErrors?.label)} label={labelLabel} required>
              <Controller
                control={control}
                name={`${baseName}.label` as Path<ExpenseApplicationFormValues>}
                render={({ field }) => (
                  <input
                    {...field}
                    className={fieldInputClassName}
                    placeholder="例如：上海客户拜访 / 北京-上海"
                    value={typeof field.value === "string" ? field.value : ""}
                  />
                )}
              />
            </FieldShell>

            <FieldShell error={readError(groupErrors?.[startKey])} label={startLabel} required>
              <Controller
                control={control}
                name={`${baseName}.${startKey}` as Path<ExpenseApplicationFormValues>}
                render={({ field }) => (
                  <input
                    {...field}
                    className={fieldInputClassName}
                    type="date"
                    value={typeof field.value === "string" ? field.value : ""}
                  />
                )}
              />
            </FieldShell>

            <FieldShell error={readError(groupErrors?.[endKey])} label={endLabel} required>
              <Controller
                control={control}
                name={`${baseName}.${endKey}` as Path<ExpenseApplicationFormValues>}
                render={({ field }) => (
                  <input
                    {...field}
                    className={fieldInputClassName}
                    type="date"
                    value={typeof field.value === "string" ? field.value : ""}
                  />
                )}
              />
            </FieldShell>
          </div>

          <div className={`grid gap-4 ${applicationType === "trip" ? "xl:grid-cols-3" : ""}`}>
            {Array.from({ length: optionCount }, (_, optionIndex) => (
              <div key={`${baseName}-option-${optionIndex}`} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-ink-900">
                    {applicationType === "trip" ? `方案 ${optionIndex + 1}` : "实际明细"}
                  </h4>
                  {lowestOption?.index === optionIndex ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      最佳方案
                    </span>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <FieldShell
                    error={readError(groupErrors?.options?.[optionIndex]?.vendor) || readError(groupErrors?.options?.[optionIndex])}
                    label={optionFieldLabel}
                    required={applicationType === "trip"}
                  >
                    <Controller
                      control={control}
                      name={`${baseName}.options.${optionIndex}.vendor` as Path<ExpenseApplicationFormValues>}
                      render={({ field }) => (
                        <input
                          {...field}
                          className={fieldInputClassName}
                          placeholder={optionPlaceholder}
                          value={typeof field.value === "string" ? field.value : ""}
                        />
                      )}
                    />
                  </FieldShell>

                  {applicationType === "trip" ? (
                    <FieldShell error={readError(groupErrors?.options?.[optionIndex]?.budgetAmount)} label="预算金额" required>
                      <Controller
                        control={control}
                        name={`${baseName}.options.${optionIndex}.budgetAmount` as Path<ExpenseApplicationFormValues>}
                        render={({ field }) => (
                          <CurrencyInput value={typeof field.value === "number" ? field.value : undefined} onChange={field.onChange} />
                        )}
                      />
                    </FieldShell>
                  ) : (
                    <FieldShell error={readError(groupErrors?.options?.[optionIndex]?.actualAmount)} hint="无此项可留空" label="实际金额">
                      <Controller
                        control={control}
                        name={`${baseName}.options.${optionIndex}.actualAmount` as Path<ExpenseApplicationFormValues>}
                        render={({ field }) => (
                          <CurrencyInput value={typeof field.value === "number" ? field.value : undefined} onChange={field.onChange} />
                        )}
                      />
                    </FieldShell>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
