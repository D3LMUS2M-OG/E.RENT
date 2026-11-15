import { MessageCircle, ShieldCheck } from "lucide-react";

// On a computer this fills the right pane until a chat is chosen. On a phone the list is shown instead.
export default function ChatsIndex() {
  return (
    <div className="chat-wallpaper flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-btn)]"><MessageCircle className="size-9 text-accent" aria-hidden /></span>
      <h2 className="text-3xl">Your chats</h2>
      <p className="max-w-sm text-muted">Pick a conversation on the left, or open a house and choose Message the landlord.</p>
      <p className="flex max-w-sm items-center gap-2 text-sm text-muted"><ShieldCheck className="size-4 shrink-0" aria-hidden />Messages and files are deleted 30 days after they are sent. Reported conversations are kept for review.</p>
    </div>
  );
}
