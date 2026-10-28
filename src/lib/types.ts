export type LeaveStatus = "pending" | "approved" | "rejected";

export type RequestRow = {
  id: number;
  startDate: string;
  endDate: string;
  workDays: number;
  typeName: string;
  deductsBalance: boolean;
  status: LeaveStatus;
  note: string | null;
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
  notifications: { id: number; title: string; detail: string; href: string }[];
  hrContacts: { name: string; email: string }[];
};
