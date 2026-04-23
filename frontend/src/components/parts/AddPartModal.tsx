"use client";
import { useState, useEffect } from "react";
import { Part, PartCreate, PartUpdate } from "@/lib/types";
import { createPart, updatePart } from "@/lib/api";
import { X, Package, Loader2 } from "lucide-react";

interface AddPartModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Part | null;
}

export function AddPartModal({ open, onClose, onSaved, editing }: AddPartModalProps) {
  const isEdit = !!editing;
  const [form, setForm] = useState<PartCreate>({
    name: "",
    category: "",
    search_query: "",
    target_margin_override: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when editing changes
  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        search_query: editing.search_query,
        target_margin_override: editing.target_margin_override,
      });
    } else {
      setForm({
        name: "",
        category: "",
        search_query: "",
        target_margin_override: null,
      });
    }
    setError(null);
  }, [editing, open]);

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isEdit ? "Edit Part" : "Add Part"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEdit ? "Update tracking settings" : "Track a new eBay product"}
              </p>
            </div>
          </div>
          <button 
            id="close-modal" 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
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
              <Field label="eBay Search Query" id="part-query" required hint="Use quotes for exact match, -keyword to exclude">
                <input
                  id="part-query"
                  type="text"
                  value={form.search_query}
                  onChange={(e) => setForm({ ...form, search_query: e.target.value })}
                  required
                  placeholder='"Dell XPS 15 9500 battery" -charger'
                  className={inputCls}
                />
              </Field>
            </>
          )}
          <Field label="Target Margin Override (%)" id="part-margin" hint="Leave blank to use default (30%)">
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
              placeholder="30"
              className={inputCls}
            />
          </Field>

          {error && (
            <div className="text-xs text-danger rounded-xl bg-danger/5 border border-danger/20 p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              id="cancel-part"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-part"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-3 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? "Save Changes" : "Add Part"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, id, required, hint, children }: { label: string; id: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all";
