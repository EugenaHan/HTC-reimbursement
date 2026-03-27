import type { AccommodationPlan, ExpenseApplicationFormValues, TransportPlan } from "./types";

export const emptyTransportPlan = (): TransportPlan => ({
  departureAt: "",
  arrivalAt: "",
  vendor: "",
  quoteAt: "",
  budgetAmount: undefined,
  actualAmount: undefined,
});

export const emptyAccommodationPlan = (): AccommodationPlan => ({
  checkInAt: "",
  checkOutAt: "",
  vendor: "",
  quoteAt: "",
  budgetAmount: undefined,
  actualAmount: undefined,
});

export const defaultValues: ExpenseApplicationFormValues = {
  applicationType: "trip",
  employeeName: "",
  department: "HTC",
  departmentOther: "",
  startDate: "",
  endDate: "",
  tripDays: 0,
  tripReason: "",
  destination: "",
  transportPlans: [emptyTransportPlan()],
  accommodationPlans: [emptyAccommodationPlan()],
  mealBudget: undefined,
  mealActual: undefined,
  groundBudget: undefined,
  groundActual: undefined,
  otherBudget: undefined,
  otherActual: undefined,
};
