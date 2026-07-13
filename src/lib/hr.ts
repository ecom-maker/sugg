import type { EmployeeType, EmployeeIdType } from "@prisma/client";

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  SUPER_ADMIN: "Super Admin",
  BRANCH_MANAGER: "Branch Manager",
  ASST_BRANCH_MANAGER: "Asst. Branch Manager",
  TEAM_LEADER: "Team Leader",
  COUNSELLOR: "Counsellor",
  OFFICE_ASSISTANT: "Office Assistant",
  DRIVER: "Driver",
};

export const EMPLOYEE_TYPE_OPTIONS = Object.entries(EMPLOYEE_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as EmployeeType, label })
);

export const EMPLOYEE_ID_TYPE_LABELS: Record<EmployeeIdType, string> = {
  AADHAAR: "Aadhaar",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
  PAN: "PAN",
  VOTERS_ID: "Voter's ID",
};

export const EMPLOYEE_ID_TYPE_OPTIONS = Object.entries(EMPLOYEE_ID_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as EmployeeIdType, label })
);
