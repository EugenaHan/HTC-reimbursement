import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generateApprovalDoc } from "../lib/docx/generateApprovalDoc";
import {
  calculateActualTotal,
  calculateBudgetTotal,
  formatCurrency,
  getTripDays,
} from "../lib/form/calculations";
import {
  defaultValues,
  emptyAccommodationPlan,
  emptyTransportPlan,
} from "../lib/form/defaultValues";
import { expenseApplicationSchema } from "../lib/form/schema";
import type { ApplicationType, ExpenseApplicationFormValues } from "../lib/form/types";
import { CurrencyInput } from "./form/CurrencyInput";
import { FieldShell, fieldInputClassName } from "./form/FieldShell";
import { PlanCard } from "./form/PlanCard";
import { SectionCard } from "./form/SectionCard";
import { StepIndicator } from "./layout/StepIndicator";

const steps = ["基础信息", "方案与明细", "费用汇总", "导出预览"];

const baseFields: Array<keyof ExpenseApplicationFormValues> = [
  "applicationType",
  "employeeName",
  "department",
  "departmentOther",
  "startDate",
  "endDate",
  "tripReason",
  "destination",
];

const detailFields: Array<keyof ExpenseApplicationFormValues> = ["transportPlans", "accommodationPlans"];

const summaryFields: Array<keyof ExpenseApplicationFormValues> = [
  "mealBudget",
  "mealActual",
  "groundBudget",
  "groundActual",
  "otherBudget",
  "otherActual",
];

const submitLabel: Record<ApplicationType, string> = {
  trip: "确认并下载出差申请单",
  reimbursement: "确认并下载报销申请单",
  combined: "确认并下载审批单",
};

const displayDate = (value?: string) => (value ? value.split("-").join(".") : "未填写");
const displayCurrency = (value?: number) => formatCurrency(value, false);

export function TravelExpenseApp() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    trigger,
  } = useForm<ExpenseApplicationFormValues>({
    defaultValues,
    resolver: zodResolver(expenseApplicationSchema),
    mode: "onBlur",
  });

  const applicationType = useWatch({ control, name: "applicationType" }) ?? defaultValues.applicationType;
  const department = useWatch({ control, name: "department" }) ?? defaultValues.department;
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });
  const values = useWatch({ control });

  const transportFieldArray = useFieldArray({
    control,
    name: "transportPlans",
  });

  const accommodationFieldArray = useFieldArray({
    control,
    name: "accommodationPlans",
  });

  useEffect(() => {
    setValue("tripDays", getTripDays(startDate, endDate), {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [endDate, setValue, startDate]);

  useEffect(() => {
    if (department !== "OTHER") {
      setValue("departmentOther", "", { shouldDirty: false, shouldValidate: false });
    }
  }, [department, setValue]);

  const normalizedValues = useMemo<ExpenseApplicationFormValues>(() => {
    return {
      ...defaultValues,
      ...values,
      applicationType: values?.applicationType ?? defaultValues.applicationType,
      department: values?.department ?? defaultValues.department,
      departmentOther: values?.departmentOther ?? defaultValues.departmentOther,
      employeeName: values?.employeeName ?? defaultValues.employeeName,
      startDate: values?.startDate ?? defaultValues.startDate,
      endDate: values?.endDate ?? defaultValues.endDate,
      tripDays: values?.tripDays ?? defaultValues.tripDays,
      tripReason: values?.tripReason ?? defaultValues.tripReason,
      destination: values?.destination ?? defaultValues.destination,
      transportPlans: (values?.transportPlans ?? defaultValues.transportPlans).map((plan) => ({
        departureAt: plan.departureAt ?? "",
        arrivalAt: plan.arrivalAt ?? "",
        vendor: plan.vendor ?? "",
        quoteAt: plan.quoteAt ?? "",
        budgetAmount: plan.budgetAmount,
        actualAmount: plan.actualAmount,
      })),
      accommodationPlans: (values?.accommodationPlans ?? defaultValues.accommodationPlans).map((plan) => ({
        checkInAt: plan.checkInAt ?? "",
        checkOutAt: plan.checkOutAt ?? "",
        vendor: plan.vendor ?? "",
        quoteAt: plan.quoteAt ?? "",
        budgetAmount: plan.budgetAmount,
        actualAmount: plan.actualAmount,
      })),
      mealBudget: values?.mealBudget,
      mealActual: values?.mealActual,
      groundBudget: values?.groundBudget,
      groundActual: values?.groundActual,
      otherBudget: values?.otherBudget,
      otherActual: values?.otherActual,
    };
  }, [values]);

  const totals = useMemo(
    () => ({
      totalBudget: calculateBudgetTotal(normalizedValues),
      totalActual: calculateActualTotal(normalizedValues),
    }),
    [normalizedValues],
  );

  const handleNext = async () => {
    const fieldsToValidate =
      currentStep === 0 ? baseFields : currentStep === 1 ? detailFields : currentStep === 2 ? summaryFields : undefined;
    const valid = fieldsToValidate ? await trigger(fieldsToValidate) : true;
    if (valid) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    }
  };

  const submitDownload = handleSubmit(async (formValues) => {
    setSubmitting(true);
    try {
      await generateApprovalDoc(formValues);
    } finally {
      setSubmitting(false);
    }
  });

  const departmentLabel =
    normalizedValues.department === "OTHER"
      ? normalizedValues.departmentOther || "未填写"
      : normalizedValues.department;

  return (
    <main className="min-h-screen px-4 py-10 text-ink-900 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 px-6 py-8 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-ink-400">Travel & Expense Approval</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
                出差与报销申请双效录入系统
              </h1>
              <p className="mt-3 text-sm leading-7 text-ink-500 md:text-base">
                按原始审批单结构 1:1 导出 `.docx`。网页端先完成录入、汇总与最终预览，确认无误后再下载 Word。
              </p>
            </div>
            <div className="rounded-2xl bg-ink-900 px-5 py-4 text-white">
              <p className="text-sm text-white/70">导出文件</p>
              <p className="mt-1 font-medium">出差报销申请单_姓名_日期.docx</p>
            </div>
          </div>
        </header>

        <StepIndicator currentStep={currentStep} steps={steps} />

        <form
          className="space-y-8"
          onKeyDown={(event) => {
            const target = event.target as HTMLElement;
            if (event.key === "Enter" && target.tagName !== "TEXTAREA" && target.tagName !== "BUTTON") {
              event.preventDefault();
            }
          }}
        >
          {currentStep === 0 ? (
            <SectionCard
              title="基础信息"
              description="先确认本次申请的基本信息。这里的字段会直接映射到 Word 顶部区域与勾选项。"
            >
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <FieldShell error={errors.applicationType?.message} label="申请类型" required>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "trip", label: "出差申请" },
                      { value: "reimbursement", label: "报销申请" },
                      { value: "combined", label: "二合一" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-3 transition hover:border-ink-300 hover:bg-white"
                      >
                        <input type="radio" value={option.value} {...register("applicationType")} />
                        <span className="text-sm font-medium text-ink-800">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </FieldShell>

                <FieldShell error={errors.employeeName?.message} htmlFor="employeeName" label="员工姓名" required>
                  <input id="employeeName" className={fieldInputClassName} placeholder="请输入姓名" {...register("employeeName")} />
                </FieldShell>

                <FieldShell error={errors.department?.message} htmlFor="department" label="部门" required>
                  <select id="department" className={fieldInputClassName} {...register("department")}>
                    <option value="HTC">HTC</option>
                    <option value="SHOB">SHOB</option>
                    <option value="OTHER">其他</option>
                  </select>
                </FieldShell>

                {department === "OTHER" ? (
                  <FieldShell error={errors.departmentOther?.message} htmlFor="departmentOther" label="其他部门名称" required>
                    <input
                      id="departmentOther"
                      className={fieldInputClassName}
                      placeholder="请输入部门名称"
                      {...register("departmentOther")}
                    />
                  </FieldShell>
                ) : null}

                <FieldShell error={errors.startDate?.message} htmlFor="startDate" label="开始日期" required>
                  <input id="startDate" className={fieldInputClassName} type="date" {...register("startDate")} />
                </FieldShell>

                <FieldShell error={errors.endDate?.message} htmlFor="endDate" label="结束日期" required>
                  <input id="endDate" className={fieldInputClassName} type="date" {...register("endDate")} />
                </FieldShell>

                <FieldShell hint="按自然日自动计算" htmlFor="tripDays" label="天数">
                  <input
                    id="tripDays"
                    className={`${fieldInputClassName} font-semibold text-ink-700`}
                    readOnly
                    value={normalizedValues.tripDays}
                  />
                </FieldShell>

                <div className="md:col-span-2">
                  <FieldShell error={errors.tripReason?.message} htmlFor="tripReason" label="出差事由" required>
                    <textarea
                      id="tripReason"
                      className={`${fieldInputClassName} min-h-28 resize-y`}
                      placeholder="例如：客户拜访、项目交付、展会参会"
                      {...register("tripReason")}
                    />
                  </FieldShell>
                </div>

                <FieldShell error={errors.destination?.message} htmlFor="destination" label="目的地" required>
                  <input id="destination" className={fieldInputClassName} placeholder="请输入城市 / 国家 / 地区" {...register("destination")} />
                </FieldShell>
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-8">
              <SectionCard
                title="城市间交通方案"
                description="预算与实际金额都会在录入时直接展示，导出到 Word 时固定映射到原表的 3 个槽位。"
                action={
                  <button
                    className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={transportFieldArray.fields.length >= 3}
                    type="button"
                    onClick={() => transportFieldArray.append(emptyTransportPlan())}
                  >
                    添加方案
                  </button>
                }
              >
                <div className="space-y-4">
                  {transportFieldArray.fields.map((field, index) => (
                    <PlanCard
                      key={field.id}
                      baseName={`transportPlans.${index}`}
                      control={control}
                      dateLabels={{ start: "出发日期", end: "抵达日期" }}
                      endKey="arrivalAt"
                      errors={errors}
                      startKey="departureAt"
                      title={`交通方案 ${index + 1}`}
                      onRemove={
                        transportFieldArray.fields.length > 1
                          ? () => transportFieldArray.remove(index)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="住宿方案"
                description="住宿方案同样按“日期 + 预算 + 实际”录入，最终在 Word 中保持原表结构。"
                action={
                  <button
                    className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={accommodationFieldArray.fields.length >= 3}
                    type="button"
                    onClick={() => accommodationFieldArray.append(emptyAccommodationPlan())}
                  >
                    添加方案
                  </button>
                }
              >
                <div className="space-y-4">
                  {accommodationFieldArray.fields.map((field, index) => (
                    <PlanCard
                      key={field.id}
                      baseName={`accommodationPlans.${index}`}
                      control={control}
                      dateLabels={{ start: "入住日期", end: "退房日期" }}
                      endKey="checkOutAt"
                      errors={errors}
                      startKey="checkInAt"
                      title={`住宿方案 ${index + 1}`}
                      onRemove={
                        accommodationFieldArray.fields.length > 1
                          ? () => accommodationFieldArray.remove(index)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-8">
              <SectionCard
                title="费用汇总"
                description="预算与实际会分别自动汇总到 Word 的“总支出（预算）/ 总支出（实际）”栏位。"
              >
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <FieldShell error={errors.mealBudget?.message} label="餐费预算">
                    <Controller
                      control={control}
                      name="mealBudget"
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FieldShell>
                  <FieldShell error={errors.groundBudget?.message} label="地面交通预算">
                    <Controller
                      control={control}
                      name="groundBudget"
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FieldShell>
                  <FieldShell error={errors.otherBudget?.message} label="其它支出预算">
                    <Controller
                      control={control}
                      name="otherBudget"
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FieldShell>
                  <FieldShell error={errors.mealActual?.message} label="餐费实际">
                    <Controller
                      control={control}
                      name="mealActual"
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FieldShell>
                  <FieldShell error={errors.groundActual?.message} label="地面交通实际">
                    <Controller
                      control={control}
                      name="groundActual"
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FieldShell>
                  <FieldShell error={errors.otherActual?.message} label="其它支出实际">
                    <Controller
                      control={control}
                      name="otherActual"
                      render={({ field }) => (
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </FieldShell>
                </div>
              </SectionCard>

              <SectionCard title="自动汇总预览" description="这两个金额不能手动改写，导出时会直接写入原表汇总栏。">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl bg-ink-900 p-5 text-white">
                    <p className="text-sm text-white/65">总支出（预算）</p>
                    <p className="mt-3 text-3xl font-semibold">{displayCurrency(totals.totalBudget)}</p>
                  </div>
                  <div className="rounded-3xl bg-accent-700 p-5 text-white">
                    <p className="text-sm text-white/65">总支出（实际）</p>
                    <p className="mt-3 text-3xl font-semibold">{displayCurrency(totals.totalActual)}</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-8">
              <SectionCard
                title="最终预览"
                description="这里是下载前的最终检查。确认无误后，点击右下角按钮再生成并下载 Word。"
              >
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <p className="text-sm text-ink-400">申请类型</p>
                        <p className="mt-2 font-semibold text-ink-900">
                          {applicationType === "trip"
                            ? "出差申请"
                            : applicationType === "reimbursement"
                              ? "报销申请"
                              : "二合一"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <p className="text-sm text-ink-400">员工 / 部门</p>
                        <p className="mt-2 font-semibold text-ink-900">
                          {normalizedValues.employeeName || "未填写"} / {departmentLabel || "未填写"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <p className="text-sm text-ink-400">出差日期</p>
                        <p className="mt-2 font-semibold text-ink-900">
                          {displayDate(normalizedValues.startDate)} - {displayDate(normalizedValues.endDate)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <p className="text-sm text-ink-400">天数 / 目的地</p>
                        <p className="mt-2 font-semibold text-ink-900">
                          {normalizedValues.tripDays || 0} 天 / {normalizedValues.destination || "未填写"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-ink-100 bg-white p-4">
                      <p className="text-sm text-ink-400">出差事由</p>
                      <p className="mt-2 leading-7 text-ink-900">{normalizedValues.tripReason || "未填写"}</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-3xl bg-ink-900 p-5 text-white">
                      <p className="text-sm text-white/65">总支出（预算）</p>
                      <p className="mt-3 text-3xl font-semibold">{displayCurrency(totals.totalBudget)}</p>
                    </div>
                    <div className="rounded-3xl bg-accent-700 p-5 text-white">
                      <p className="text-sm text-white/65">总支出（实际）</p>
                      <p className="mt-3 text-3xl font-semibold">{displayCurrency(totals.totalActual)}</p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="方案预览" description="Word 中会固定保留 3 条交通和 3 条住宿槽位。">
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-ink-900">城市间交通方案</h3>
                    {normalizedValues.transportPlans.map((plan, index) => (
                      <div key={`preview-transport-${index}`} className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <p className="font-medium text-ink-900">方案 {index + 1}</p>
                        <p className="mt-2 text-sm text-ink-500">
                          {displayDate(plan.departureAt)} - {displayDate(plan.arrivalAt)}
                        </p>
                        <p className="mt-1 text-sm text-ink-700">
                          预算 {displayCurrency(plan.budgetAmount)} / 实际 {displayCurrency(plan.actualAmount)}
                        </p>
                        <p className="mt-1 text-sm text-ink-700">服务商 {plan.vendor || "未填写"}</p>
                        <p className="mt-1 text-sm text-ink-700">报价日期 {displayDate(plan.quoteAt)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-ink-900">住宿方案</h3>
                    {normalizedValues.accommodationPlans.map((plan, index) => (
                      <div key={`preview-hotel-${index}`} className="rounded-2xl border border-ink-100 bg-ink-50 p-4">
                        <p className="font-medium text-ink-900">方案 {index + 1}</p>
                        <p className="mt-2 text-sm text-ink-500">
                          {displayDate(plan.checkInAt)} - {displayDate(plan.checkOutAt)}
                        </p>
                        <p className="mt-1 text-sm text-ink-700">
                          预算 {displayCurrency(plan.budgetAmount)} / 实际 {displayCurrency(plan.actualAmount)}
                        </p>
                        <p className="mt-1 text-sm text-ink-700">服务商 {plan.vendor || "未填写"}</p>
                        <p className="mt-1 text-sm text-ink-700">报价日期 {displayDate(plan.quoteAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-panel md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-ink-500">
              审批栏与注意事项会按原 Word 保持不变。所有方案日期按“天”导出，下载动作只会在最终预览页触发。
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-ink-200 px-5 py-3 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={currentStep === 0}
                type="button"
                onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
              >
                上一步
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-800"
                  type="button"
                  onClick={handleNext}
                >
                  下一步
                </button>
              ) : (
                <button
                  className="rounded-full bg-ink-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  type="button"
                  onClick={() => {
                    void submitDownload();
                  }}
                >
                  {submitting ? "正在生成..." : submitLabel[applicationType]}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
