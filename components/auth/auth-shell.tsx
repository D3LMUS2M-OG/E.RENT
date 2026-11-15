import Link from "next/link";
import { stagger } from "@/lib/utils";
import { LogoArt } from "@/components/brand/logo";

/** Full-screen sign-in layout. The header and footer are hidden on these pages (see globals.css). */
export function AuthShell({ title, accent, subtitle, children }: { title: string; accent: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div data-auth-page className="auth-bg relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ribbon ribbon-a" /><div className="ribbon ribbon-b" />
        <svg className="ribbon-lines absolute inset-0 size-full" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" fill="none">
          <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stopColor="#ff4d00" stopOpacity="0" /><stop offset=".5" stopColor="#ff4d00" stopOpacity=".9" /><stop offset="1" stopColor="#ff4d00" stopOpacity="0" /></linearGradient></defs>
          <path d="M-50 560C150 470 300 640 520 520S760 330 860 360" stroke="url(#rg)" strokeWidth="2" />
          <path d="M-50 600C170 520 320 690 540 570S780 390 860 420" stroke="url(#rg)" strokeWidth="1" opacity=".6" />
          <path d="M-40 170C140 90 300 230 500 140S740 40 850 90" stroke="url(#rg)" strokeWidth="1.5" opacity=".7" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <Link href="/" aria-label="E.Rent, home" className="mb-6 flex justify-center"><LogoArt className="h-12" /></Link>
        <div className="relative">
          <span aria-hidden className="corner-glass -left-3 -top-3 [clip-path:polygon(0_0,100%_0,0_100%)]" />
          <span aria-hidden className="corner-glass -bottom-3 -right-3 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
          <div className="chamfer motion-rise">
            <div className="chamfer-inner px-6 pb-8 pt-9 sm:px-8">
              <div className="stagger space-y-6">
                <div style={stagger(0)}>
                  <h1 className="text-[34px] leading-tight">{title} <span className="text-accent">{accent}</span></h1>
                  <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
