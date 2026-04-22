"use client";
import { useState } from "react";
import { Part, PartCreate, PartUpdate } from "@/lib/types";
import { createPart, updatePart } from "@/lib/api";
import { X } from "lucide-react";

interface AddPartModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Part | null;
}

export function AddPartModal({ open, onClose, onSaved, editing }: AddPartModalProps) {
  const isEdit = !!editing;
  const [form, setForm] = useState<PartCreate>({
    name: editing?.name ?? "",
    category: editing?.category ?? "",
    search_query: editing?.search_query ?? "",
    target_margin_override: editing?.target_margin_override ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && editing) {
        const patch: PartUpdate = {
          target_margin_override: form.target_margin_override,
        };
        await updatePart(editing.id, patch);
      } else {
        await createPart(form);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-800 shadow-2xl shadow-black/50 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? "Edit Part" : "Add Part"}
          </h2>
          <button id="close-modal" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isEdit && (
            <>
              <Field label="Part Name" id="part-name" required>
                <input
                  id="part-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Dell XPS 15 Battery"
                  className={inputCls}
                />
              </Field>
              <Field label="Category" id="part-category" required>
                <input
                  id="part-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  placeholder="e.g. Laptop Parts"
                  className={inputCls}
                />
              </Field>
              <Field label="eBay Search Query" id="part-query" required>
                <input
                  id="part-query"
                  type="text"
                  value={form.search_query}
                  onChange={(e) => setForm({ ...form, search_query: e.target.value })}
                  required
                  placeholder='e.g. "Dell XPS 15 9500 battery" -charger'
                  className={inputCls}
                />
              </Field>
            </>
          )}
          <Field label="Target Margin Override (%)" id="part-margin">
            <input
              id="part-margin"
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.target_margin_override != null ? Math.round(form.target_margin_override * 100) : ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  target_margin_override: e.target.value === "" ? null : Number(e.target.value) / 100,
                })
              }
              placeholder="Leave blank to use global default (30%)"
              className={inputCls}
            />
          </Field>

          {error && (
            <p className="text-xs text-rose-400 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              id="cancel-part"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-600 bg-slate-700/40 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-part"
              disabled={saving}
              className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Part"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, id, required, children }: { label: string; id: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        {label} {required && <span className="text-violet-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-600/60 bg-slate-700/50 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-colors";
