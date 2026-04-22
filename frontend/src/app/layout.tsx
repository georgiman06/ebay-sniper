import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Zap, LayoutDashboard, Compass, Database } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "eBay Sniper — Real-Time Deal Hunter",
  description: "Automated eBay deal scanner. Find profitable listings instantly with margin tracking and market analysis.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} bg-background`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Navigation */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            {/* Logo */}
            <Link href="/" id="nav-logo" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground tracking-tight">
                  eBay<span className="text-primary">Sniper</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  Deal Hunter
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-1">
              <NavLink href="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" id="nav-dashboard" />
              <NavLink href="/discover" icon={<Compass className="h-4 w-4" />} label="Discover" id="nav-discover" />
              <NavLink href="/parts" icon={<Database className="h-4 w-4" />} label="Parts" id="nav-parts" />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-border mt-auto">
          <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Built for resellers. Powered by real eBay data.
            </p>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Live Scanning</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label, id }: { href: string; icon: React.ReactNode; label: string; id: string }) {
  return (
    <Link
      id={id}
      href={href}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
    >
      {icon}
      {label}
    </Link>
  );
}
