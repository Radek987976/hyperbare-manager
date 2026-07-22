import React from 'react';
import { X } from 'lucide-react';

const ROUTE_LABELS = {
  '/': 'Tableau de bord',
  '/caisson': 'Caisson',
  '/equipements': 'Équipements',
  '/sous-equipements': 'Sous-équipements',
  '/ordres-travail': 'Maintenance préventive',
  '/controles': 'Contrôles réglementaires',
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

export const NavTabs = ({ tabs = [], active, onSelect, onClose }) => {
  if (!tabs || tabs.length === 0) return null;

  return (
    <div
      className="flex items-stretch gap-0 overflow-x-auto bg-slate-100 border-b border-slate-200 px-2 pt-1"
      data-testid="nav-tabs"
    >
      {tabs.map((path) => {
        const isActive = path === active;
        return (
          <div
            key={path}
            onClick={() => onSelect(path)}
            role="button"
            className={`group flex items-center gap-2 pl-4 pr-2 py-2 text-sm cursor-pointer whitespace-nowrap rounded-t-md border border-b-0 mr-1 transition-colors ${
              isActive
                ? 'bg-white text-[#005F73] font-medium border-slate-200'
                : 'bg-slate-200/60 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-800'
            }`}
            data-testid={`nav-tab-${testIdFor(path)}`}
          >
            <span>{labelFor(path)}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(path);
              }}
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
