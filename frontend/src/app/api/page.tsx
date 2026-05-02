"use client";

import { useState } from "react";
import {
  useQuotaStatus,
  tierColors,
  timeUntilReset,
  type QuotaService,
} from "@/hooks/useQuotaStatus";
import { QuotaMetricCard } from "@/components/quota/QuotaMetricCard";
import { QuotaDonut } from "@/components/quota/QuotaDonut";
import { classNames } from "@/lib/utils";

type Tab = "live" | "history";

export default function ApiDashboardPage() {
  const { data, loading, error } = useQuotaStatus();
  const [tab, setTab] = useState<Tab>("live");

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
          Failed to load quota status: {error ?? "unknown error"}
        </div>
      </div>
    );
  }

  const browse = data.services["ebay_browse"];
  const scraper = data.services["scraperapi"];
  const services = Object.values(data.services);

  // Estimate "calls/min" from today's calls assuming an even split — placeholder
  // until we wire per-minute history. Conservative because most calls cluster.
  const minutesElapsed = Math.max(
    1,
    Math.floor((Date.now() / 1000 - new Date().setUTCHours(0, 0, 0, 0) / 1000) / 60)
  );
  const callsPerMin = (data.totals.calls_today / minutesElapsed).toFixed(1);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
            <PulseIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              API Usage Monitor
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time eBay & ScraperAPI consumption tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HeaderButton onClick={() => location.reload()}>
            <RefreshIcon className="h-3.5 w-3.5" />
            Refresh
          </HeaderButton>
        </div>
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuotaMetricCard
          label="eBay Calls Today"
          value={browse?.used.toLocaleString() ?? "0"}
          hint={`of ${browse?.limit.toLocaleString() ?? "—"}`}
          iconColor="text-blue-400"
          icon={<BoltIcon className="h-5 w-5" />}
        />
        <QuotaMetricCard
          label="ScraperAPI This Month"
          value={scraper?.used.toLocaleString() ?? "0"}
          hint={`of ${scraper?.limit.toLocaleString() ?? "—"}`}
          iconColor="text-primary"
          icon={<PulseIcon className="h-5 w-5" />}
        />
        <QuotaMetricCard
          label="Calls / min"
          value={callsPerMin}
          hint="Today's average"
          iconColor="text-purple-400"
          icon={<NetworkIcon className="h-5 w-5" />}
        />
        <QuotaMetricCard
          label="Failed Calls"
          value={data.totals.failed.toLocaleString()}
          hint={data.totals.failed === 0 ? "All systems healthy" : "Across all services"}
          iconColor={data.totals.failed > 0 ? "text-danger" : "text-muted-foreground"}
          icon={<WarningIcon className="h-5 w-5" />}
        />
      </div>

      {/* Donuts + service pills */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
          {browse && (
            <QuotaDonut
              pct={browse.pct}
              tier={browse.tier}
              centerNumber={`${Math.round(browse.pct * 100)}%`}
              centerLabel={`${browse.used.toLocaleString()} / ${browse.limit.toLocaleString()}`}
              bottomLabel={browse.label}
              bottomSubLabel={`Resets in ${timeUntilReset(browse.resets_at_unix)}`}
            />
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 flex items-center justify-center">
          {scraper && (
            <QuotaDonut
              pct={scraper.pct}
              tier={scraper.tier}
              centerNumber={`${Math.round(scraper.pct * 100)}%`}
              centerLabel={`${scraper.used.toLocaleString()} / ${scraper.limit.toLocaleString()}`}
              bottomLabel={scraper.label}
              bottomSubLabel={`Resets in ${timeUntilReset(scraper.resets_at_unix)}`}
            />
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Service Status
          </h3>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <ServicePill key={s.key} service={s} />
            ))}
          </div>
          <div className="mt-6 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Generated at</span>
              <span className="tabular-nums">
                {new Date(data.generated_at_unix * 1000).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Overall tier</span>
              <span
                className={classNames(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                  tierColors(data.overall_tier).text,
                  tierColors(data.overall_tier).bg
                )}
              >
                {data.overall_tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          <TabButton active={tab === "live"} onClick={() => setTab("live")}>
            Live Status
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            Per-Service Detail
          </TabButton>
        </div>
      </div>

      {tab === "live" ? (
        <LiveStatusTab services={services} />
      ) : (
        <PerServiceTab services={services} />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ServicePill({ service }: { service: QuotaService }) {
  const colors = tierColors(service.tier);
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        colors.border,
        colors.bg,
        colors.text
      )}
    >
      <span
        className={classNames(
          "inline-block h-1.5 w-1.5 rounded-full",
          colors.dot,
          service.tier !== "green" ? "pulse-glow" : ""
        )}
      />
      {service.label}
    </span>
  );
}

function HeaderButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-border-highlight transition-colors"
    >
      {children}
    </button>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function LiveStatusTab({ services }: { services: QuotaService[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/50">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-5 py-3 font-medium">Service</th>
            <th className="px-5 py-3 font-medium">Window</th>
            <th className="px-5 py-3 font-medium tabular-nums">Used</th>
            <th className="px-5 py-3 font-medium tabular-nums">Limit</th>
            <th className="px-5 py-3 font-medium tabular-nums">Failed</th>
            <th className="px-5 py-3 font-medium">Resets In</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => {
            const colors = tierColors(s.tier);
            return (
              <tr
                key={s.key}
                className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <td className="px-5 py-3 font-medium text-foreground">
                  {s.label}
                </td>
                <td className="px-5 py-3 text-muted-foreground capitalize">
                  {s.window}
                </td>
                <td className="px-5 py-3 tabular-nums text-foreground">
                  {s.used.toLocaleString()}
                </td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">
                  {s.limit.toLocaleString()}
                </td>
                <td
                  className={classNames(
                    "px-5 py-3 tabular-nums",
                    s.failed > 0 ? "text-danger" : "text-muted-foreground"
                  )}
                >
                  {s.failed.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-muted-foreground tabular-nums">
                  {timeUntilReset(s.resets_at_unix)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={classNames(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                      colors.text,
                      colors.bg
                    )}
                  >
                    {s.tier}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PerServiceTab({ services }: { services: QuotaService[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => {
        const colors = tierColors(s.tier);
        return (
          <div
            key={s.key}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">
                {s.label}
              </span>
              <span
                className={classNames(
                  "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                  colors.text,
                  colors.bg
                )}
              >
                {s.tier}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {s.used.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                / {s.limit.toLocaleString()}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={classNames("h-full transition-all duration-700 ease-out", colors.dot)}
                style={{ width: `${Math.min(100, s.pct * 100)}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{s.window} window</span>
              <span>resets in {timeUntilReset(s.resets_at_unix)}</span>
            </div>
            {s.failed > 0 && (
              <div className="mt-2 text-xs text-danger">
                {s.failed} failed call{s.failed === 1 ? "" : "s"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Icons (inline so we don't pull in a library) ────────────────────────────

function PulseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12h4l2-7 4 14 2-7h6" />
    </svg>
  );
}

function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function NetworkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <path d="M5 16V12h14v4M12 8v4" />
    </svg>
  );
}

function WarningIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3 10 18H2L12 3z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
