"use client";

import { useState, FormEvent, useEffect } from "react";
import useSWR from "swr";
import { Link } from "lucide-react";
import {
  previewSearch,
  addToTracker,
  getSearchSuggestions,
  getSearchHistory,
  recordSearchEvent,
  SearchPreviewResult,
  SuggestionItem,
  SearchHistoryItem
} from "@/lib/api";
import { 
  Loader2, Search, CheckCircle2, AlertCircle, 
  History, Sparkles, TrendingUp, Tags, ShoppingCart, Info 
} from "lucide-react";
import { classNames } from "@/lib/utils";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState("working");
  const [preview, setPreview] = useState<SearchPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestions and History
  const { data: suggestionsData, mutate: mutateSuggestions } = useSWR("/search/suggestions", () => getSearchSuggestions(8));
  const { data: historyData, mutate: mutateHistory } = useSWR("/search/history", () => getSearchHistory(10));

  async function handleSearch(e: FormEvent | string | React.MouseEvent) {
    // Called 3 ways: form submit (FormEvent), suggestion click (string), button click (MouseEvent)
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
      // Fire and forget recording event
      recordSearchEvent(q).catch((console.error));
      mutateHistory(); // update history
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto w-full pb-20">
      
      {/* Header & Search */}
      <div className="flex flex-col items-center text-center gap-6 pt-10">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-sky-400 tracking-tight">
            Live Market Discovery
          </h1>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
            Search for any item to instantly analyze true sold prices on eBay.
            Discover the realistic market average and identify your perfect target margin.
          </p>
        </div>

        <form 
          onSubmit={handleSearch} 
          className="w-full max-w-2xl relative group"
        >
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-violet-400 transition-colors" />
          </div>
          <input
            type="text"
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-[200px] text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 shadow-xl shadow-black/20 transition-all backdrop-blur-sm text-lg"
            placeholder="e.g. RTX 3080, MacBook Pro..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-2 right-2 flex items-center gap-2">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500 transition-colors h-full max-h-[44px]"
            >
              <option value="working">Used (Working)</option>
              <option value="parts">For Parts / Broken</option>
              <option value="new">Brand New</option>
            </select>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 h-full max-h-[44px] bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Analyze"}
            </button>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 max-w-2xl mx-auto w-full">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Preview Results Panel */}
      {preview && <PreviewPanel preview={preview} />}

      {/* Dashboard Grid (Suggestions & History) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Suggestions */}
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200">Recommended to Track</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {suggestionsData?.suggestions?.map((s, i) => (
              <button 
                key={i}
                onClick={() => handleSearch(s.clean_query)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/50 hover:border-emerald-500/30 text-left transition-all group"
              >
                <div>
                  <div className="text-sm font-medium text-slate-200 group-hover:text-emerald-300 transition-colors">{s.resolved_name || s.clean_query}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.category || "General"}</div>
                </div>
                {s.avg_price_at_search && (
                  <div className="text-sm font-bold text-slate-400 group-hover:text-emerald-400">${Math.round(s.avg_price_at_search)}</div>
                )}
              </button>
            ))}
            {!suggestionsData?.suggestions?.length && (
              <p className="text-sm text-slate-500 italic px-2">Start searching to generate personalized suggestions.</p>
            )}
          </div>
        </div>

        {/* History */}
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-sky-400" />
            <h3 className="font-semibold text-slate-200">Recent Searches</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {historyData?.map((h, i) => (
               <button 
                 key={h.id}
                 onClick={() => handleSearch(h.raw_query)}
                 className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/50 hover:border-sky-500/30 text-left transition-all group"
               >
                 <div>
                   <div className="text-sm font-medium text-slate-300 group-hover:text-sky-300 transition-colors">{h.raw_query}</div>
                   <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(h.last_searched_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                   </div>
                 </div>
                 {h.avg_price_at_search && (
                   <div className="text-sm font-semibold text-slate-500 group-hover:text-sky-400">${Math.round(h.avg_price_at_search)}</div>
                 )}
               </button>
            ))}
            {!historyData?.length && (
              <p className="text-sm text-slate-500 italic px-2">Your search history will appear here.</p>
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

  // Sync up default name when preview changes
  useEffect(() => {
    setName(preview.query);
    setAddedResult(null);
  }, [preview]);

  if (preview.status === "no_data") {
    return (
      <div className="w-full max-w-2xl mx-auto rounded-2xl bg-slate-800/60 border border-slate-700 p-8 text-center flex flex-col items-center gap-3">
        <Info className="h-10 w-10 text-slate-500" />
        <h2 className="text-xl font-bold text-white">No solid pricing data found</h2>
        <p className="text-slate-400 text-sm max-w-md">{preview.message}</p>
        
        {preview.suggestions && preview.suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {preview.suggestions.map(s => (
              <div key={s} className="px-3 py-1.5 rounded-lg bg-slate-700/50 text-xs font-medium text-slate-300">
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
    <div className="w-full bg-slate-800/80 border border-violet-500/20 shadow-2xl shadow-violet-900/10 rounded-3xl overflow-hidden flex flex-col">
      
      {/* Top Banner / Metrics */}
      <div className="p-8 pb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300">Live eBay Data</span>
            <span className="text-xs text-slate-400">{preview.sample_size} recent sales analyzed</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{preview.query}</h2>
          
          <div className="flex items-center gap-3 mt-3">
            <div className="bg-slate-900/60 rounded-xl px-4 py-2 border border-slate-700/50">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">True Market Average</div>
              <div className="text-xl font-bold text-white">${preview.avg_sold_price?.toFixed(2)}</div>
            </div>
            <div className="bg-emerald-900/40 rounded-xl px-4 py-2 border border-emerald-500/20">
              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">Safe Buy Target (Max)</div>
              <div className="text-xl font-bold text-emerald-400">${preview.max_buy_price?.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Add to Tracker Form inline */}
        {addedResult?.ok ? (
           <div className="h-full flex items-center justify-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-full md:w-auto">
             <div className="flex flex-col items-center text-center gap-2">
               <CheckCircle2 className="h-8 w-8 text-emerald-400" />
               <div className="font-bold text-emerald-300">Added to Tracker!</div>
               <div className="text-xs text-emerald-400/80">Background sync started.</div>
             </div>
           </div>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-col gap-3 w-full md:w-72 bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50">
            <div className="text-sm font-semibold text-white flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-4 w-4 text-violet-400" /> Start Tracking
            </div>
            <input 
              type="text" 
              placeholder="Display Name" 
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 outline-none transition-colors"
              required
            />
            <input 
              type="text" 
              placeholder="Category (e.g. GPUs)" 
              value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 outline-none transition-colors"
              required
            />
            
            <button 
              type="submit" 
              disabled={adding}
              className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {adding ? "Adding..." : "Add to Sniper Watch"}
            </button>
            {addedResult?.msg && <div className="text-xs text-rose-400 mt-1 break-words">{addedResult.msg}</div>}
          </form>
        )}
      </div>

      {/* Recent Comps Sample */}
      {preview.recent_sold_titles && preview.recent_sold_titles.length > 0 && (
        <div className="p-6 bg-slate-900/30 border-t border-white/5">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sample of Recent Sold Listings</h3>
            <span className="text-xs font-medium text-slate-500">{preview.recent_sold_titles.length} items verified</span>
          </div>
          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {preview.recent_sold_titles.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-5 py-3.5 bg-slate-800/40 hover:bg-slate-800/60 transition-colors rounded-xl border border-slate-700/30 group">
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <div className="text-sm font-medium text-slate-200 line-clamp-1 group-hover:text-violet-300 transition-colors" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Sold {item.date}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sky-400/80 hover:text-sky-300 hover:underline inline-flex items-center gap-1">
                        View on eBay ↗
                      </a>
                    )}
                  </div>
                </div>
                <div className="font-bold text-emerald-400 text-lg flex-shrink-0">
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
