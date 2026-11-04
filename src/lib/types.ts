export type LeaveStatus = "pending" | "approved" | "rejected";

export type RequestRow = {
  id: number;
  startDate: string;
  endDate: string;
  workDays: number;
  halfDay: boolean;
  typeName: string;
  deductsBalance: boolean;
  status: LeaveStatus;
  note: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  personName: string;
  initials: string;
  department: string;
  userId: number;
};

export type BalanceSnapshot = {
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  quotas: [number, number, number, number];
  usedByQuarter: [number, number, number, number];
};

export type ShellData = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    initials: string;
    jobTitle: string;
    email: string;
    companyId: number;
    role: "employee" | "manager" | "hr" | "admin";
  };
  companies: { id: number; name: string }[];
  selectedCompanyId: number;
  selectedCompanyName: string;
  pendingApprovals: number;
  hasDirectReports: boolean;
  unreadNotifications: number;
  notifications: {
    id: number;
    title: string;
    detail: string;
    href: string;
    read: boolean;
  }[];
  hrContacts: { name: string; email: string }[];
};
