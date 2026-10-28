export type OrgPerson = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  role: string;
  roleTitle: string;
  departmentId: number;
  department: string;
  managerId: number | null;
  active: boolean;
  inactiveReason: string | null;
  leaveTotalDays: number;
  leaveAvailableDays: number;
};

export type StaffRoleOption = {
  id: number;
  name: string;
  kind: string;
};
