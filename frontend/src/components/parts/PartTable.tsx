"use client";
import { useState } from "react";
import { Part } from "@/lib/types";
import { formatCurrency, formatPercent, timeAgo, classNames } from "@/lib/utils";
import { Pencil, Trash2, RefreshCw, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react";
import { deletePart, updatePart, refreshPart } from "@/lib/api";
import Link from "next/link";

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
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            {["Part", "Category", "Avg Sold", "Median", "Max Buy", "Margin", "Samples", "Last Refresh", ""].map((h) => (
              <th key={h} className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr
              key={part.id}
              className="border-b border-border/50 hover:bg-secondary/30 transition-colors group"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={classNames(
                      "inline-flex h-2.5 w-2.5 rounded-full",
                      part.is_active ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                  <div>
                    <Link 
                      href={`/history/${part.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      {part.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{part.search_query}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {part.category}
                </span>
              </td>
              <td className="px-5 py-4 font-mono text-foreground">{formatCurrency(part.avg_sold_price)}</td>
              <td className="px-5 py-4 font-mono text-muted-foreground">{formatCurrency(part.median_sold_price)}</td>
              <td className="px-5 py-4 font-mono font-semibold text-primary">{formatCurrency(part.max_buy_price)}</td>
              <td className="px-5 py-4">
                <span className="font-semibold text-primary">{formatPercent((part.effective_margin ?? 0.3) * 100)}</span>
              </td>
              <td className="px-5 py-4 text-muted-foreground">{part.sample_size ?? "--"}</td>
              <td className="px-5 py-4 text-xs text-muted-foreground">{timeAgo(part.last_refreshed_at)}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <ActionButton
                    id={`toggle-${part.id}`}
                    onClick={() => handleToggle(part)}
                    disabled={loadingId === part.id}
                    title={part.is_active ? "Deactivate" : "Activate"}
                    hoverColor="text-primary"
                  >
                    {part.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </ActionButton>
                  <ActionButton
                    id={`refresh-${part.id}`}
                    onClick={() => handleRefresh(part.id)}
                    disabled={loadingId === part.id}
                    title="Refresh pricing"
                    hoverColor="text-blue-400"
                  >
                    <RefreshCw className={classNames("h-3.5 w-3.5", loadingId === part.id && "animate-spin")} />
                  </ActionButton>
                  <ActionButton
                    id={`edit-${part.id}`}
                    onClick={() => onEdit(part)}
                    title="Edit"
                    hoverColor="text-warning"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </ActionButton>
                  <ActionButton
                    id={`delete-${part.id}`}
                    onClick={() => handleDelete(part.id)}
                    disabled={loadingId === part.id}
                    title="Delete"
                    hoverColor="text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({ 
  id, 
  onClick, 
  disabled, 
  title, 
  hoverColor, 
  children 
}: { 
  id: string;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  hoverColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={classNames(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-secondary disabled:opacity-40",
        `hover:${hoverColor}`
      )}
    >
      {children}
    </button>
  );
}
