import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Crosshair } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "eBay Sniper — Deal Finder",
  description: "Real-time eBay deal scanner and margin tracker for resellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {/* Nav */}
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" id="nav-logo" className="flex items-center gap-2 font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
                <Crosshair size={15} />
              </span>
              <span className="text-base tracking-tight">
                eBay <span className="text-violet-400">Sniper</span>
              </span>
            </Link>
            <nav className="flex gap-1">
              <NavLink href="/" label="Dashboard" id="nav-dashboard" />
              <NavLink href="/discover" label="Discover" id="nav-discover" />
              <NavLink href="/parts" label="Parts" id="nav-parts" />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

function NavLink({ href, label, id }: { href: string; label: string; id: string }) {
  return (
    <Link
      id={id}
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}
