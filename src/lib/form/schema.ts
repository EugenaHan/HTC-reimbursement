import { z } from "zod";
import type { ExpenseApplicationFormValues } from "./types";

const textField = (label: string) =>
  z.string().trim().min(1, `${label}不能为空`).max(100, `${label}长度不能超过 100 个字符`);

const longTextField = (label: string) =>
  z.string().trim().min(1, `${label}不能为空`).max(300, `${label}长度不能超过 300 个字符`);

const optionalAmount = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
}, z.number().min(0, "金额不能为负数").optional());

const transportPlanSchema = z.object({
  departureAt: z.string().trim().optional().default(""),
  arrivalAt: z.string().trim().optional().default(""),
  vendor: z.string().trim().optional().default(""),
  quoteAt: z.string().trim().optional().default(""),
  budgetAmount: optionalAmount,
  actualAmount: optionalAmount,
});

const accommodationPlanSchema = z.object({
  checkInAt: z.string().trim().optional().default(""),
  checkOutAt: z.string().trim().optional().default(""),
  vendor: z.string().trim().optional().default(""),
  quoteAt: z.string().trim().optional().default(""),
  budgetAmount: optionalAmount,
  actualAmount: optionalAmount,
});

const hasPlanContent = (plan: {
  departureAt?: string;
  arrivalAt?: string;
  checkInAt?: string;
  checkOutAt?: string;
  vendor?: string;
  quoteAt?: string;
  budgetAmount?: number;
  actualAmount?: number;
}) =>
  Boolean(
    plan.departureAt ||
      plan.arrivalAt ||
      plan.checkInAt ||
      plan.checkOutAt ||
      plan.vendor ||
      plan.quoteAt ||
      plan.budgetAmount !== undefined ||
      plan.actualAmount !== undefined,
  );

export const expenseApplicationSchema = z
  .object({
    applicationType: z.enum(["trip", "reimbursement"]),
    employeeName: textField("员工姓名"),
    department: z.enum(["HTC", "SHOB", "OTHER"]),
    departmentOther: z.string().trim().max(100, "自定义部门长度不能超过 100 个字符"),
    startDate: z.string().trim().min(1, "开始日期不能为空"),
    endDate: z.string().trim().min(1, "结束日期不能为空"),
    tripDays: z.number().min(0),
    tripReason: longTextField("出差事由"),
    destination: textField("目的地"),
    transportPlans: z.array(transportPlanSchema).max(3, "城市间交通方案最多 3 条"),
    accommodationPlans: z.array(accommodationPlanSchema).max(3, "住宿方案最多 3 条"),
    mealBudget: optionalAmount,
    mealActual: optionalAmount,
    groundBudget: optionalAmount,
    groundActual: optionalAmount,
    otherBudget: optionalAmount,
    otherActual: optionalAmount,
  })
  .superRefine((values, ctx) => {
    if (values.department === "OTHER" && !values.departmentOther.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "请填写其他部门名称",
        path: ["departmentOther"],
      });
    }

    if (values.startDate && values.endDate && new Date(values.endDate) < new Date(values.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "结束日期不能早于开始日期",
        path: ["endDate"],
      });
    }

    if (values.applicationType === "trip") {
      if (values.transportPlans.length !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "出差申请必须填写 3 个交通方案用于比价",
          path: ["transportPlans"],
        });
      }

      if (values.accommodationPlans.length !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "出差申请必须填写 3 个住宿方案用于比价",
          path: ["accommodationPlans"],
        });
      }

      values.transportPlans.forEach((plan, index) => {
        if (!plan.departureAt || !plan.arrivalAt || !plan.vendor.trim() || !plan.quoteAt || plan.budgetAmount === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "出差申请的交通方案需完整填写日期、预算、服务商和报价日期",
            path: ["transportPlans", index],
          });
        }

        if (plan.actualAmount !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "出差申请不填写实际金额",
            path: ["transportPlans", index, "actualAmount"],
          });
        }
      });

      values.accommodationPlans.forEach((plan, index) => {
        if (!plan.checkInAt || !plan.checkOutAt || !plan.vendor.trim() || !plan.quoteAt || plan.budgetAmount === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "出差申请的住宿方案需完整填写日期、预算、服务商和报价日期",
            path: ["accommodationPlans", index],
          });
        }

        if (plan.actualAmount !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "出差申请不填写实际金额",
            path: ["accommodationPlans", index, "actualAmount"],
          });
        }
      });

      if (values.mealActual !== undefined || values.groundActual !== undefined || values.otherActual !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "出差申请只填写预算金额",
          path: ["mealActual"],
        });
      }
    }

    if (values.applicationType === "reimbursement") {
      values.transportPlans.forEach((plan, index) => {
        if (plan.budgetAmount !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "报销申请不填写预算金额",
            path: ["transportPlans", index, "budgetAmount"],
          });
        }

        if (hasPlanContent(plan) && (!plan.departureAt || !plan.arrivalAt || !plan.vendor.trim() || !plan.quoteAt || plan.actualAmount === undefined)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "已填写的交通方案需补全日期、实际金额、服务商和报价日期",
            path: ["transportPlans", index],
          });
        }
      });

      values.accommodationPlans.forEach((plan, index) => {
        if (plan.budgetAmount !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "报销申请不填写预算金额",
            path: ["accommodationPlans", index, "budgetAmount"],
          });
        }

        if (hasPlanContent(plan) && (!plan.checkInAt || !plan.checkOutAt || !plan.vendor.trim() || !plan.quoteAt || plan.actualAmount === undefined)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "已填写的住宿方案需补全日期、实际金额、服务商和报价日期",
            path: ["accommodationPlans", index],
          });
        }
      });

      if (values.mealBudget !== undefined || values.groundBudget !== undefined || values.otherBudget !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "报销申请只填写实际金额",
          path: ["mealBudget"],
        });
      }
    }
  });

export type ExpenseApplicationSchema = z.infer<typeof expenseApplicationSchema>;

export const validateExpenseApplication = (values: ExpenseApplicationFormValues) =>
  expenseApplicationSchema.parse(values);
