// Sugg Platform - Type Definitions

export type UserRole =
  | "SUPER_ADMIN"
  | "SUGG_COUNSELOR"
  | "SUGG_BRANCH_MANAGER"
  | "COLLEGE_ADMIN"
  | "AGENCY_OWNER"
  | "AGENCY_ADMIN"
  | "BRANCH_MANAGER"
  | "AGENCY_COUNSELOR";

export type BranchStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type AssignmentStrategy = "ROUND_ROBIN" | "MANUAL" | "COURSE_BASED" | "BRANCH_BASED";

export interface AgencyBranch {
  id: string;
  agencyId: string;
  branchName: string;
  branchCode: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  managerId?: string | null;
  status: BranchStatus;
  createdAt: Date;
}

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "COUNSELING_SCHEDULED"
  | "COLLEGE_SHORTLISTED"
  | "APPLICATION_SUBMITTED"
  | "OFFER_RECEIVED"
  | "ADMISSION_CONFIRMED"
  | "LOST";

export type LeadSource = "WHATSAPP" | "AGENCY_REFERRAL" | "MANUAL_ENTRY";

export type CollegeStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ARCHIVED";

export type UniversityStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type UniversityType =
  | "PUBLIC"
  | "PRIVATE"
  | "DEEMED"
  | "AUTONOMOUS"
  | "INTERNATIONAL";

export interface UniversitySummary {
  id: string;
  name: string;
  establishmentYear: number;
  location: string;
  city?: string | null;
  state?: string | null;
  country: string;
  website?: string | null;
  universityType?: UniversityType | null;
  accreditation?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  status: UniversityStatus;
  createdAt: Date;
  updatedAt: Date;
  _count?: { colleges: number };
}

export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "ENROLLED";

export type CommissionType = "FIXED" | "PERCENTAGE" | "SLAB";
export type CommissionStatus = "PENDING" | "APPROVED" | "PAID";

export type DegreeType =
  | "DIPLOMA"
  | "BACHELOR"
  | "MASTER"
  | "DOCTORATE"
  | "CERTIFICATE"
  | "OTHER";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  capabilities: string[];
  isActive: boolean;
}

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: number | string;
  children?: NavItem[];
}

export interface DashboardStats {
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadStatusConfig {
  value: LeadStatus;
  label: string;
  color: string;
  bgColor: string;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, LeadStatusConfig> = {
  NEW: { value: "NEW", label: "New", color: "text-blue-700", bgColor: "bg-blue-50" },
  CONTACTED: { value: "CONTACTED", label: "Contacted", color: "text-purple-700", bgColor: "bg-purple-50" },
  QUALIFIED: { value: "QUALIFIED", label: "Qualified", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  COUNSELING_SCHEDULED: { value: "COUNSELING_SCHEDULED", label: "Counseling Scheduled", color: "text-orange-700", bgColor: "bg-orange-50" },
  COLLEGE_SHORTLISTED: { value: "COLLEGE_SHORTLISTED", label: "College Shortlisted", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  APPLICATION_SUBMITTED: { value: "APPLICATION_SUBMITTED", label: "Application Submitted", color: "text-teal-700", bgColor: "bg-teal-50" },
  OFFER_RECEIVED: { value: "OFFER_RECEIVED", label: "Offer Received", color: "text-green-700", bgColor: "bg-green-50" },
  ADMISSION_CONFIRMED: { value: "ADMISSION_CONFIRMED", label: "Admission Confirmed", color: "text-emerald-700", bgColor: "bg-emerald-100" },
  LOST: { value: "LOST", label: "Lost", color: "text-red-700", bgColor: "bg-red-50" },
};

export const APPLICATION_STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  SUBMITTED: { label: "Submitted", color: "text-blue-700", bgColor: "bg-blue-50" },
  UNDER_REVIEW: { label: "Under Review", color: "text-orange-700", bgColor: "bg-orange-50" },
  ACCEPTED: { label: "Accepted", color: "text-green-700", bgColor: "bg-green-50" },
  REJECTED: { label: "Rejected", color: "text-red-700", bgColor: "bg-red-50" },
  ENROLLED: { label: "Enrolled", color: "text-emerald-700", bgColor: "bg-emerald-100" },
};
