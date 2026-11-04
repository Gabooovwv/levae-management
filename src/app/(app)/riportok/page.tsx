import { prisma } from "@/lib/prisma";
import {
  getCompanyReport,
  getCurrentUser,
  getOwnReport,
  getSelectedCompanyId,
  getTeamReport,
} from "@/lib/data";
import { ReportsView } from "@/components/reports-view";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (user.role === "admin") {
    const companyId = await getSelectedCompanyId(user.companyId);
    const company = await getCompanyReport(companyId);
    return <ReportsView own={null} team={null} company={company} />;
  }

  const reportCount = await prisma.user.count({
    where: { managerId: user.id, role: { not: "admin" }, active: true },
  });
  const hasTeam = reportCount > 0;

  const [own, team] = await Promise.all([
    getOwnReport(user.id),
    hasTeam ? getTeamReport(user.id) : Promise.resolve(null),
  ]);

  return <ReportsView own={own} team={team} company={null} />;
}
