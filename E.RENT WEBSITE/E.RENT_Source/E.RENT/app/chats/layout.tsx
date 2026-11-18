import type { Metadata } from "next";
import { ChatsShell } from "@/components/chat/chats-shell";

export const metadata: Metadata = { title: "Chats", robots: { index: false } };

export default function ChatsLayout({ children }: { children: React.ReactNode }) { return <ChatsShell>{children}</ChatsShell>; }
