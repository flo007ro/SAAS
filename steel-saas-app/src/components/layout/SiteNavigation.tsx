"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [ ["/dashboard", "Overview"], ["/projects", "Projects"], ["/profiles", "Steel profiles"], ["/about", "About"] ];
export default function SiteNavigation() {
  const pathname = usePathname();
  return <header className="site-header">
    <Link className="site-brand" href="/dashboard" aria-label="SteelCalc dashboard">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v4h-7v10h7v4H3v-4h7V7H3Z" fill="currentColor" /></svg>
      STEEL<span>CALC</span>
    </Link>
    <nav aria-label="Main navigation">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>{label}</Link>)}</nav>
    <Link href="/login" className="site-account">Account</Link>
  </header>;
}
