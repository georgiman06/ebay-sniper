"use client";
import { useState, useEffect } from "react";
import { Part, PartCreate, PartUpdate } from "@/lib/types";
import { createPart, updatePart } from "@/lib/api";
import { X, Package, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";

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
    ebay_fee_override: null,
    outbound_shipping: null,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        category: editing.category,
        search_query: editing.search_query,
        target_margin_override: editing.target_margin_override,
        ebay_fee_override: editing.ebay_fee_override,
        outbound_shipping: editing.outbound_shipping,
      });
      // Open advanced panel if non-default values are already set
      setShowAdvanced(
        editing.ebay_fee_override != null || editing.outbound_shipping != null
      );
    } else {
      setForm({ name: "", category: "", search_query: "", target_margin_override: null, ebay_fee_override: null, outbound_shipping: null });
      setShowAdvanced(false);
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
          ebay_fee_override: form.ebay_fee_override,
          outbound_shipping: form.outbound_shipping,
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

  // Live preview of the max buy calculation
  const previewFee   = (form.ebay_fee_override ?? 0.1325);
  const previewShip  = (form.outbound_shipping ?? 0);
  const previewMar   = (form.target_margin_override ?? 0.30);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                  id="part-name" type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required placeholder="e.g. Dell XPS 15 Battery" className={inputCls}
                />
              </Field>
              <Field label="Category" id="part-category" required>
                <input
                  id="part-category" type="text" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required placeholder="e.g. Laptop Parts" className={inputCls}
                />
              </Field>
              <Field label="eBay Search Query" id="part-query" required hint='Use quotes for exact match, -keyword to exclude'>
                <input
                  id="part-query" type="text" value={form.search_query}
                  onChange={(e) => setForm({ ...form, search_query: e.target.value })}
                  required placeholder='"Dell XPS 15 9500 battery" -charger' className={inputCls}
                />
              </Field>
            </>
          )}

          <Field label="Target Margin (%)" id="part-margin" hint="Your profit goal after fees. Default: 30%">
            <input
              id="part-margin" type="number" min={0} max={100} step={1}
              value={form.target_margin_override != null ? Math.round(form.target_margin_override * 100) : ""}
              onChange={(e) => setForm({ ...form, target_margin_override: e.target.value === "" ? null : Number(e.target.value) / 100 })}
              placeholder="30" className={inputCls}
            />
          </Field>

          {/* Advanced settings — collapsed by default */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                Advanced — Fee &amp; Shipping Settings
              </span>
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showAdvanced && (
              <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-4 bg-secondary/20">
                {/* Fee explanation callout */}
                <div className="flex gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-[11px] text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>
                    Max buy price = (avg sold − eBay fee − shipping out) × (1 − target margin).
                    Leave blank to use global defaults.
                  </span>
                </div>

                <Field label="eBay Fee Rate (%)" id="part-fee" hint="Standard: 13.25%. Tools/Auto Parts: 11.5%. Motors: 2.35%">
                  <input
                    id="part-fee" type="number" min={0} max={30} step={0.01}
                    value={form.ebay_fee_override != null ? +(form.ebay_fee_override * 100).toFixed(2) : ""}
                    onChange={(e) => setForm({ ...form, ebay_fee_override: e.target.value === "" ? null : Number(e.target.value) / 100 })}
                    placeholder="13.25" className={inputCls}
                  />
                </Field>

                <Field label="Outbound Shipping ($)" id="part-ship" hint="Cost to ship this item to the buyer. 0 = free shipping listed">
                  <input
                    id="part-ship" type="number" min={0} step={0.01}
                    value={form.outbound_shipping ?? ""}
                    onChange={(e) => setForm({ ...form, outbound_shipping: e.target.value === "" ? null : Number(e.target.value) })}
                    placeholder="0.00" className={inputCls}
                  />
                </Field>

                {/* Live formula preview */}
                <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-[11px] space-y-1">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">Formula Preview</p>
                  <div className="flex justify-between text-muted-foreground">
                    <span>eBay fee rate</span><span className="tabular-nums">{(previewFee * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Outbound shipping</span><span className="tabular-nums">${previewShip.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Target margin</span><span className="tabular-nums">{(previewMar * 100).toFixed(1)}%</span>
                  </div>
                  <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between font-semibold text-foreground">
                    <span>If avg sold = $100</span>
                    <span className="text-primary tabular-nums">
                      max buy = ${((100 * (1 - previewFee) - previewShip) * (1 - previewMar)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-xs text-danger rounded-xl bg-danger/5 border border-danger/20 p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              type="button" id="cancel-part" onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit" id="save-part" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-4 py-3 text-sm font-semibold text-primary-foreground transition-all disabled:opacity-60"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : isEdit ? "Save Changes" : "Add Part"}
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
