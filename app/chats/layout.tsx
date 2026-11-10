import type { Metadata } from "next";

export const metadata: Metadata = { title: "Chats", robots: { index: false } };

export default function ChatsLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
