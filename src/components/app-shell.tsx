import { ShellFrame } from "@/components/shell-frame";
import { getShell } from "@/lib/data";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const data = await getShell();
  return <ShellFrame data={data}>{children}</ShellFrame>;
}
