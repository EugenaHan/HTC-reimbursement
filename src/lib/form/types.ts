export type ApplicationType = "trip" | "reimbursement";

export type DepartmentOption = "HTC" | "SHOB" | "OTHER";

export interface TransportPlan {
  departureAt: string;
  arrivalAt: string;
  vendor: string;
  quoteAt: string;
  budgetAmount?: number;
  actualAmount?: number;
}

export interface AccommodationPlan {
  checkInAt: string;
  checkOutAt: string;
  vendor: string;
  quoteAt: string;
  budgetAmount?: number;
  actualAmount?: number;
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
  transportPlans: TransportPlan[];
  accommodationPlans: AccommodationPlan[];
  mealBudget?: number;
  mealActual?: number;
  groundBudget?: number;
  groundActual?: number;
  otherBudget?: number;
  otherActual?: number;
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
  meal_actual: string;
  ground_budget: string;
  ground_actual: string;
  other_budget: string;
  other_actual: string;
  total_budget: string;
  total_actual: string;
  transport_1_departure: string;
  transport_1_arrival: string;
  transport_1_budget: string;
  transport_1_vendor: string;
  transport_1_quote_at: string;
  transport_2_departure: string;
  transport_2_arrival: string;
  transport_2_budget: string;
  transport_2_vendor: string;
  transport_2_quote_at: string;
  transport_3_departure: string;
  transport_3_arrival: string;
  transport_3_budget: string;
  transport_3_vendor: string;
  transport_3_quote_at: string;
  hotel_1_check_in: string;
  hotel_1_check_out: string;
  hotel_1_budget: string;
  hotel_1_vendor: string;
  hotel_1_quote_at: string;
  hotel_2_check_in: string;
  hotel_2_check_out: string;
  hotel_2_budget: string;
  hotel_2_vendor: string;
  hotel_2_quote_at: string;
  hotel_3_check_in: string;
  hotel_3_check_out: string;
  hotel_3_budget: string;
  hotel_3_vendor: string;
  hotel_3_quote_at: string;
}
