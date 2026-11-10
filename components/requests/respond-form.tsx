"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { respondRequest } from "@/app/requests/actions";
import type { ActionState } from "@/app/dashboard/actions";

export function RespondForm({ id }: { id: string }) {
  const router = useRouter();
  const [s, action, pending] = useActionState(async (prev: ActionState, f: FormData) => { const r = await respondRequest(prev, f); router.refresh(); return r; }, {} as ActionState);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input type="hidden" name="id" value={id} />
      <Input name="note" placeholder="Note to the tenant (optional)" aria-label="Note to the tenant" maxLength={500} className="sm:w-72" />
      <Button name="decision" value="accepted" loading={pending}>Accept</Button>
      <Button name="decision" value="declined" variant="secondary" loading={pending}>Decline</Button>
      {s.error && <span role="alert" className="text-sm font-medium">Error: {s.error}</span>}
    </form>
  );
}
