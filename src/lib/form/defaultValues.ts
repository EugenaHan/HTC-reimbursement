import type {
  AccommodationGroup,
  ComparisonOption,
  ExpenseApplicationFormValues,
  TransportGroup,
} from "./types";

export const createComparisonOption = (): ComparisonOption => ({
  vendor: "",
  budgetAmount: undefined,
  actualAmount: undefined,
});

export const createComparisonOptions = (count = 3) =>
  Array.from({ length: count }, () => createComparisonOption());

export const emptyTransportGroup = (optionCount = 3): TransportGroup => ({
  label: "",
  departureAt: "",
  arrivalAt: "",
  options: createComparisonOptions(optionCount),
});

export const emptyAccommodationGroup = (optionCount = 3): AccommodationGroup => ({
  label: "",
  checkInAt: "",
  checkOutAt: "",
  options: createComparisonOptions(optionCount),
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
  transportGroups: [emptyTransportGroup()],
  accommodationGroups: [emptyAccommodationGroup()],
  mealBudget: undefined,
  mealActual: undefined,
  groundBudget: undefined,
  groundActual: undefined,
  otherBudget: undefined,
  otherActual: undefined,
};
