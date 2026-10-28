import { Badge } from "@/components/ui/badge";
import type { LeaveStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<LeaveStatus, string> = {
  pending: "bg-[#f3eeff] text-[#673cf5]",
  approved: "bg-[#e5fbf3] text-[#08784c]",
  rejected: "bg-[#fdecec] text-[#d81c1c]",
};

const labels: Record<LeaveStatus, string> = {
  pending: "Függőben",
  approved: "Jóváhagyva",
  rejected: "Elutasítva",
};

export function StatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <Badge
      className={cn(
        "h-6 gap-1.5 rounded-full border-transparent px-2 text-[11px] font-semibold",
        styles[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </Badge>
  );
}
