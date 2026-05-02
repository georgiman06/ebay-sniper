"use client";
import { useState } from "react";
import { useParts } from "@/hooks/useParts";
import { PartTable } from "@/components/parts/PartTable";
import { AddPartModal } from "@/components/parts/AddPartModal";
import { Part } from "@/lib/types";
import { clearScrapeCache } from "@/lib/api";
import { Plus, Database, Package, Trash2 } from "lucide-react";

export default function PartsPage() {
  const { parts, isLoading, mutate } = useParts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(part: Part) {
    setEditing(part);
    setModalOpen(true);
  }

  const activeParts = parts.filter(p => p.is_active).length;
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);

  async function handleClearCache() {
    if (!confirm("Clear the price scrape cache? All parts will re-scrape fresh data on next refresh.")) return;
    setClearing(true);
    setClearMsg(null);
    try {
      const res = await clearScrapeCache();
      setClearMsg(`Cache cleared — ${res.rows_deleted} rows removed. Refresh your parts to repopulate.`);
    } catch {
      setClearMsg("Failed to clear cache. Try again.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Part Tracker
            </span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Manage Parts
          </h1>
          <p className="text-muted-foreground mt-2">
            {parts.length} parts tracked, {activeParts} currently active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClearCache}
            disabled={clearing}
            title="Purge the 24h scrape cache so parts re-fetch fresh price data on next refresh"
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border-highlight transition-all disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {clearing ? "Clearing…" : "Clear Cache"}
          </button>
          <button
            id="add-part-btn"
            onClick={openAdd}
            className="flex items-center gap-2.5 rounded-xl bg-primary hover:bg-primary/90 px-5 py-3 text-sm font-semibold text-primary-foreground transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Add Part
          </button>
        </div>
      </div>

      {/* Cache clear feedback */}
      {clearMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${clearMsg.startsWith("Failed") ? "border-danger/30 bg-danger/5 text-danger" : "border-primary/30 bg-primary/5 text-primary"}`}>
          {clearMsg}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary border border-border animate-pulse">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Loading parts...</p>
          </div>
        </div>
      ) : parts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No parts tracked yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click <span className="text-primary font-medium">Add Part</span> to start tracking deals
              </p>
            </div>
          </div>
        </div>
      ) : (
        <PartTable parts={parts} onRefresh={mutate} onEdit={openEdit} />
      )}

      <AddPartModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={mutate}
        editing={editing}
      />
    </div>
  );
}
