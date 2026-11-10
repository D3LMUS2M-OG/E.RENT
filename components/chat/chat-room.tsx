"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Mic, Paperclip, Send, ShieldAlert, Square } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { createClient } from "@/lib/supabase/client";
import { blockUser, deleteConversation, reportConversation, unblockUser } from "@/app/chats/actions";

export type Msg = {
  id: string; sender_id: string; kind: "text" | "image" | "voice" | "document"; body: string | null; attachment_path: string | null;
  attachment_name: string | null; attachment_mime: string | null; attachment_bytes: number | null; duration_s: number | null;
  created_at: string; read_at: string | null;
};
export type Overview = {
  id: string; listing_id: string; listing_title: string; listing_slug: string; listing_status: string; my_role: "tenant" | "landlord";
  other_name: string; other_verified: boolean; other_user_id: string; i_blocked: boolean; blocked_me: boolean;
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
    return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Photo sent in chat" loading="lazy" className="max-h-72 rounded-md" /></a>;
  if (m.kind === "voice") return <audio controls preload="none" src={url} className="max-w-full" aria-label="Voice note" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4"><FileText className="size-4" aria-hidden />{m.attachment_name ?? "Document"}</a>;
}

export function ChatRoom({ o, me, initial, children }: { o: Overview; me: string; initial: Msg[]; children?: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Msg[]>(initial);
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
  const bottom = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const locked = o.i_blocked || o.blocked_me;

  const upsert = useCallback((m: Msg) => setMessages((prev) => {
    const i = prev.findIndex((x) => x.id === m.id);
    if (i >= 0) { const next = [...prev]; next[i] = m; return next; }
    return [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }), []);

  const markRead = useCallback(() => { if (document.visibilityState === "visible") supabase.rpc("mark_conversation_read", { p_id: o.id }); }, [supabase, o.id]);

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

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages.length, typing]);

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

  const lastMineIdx = messages.map((m) => m.sender_id === me).lastIndexOf(true);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">{o.other_name || "Landlord"}{o.other_verified && <VerifiedBadge />}</p>
          <p className="truncate text-sm text-muted">
            <span aria-live="polite">{otherOnline ? "Online now" : "Offline"}</span> · <Link className="underline underline-offset-4" href={`/listing/${o.listing_slug}`}>{o.listing_title}</Link>
          </p>
        </div>
        <details className="relative">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-md border border-border-strong px-3 text-sm font-medium">Menu</summary>
          <div className="absolute right-0 z-10 mt-2 w-[min(22rem,90vw)] space-y-4 rounded-lg border border-border bg-background p-4">
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
              <select name="reason" aria-label="Reason" className="min-h-11 w-full rounded-md border border-border-strong bg-background px-3 text-base">{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <textarea name="details" rows={2} maxLength={1000} aria-label="What happened" placeholder="What happened? (optional)" className="w-full rounded-md border border-border-strong bg-background p-2 text-base" />
              <Button type="submit" variant="secondary">Send report</Button>
              {reported && <p role="status" className="text-sm font-medium">{reported}</p>}
            </form>
          </div>
        </details>
      </header>

      <p className="flex items-start gap-2 border-b border-border bg-surface px-4 py-2 text-sm"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        Never pay a deposit or rent before you have viewed the house in person. E.Rent does not take payments, so nobody here can ask you to pay through the app.</p>

      <div role="log" aria-live="polite" aria-label="Messages" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <p className="text-center text-sm text-muted">Say hello and ask what you want to know about the house.</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] space-y-1 rounded-lg px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}>
                {m.kind === "text" ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : <Attachment m={m} />}
                <p className={`text-xs ${mine ? "opacity-70" : "text-muted"}`}>
                  {new Date(m.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}{mine && i === lastMineIdx && (m.read_at ? " · Read" : " · Sent")}
                </p>
              </div>
            </div>);
        })}
        {typing && <p className="text-sm text-muted" aria-live="polite">{o.other_name?.split(" ")[0] || "They"} is typing</p>}
        <div ref={bottom} />
      </div>

      {locked ? (
        <p role="status" className="border-t border-border p-4 text-sm font-medium">{o.i_blocked ? "You blocked this person. Unblock them from the menu to chat again." : "You cannot send messages in this conversation."}</p>
      ) : o.listing_status !== "active" ? (
        <p role="status" className="border-t border-border p-4 text-sm text-muted">This house is not on the market now. You can still read and reply.</p>
      ) : null}
      {!locked && (
        <form onSubmit={sendText} className="space-y-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p role="alert" className="text-sm font-medium">Error: {error}</p>}
          {note && <p role="status" className="text-sm">{note}</p>}
          <div className="flex items-end gap-2">
            <input ref={fileInput} type="file" hidden accept="image/*,application/pdf,.doc,.docx" onChange={onPick} />
            <Button type="button" variant="secondary" size="icon" aria-label="Attach a photo or document" onClick={() => fileInput.current?.click()} disabled={sending}><Paperclip className="size-4" aria-hidden /></Button>
            <Button type="button" variant={recording === null ? "secondary" : "primary"} size="icon" aria-label={recording === null ? "Record a voice note" : "Stop and send the voice note"} onClick={toggleRecord} disabled={sending && recording === null}>
              {recording === null ? <Mic className="size-4" aria-hidden /> : <Square className="size-4" aria-hidden />}
            </Button>
            <label htmlFor="chat-text" className="sr-only">Message</label>
            <textarea id="chat-text" value={text} onChange={(e) => onType(e.target.value)} rows={1} maxLength={2000} placeholder={recording !== null ? `Recording ${recording}s` : "Write a message"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-border-strong bg-background px-3 py-2 text-base" />
            <Button type="submit" size="icon" aria-label="Send message" loading={sending} disabled={!text.trim()}><Send className="size-4" aria-hidden /></Button>
          </div>
        </form>
      )}
    </div>
  );
}
