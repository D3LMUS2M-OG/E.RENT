import { signInWithGoogle } from "@/app/(auth)/actions";
import { stagger } from "@/lib/utils";

/** "Or continue with" appears only when Google sign-in is switched on in the feature flags. */
export function SocialBlock({ next }: { next?: string }) {
  return (
    <div style={stagger(5)} className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted"><span className="h-px flex-1 bg-border" />or continue with<span className="h-px flex-1 bg-border" /></div>
      <form action={signInWithGoogle}>
        {next && <input type="hidden" name="next" value={next} />}
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-border-strong bg-surface-2 text-[15px] font-semibold shadow-[var(--shadow-btn)] transition-[transform,box-shadow] duration-150 hover:border-foreground/40 active:translate-y-px active:shadow-none">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.3a11 11 0 0 0 0 9.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.3 7.1l3.6 2.8C6.8 7.300 9.200 5.400 12 5.400z" /></svg>
          Google
        </button>
      </form>
    </div>
  );
}
