import { format } from "date-fns";
import {
  calculateActualTotal,
  calculateBudgetTotal,
  formatCurrency,
  getLowestBudgetOption,
  getOptionDisplayAmount,
  getSummaryDisplayAmount,
  getTripDays,
  isAccommodationGroupVisible,
  isTransportGroupVisible,
} from "../form/calculations";
import type {
  AccommodationGroup,
  ComparisonOption,
  DocxComparisonGroupData,
  DocxTemplateData,
  ExpenseApplicationFormValues,
  TransportGroup,
} from "../form/types";

const formatDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return format(parsed, "yyyy.MM.dd");
};

const amountDisplay = (value?: number) => formatCurrency(value, true);

const getDepartmentName = (values: ExpenseApplicationFormValues) =>
  values.department === "OTHER" ? values.departmentOther.trim() : values.department;

const toComparisonGroupData = (
  values: ExpenseApplicationFormValues,
  group: TransportGroup | AccommodationGroup,
  displayTitle: string,
  startDate: string,
  endDate: string,
): DocxComparisonGroupData => {
  const lowestBudgetOption = values.applicationType === "trip" ? getLowestBudgetOption(group.options) : null;
  const visibleOptions =
    values.applicationType === "trip" ? group.options.slice(0, 3) : group.options.slice(0, 1);

  return {
    display_title: displayTitle,
    group_label: group.label.trim(),
    best_option_note:
      values.applicationType === "trip" && lowestBudgetOption
        ? `最低价为方案 ${lowestBudgetOption.index + 1}（${formatCurrency(lowestBudgetOption.amount, false)}）`
        : "",
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    options: visibleOptions.map((option, index) => ({
      row_label:
        values.applicationType === "trip"
          ? lowestBudgetOption?.index === index
            ? `方案 ${index + 1}（最低价）`
            : `方案 ${index + 1}`
          : "实际",
      vendor: option.vendor?.trim() ?? "",
      amount: amountDisplay(getOptionDisplayAmount(values.applicationType, option)),
    })),
  };
};

const mapTransportGroups = (values: ExpenseApplicationFormValues) =>
  values.transportGroups
    .filter((group) => isTransportGroupVisible(group, values.applicationType))
    .map((group, index) => toComparisonGroupData(values, group, `交通${index + 1}`, group.departureAt, group.arrivalAt));

const mapAccommodationGroups = (values: ExpenseApplicationFormValues) =>
  values.accommodationGroups
    .filter((group) => isAccommodationGroupVisible(group, values.applicationType))
    .map((group, index) => toComparisonGroupData(values, group, `住宿${index + 1}`, group.checkInAt, group.checkOutAt));

export const mapFormValuesToTemplateData = (values: ExpenseApplicationFormValues): DocxTemplateData => {
  const totalBudget = calculateBudgetTotal(values);
  const totalActual = calculateActualTotal(values);
  const tripDays = values.tripDays || getTripDays(values.startDate, values.endDate);

  return {
    form_title: values.applicationType === "trip" ? "出差申请表" : "报销申请表",
    trip_checked: values.applicationType === "trip" ? "√" : "",
    reimbursement_checked: values.applicationType === "reimbursement" ? "√" : "",
    name: values.employeeName.trim(),
    dept: getDepartmentName(values),
    start_date: formatDate(values.startDate),
    end_date: formatDate(values.endDate),
    trip_days: tripDays ? String(tripDays) : "",
    reason: values.tripReason.trim(),
    destination: values.destination.trim(),
    meal_budget: amountDisplay(getSummaryDisplayAmount(values.applicationType, values.mealBudget, values.mealActual)),
    ground_budget: amountDisplay(getSummaryDisplayAmount(values.applicationType, values.groundBudget, values.groundActual)),
    other_budget: amountDisplay(getSummaryDisplayAmount(values.applicationType, values.otherBudget, values.otherActual)),
    total_budget: values.applicationType === "trip" ? formatCurrency(totalBudget, false) : "",
    total_actual: values.applicationType === "reimbursement" ? formatCurrency(totalActual, false) : "",
    transport_groups: mapTransportGroups(values),
    accommodation_groups: mapAccommodationGroups(values),
  };
};
