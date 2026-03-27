import { differenceInCalendarDays } from "date-fns";
import type {
  AccommodationPlan,
  ApplicationType,
  ExpenseApplicationFormValues,
  TransportPlan,
} from "./types";

const safeNumber = (value?: number | null) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export const getTripDays = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  return differenceInCalendarDays(end, start) + 1;
};

const sumPlanBudget = (plans: Array<TransportPlan | AccommodationPlan>) =>
  plans.reduce((sum, plan) => sum + safeNumber(plan.budgetAmount), 0);

const sumPlanActual = (plans: Array<TransportPlan | AccommodationPlan>) =>
  plans.reduce((sum, plan) => sum + safeNumber(plan.actualAmount), 0);

export const calculateBudgetTotal = (values: ExpenseApplicationFormValues) =>
  sumPlanBudget(values.transportPlans) +
  sumPlanBudget(values.accommodationPlans) +
  safeNumber(values.mealBudget) +
  safeNumber(values.groundBudget) +
  safeNumber(values.otherBudget);

export const calculateActualTotal = (values: ExpenseApplicationFormValues) =>
  sumPlanActual(values.transportPlans) +
  sumPlanActual(values.accommodationPlans) +
  safeNumber(values.mealActual) +
  safeNumber(values.groundActual) +
  safeNumber(values.otherActual);

export const formatCurrency = (value?: number | null, blankIfZero = true) => {
  const amount = safeNumber(value);
  if (blankIfZero && amount === 0) {
    return "";
  }

  return `￥${amount.toFixed(2)}`;
};

export const getLowestBudgetPlan = (plans: Array<TransportPlan | AccommodationPlan>) => {
  const indexed = plans
    .map((plan, index) => ({ index, amount: safeNumber(plan.budgetAmount) }))
    .filter((plan) => plan.amount > 0);

  if (!indexed.length) {
    return null;
  }

  return indexed.reduce((best, current) => (current.amount < best.amount ? current : best));
};

export const getPlanDisplayAmount = (
  applicationType: ApplicationType,
  plan?: TransportPlan | AccommodationPlan,
) => (applicationType === "trip" ? safeNumber(plan?.budgetAmount) : safeNumber(plan?.actualAmount));

export const getSummaryDisplayAmount = (
  applicationType: ApplicationType,
  budgetValue?: number,
  actualValue?: number,
) => (applicationType === "trip" ? safeNumber(budgetValue) : safeNumber(actualValue));
