import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Input } from './input';
import { ArrowDownAZ, ArrowUpZA, Filter, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

const norm = (v) => (v === null || v === undefined || v === '') ? '(Vides)' : String(v);

// Hook de gestion des tris/filtres de colonnes
export function useColumnFilters(initialSort = null) {
  const [sort, setSort] = React.useState(initialSort); // { key, dir }
  const [filters, setFilters] = React.useState({}); // { key: string[] | undefined }

  const setColumnFilter = (key, valuesArrayOrNull) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (!valuesArrayOrNull) delete next[key];
      else next[key] = valuesArrayOrNull;
      return next;
    });
  };

  const clearAll = () => { setFilters({}); };
  const hasActive = Object.keys(filters).length > 0;

  return { sort, setSort, filters, setColumnFilter, clearAll, hasActive };
}

export function filterRows(rows, columnsConfig, filters) {
  const entries = Object.entries(filters);
  if (entries.length === 0) return rows;
  return rows.filter((row) =>
    entries.every(([key, allowed]) => {
      if (!allowed) return true;
      const getV = columnsConfig[key] || ((r) => r[key]);
      return allowed.includes(norm(getV(row)));
    })
  );
}

const _DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const _sortKey = (v) => {
  const s = (v === null || v === undefined) ? '' : String(v);
  const m = s.match(_DATE_RE);
  if (m) return `${m[3]}${m[2]}${m[1]}`; // AAAAMMJJ → tri chronologique
  return s;
};

export function sortRows(rows, columnsConfig, sort) {
  if (!sort || !sort.key) return rows;
  const getV = columnsConfig[sort.key] || ((r) => r[sort.key]);
  const arr = [...rows].sort((a, b) =>
    _sortKey(getV(a)).localeCompare(_sortKey(getV(b)), 'fr', { sensitivity: 'base', numeric: true })
  );
  if (sort.dir === 'desc') arr.reverse();
  return arr;
}

export function applyTableFilters(rows, columnsConfig, { filters, sort }) {
  return sortRows(filterRows(rows, columnsConfig, filters), columnsConfig, sort);
}

// Valeurs distinctes d'une colonne, calculées sur les lignes filtrées par les AUTRES colonnes (comportement Excel)
export function distinctValues(rows, columnsConfig, key, filters) {
  const others = { ...filters };
  delete others[key];
  const base = filterRows(rows, columnsConfig, others);
  const getV = columnsConfig[key] || ((r) => r[key]);
  const set = new Set(base.map((r) => norm(getV(r))));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }));
}

export function ColumnFilter({ label, columnKey, values, filters, sort, setSort, setColumnFilter, className }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const current = filters[columnKey];
  const [temp, setTemp] = React.useState(new Set());

  React.useEffect(() => {
    if (open) {
      setTemp(current ? new Set(current) : new Set(values));
      setSearch('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shown = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  const allChecked = shown.length > 0 && shown.every((v) => temp.has(v));

  const toggle = (v) => setTemp((prev) => {
    const n = new Set(prev);
    n.has(v) ? n.delete(v) : n.add(v);
    return n;
  });
  const toggleAll = () => setTemp((prev) => {
    const n = new Set(prev);
    if (shown.every((v) => n.has(v))) shown.forEach((v) => n.delete(v));
    else shown.forEach((v) => n.add(v));
    return n;
  });

  const apply = () => {
    if (temp.size === values.length || temp.size === 0) setColumnFilter(columnKey, temp.size === 0 ? [] : null);
    else setColumnFilter(columnKey, Array.from(temp));
    setOpen(false);
  };

  const isActive = Array.isArray(current) && current.length !== values.length;
  const isSorted = sort?.key === columnKey;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="font-semibold">{label}</span>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid={`colfilter-${columnKey}`}
            className={cn(
              'p-0.5 rounded hover:bg-slate-200 text-slate-400 transition-colors',
              (isActive || isSorted) && 'text-[#005F73] bg-[#005F73]/10'
            )}
          >
            <Filter className="w-3.5 h-3.5" fill={isActive ? 'currentColor' : 'none'} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <div className="p-1.5 border-b space-y-0.5">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded"
              onClick={() => { setSort({ key: columnKey, dir: 'asc' }); setOpen(false); }}
            >
              <ArrowDownAZ className="w-4 h-4 text-slate-500" /> Trier de A à Z
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-100 rounded"
              onClick={() => { setSort({ key: columnKey, dir: 'desc' }); setOpen(false); }}
            >
              <ArrowUpZA className="w-4 h-4 text-slate-500" /> Trier de Z à A
            </button>
          </div>
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher"
                className="pl-7 h-8 text-sm"
                data-testid={`colfilter-search-${columnKey}`}
              />
            </div>
            <div className="max-h-52 overflow-y-auto border rounded">
              <label className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer border-b font-medium">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-[#005F73]" />
                (Sélectionner tout)
              </label>
              {shown.map((v) => (
                <label key={v} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={temp.has(v)} onChange={() => toggle(v)} className="accent-[#005F73]" />
                  <span className="truncate">{v}</span>
                </label>
              ))}
              {shown.length === 0 && <p className="px-2 py-2 text-xs text-slate-400">Aucune valeur</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 p-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
            <Button size="sm" className="bg-[#005F73] hover:bg-[#004C5C]" onClick={apply} data-testid={`colfilter-ok-${columnKey}`}>OK</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
