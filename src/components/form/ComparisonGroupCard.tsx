import { Controller, useWatch, type Control, type FieldErrors, type Path } from "react-hook-form";
import { CurrencyInput } from "./CurrencyInput";
import { FieldShell, fieldInputClassName } from "./FieldShell";
import { formatCurrency, getPreferredBudgetOption } from "../../lib/form/calculations";
import type {
  AccommodationGroup,
  ApplicationType,
  ExpenseApplicationFormValues,
  TransportGroup,
} from "../../lib/form/types";

interface ComparisonGroupCardProps {
  title: string;
  variant?: "transport" | "accommodation";
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
  variant = "transport",
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
        preferredOptionIndex?: number;
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
        preferredOptionIndex?: { message?: string };
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
  const preferredGroup = baseName.startsWith("transport")
    ? ({
        label: groupValue?.label ?? "",
        departureAt: groupValue?.departureAt ?? "",
        arrivalAt: groupValue?.arrivalAt ?? "",
        options: watchedOptions,
        preferredOptionIndex: groupValue?.preferredOptionIndex,
      } satisfies TransportGroup)
    : ({
        label: groupValue?.label ?? "",
        checkInAt: groupValue?.checkInAt ?? "",
        checkOutAt: groupValue?.checkOutAt ?? "",
        options: watchedOptions,
        preferredOptionIndex: groupValue?.preferredOptionIndex,
      } satisfies AccommodationGroup);
  const preferredOption = applicationType === "trip" ? getPreferredBudgetOption(preferredGroup) : null;
  const optionCount = applicationType === "trip" ? 3 : 1;
  const isTransport = variant === "transport";
  const summaryParts = [
    groupValue?.label?.trim(),
    groupValue?.[startKey] ? `${startLabel} ${String(groupValue[startKey]).split("-").join(".")}` : "",
    groupValue?.[endKey] ? `${endLabel} ${String(groupValue[endKey]).split("-").join(".")}` : "",
  ].filter(Boolean);

  return (
    <div
      className={`overflow-hidden rounded-3xl border ${
        isTransport
          ? "border-sky-200 bg-sky-50/70"
          : "border-emerald-200 bg-emerald-50/70"
      }`}
    >
      <div
        className={`flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between ${
          isTransport
            ? "border-sky-200 bg-gradient-to-r from-sky-100 via-sky-50 to-white"
            : "border-emerald-200 bg-gradient-to-r from-emerald-100 via-emerald-50 to-white"
        }`}
      >
        <div className="space-y-1">
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.24em] ${
              isTransport ? "text-sky-600" : "text-emerald-600"
            }`}
          >
            {isTransport ? "Transport" : "Accommodation"}
          </p>
          <button
            className={`text-left text-lg font-semibold transition ${
              isTransport ? "text-sky-950 hover:text-sky-800" : "text-emerald-950 hover:text-emerald-800"
            }`}
            type="button"
            onClick={onToggle}
          >
            {collapsed ? "展开" : "收起"} {title}
          </button>
          {summaryParts.length ? (
            <p className={`text-sm ${isTransport ? "text-sky-700" : "text-emerald-700"}`}>
              {summaryParts.join(" | ")}
            </p>
          ) : (
            <p className={`text-sm ${isTransport ? "text-sky-500" : "text-emerald-500"}`}>
              先填写该条的目的地和共享日期，再录入{applicationType === "trip" ? " 3 个比价方案" : " 1 条实际明细"}。
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {preferredOption ? (
            <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-800">
              最优方案：方案 {preferredOption.index + 1} {formatCurrency(preferredOption.amount, false)}
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
              <div
                key={`${baseName}-option-${optionIndex}`}
                className={`rounded-2xl border bg-white/95 p-4 shadow-sm ${
                  isTransport ? "border-sky-100" : "border-emerald-100"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4
                    className={`text-sm font-semibold ${
                      isTransport ? "text-sky-900" : "text-emerald-900"
                    }`}
                  >
                    {applicationType === "trip" ? `方案 ${optionIndex + 1}` : "实际明细"}
                  </h4>
                  {preferredOption?.index === optionIndex ? (
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
                    <>
                      <FieldShell error={readError(groupErrors?.options?.[optionIndex]?.budgetAmount)} label="预算金额" required>
                        <Controller
                          control={control}
                          name={`${baseName}.options.${optionIndex}.budgetAmount` as Path<ExpenseApplicationFormValues>}
                          render={({ field }) => (
                            <CurrencyInput value={typeof field.value === "number" ? field.value : undefined} onChange={field.onChange} />
                          )}
                        />
                      </FieldShell>
                      <FieldShell
                        error={optionIndex === 0 ? readError(groupErrors?.preferredOptionIndex) : undefined}
                        label="最优方案"
                      >
                        <Controller
                          control={control}
                          name={`${baseName}.preferredOptionIndex` as Path<ExpenseApplicationFormValues>}
                          render={({ field }) => (
                            <label
                              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${
                                isTransport
                                  ? "border-sky-100 bg-sky-50"
                                  : "border-emerald-100 bg-emerald-50"
                              }`}
                            >
                              <input
                                checked={field.value === optionIndex}
                                type="radio"
                                onChange={() => field.onChange(optionIndex)}
                              />
                              <span className={`text-sm ${isTransport ? "text-sky-800" : "text-emerald-800"}`}>
                                设为最优方案
                              </span>
                            </label>
                          )}
                        />
                      </FieldShell>
                    </>
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
