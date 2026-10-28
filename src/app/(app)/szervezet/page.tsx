import { redirect } from "next/navigation";
import { OrgTree } from "@/components/org-tree";
import { getCurrentUser, getOrg, getSelectedCompanyId } from "@/lib/data";

export default async function OrgPage() {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");

  const companyId = await getSelectedCompanyId(user.companyId);
  const org = await getOrg(companyId);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">Admin</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dolgozók</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A fa azt mutatja, kinek ki a felettese. Új dolgozó felvételekor a felettes kapja a
          szabadságkérelmet, és ő fogadja el vagy utasítja el. Felettes nélkül a kérelem nem küldhető el.
        </p>
      </div>
      <OrgTree
        people={org.people}
        departments={org.departments}
        jobTitles={org.jobTitles}
        companyId={companyId}
      />
    </div>
  );
}
