import { Logo } from "@/components/brand/logo";
import { DesktopNav } from "./desktop-nav";
import { HeaderActions } from "./header-actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center px-4">
        <Logo />
        <DesktopNav />
        <HeaderActions />
      </div>
    </header>
  );
}
