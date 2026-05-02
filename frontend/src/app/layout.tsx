import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { QuotaPill } from "@/components/quota/QuotaPill";
import { QuotaBanner } from "@/components/quota/QuotaBanner";

export const metadata: Metadata = {
  title: "SNIPER - eBay Deal Finder",
  description: "Automated eBay deal scanner. Find profitable listings instantly.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Navigation - COMPUTE style */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1.5">
              <span className="text-xl font-semibold tracking-tight text-foreground">
                SNIPER
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider mt-1">
                TM
              </span>
            </Link>

            {/* Center Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <NavLink href="/#discover">Discover</NavLink>
              <NavLink href="/#dashboard">Dashboard</NavLink>
              <NavLink href="/#parts">Parts</NavLink>
              <NavLink href="/#history">History</NavLink>
              <NavLink href="/api">API</NavLink>
            </nav>

            {/* CTA Button */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex h-2 w-2 rounded-full bg-primary pulse-glow" />
                Live
              </span>
              <QuotaPill />
              <Link
                href="/#discover"
                className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                Start scanning
              </Link>
            </div>
          </div>
          <QuotaBanner />
        </header>

        <main className="pt-[73px]">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {children}
    </Link>
  );
}
