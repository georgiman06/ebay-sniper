"use client";
import { useState } from "react";
import { useParts } from "@/hooks/useParts";
import { PartTable } from "@/components/parts/PartTable";
import { AddPartModal } from "@/components/parts/AddPartModal";
import { Part } from "@/lib/types";
import { Plus } from "lucide-react";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Part Manager</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {parts.length} tracked part{parts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          id="add-part-btn"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-violet-900/30"
        >
          <Plus size={15} /> Add Part
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading parts…</div>
      ) : parts.length === 0 ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          No parts yet. Click <strong className="text-slate-300">Add Part</strong> to get started.
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
