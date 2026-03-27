export type ApplicationType = "trip" | "reimbursement";

export type DepartmentOption = "HTC" | "SHOB" | "OTHER";

export interface ComparisonOption {
  vendor: string;
  budgetAmount?: number;
  actualAmount?: number;
}

export interface TransportGroup {
  label: string;
  departureAt: string;
  arrivalAt: string;
  options: ComparisonOption[];
}

export interface AccommodationGroup {
  label: string;
  checkInAt: string;
  checkOutAt: string;
  options: ComparisonOption[];
}

export interface ExpenseApplicationFormValues {
  applicationType: ApplicationType;
  employeeName: string;
  department: DepartmentOption;
  departmentOther: string;
  startDate: string;
  endDate: string;
  tripDays: number;
  tripReason: string;
  destination: string;
  transportGroups: TransportGroup[];
  accommodationGroups: AccommodationGroup[];
  mealBudget?: number;
  mealActual?: number;
  groundBudget?: number;
  groundActual?: number;
  otherBudget?: number;
  otherActual?: number;
}

export interface DocxComparisonGroupData {
  display_title: string;
  group_label: string;
  best_option_note: string;
  start_date: string;
  end_date: string;
  options: Array<{
    row_label: string;
    vendor: string;
    amount: string;
  }>;
}

export interface DocxTemplateData {
  form_title: string;
  trip_checked: string;
  reimbursement_checked: string;
  name: string;
  dept: string;
  start_date: string;
  end_date: string;
  trip_days: string;
  reason: string;
  destination: string;
  meal_budget: string;
  ground_budget: string;
  other_budget: string;
  total_budget: string;
  total_actual: string;
  transport_groups: DocxComparisonGroupData[];
  accommodation_groups: DocxComparisonGroupData[];
}
