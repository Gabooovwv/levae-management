import { redirect } from "next/navigation";
import { OrgTree } from "@/components/org-tree";
import { getCurrentUser, getOrg, getSelectedCompanyId } from "@/lib/data";

export default async function OrgPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");

  const companyId = await getSelectedCompanyId(user.companyId);
  const org = await getOrg(companyId);

  return (
    <OrgTree
      people={org.people}
      departments={org.departments}
      jobTitles={org.jobTitles}
      staffRoles={org.staffRoles}
      companyId={companyId}
    />
  );
}
