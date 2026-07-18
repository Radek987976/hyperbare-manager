import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const ROUTE_LABELS = {
  '/': 'Tableau de bord',
  '/caisson': 'Caisson',
  '/equipements': 'Équipements',
  '/sous-equipements': 'Sous-équipements',
  '/ordres-travail': 'Maintenance préventive',
  '/planning': 'Planning',
  '/interventions': 'Interventions',
  '/bouteilles-gaz': 'Bouteilles de gaz',
  '/stock': 'Stock pièces',
  '/prestataires': 'Prestataires',
  '/contrats': 'Contrats',
  '/documents': 'Documents',
  '/pv-controle': 'PV de contrôle',
  '/budget': 'Budget prévisionnel',
  '/rapports': 'Rapports PDF',
  '/types-equipement': 'Types équipement',
  '/utilisateurs': 'Utilisateurs',
  '/import': 'Import données',
  '/export': 'Export données',
};

const labelFor = (path) => {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path];
  const base = '/' + (path.split('/')[1] || '');
  return ROUTE_LABELS[base] || path;
};

const testIdFor = (path) => (path === '/' ? 'home' : path.replace(/\//g, '-').replace(/^-/, ''));

export const NavTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    const path = location.pathname;
    setTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, [location.pathname]);

  const closeTab = (e, path) => {
    e.stopPropagation();
    setTabs((prev) => {
      const idx = prev.indexOf(path);
      const next = prev.filter((p) => p !== path);
      if (path === location.pathname) {
        const target = next[idx] || next[idx - 1] || null;
        navigate(target || '/');
      }
      return next;
    });
  };

  if (tabs.length === 0) return null;

  return (
    <div
      className="hidden md:flex items-stretch gap-0 overflow-x-auto bg-slate-100 border-b border-slate-200 px-2 pt-1"
      data-testid="nav-tabs"
    >
      {tabs.map((path) => {
        const active = path === location.pathname;
        return (
          <div
            key={path}
            onClick={() => navigate(path)}
            role="button"
            className={`group flex items-center gap-2 pl-4 pr-2 py-2 text-sm cursor-pointer whitespace-nowrap rounded-t-md border border-b-0 mr-1 transition-colors ${
              active
                ? 'bg-white text-[#005F73] font-medium border-slate-200'
                : 'bg-slate-200/60 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-800'
            }`}
            data-testid={`nav-tab-${testIdFor(path)}`}
          >
            <span>{labelFor(path)}</span>
            <button
              onClick={(e) => closeTab(e, path)}
              className="flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
              aria-label="Fermer l'onglet"
              data-testid={`nav-tab-close-${testIdFor(path)}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default NavTabs;
