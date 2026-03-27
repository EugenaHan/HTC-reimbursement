import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApprovalDocumentPreview } from "./export/ApprovalDocumentPreview";
import { CurrencyInput } from "./form/CurrencyInput";
import { FieldShell, fieldInputClassName } from "./form/FieldShell";
import { PlanCard } from "./form/PlanCard";
import { PolicyNotice } from "./form/PolicyNotice";
import { SectionCard } from "./form/SectionCard";
import { StepIndicator } from "./layout/StepIndicator";
import { generateApprovalDoc } from "../lib/docx/generateApprovalDoc";
import { generateApprovalPdf } from "../lib/docx/generateApprovalPdf";
import {
  calculateActualTotal,
  calculateBudgetTotal,
  formatCurrency,
  getLowestBudgetPlan,
  getTripDays,
} from "../lib/form/calculations";
import {
  defaultValues,
  emptyAccommodationPlan,
  emptyTransportPlan,
} from "../lib/form/defaultValues";
import { expenseApplicationSchema } from "../lib/form/schema";
import type { ApplicationType, ExpenseApplicationFormValues } from "../lib/form/types";

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

const displayDate = (value?: string) => (value ? value.split("-").join(".") : "未填写");
const displayCurrency = (value?: number) => formatCurrency(value, false);

const tripBasePolicy = [
  "出差前填写申请表，明确出差事由、时间、地点、预算，并完成部门主管审核和总经理批准。",
  "严格控制出差人数和天数，严禁无实质内容的差旅活动和变相旅游。",
];

const transportPolicy = [
  "优先选择经济便捷的交通工具，必须提供 3 个交通方案进行比价。",
  "特殊情况需提前说明，未经许可自行超标的部分由个人承担。",
];

const hotelPolicy = [
  "必须提供 3 个住宿方案进行比价，系统会自动标记最低价为最佳方案。",
  "住宿标准：一线城市 1000 元/晚以内，省会城市 800 元/晚以内，其他城市 600 元/晚以内。",
];

const reimbursementPolicy = [
  "报销申请只能填写实际金额，标准内根据有效票据实报实销。",
  "出差结束后 7 个工作日内办理报销手续，超期需书面说明。",
  "所有票据及附件需真实、合法、完整，用于纳税和审计。",
];

const submitLabel: Record<ApplicationType, string> = {
  trip: "导出 Word 和 PDF",
  reimbursement: "导出 Word 和 PDF",
};

const getExportFilePrefix = (applicationType: ApplicationType) =>
  applicationType === "trip" ? "出差申请单" : "报销申请单";

function normalizePlansForType<T extends { budgetAmount?: number; actualAmount?: number }>(
  applicationType: ApplicationType,
  plans: T[],
  createEmpty: () => T,
): T[] {
  const next = [...plans];

  if (applicationType === "trip") {
    while (next.length < 3) {
      next.push(createEmpty());
    }

    return next.slice(0, 3).map((plan) => ({
      ...plan,
      actualAmount: undefined,
    }));
  }

  const baseline = next.length ? next : [createEmpty()];
  return baseline.slice(0, 3).map((plan) => ({
    ...plan,
    budgetAmount: undefined,
  }));
}

export function TravelExpenseApp() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const {
    control,
    formState: { errors },
    getValues,
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

  const {
    fields: transportFields,
    append: appendTransportPlan,
    remove: removeTransportPlan,
    replace: replaceTransportPlans,
  } = useFieldArray({
    control,
    name: "transportPlans",
  });

  const {
    fields: accommodationFields,
    append: appendAccommodationPlan,
    remove: removeAccommodationPlan,
    replace: replaceAccommodationPlans,
  } = useFieldArray({
    control,
    name: "accommodationPlans",
  });

  const isTripApplication = applicationType === "trip";

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

  useEffect(() => {
    const currentTransport = getValues("transportPlans");
    const currentAccommodation = getValues("accommodationPlans");

    replaceTransportPlans(
      normalizePlansForType(applicationType, currentTransport, emptyTransportPlan),
    );
    replaceAccommodationPlans(
      normalizePlansForType(applicationType, currentAccommodation, emptyAccommodationPlan),
    );

    if (applicationType === "trip") {
      setValue("mealActual", undefined, { shouldDirty: true, shouldValidate: false });
      setValue("groundActual", undefined, { shouldDirty: true, shouldValidate: false });
      setValue("otherActual", undefined, { shouldDirty: true, shouldValidate: false });
    } else {
      setValue("mealBudget", undefined, { shouldDirty: true, shouldValidate: false });
      setValue("groundBudget", undefined, { shouldDirty: true, shouldValidate: false });
      setValue("otherBudget", undefined, { shouldDirty: true, shouldValidate: false });
    }
  }, [
    applicationType,
    getValues,
    replaceAccommodationPlans,
    replaceTransportPlans,
    setValue,
  ]);

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

  const lowestTransportPlan = useMemo(
    () => (isTripApplication ? getLowestBudgetPlan(normalizedValues.transportPlans) : null),
    [isTripApplication, normalizedValues.transportPlans],
  );
  const lowestAccommodationPlan = useMemo(
    () => (isTripApplication ? getLowestBudgetPlan(normalizedValues.accommodationPlans) : null),
    [isTripApplication, normalizedValues.accommodationPlans],
  );

  const handleNext = async () => {
    const fieldsToValidate =
      currentStep === 0 ? baseFields : currentStep === 1 ? detailFields : currentStep === 2 ? summaryFields : undefined;
    const valid = fieldsToValidate ? await trigger(fieldsToValidate) : true;
    if (valid) {
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    }
  };

  const exportFiles = handleSubmit(async (formValues) => {
    setSubmitting(true);
    try {
      await generateApprovalDoc(formValues);

      if (previewRef.current) {
        const dateSegment = format(new Date(), "yyyyMMdd");
        const safeName = formValues.employeeName.trim() || "未命名";
        const prefix = getExportFilePrefix(formValues.applicationType);
        await generateApprovalPdf(previewRef.current, `${prefix}_${safeName}_${dateSegment}.pdf`);
      }
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
                出差申请与报销申请系统
              </h1>
              <p className="mt-3 text-sm leading-7 text-ink-500 md:text-base">
                出差申请只填写预算金额，报销申请只填写实际金额。最终一步会同时导出 Word 与 PDF。
              </p>
            </div>
            <div className="rounded-2xl bg-ink-900 px-5 py-4 text-white">
              <p className="text-sm text-white/70">导出文件</p>
              <p className="mt-1 font-medium">申请单_姓名_日期.docx / .pdf</p>
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
              description="先确认本次申请的类型和基础信息。系统会根据申请类型自动切换预算/实际金额录入规则。"
            >
              <div className="space-y-5">
                <PolicyNotice title="制度提醒" lines={tripBasePolicy} />
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  <FieldShell error={errors.applicationType?.message} label="申请类型" required>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { value: "trip", label: "出差申请" },
                        { value: "reimbursement", label: "报销申请" },
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
              </div>
            </SectionCard>
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-8">
              <SectionCard
                title="城市间交通方案"
                description={
                  isTripApplication
                    ? "出差申请必须完整填写 3 个交通方案，系统会自动判定最低价为最佳方案。"
                    : "报销申请只填写实际金额；如填写交通方案，请补全日期、金额、服务商和报价日期。"
                }
                action={
                  isTripApplication ? null : (
                    <button
                      className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={transportFields.length >= 3}
                      type="button"
                      onClick={() => appendTransportPlan(emptyTransportPlan())}
                    >
                      添加方案
                    </button>
                  )
                }
              >
                <div className="space-y-4">
                  <PolicyNotice
                    title="交通规则"
                    lines={[
                      ...transportPolicy,
                      lowestTransportPlan
                        ? `当前最低价交通方案：方案 ${lowestTransportPlan.index + 1}，${displayCurrency(lowestTransportPlan.amount)}`
                        : "当前尚未形成可比价的交通方案。",
                    ]}
                  />
                  {transportFields.map((field, index) => (
                    <PlanCard
                      key={field.id}
                      amountMode={isTripApplication ? "budget" : "actual"}
                      baseName={`transportPlans.${index}`}
                      control={control}
                      dateLabels={{ start: "出发日期", end: "抵达日期" }}
                      endKey="arrivalAt"
                      errors={errors}
                      highlightLabel={
                        isTripApplication && lowestTransportPlan?.index === index ? "最低价 / 最佳方案" : undefined
                      }
                      startKey="departureAt"
                      title={`交通方案 ${index + 1}`}
                      onRemove={
                        !isTripApplication && transportFields.length > 1
                          ? () => removeTransportPlan(index)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="住宿方案"
                description={
                  isTripApplication
                    ? "出差申请必须完整填写 3 个住宿方案，系统会自动判定最低价为最佳方案。"
                    : "报销申请只填写实际金额；如填写住宿方案，请补全日期、金额、服务商和报价日期。"
                }
                action={
                  isTripApplication ? null : (
                    <button
                      className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={accommodationFields.length >= 3}
                      type="button"
                      onClick={() => appendAccommodationPlan(emptyAccommodationPlan())}
                    >
                      添加方案
                    </button>
                  )
                }
              >
                <div className="space-y-4">
                  <PolicyNotice
                    title="住宿规则"
                    lines={[
                      ...hotelPolicy,
                      lowestAccommodationPlan
                        ? `当前最低价住宿方案：方案 ${lowestAccommodationPlan.index + 1}，${displayCurrency(lowestAccommodationPlan.amount)}`
                        : "当前尚未形成可比价的住宿方案。",
                    ]}
                  />
                  {accommodationFields.map((field, index) => (
                    <PlanCard
                      key={field.id}
                      amountMode={isTripApplication ? "budget" : "actual"}
                      baseName={`accommodationPlans.${index}`}
                      control={control}
                      dateLabels={{ start: "入住日期", end: "退房日期" }}
                      endKey="checkOutAt"
                      errors={errors}
                      highlightLabel={
                        isTripApplication && lowestAccommodationPlan?.index === index ? "最低价 / 最佳方案" : undefined
                      }
                      startKey="checkInAt"
                      title={`住宿方案 ${index + 1}`}
                      onRemove={
                        !isTripApplication && accommodationFields.length > 1
                          ? () => removeAccommodationPlan(index)
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
                description={isTripApplication ? "出差申请只填写预算金额。" : "报销申请只填写实际金额。"}
              >
                <div className="space-y-5">
                  <PolicyNotice
                    title={isTripApplication ? "预算提醒" : "报销提醒"}
                    lines={isTripApplication ? ["预算控制、标准管理，超标部分未经审批需个人承担。"] : reimbursementPolicy}
                  />
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {isTripApplication ? (
                      <>
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
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="自动汇总预览" description="系统会根据当前申请类型自动汇总对应金额。">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`rounded-3xl p-5 text-white ${isTripApplication ? "bg-ink-900" : "bg-slate-300"}`}>
                    <p className="text-sm text-white/65">总支出（预算）</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {isTripApplication ? displayCurrency(totals.totalBudget) : "本次不填写"}
                    </p>
                  </div>
                  <div className={`rounded-3xl p-5 text-white ${!isTripApplication ? "bg-accent-700" : "bg-slate-300"}`}>
                    <p className="text-sm text-white/65">总支出（实际）</p>
                    <p className="mt-3 text-3xl font-semibold">
                      {!isTripApplication ? displayCurrency(totals.totalActual) : "本次不填写"}
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-8">
              <SectionCard
                title="最终预览"
                description="这里展示最终导出内容。点击右下角按钮后，会同时下载 Word 和 PDF 两份文件。"
              >
                <div className="space-y-5">
                  <PolicyNotice
                    title="导出前确认"
                    lines={[
                      isTripApplication
                        ? "本次为出差申请，系统只导出预算金额，并已按最低价自动标记最佳方案。"
                        : "本次为报销申请，系统只导出实际金额，并保留报销审核栏位。",
                      ...reimbursementPolicy,
                    ]}
                  />
                  <div className="overflow-x-auto rounded-3xl border border-white/70 bg-slate-100/70 p-4">
                    <ApprovalDocumentPreview
                      applicationType={applicationType}
                      previewRef={previewRef}
                      totalActual={totals.totalActual}
                      totalBudget={totals.totalBudget}
                      values={normalizedValues}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-3xl border border-white/70 bg-white/90 p-5 shadow-panel md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-ink-500">
              出差申请只允许预算金额，报销申请只允许实际金额；最终一步会同时导出 Word 与 PDF。
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
                    void exportFiles();
                  }}
                >
                  {submitting ? "正在导出..." : submitLabel[applicationType]}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
