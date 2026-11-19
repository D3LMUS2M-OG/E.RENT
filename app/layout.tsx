import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { RegisterServiceWorker } from "@/components/layout/register-sw";
import { SessionProvider } from "@/components/layout/session-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeSync } from "@/components/layout/theme-sync";
import { ConfirmProvider } from "@/components/ui/glass-confirm";
import { CompareBar } from "@/components/compare/compare-bar";
import { InstallBanner } from "@/components/pwa/install-banner";

// Two families and one accent face: a warm serif for headlines, a clean sans for everything else, an italic serif for large quotes.
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const quote = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-quote", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "E.Rent: houses to rent in Kenya", template: "%s | E.Rent" },
  description: "Search rental houses in all 47 counties, chat privately with landlords and read honest reviews from past tenants.",
  icons: { icon: [{ url: "/icons/favicon-48.png", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "E.Rent", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#111111" }],
  width: "device-width", initialScale: 1, viewportFit: "cover",
};

// Applies the saved theme before first paint so there is no flash
const themeScript = `try{var t=localStorage.getItem("erent-theme"),d=document.documentElement;if(t==="light"||t==="dark")d.dataset.theme=t;var l=t==="light"||(t!=="dark"&&matchMedia("(prefers-color-scheme: light)").matches);document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",l?"#ffffff":"#111111")})}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${quote.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="flex min-h-dvh flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <SessionProvider>
         <ConfirmProvider>
          <ThemeSync />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <MobileNav />
          <InstallBanner />
          <CompareBar />
         </ConfirmProvider>
        </SessionProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
