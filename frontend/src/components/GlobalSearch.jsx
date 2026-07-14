import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../lib/api';
import { Input } from './ui/input';
import { Search, Settings2, Layers, ClipboardList, Wrench, ShieldCheck, Loader2, X } from 'lucide-react';

const CATEGORY_META = {
  equipment: { icon: Settings2, color: 'text-[#005F73]', route: '/equipements' },
  subequipment: { icon: Layers, color: 'text-[#0A9396]', route: '/sous-equipements' },
  work_order: { icon: ClipboardList, color: 'text-[#EE9B00]', route: '/ordres-travail' },
  intervention: { icon: Wrench, color: 'text-slate-600', route: '/interventions' },
  inspection: { icon: ShieldCheck, color: 'text-indigo-600', route: '/controles' },
};

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const runSearch = useCallback((q) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchAPI.search(q)
      .then(res => { setResults(res.data?.results || []); setOpen(true); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, runSearch]);

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const goTo = (r) => {
    const meta = CATEGORY_META[r.category];
    if (!meta) return;
    const state = { q: r.label };
    if (r.category === 'equipment' || r.category === 'subequipment') state.openId = r.id;
    navigate(meta.route, { state });
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); goTo(results[activeIndex]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative w-full" data-testid="global-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <Input
          data-testid="global-search-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un équipement, sous-équipement, maintenance, intervention, type, référence…"
          className="pl-10 pr-10 h-11 bg-white border-slate-200 focus-visible:ring-[#005F73]"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
        {!loading && query && (
          <button
            data-testid="global-search-clear"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          data-testid="global-search-results"
          className="absolute z-50 mt-2 w-full bg-white rounded-lg border border-slate-200 shadow-lg max-h-[420px] overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 text-center" data-testid="global-search-empty">
              {query.trim().length < 2 ? 'Tapez au moins 2 caractères' : 'Aucun résultat'}
            </div>
          ) : (
            results.map((r, i) => {
              const meta = CATEGORY_META[r.category] || {};
              const Icon = meta.icon || Search;
              return (
                <button
                  key={`${r.category}-${r.id}-${i}`}
                  data-testid={`search-result-${r.category}`}
                  onClick={() => goTo(r)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-slate-50 last:border-0 ${
                    activeIndex === i ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${meta.color || 'text-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                    {r.sublabel && <p className="text-xs text-slate-400 truncate">{r.sublabel}</p>}
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">{r.label_category}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
