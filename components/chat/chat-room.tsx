"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCheck, ChevronDown, FileText, Mic, MoreVertical, Paperclip, Send, ShieldAlert, Square } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/glass-confirm";
import { PopoverMenu, useDismiss } from "@/components/ui/popover-menu";
import { createClient } from "@/lib/supabase/client";
import { blockUser, deleteConversation, deleteMessageForEveryone, hideMessage, reportConversation, unblockUser } from "@/app/chats/actions";

export type Msg = {
  id: string; sender_id: string; kind: "text" | "image" | "voice" | "document"; body: string | null; attachment_path: string | null;
  attachment_name: string | null; attachment_mime: string | null; attachment_bytes: number | null; duration_s: number | null;
  created_at: string; read_at: string | null; deleted_for_everyone_at: string | null;
};
export type Overview = {
  id: string; listing_id: string; listing_title: string; listing_slug: string; listing_status: string; my_role: "tenant" | "landlord";
  other_name: string; other_verified: boolean; other_user_id: string; i_blocked: boolean; blocked_me: boolean; other_avatar: string | null;
};

const BUCKET = "chat-attachments";
const MAX_FILE = 10 * 1024 * 1024;
const MAX_VOICE_SECONDS = 120;
const DOC_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const REASONS = [["scam", "Scam or fake listing"], ["pressure_to_pay", "Asking me to pay before viewing"], ["harassment", "Harassment or abuse"], ["inappropriate", "Inappropriate content"], ["other", "Something else"]] as const;

/** Phones on weak networks: shrink photos before they leave the device. */
async function shrinkImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height); bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not read the photo"))), "image/jpeg", 0.82));
}

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!path) return; let live = true;
    createClient().storage.from(BUCKET).createSignedUrl(path, 3600).then(({ data }) => { if (live) setUrl(data?.signedUrl); });
    return () => { live = false; };
  }, [path]);
  return url;
}

function Attachment({ m }: { m: Msg }) {
  const url = useSignedUrl(m.attachment_path);
  if (!url) return <span className="text-sm text-muted">Loading attachment</span>;
  if (m.kind === "image") /* eslint-disable-next-line @next/next/no-img-element */
    return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Photo sent in chat" loading="lazy" className="max-h-72 w-auto max-w-full rounded-[12px]" /></a>;
  if (m.kind === "voice") return <audio controls preload="none" src={url} className="max-w-full" aria-label="Voice note" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4"><FileText className="size-4" aria-hidden />{m.attachment_name ?? "Document"}</a>;
}

const DELETE_ALL_WINDOW_MS = 48 * 3600 * 1000;

function MessageRow({ m, mine, first, onHide, onDeleted }: { m: Msg; mine: boolean; first: boolean; onHide: (id: string) => void; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ask = useConfirm();
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const deleted = Boolean(m.deleted_for_everyone_at);
  const canDeleteAll = mine && !deleted && Date.now() - new Date(m.created_at).getTime() < DELETE_ALL_WINDOW_MS;
  const time = new Date(m.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

  async function run(fn: () => Promise<{ error?: string }>, done: () => void) {
    setBusy(true); setErr("");
    const r = await fn();
    setBusy(false);
    if (r.error) { setErr(r.error); return; }
    setOpen(false); done();
  }

  const ticks = mine && !deleted && (m.read_at
    ? <CheckCheck className="size-4 text-[var(--tick-read)]" aria-label="Read" />
    : <Check className="size-4" aria-label="Sent" />);
  const meta = (floating: boolean) => (
    <span className={cn("items-center gap-1 text-[11px] leading-none opacity-80", floating ? "float-right ml-3 mt-2 inline-flex translate-y-1" : "mt-1 flex justify-end")}>{time}{ticks}</span>
  );

  return (
    <div ref={ref} className={cn("group flex flex-col", mine ? "items-end" : "items-start", first ? "mt-3" : "mt-0.5")}>
      <div className={cn("flex max-w-full items-center gap-0.5", mine && "flex-row-reverse")}>
        <div className={cn("relative max-w-[78%] min-w-[76px] rounded-[16px] px-3 py-1.5 text-[15px] leading-snug",
          deleted ? "border border-dashed border-border-strong bg-transparent text-muted"
            : mine ? "bg-[var(--bubble-out)] text-[var(--bubble-out-fg)]" : "bg-[var(--bubble-in)] text-[var(--bubble-in-fg)] shadow-[0_1px_1px_rgba(0,0,0,.2)]",
          first && (mine ? "rounded-tr-[5px]" : "rounded-tl-[5px]"))}>
          {deleted ? <p className="flow-root italic">{mine ? "You deleted this message" : "This message was deleted"}{meta(true)}</p>
            : m.kind === "text" ? <p className="flow-root whitespace-pre-wrap break-words">{m.body}{meta(true)}</p>
            : <div><Attachment m={m} />{meta(false)}</div>}
        </div>
        <button type="button" aria-label="Message options" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-11 min-w-9 items-center justify-center rounded-full text-muted opacity-60 transition-opacity hover:bg-surface-2 hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
      {open && (
        <div role="group" aria-label="Message options" className="motion-pop mt-1 flex flex-wrap gap-2 rounded-[20px] border border-border bg-surface p-2 shadow-[0_12px_30px_rgba(0,0,0,.35)]">
          <Button type="button" variant="secondary" loading={busy} onClick={() => run(() => hideMessage(m.id), () => onHide(m.id))}>Delete for me</Button>
          {canDeleteAll && (
            <Button type="button" variant="secondary" loading={busy}
              onClick={async () => { if (await ask({ title: "Delete for everyone?", message: "The other person will see that this message was deleted.", confirmLabel: "Delete message" })) run(() => deleteMessageForEveryone(m.id), () => onDeleted(m.id)); }}>
              Delete for everyone
            </Button>)}
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
        </div>)}
      {err && <p role="alert" className="mt-1 text-sm font-medium">Error: {err}</p>}
    </div>
  );
}

const dayLabel = (iso: string) => {
  const d = new Date(iso); const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return same(d, today) ? "Today" : same(d, y) ? "Yesterday" : d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });
};

export function ChatRoom({ o, me, initial, hiddenIds = [], children }: { o: Overview; me: string; initial: Msg[]; hiddenIds?: string[]; children?: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(hiddenIds));
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState<number | null>(null);
  const [reported, setReported] = useState("");
  const channel = useRef<RealtimeChannel | null>(null);
  const lastTyping = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const logRef = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const locked = o.i_blocked || o.blocked_me;

  const upsert = useCallback((m: Msg) => setMessages((prev) => {
    const i = prev.findIndex((x) => x.id === m.id);
    if (i >= 0) { const next = [...prev]; next[i] = m; return next; }
    return [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }), []);

  // Supabase calls only run when awaited or given .then(). Without it the request is never sent.
  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    supabase.rpc("mark_conversation_read", { p_id: o.id }).then(() => window.dispatchEvent(new Event("erent:unread-changed")));
  }, [supabase, o.id]);

  useEffect(() => {
    let ch: RealtimeChannel | undefined; let dead = false;
    (async () => {
      await supabase.realtime.setAuth();
      if (dead) return;
      ch = supabase.channel(`chat:${o.id}`, { config: { private: true, presence: { key: me } } });
      ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${o.id}` }, (p) => {
        const m = p.new as Msg; upsert(m); if (m.sender_id !== me) markRead();
      })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${o.id}` }, (p) => upsert(p.new as Msg))
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.role === o.my_role) return;
          setTyping(true); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 3000);
        })
        .on("presence", { event: "sync" }, () => {
          const state = ch!.presenceState() as Record<string, { role?: string }[]>;
          setOtherOnline(Object.values(state).some((metas) => metas.some((x) => x.role && x.role !== o.my_role)));
        })
        .subscribe(async (status) => { if (status === "SUBSCRIBED") await ch!.track({ role: o.my_role }); });
      channel.current = ch;
    })();
    markRead();
    document.addEventListener("visibilitychange", markRead);
    return () => { dead = true; document.removeEventListener("visibilitychange", markRead); clearTimeout(typingTimer.current); if (ch) supabase.removeChannel(ch); };
  }, [supabase, o.id, o.my_role, me, upsert, markRead]);

  useEffect(() => { const el = logRef.current; if (el) el.scrollTo({ top: el.scrollHeight }); }, [messages.length, typing, hidden.size]);

  function onType(v: string) {
    setText(v);
    if (Date.now() - lastTyping.current > 2000) { lastTyping.current = Date.now(); channel.current?.send({ type: "broadcast", event: "typing", payload: { role: o.my_role } }); }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body || sending || locked) return;
    setSending(true); setError(""); setNote("");
    const { data, error: err } = await supabase.from("messages").insert({ conversation_id: o.id, sender_id: me, kind: "text", body }).select().single();
    setSending(false);
    if (err) { setError(err.message); return; }
    setText(""); upsert(data as Msg);
    if (data.body !== body) setNote("We hid a phone number in your message. Use Share my number in the menu instead, so the other person can approve it.");
  }

  async function sendFile(blob: Blob, name: string, mime: string, kind: Msg["kind"], duration?: number) {
    if (blob.size > MAX_FILE) { setError("Files must be under 10 MB"); return; }
    setSending(true); setError("");
    const ext = (name.split(".").pop() || mime.split("/")[1] || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${o.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime });
    if (up.error) { setSending(false); setError(up.error.message); return; }
    const { data, error: err } = await supabase.from("messages").insert({
      conversation_id: o.id, sender_id: me, kind, attachment_path: path, attachment_name: name, attachment_mime: mime, attachment_bytes: blob.size, duration_s: duration ?? null,
    }).select().single();
    setSending(false);
    if (err) { await supabase.storage.from(BUCKET).remove([path]); setError(err.message); return; }
    upsert(data as Msg);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    try {
      if (file.type.startsWith("image/")) await sendFile(await shrinkImage(file), file.name.replace(/\.\w+$/, "") + ".jpg", "image/jpeg", "image");
      else if (DOC_TYPES.includes(file.type)) await sendFile(file, file.name, file.type, "document");
      else setError("Send a photo, a PDF or a Word document");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send the file"); }
  }

  async function toggleRecord() {
    if (recorder.current) { recorder.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = []; const started = Date.now();
      r.ondataavailable = (ev) => chunks.push(ev.data);
      const tick = setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); setRecording(s); if (s >= MAX_VOICE_SECONDS) r.stop(); }, 500);
      r.onstop = () => {
        clearInterval(tick); stream.getTracks().forEach((t) => t.stop()); recorder.current = null; setRecording(null);
        const type = mime || "audio/webm"; const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
        sendFile(new Blob(chunks, { type }), `voice-note.${type === "audio/mp4" ? "m4a" : "webm"}`, type, "voice", secs);
      };
      recorder.current = r; setRecording(0); r.start();
    } catch { setError("Allow microphone access to record a voice note"); }
  }

  const visible = messages.filter((m) => !hidden.has(m.id));
  const markDeleted = (id: string) => setMessages((prev) => prev.map((x) => x.id === id
    ? { ...x, deleted_for_everyone_at: new Date().toISOString(), body: null, attachment_path: null, attachment_name: null, attachment_mime: null, attachment_bytes: null, duration_s: null } : x));

  const rows = visible.map((m, i) => {
    const prev = visible[i - 1];
    const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
    const first = newDay || prev.sender_id !== m.sender_id || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60000;
    return { m, newDay, first };
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-2 py-2 pl-1 sm:px-3">
        <Link href="/chats" aria-label="Back to chats" className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-2 md:hidden"><ArrowLeft className="size-5" aria-hidden /></Link>
        <Avatar name={o.other_name} path={o.other_avatar} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold leading-tight">{o.other_name || "Landlord"}{o.other_verified && <VerifiedBadge />}</p>
          <p className={cn("truncate text-[13px] leading-tight", typing ? "font-medium text-accent" : "text-muted")} aria-live="polite">{typing ? "typing…" : otherOnline ? "Online now" : "Offline"}</p>
        </div>
        <PopoverMenu ariaLabel="Chat menu" label={<MoreVertical className="size-5" aria-hidden />} className="size-11 justify-center !rounded-full !border-transparent !px-0 hover:!border-border-strong">
          <>
            {children}
            <div className="space-y-2 border-t border-border pt-3">
              {o.i_blocked
                ? <ActionButton action={unblockUser.bind(null, o.other_user_id)} variant="secondary">Unblock this person</ActionButton>
                : <ActionButton action={blockUser.bind(null, o.other_user_id)} variant="secondary" confirmText="Block this person? You will not be able to message each other.">Block this person</ActionButton>}
              <ActionButton action={deleteConversation.bind(null, o.id)} variant="ghost" confirmText="Delete this conversation for you?">Delete conversation</ActionButton>
            </div>
            <form className="space-y-2 border-t border-border pt-3" onSubmit={async (e) => {
              e.preventDefault(); const f = new FormData(e.currentTarget);
              const r = await reportConversation(o.id, String(f.get("reason")), String(f.get("details") ?? ""));
              setReported(r.error ? `Error: ${r.error}` : r.message ?? "Reported");
            }}>
              <p className="text-sm font-medium">Report this conversation</p>
              <select name="reason" aria-label="Reason" className="min-h-11 w-full rounded-[14px] border border-border-strong bg-surface px-3 text-base">{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <textarea name="details" rows={2} maxLength={1000} aria-label="What happened" placeholder="What happened? (optional)" className="w-full rounded-[14px] border border-border-strong bg-surface p-2 text-base" />
              <Button type="submit" variant="secondary">Send report</Button>
              {reported && <p role="status" className="text-sm font-medium">{reported}</p>}
            </form>
          </>
        </PopoverMenu>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-3 py-1.5 text-[13px]">
        <span className="min-w-0 truncate text-muted">About <Link className="font-medium text-link underline-offset-4 hover:underline" href={`/listing/${o.listing_slug}`}>{o.listing_title}</Link></span>
      </div>
      <p className="flex items-start gap-2 border-b border-border bg-surface-2 px-3 py-1.5 text-xs text-muted"><ShieldAlert className="mt-px size-3.5 shrink-0 text-accent" aria-hidden />
        Never pay a deposit or rent before you view the house in person. E.Rent takes no payments, so nobody here can ask you to pay through the app.</p>

      <div ref={logRef} role="log" aria-live="polite" aria-label="Messages" className="chat-wallpaper min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6">
        {visible.length === 0 && <p className="mx-auto mt-6 w-fit max-w-xs rounded-full bg-[var(--bubble-in)] px-4 py-2 text-center text-sm text-muted shadow-sm">Say hello and ask what you want to know about the house.</p>}
        {rows.map(({ m, newDay, first }) => (
          <div key={m.id}>
            {newDay && <p className="my-3 flex justify-center"><span className="rounded-full bg-[var(--bubble-in)] px-3 py-1 text-xs font-medium text-muted shadow-sm">{dayLabel(m.created_at)}</span></p>}
            <MessageRow m={m} mine={m.sender_id === me} first={first} onHide={(id) => setHidden((h) => new Set(h).add(id))} onDeleted={markDeleted} />
          </div>
        ))}
        {typing && <p className="mt-2 w-fit rounded-[16px] rounded-tl-[5px] bg-[var(--bubble-in)] px-3 py-2 text-sm text-muted shadow-sm" aria-live="polite">typing…</p>}
      </div>

      {locked ? (
        <p role="status" className="border-t border-border bg-surface p-4 text-sm font-medium">{o.i_blocked ? "You blocked this person. Unblock them from the menu to chat again." : "You cannot send messages in this conversation."}</p>
      ) : o.listing_status !== "active" ? (
        <p role="status" className="border-t border-border bg-surface px-4 py-2 text-sm text-muted">This house is not on the market now. You can still read and reply.</p>
      ) : null}
      {!locked && (
        <form onSubmit={sendText} className="border-t border-border bg-surface/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
          {error && <p role="alert" className="px-2 pb-1 text-sm font-medium">Error: {error}</p>}
          {note && <p role="status" className="px-2 pb-1 text-sm">{note}</p>}
          <div className="flex items-end gap-2">
            <input ref={fileInput} type="file" hidden accept="image/*,application/pdf,.doc,.docx" onChange={onPick} />
            <div className="flex min-w-0 flex-1 items-end rounded-[26px] border border-border-strong bg-background px-1 shadow-[var(--shadow-btn)]">
              <button type="button" aria-label="Attach a photo or document" onClick={() => fileInput.current?.click()} disabled={sending}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground disabled:opacity-40"><Paperclip className="size-5" aria-hidden /></button>
              <label htmlFor="chat-text" className="sr-only">Message</label>
              <textarea id="chat-text" value={text} onChange={(e) => onType(e.target.value)} rows={1} maxLength={2000} placeholder={recording !== null ? `Recording… ${recording}s` : "Message"}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-base placeholder:text-muted focus:outline-none" />
            </div>
            {text.trim() ? (
              <Button type="submit" size="icon" className="size-12 shrink-0" aria-label="Send message" loading={sending}><Send className="size-5" aria-hidden /></Button>
            ) : (
              <Button type="button" size="icon" className="size-12 shrink-0" variant={recording === null ? "primary" : "secondary"} aria-label={recording === null ? "Record a voice note" : "Stop and send the voice note"} onClick={toggleRecord} disabled={sending && recording === null}>
                {recording === null ? <Mic className="size-5" aria-hidden /> : <Square className="size-5 text-danger" aria-hidden />}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
