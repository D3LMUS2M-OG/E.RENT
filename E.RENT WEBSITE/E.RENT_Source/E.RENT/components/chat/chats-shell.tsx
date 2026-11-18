"use client";

import { usePathname } from "next/navigation";
import { ConversationList } from "./conversation-list";
import { cn } from "@/lib/utils";

/** Two panes like WhatsApp Web on a computer. On a phone you see the list, or the open chat, one at a time. */
export function ChatsShell({ children }: { children: React.ReactNode }) {
  const open = /^\/chats\/[^/]+/.test(usePathname());
  return (
    <div data-chat-root className="mx-auto h-[calc(100dvh-5.5rem)] max-w-7xl md:grid md:grid-cols-[380px_1fr] md:border-x md:border-border">
      <aside aria-label="Your chats" className={cn("h-full min-h-0 border-border bg-background md:border-r", open ? "hidden md:block" : "block")}><ConversationList /></aside>
      <section aria-label="Conversation" className={cn("h-full min-h-0", open ? "block" : "hidden md:block")}>{children}</section>
    </div>
  );
}
