"use client";

import { useState, FormEvent, useEffect } from "react";
import useSWR from "swr";
import {
  previewSearch,
  addToTracker,
  getSearchSuggestions,
  getSearchHistory,
  recordSearchEvent,
  SearchPreviewResult,
} from "@/lib/api";
import { 
  Loader2, Search, CheckCircle2, AlertCircle, 
  History, Sparkles, TrendingUp, ShoppingCart, Info, ArrowRight, ExternalLink
} from "lucide-react";
import { classNames } from "@/lib/utils";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("working");
  const [preview, setPreview] = useState<SearchPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR("/search/suggestions", () => getSearchSuggestions(8));
  const { data: historyData, mutate: mutateHistory } = useSWR("/search/history", () => getSearchHistory(10));

  async function handleSearch(e: FormEvent | string | React.MouseEvent) {
    if (e && typeof e !== "string" && "preventDefault" in e) e.preventDefault();
    const q = typeof e === "string" ? e : query;
    if (!q.trim()) return;

    setQuery(q);
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const res = await previewSearch(q, condition);
      setPreview(res);
      recordSearchEvent(q).catch((console.error));
      mutateHistory();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-12 max-w-5xl mx-auto w-full pb-20">
      
      {/* Hero Header */}
      <div className="flex flex-col items-center text-center gap-8 pt-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary pulse-glow" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Live Market Data
            </span>
          </div>
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Market <span className="gradient-text">Discovery</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-base leading-relaxed">
            Analyze real eBay sold prices instantly. Find the true market value and set your perfect buy target.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            className="w-full bg-card border border-border rounded-2xl py-4 pl-14 pr-[220px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 shadow-xl shadow-black/30 transition-all text-lg"
            placeholder="RTX 4080, MacBook Pro M3..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-2 right-2 flex items-center gap-2">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors h-full"
            >
              <option value="working">Used (Working)</option>
              <option value="parts">For Parts</option>
              <option value="new">Brand New</option>
            </select>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 h-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[110px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Analyze
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-danger/5 border border-danger/20 max-w-2xl mx-auto w-full">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      {/* Preview Results */}
      {preview && <PreviewPanel preview={preview} />}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Suggestions */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Recommended</h3>
              <p className="text-xs text-muted-foreground">Popular items to track</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {suggestionsData?.suggestions?.map((s, i) => (
              <button 
                key={i}
                onClick={() => handleSearch(s.clean_query)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 hover:bg-secondary text-left transition-all group"
              >
                <div>
                  <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {s.resolved_name || s.clean_query}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.category || "General"}</div>
                </div>
                {s.avg_price_at_search && (
                  <div className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">
                    ${Math.round(s.avg_price_at_search)}
                  </div>
                )}
              </button>
            ))}
            {!suggestionsData?.suggestions?.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Start searching to generate personalized suggestions.
              </p>
            )}
          </div>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
              <History className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Recent Searches</h3>
              <p className="text-xs text-muted-foreground">Your search history</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {historyData?.map((h) => (
               <button 
                 key={h.id}
                 onClick={() => handleSearch(h.raw_query)}
                 className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/50 border border-border hover:border-blue-500/30 hover:bg-secondary text-left transition-all group"
               >
                 <div>
                   <div className="text-sm font-medium text-foreground group-hover:text-blue-400 transition-colors">
                     {h.raw_query}
                   </div>
                   <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(h.last_searched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                   </div>
                 </div>
                 {h.avg_price_at_search && (
                   <div className="text-sm font-bold text-muted-foreground group-hover:text-blue-400 transition-colors">
                     ${Math.round(h.avg_price_at_search)}
                   </div>
                 )}
               </button>
            ))}
            {!historyData?.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Your search history will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function PreviewPanel({ preview }: { preview: SearchPreviewResult }) {
  const [name, setName] = useState(preview.query);
  const [category, setCategory] = useState("General");
  const [adding, setAdding] = useState(false);
  const [addedResult, setAddedResult] = useState<{ok: boolean, msg?: string, id?: string} | null>(null);

  useEffect(() => {
    setName(preview.query);
    setAddedResult(null);
  }, [preview]);

  if (preview.status === "no_data") {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border bg-card p-10 text-center flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary border border-border">
          <Info className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">No pricing data found</h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md">{preview.message}</p>
        </div>
        
        {preview.suggestions && preview.suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {preview.suggestions.map(s => (
              <div key={s} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-muted-foreground">
                Try: {s}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name || !category) return;
    setAdding(true);
    setAddedResult(null);
    try {
      const res = await addToTracker(preview.clean_query, name, category);
      setAddedResult({ ok: true, id: res.part_id });
    } catch (err: any) {
      setAddedResult({ ok: false, msg: err.message || String(err) });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="w-full border border-border bg-card shadow-2xl shadow-black/20 rounded-3xl overflow-hidden">
      
      {/* Header */}
      <div className="p-8 pb-6 border-b border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Live eBay Data
            </span>
            <span className="text-xs text-muted-foreground">{preview.sample_size} recent sales</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">{preview.query}</h2>
          
          <div className="flex items-center gap-3 mt-5">
            <div className="rounded-xl px-5 py-3 border border-border bg-secondary/50">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Market Average</div>
              <div className="text-2xl font-bold text-foreground">${preview.avg_sold_price?.toFixed(2)}</div>
            </div>
            <div className="rounded-xl px-5 py-3 border border-primary/20 bg-primary/5">
              <div className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Max Buy Target</div>
              <div className="text-2xl font-bold text-primary">${preview.max_buy_price?.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Add Form */}
        {addedResult?.ok ? (
           <div className="flex items-center justify-center p-8 bg-primary/5 border border-primary/20 rounded-2xl w-full lg:w-auto">
             <div className="flex flex-col items-center text-center gap-3">
               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                 <CheckCircle2 className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <div className="font-bold text-primary">Added to Tracker</div>
                 <div className="text-xs text-muted-foreground mt-1">Background sync started</div>
               </div>
             </div>
           </div>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 w-full lg:w-72 bg-secondary/30 p-5 rounded-2xl border border-border">
            <div className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              Start Tracking
            </div>
            <input 
              type="text" 
              placeholder="Display Name" 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 outline-none transition-all"
              required
            />
            <input 
              type="text" 
              placeholder="Category (e.g. GPUs)" 
              value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/30 outline-none transition-all"
              required
            />
            
            <button 
              type="submit" 
              disabled={adding}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {adding ? "Adding..." : "Add to Sniper Watch"}
            </button>
            {addedResult?.msg && <div className="text-xs text-danger mt-1 break-words">{addedResult.msg}</div>}
          </form>
        )}
      </div>

      {/* Recent Sales */}
      {preview.recent_sold_titles && preview.recent_sold_titles.length > 0 && (
        <div className="p-6 bg-secondary/20">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Sold Listings</h3>
            <span className="text-xs font-medium text-muted-foreground">{preview.recent_sold_titles.length} verified</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {preview.recent_sold_titles.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-4 bg-card hover:bg-secondary/50 transition-colors rounded-xl border border-border group">
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <div className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3">
                    <span>Sold {item.date}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="font-bold text-primary text-lg flex-shrink-0">
                  ${item.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
