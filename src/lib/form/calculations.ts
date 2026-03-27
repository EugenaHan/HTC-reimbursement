import { differenceInCalendarDays } from "date-fns";
import type {
  AccommodationGroup,
  ApplicationType,
  ComparisonOption,
  ExpenseApplicationFormValues,
  TransportGroup,
} from "./types";

const safeNumber = (value?: number | null) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const groupHasAmount = (options: ComparisonOption[], applicationType: ApplicationType) =>
  options.some((option) =>
    applicationType === "trip" ? option.budgetAmount !== undefined : option.actualAmount !== undefined,
  );

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

export const formatCurrency = (value?: number | null, blankIfZero = true) => {
  const amount = safeNumber(value);
  if (blankIfZero && amount === 0) {
    return "";
  }

  return `￥${amount.toFixed(2)}`;
};

export const getLowestBudgetOption = (options: ComparisonOption[]) => {
  const indexed = options
    .map((option, index) => ({ index, amount: safeNumber(option.budgetAmount) }))
    .filter((option) => option.amount > 0);

  if (!indexed.length) {
    return null;
  }

  return indexed.reduce((best, current) => (current.amount < best.amount ? current : best));
};

const sumLowestBudgetAcrossGroups = (groups: Array<TransportGroup | AccommodationGroup>) =>
  groups.reduce((sum, group) => sum + safeNumber(getLowestBudgetOption(group.options)?.amount), 0);

const sumActualAcrossGroups = (groups: Array<TransportGroup | AccommodationGroup>) =>
  groups.reduce(
    (sum, group) => sum + group.options.reduce((groupSum, option) => groupSum + safeNumber(option.actualAmount), 0),
    0,
  );

export const calculateBudgetTotal = (values: ExpenseApplicationFormValues) =>
  sumLowestBudgetAcrossGroups(values.transportGroups) +
  sumLowestBudgetAcrossGroups(values.accommodationGroups) +
  safeNumber(values.mealBudget) +
  safeNumber(values.groundBudget) +
  safeNumber(values.otherBudget);

export const calculateActualTotal = (values: ExpenseApplicationFormValues) =>
  sumActualAcrossGroups(values.transportGroups) +
  sumActualAcrossGroups(values.accommodationGroups) +
  safeNumber(values.mealActual) +
  safeNumber(values.groundActual) +
  safeNumber(values.otherActual);

export const getOptionDisplayAmount = (
  applicationType: ApplicationType,
  option?: ComparisonOption,
) => (applicationType === "trip" ? safeNumber(option?.budgetAmount) : safeNumber(option?.actualAmount));

export const getSummaryDisplayAmount = (
  applicationType: ApplicationType,
  budgetValue?: number,
  actualValue?: number,
) => (applicationType === "trip" ? safeNumber(budgetValue) : safeNumber(actualValue));

export const isTransportGroupVisible = (group: TransportGroup, applicationType: ApplicationType) =>
  Boolean(group.label || group.departureAt || group.arrivalAt || groupHasAmount(group.options, applicationType) || group.options.some((option) => option.vendor));

export const isAccommodationGroupVisible = (group: AccommodationGroup, applicationType: ApplicationType) =>
  Boolean(group.label || group.checkInAt || group.checkOutAt || groupHasAmount(group.options, applicationType) || group.options.some((option) => option.vendor));
