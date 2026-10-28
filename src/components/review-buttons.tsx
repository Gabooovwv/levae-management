"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { reviewLeaveRequest } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function ReviewButtons({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function review(status: "approved" | "rejected") {
    startTransition(async () => {
      const result = await reviewLeaveRequest(id, status);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => review("rejected")}
      >
        Elutasítás
      </Button>
      <Button
        size="sm"
        disabled={pending}
        className="font-semibold hover:bg-[#477bf3]"
        onClick={() => review("approved")}
      >
        Jóváhagyás
      </Button>
    </div>
  );
}
