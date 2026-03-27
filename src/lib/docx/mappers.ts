import { format } from "date-fns";
import {
  calculateActualTotal,
  calculateBudgetTotal,
  formatCurrency,
  getPlanDisplayAmount,
  getSummaryDisplayAmount,
  getTripDays,
} from "../form/calculations";
import type { AccommodationPlan, DocxTemplateData, ExpenseApplicationFormValues, TransportPlan } from "../form/types";

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

const fillTransportSlot = (applicationType: ExpenseApplicationFormValues["applicationType"], slot: number, plan?: TransportPlan) => ({
  [`transport_${slot}_departure`]: formatDate(plan?.departureAt),
  [`transport_${slot}_arrival`]: formatDate(plan?.arrivalAt),
  [`transport_${slot}_budget`]: amountDisplay(getPlanDisplayAmount(applicationType, plan)),
  [`transport_${slot}_vendor`]: plan?.vendor?.trim() ?? "",
  [`transport_${slot}_quote_at`]: formatDate(plan?.quoteAt),
});

const fillHotelSlot = (applicationType: ExpenseApplicationFormValues["applicationType"], slot: number, plan?: AccommodationPlan) => ({
  [`hotel_${slot}_check_in`]: formatDate(plan?.checkInAt),
  [`hotel_${slot}_check_out`]: formatDate(plan?.checkOutAt),
  [`hotel_${slot}_budget`]: amountDisplay(getPlanDisplayAmount(applicationType, plan)),
  [`hotel_${slot}_vendor`]: plan?.vendor?.trim() ?? "",
  [`hotel_${slot}_quote_at`]: formatDate(plan?.quoteAt),
});

export const mapFormValuesToTemplateData = (values: ExpenseApplicationFormValues): DocxTemplateData => {
  const totalBudget = calculateBudgetTotal(values);
  const totalActual = calculateActualTotal(values);
  const tripDays = values.tripDays || getTripDays(values.startDate, values.endDate);
  const transportPlans = [...values.transportPlans].slice(0, 3);
  const accommodationPlans = [...values.accommodationPlans].slice(0, 3);

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
    meal_actual: values.applicationType === "reimbursement" ? formatCurrency(values.mealActual, true) : "",
    ground_budget: amountDisplay(getSummaryDisplayAmount(values.applicationType, values.groundBudget, values.groundActual)),
    ground_actual: values.applicationType === "reimbursement" ? formatCurrency(values.groundActual, true) : "",
    other_budget: amountDisplay(getSummaryDisplayAmount(values.applicationType, values.otherBudget, values.otherActual)),
    other_actual: values.applicationType === "reimbursement" ? formatCurrency(values.otherActual, true) : "",
    total_budget: values.applicationType === "trip" ? formatCurrency(totalBudget, false) : "",
    total_actual: values.applicationType === "reimbursement" ? formatCurrency(totalActual, false) : "",
    ...(fillTransportSlot(values.applicationType, 1, transportPlans[0]) as Pick<
      DocxTemplateData,
      | "transport_1_departure"
      | "transport_1_arrival"
      | "transport_1_budget"
      | "transport_1_vendor"
      | "transport_1_quote_at"
    >),
    ...(fillTransportSlot(values.applicationType, 2, transportPlans[1]) as Pick<
      DocxTemplateData,
      | "transport_2_departure"
      | "transport_2_arrival"
      | "transport_2_budget"
      | "transport_2_vendor"
      | "transport_2_quote_at"
    >),
    ...(fillTransportSlot(values.applicationType, 3, transportPlans[2]) as Pick<
      DocxTemplateData,
      | "transport_3_departure"
      | "transport_3_arrival"
      | "transport_3_budget"
      | "transport_3_vendor"
      | "transport_3_quote_at"
    >),
    ...(fillHotelSlot(values.applicationType, 1, accommodationPlans[0]) as Pick<
      DocxTemplateData,
      | "hotel_1_check_in"
      | "hotel_1_check_out"
      | "hotel_1_budget"
      | "hotel_1_vendor"
      | "hotel_1_quote_at"
    >),
    ...(fillHotelSlot(values.applicationType, 2, accommodationPlans[1]) as Pick<
      DocxTemplateData,
      | "hotel_2_check_in"
      | "hotel_2_check_out"
      | "hotel_2_budget"
      | "hotel_2_vendor"
      | "hotel_2_quote_at"
    >),
    ...(fillHotelSlot(values.applicationType, 3, accommodationPlans[2]) as Pick<
      DocxTemplateData,
      | "hotel_3_check_in"
      | "hotel_3_check_out"
      | "hotel_3_budget"
      | "hotel_3_vendor"
      | "hotel_3_quote_at"
    >),
  };
};
