"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReviewRequestDialog,
  type ReviewableRequest,
} from "@/components/review-request-dialog";
import { Button } from "@/components/ui/button";

export function ReviewButtons({
  id,
  request,
}: {
  id: number;
  request: Omit<ReviewableRequest, "id">;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const item: ReviewableRequest = { id, ...request };

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="font-semibold"
          onClick={() => setOpen(true)}
        >
          Elbírálás
        </Button>
      </div>
      <ReviewRequestDialog
        request={open ? item : null}
        open={open}
        onOpenChange={setOpen}
        onReviewed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
