"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

type Result = { error?: string } | void;

/** A button that runs a server action, shows its error under itself, then refreshes the page. */
export function ActionButton({ action, children, confirmText, ...props }: Omit<ButtonProps, "onClick"> & { action: () => Promise<Result>; confirmText?: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" loading={pending} {...props}
        onClick={() => { if (confirmText && !confirm(confirmText)) return; start(async () => { const r = await action(); setError(r?.error ?? ""); router.refresh(); }); }}>
        {children}
      </Button>
      {error && <span role="alert" className="text-sm font-medium">Error: {error}</span>}
    </span>
  );
}
