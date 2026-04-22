"use client";
import { useState } from "react";
import { Part } from "@/lib/types";
import { formatCurrency, formatPercent, timeAgo } from "@/lib/utils";
import { Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { deletePart, updatePart, refreshPart } from "@/lib/api";

interface PartTableProps {
  parts: Part[];
  onRefresh: () => void;
  onEdit: (part: Part) => void;
}

export function PartTable({ parts, onRefresh, onEdit }: PartTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this part?")) return;
    setLoadingId(id);
    await deletePart(id);
    onRefresh();
    setLoadingId(null);
  }

  async function handleToggle(part: Part) {
    setLoadingId(part.id);
    await updatePart(part.id, { is_active: !part.is_active });
    onRefresh();
    setLoadingId(null);
  }

  async function handleRefresh(id: string) {
    setLoadingId(id);
    await refreshPart(id);
    setTimeout(onRefresh, 3000);
    setLoadingId(null);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-800/80">
            {["Part", "Category", "Avg Sold", "Median", "Max Buy", "Margin", "Samples", "Last Refresh", ""].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr
              key={part.id}
              className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${part.is_active ? "bg-emerald-400" : "bg-slate-600"}`}
                  />
                  <span className="font-medium text-white">{part.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">{part.search_query}</p>
              </td>
              <td className="px-4 py-3 text-slate-300">{part.category}</td>
              <td className="px-4 py-3 font-mono text-slate-200">{formatCurrency(part.avg_sold_price)}</td>
              <td className="px-4 py-3 font-mono text-slate-400">{formatCurrency(part.median_sold_price)}</td>
              <td className="px-4 py-3 font-mono text-violet-300 font-semibold">{formatCurrency(part.max_buy_price)}</td>
              <td className="px-4 py-3 font-semibold text-emerald-400">{formatPercent((part.effective_margin ?? 0.3) * 100)}</td>
              <td className="px-4 py-3 text-slate-400">{part.sample_size ?? "—"}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(part.last_refreshed_at)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    id={`toggle-${part.id}`}
                    onClick={() => handleToggle(part)}
                    disabled={loadingId === part.id}
                    title={part.is_active ? "Deactivate" : "Activate"}
                    className="text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-40"
                  >
                    {part.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    id={`refresh-${part.id}`}
                    onClick={() => handleRefresh(part.id)}
                    disabled={loadingId === part.id}
                    title="Refresh"
                    className="text-slate-400 hover:text-violet-400 transition-colors disabled:opacity-40"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    id={`edit-${part.id}`}
                    onClick={() => onEdit(part)}
                    title="Edit"
                    className="text-slate-400 hover:text-sky-400 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    id={`delete-${part.id}`}
                    onClick={() => handleDelete(part.id)}
                    disabled={loadingId === part.id}
                    title="Delete"
                    className="text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
