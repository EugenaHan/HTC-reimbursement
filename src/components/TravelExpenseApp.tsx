import { format } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApprovalDocumentPreview } from "./export/ApprovalDocumentPreview";
import { CurrencyInput } from "./form/CurrencyInput";
import { ComparisonGroupCard } from "./form/ComparisonGroupCard";
import { FieldShell, fieldInputClassName } from "./form/FieldShell";
import { PolicyNotice } from "./form/PolicyNotice";
import { SectionCard } from "./form/SectionCard";
import { StepIndicator } from "./layout/StepIndicator";
import { generateApprovalPdf } from "../lib/docx/generateApprovalPdf";
import {
  calculateActualTotal,
  calculateBudgetTotal,
  formatCurrency,
  getTripDays,
} from "../lib/form/calculations";
import {
  createComparisonOptions,
  defaultValues,
  emptyAccommodationGroup,
  emptyTransportGroup,
} from "../lib/form/defaultValues";
import { expenseApplicationSchema } from "../lib/form/schema";
import type {
  AccommodationGroup,
  ApplicationType,
  ComparisonOption,
  ExpenseApplicationFormValues,
  TransportGroup,
} from "../lib/form/types";

type TransportGroupInput = {
  label?: string;
  departureAt?: string;
  arrivalAt?: string;
  options?: Array<Partial<ComparisonOption>>;
  preferredOptionIndex?: number;
};

type AccommodationGroupInput = {
  label?: string;
  checkInAt?: string;
  checkOutAt?: string;
  options?: Array<Partial<ComparisonOption>>;
  preferredOptionIndex?: number;
};

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

const detailFields: Array<keyof ExpenseApplicationFormValues> = ["transportGroups", "accommodationGroups"];

const summaryFields: Array<keyof ExpenseApplicationFormValues> = [
  "mealBudget",
  "mealActual",
  "groundBudget",
  "groundActual",
  "otherBudget",
  "otherActual",
];

const displayCurrency = (value?: number) => formatCurrency(value, false);

const tripBasePolicy = [
  "出差前填写申请表，明确出差事由、时间、地点、预算，并完成部门主管审核和总经理批准。",
  "严格控制出差人数和天数，严禁无实质内容的差旅活动和变相旅游。",
];

const transportPolicy = [
  "每新增一次都会生成 1 组交通比价卡片，组内固定为 3 个方案。",
  "同一交通组只需填写一次出发和抵达日期，下面 3 个方案会自动共用这组日期。",
  "员工需在 3 个方案中手动选择 1 个最优方案，系统将按所选最优方案汇总总预算。",
];

const hotelPolicy = [
  "每新增一次都会生成 1 组住宿比价卡片，组内固定为 3 个方案。",
  "同一住宿组只需填写一次入住和离开日期，下面 3 个方案会自动共用这组日期。",
  "住宿标准：一线城市 1000 元/晚以内，省会城市 800 元/晚以内，其他城市 600 元/晚以内。",
];

const reimbursementPolicy = [
  "报销申请只能填写实际金额，标准内根据有效票据实报实销。",
  "出差结束后 7 个工作日内办理报销手续，超期需书面说明。",
  "所有票据及附件需真实、合法、完整，用于纳税和审计。",
];

const submitLabel: Record<ApplicationType, string> = {
  trip: "导出 PDF",
  reimbursement: "导出 PDF",
};

const getExportFilePrefix = (applicationType: ApplicationType) =>
  applicationType === "trip" ? "出差申请单" : "报销申请单";

const normalizeOptionsForType = (
  applicationType: ApplicationType,
  options?: Array<Partial<ComparisonOption>>,
): ComparisonOption[] => {
  const requiredCount = applicationType === "trip" ? 3 : 1;
  const next = [...(options ?? [])];

  while (next.length < requiredCount) {
    next.push(createComparisonOptions()[0]);
  }

  return next.slice(0, requiredCount).map((option) => ({
    vendor: option.vendor ?? "",
    budgetAmount: applicationType === "trip" ? option.budgetAmount : undefined,
    actualAmount: applicationType === "reimbursement" ? option.actualAmount : undefined,
  }));
};

const normalizeTransportGroups = (
  applicationType: ApplicationType,
  groups?: TransportGroupInput[],
) => {
  const baseline = groups?.length ? groups : [emptyTransportGroup()];

  return baseline.map((group) => ({
    label: group.label ?? "",
    departureAt: group.departureAt ?? "",
    arrivalAt: group.arrivalAt ?? "",
    options: normalizeOptionsForType(applicationType, group.options),
    preferredOptionIndex:
      applicationType === "trip"
        ? typeof group.preferredOptionIndex === "number" && group.preferredOptionIndex >= 0 && group.preferredOptionIndex < 3
          ? group.preferredOptionIndex
          : 0
        : undefined,
  }));
};

const normalizeAccommodationGroups = (
  applicationType: ApplicationType,
  groups?: AccommodationGroupInput[],
) => {
  const baseline = groups?.length ? groups : [emptyAccommodationGroup()];

  return baseline.map((group) => ({
    label: group.label ?? "",
    checkInAt: group.checkInAt ?? "",
    checkOutAt: group.checkOutAt ?? "",
    options: normalizeOptionsForType(applicationType, group.options),
    preferredOptionIndex:
      applicationType === "trip"
        ? typeof group.preferredOptionIndex === "number" && group.preferredOptionIndex >= 0 && group.preferredOptionIndex < 3
          ? group.preferredOptionIndex
          : 0
        : undefined,
  }));
};

export function TravelExpenseApp() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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
    fields: transportGroupFields,
    append: appendTransportGroup,
    remove: removeTransportGroup,
    replace: replaceTransportGroups,
  } = useFieldArray({
    control,
    name: "transportGroups",
  });

  const {
    fields: accommodationGroupFields,
    append: appendAccommodationGroup,
    remove: removeAccommodationGroup,
    replace: replaceAccommodationGroups,
  } = useFieldArray({
    control,
    name: "accommodationGroups",
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
    replaceTransportGroups(
      normalizeTransportGroups(applicationType, getValues("transportGroups")),
    );
    replaceAccommodationGroups(
      normalizeAccommodationGroups(applicationType, getValues("accommodationGroups")),
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
    replaceAccommodationGroups,
    replaceTransportGroups,
    setValue,
  ]);

  const normalizedValues = useMemo<ExpenseApplicationFormValues>(() => ({
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
    transportGroups: normalizeTransportGroups(
      values?.applicationType ?? defaultValues.applicationType,
      values?.transportGroups,
    ),
    accommodationGroups: normalizeAccommodationGroups(
      values?.applicationType ?? defaultValues.applicationType,
      values?.accommodationGroups,
    ),
    mealBudget: values?.mealBudget,
    mealActual: values?.mealActual,
    groundBudget: values?.groundBudget,
    groundActual: values?.groundActual,
    otherBudget: values?.otherBudget,
    otherActual: values?.otherActual,
  }), [values]);

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

  const exportFiles = handleSubmit(async (formValues) => {
    setSubmitting(true);

    try {
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

  const toggleCollapsed = (id: string) => {
    setCollapsedGroups((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

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
                支持多组交通和住宿比价。每组固定 3 个方案，共享日期只填一次；最终一步会导出 PDF。
              </p>
            </div>
            <div className="rounded-2xl bg-ink-900 px-5 py-4 text-white">
              <p className="text-sm text-white/70">导出文件</p>
              <p className="mt-1 font-medium">申请单_姓名_日期.pdf</p>
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
              description="先确认本次申请类型和基础信息。系统会根据申请类型自动切换预算/实际金额录入规则。"
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
                    ? "每组是同一行程下的 3 个预算方案。你可以折叠已填完的组，并继续新增下一组。"
                    : "每条交通只录入 1 条实际明细，仍可继续新增交通2、交通3。"
                }
                action={
                  <button
                    className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50"
                    type="button"
                    onClick={() => appendTransportGroup(emptyTransportGroup(isTripApplication ? 3 : 1))}
                  >
                    添加交通
                  </button>
                }
              >
                <div className="space-y-4">
                  <PolicyNotice title="交通规则" lines={transportPolicy} />
                  {transportGroupFields.map((field, index) => (
                    <ComparisonGroupCard
                      key={field.id}
                      applicationType={applicationType}
                      baseName={`transportGroups.${index}`}
                      collapsed={Boolean(collapsedGroups[field.id])}
                      control={control}
                      endKey="arrivalAt"
                      endLabel="抵达日期"
                      errors={errors}
                      labelLabel="交通行程 / 目的地"
                      optionFieldLabel="交通名称"
                      optionPlaceholder="航班号 / 火车班次 / 网约车等"
                      startKey="departureAt"
                      startLabel="出发日期"
                      title={`交通${index + 1}`}
                      onRemove={
                        transportGroupFields.length > 1
                          ? () => removeTransportGroup(index)
                          : undefined
                      }
                      onToggle={() => toggleCollapsed(field.id)}
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="住宿方案"
                description={
                  isTripApplication
                    ? "每组是同一目的地或入住场景下的 3 个预算方案。你可以折叠已填完的组，并继续新增下一组。"
                    : "每条住宿只录入 1 条实际明细，仍可继续新增住宿2、住宿3。"
                }
                action={
                  <button
                    className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition hover:border-ink-400 hover:bg-ink-50"
                    type="button"
                    onClick={() => appendAccommodationGroup(emptyAccommodationGroup(isTripApplication ? 3 : 1))}
                  >
                    添加住宿
                  </button>
                }
              >
                <div className="space-y-4">
                  <PolicyNotice title="住宿规则" lines={hotelPolicy} />
                  {accommodationGroupFields.map((field, index) => (
                    <ComparisonGroupCard
                      key={field.id}
                      applicationType={applicationType}
                      baseName={`accommodationGroups.${index}`}
                      collapsed={Boolean(collapsedGroups[field.id])}
                      control={control}
                      endKey="checkOutAt"
                      endLabel="离开日期"
                      errors={errors}
                      labelLabel="入住城市 / 目的地"
                      optionFieldLabel="酒店名称"
                      optionPlaceholder="酒店名称"
                      startKey="checkInAt"
                      startLabel="入住日期"
                      title={`住宿${index + 1}`}
                      onRemove={
                        accommodationGroupFields.length > 1
                          ? () => removeAccommodationGroup(index)
                          : undefined
                      }
                      onToggle={() => toggleCollapsed(field.id)}
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
                description={
                  isTripApplication
                    ? "出差申请只填写预算金额。系统按每组手动选择的最优方案汇总预算总额。"
                    : "报销申请只填写实际金额。系统按所有实际录入金额自动汇总实际总额。"
                }
              >
                <div className="space-y-5">
                  <PolicyNotice
                    title={isTripApplication ? "预算提醒" : "报销提醒"}
                    lines={isTripApplication ? ["每组交通和住宿只按员工勾选的最优方案计入总预算，其余方案用于比价留痕。"] : reimbursementPolicy}
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
                description="这里展示最终导出内容。点击右下角按钮后，会下载最终 PDF。"
              >
                <div className="space-y-5">
                  <PolicyNotice
                    title="导出前确认"
                    lines={[
                      isTripApplication
                        ? "本次为出差申请，系统会按各条中手动选择的最优方案汇总预算，并保留所有比价明细。"
                        : "本次为报销申请，系统只导出实际金额，并保留所有已填写的交通与住宿分组明细。",
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
              每组交通和住宿都支持折叠；预算按每组手动选择的最优方案汇总，最终一步会导出 PDF。
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
