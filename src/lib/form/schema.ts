import { z } from "zod";
import type { AccommodationGroup, ExpenseApplicationFormValues, TransportGroup } from "./types";

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

const comparisonOptionSchema = z.object({
  vendor: z.string().trim().optional().default(""),
  budgetAmount: optionalAmount,
  actualAmount: optionalAmount,
});

const transportGroupSchema = z.object({
  label: z.string().trim().optional().default(""),
  departureAt: z.string().trim().optional().default(""),
  arrivalAt: z.string().trim().optional().default(""),
  options: z.array(comparisonOptionSchema).min(1).max(3),
  preferredOptionIndex: z.number().int().min(0).max(2).optional(),
});

const accommodationGroupSchema = z.object({
  label: z.string().trim().optional().default(""),
  checkInAt: z.string().trim().optional().default(""),
  checkOutAt: z.string().trim().optional().default(""),
  options: z.array(comparisonOptionSchema).min(1).max(3),
  preferredOptionIndex: z.number().int().min(0).max(2).optional(),
});

const transportGroupHasContent = (group: TransportGroup) =>
  Boolean(
    group.label ||
      group.departureAt ||
      group.arrivalAt ||
      group.options.some(
        (option) => option.vendor || option.budgetAmount !== undefined || option.actualAmount !== undefined,
      ),
  );

const accommodationGroupHasContent = (group: AccommodationGroup) =>
  Boolean(
    group.label ||
      group.checkInAt ||
      group.checkOutAt ||
      group.options.some(
        (option) => option.vendor || option.budgetAmount !== undefined || option.actualAmount !== undefined,
      ),
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
    transportGroups: z.array(transportGroupSchema).min(1, "至少保留 1 组交通方案"),
    accommodationGroups: z.array(accommodationGroupSchema).min(1, "至少保留 1 组住宿方案"),
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
      values.transportGroups.forEach((group, groupIndex) => {
        if (group.options.length !== 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "出差申请每条交通需填写 3 个比价方案",
            path: ["transportGroups", groupIndex, "options"],
          });
        }

        if (
          typeof group.preferredOptionIndex !== "number" ||
          group.preferredOptionIndex < 0 ||
          group.preferredOptionIndex > 2
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请选择 1 个最优交通方案",
            path: ["transportGroups", groupIndex, "preferredOptionIndex"],
          });
        }

        if (!group.label.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请填写交通行程或目的地",
            path: ["transportGroups", groupIndex, "label"],
          });
        }

        if (!group.departureAt || !group.arrivalAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请完整填写该组交通日期",
            path: ["transportGroups", groupIndex, "departureAt"],
          });
        }

        group.options.forEach((option, optionIndex) => {
          if (!option.vendor.trim() || option.budgetAmount === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "出差申请的 3 个交通方案都需要填写服务商和预算金额",
              path: ["transportGroups", groupIndex, "options", optionIndex],
            });
          }

          if (option.actualAmount !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "出差申请不填写实际金额",
              path: ["transportGroups", groupIndex, "options", optionIndex, "actualAmount"],
            });
          }
        });
      });

      values.accommodationGroups.forEach((group, groupIndex) => {
        if (group.options.length !== 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "出差申请每条住宿需填写 3 个比价方案",
            path: ["accommodationGroups", groupIndex, "options"],
          });
        }

        if (
          typeof group.preferredOptionIndex !== "number" ||
          group.preferredOptionIndex < 0 ||
          group.preferredOptionIndex > 2
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请选择 1 个最优住宿方案",
            path: ["accommodationGroups", groupIndex, "preferredOptionIndex"],
          });
        }

        if (!group.label.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请填写住宿目的地或入住城市",
            path: ["accommodationGroups", groupIndex, "label"],
          });
        }

        if (!group.checkInAt || !group.checkOutAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请完整填写该组住宿日期",
            path: ["accommodationGroups", groupIndex, "checkInAt"],
          });
        }

        group.options.forEach((option, optionIndex) => {
          if (!option.vendor.trim() || option.budgetAmount === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "出差申请的 3 个住宿方案都需要填写服务商和预算金额",
              path: ["accommodationGroups", groupIndex, "options", optionIndex],
            });
          }

          if (option.actualAmount !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "出差申请不填写实际金额",
              path: ["accommodationGroups", groupIndex, "options", optionIndex, "actualAmount"],
            });
          }
        });
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
      values.transportGroups.forEach((group, groupIndex) => {
        if (!transportGroupHasContent(group)) {
          return;
        }

        if (group.options.length !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "报销申请每条交通只保留 1 条实际明细",
            path: ["transportGroups", groupIndex, "options"],
          });
        }

        if (!group.label.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请填写交通行程或目的地",
            path: ["transportGroups", groupIndex, "label"],
          });
        }

        if (!group.departureAt || !group.arrivalAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请完整填写该组交通日期",
            path: ["transportGroups", groupIndex, "departureAt"],
          });
        }

        group.options.forEach((option, optionIndex) => {
          if (option.budgetAmount !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "报销申请不填写预算金额",
              path: ["transportGroups", groupIndex, "options", optionIndex, "budgetAmount"],
            });
          }

          if ((option.vendor || option.actualAmount !== undefined) && (!option.vendor.trim() || option.actualAmount === undefined)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "已填写的交通明细需同时填写服务商和实际金额",
              path: ["transportGroups", groupIndex, "options", optionIndex],
            });
          }
        });
      });

      values.accommodationGroups.forEach((group, groupIndex) => {
        if (!accommodationGroupHasContent(group)) {
          return;
        }

        if (group.options.length !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "报销申请每条住宿只保留 1 条实际明细",
            path: ["accommodationGroups", groupIndex, "options"],
          });
        }

        if (!group.label.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请填写住宿目的地或入住城市",
            path: ["accommodationGroups", groupIndex, "label"],
          });
        }

        if (!group.checkInAt || !group.checkOutAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "请完整填写该组住宿日期",
            path: ["accommodationGroups", groupIndex, "checkInAt"],
          });
        }

        group.options.forEach((option, optionIndex) => {
          if (option.budgetAmount !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "报销申请不填写预算金额",
              path: ["accommodationGroups", groupIndex, "options", optionIndex, "budgetAmount"],
            });
          }

          if ((option.vendor || option.actualAmount !== undefined) && (!option.vendor.trim() || option.actualAmount === undefined)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "已填写的住宿明细需同时填写服务商和实际金额",
              path: ["accommodationGroups", groupIndex, "options", optionIndex],
            });
          }
        });
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
