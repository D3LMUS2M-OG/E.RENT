import Link from "next/link";

const legal = [
  ["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Cookies", "/legal/cookies"],
  ["Community standards", "/legal/community-standards"], ["Safety", "/safety"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <p>E.Rent is not a party to any rental agreement. Never pay before you view in person.</p>
        <ul className="flex flex-wrap gap-x-4">
          {legal.map(([label, href]) => (
            <li key={href}><Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href={href}>{label}</Link></li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
