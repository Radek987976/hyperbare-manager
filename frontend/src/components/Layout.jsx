import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Box,
  Settings2,
  ClipboardList,
  History,
  Shield,
  Package,
  Users,
  Download,
  LogOut,
  Menu,
  X,
  Gauge
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/caisson', icon: Box, label: 'Caisson' },
    { to: '/equipements', icon: Settings2, label: 'Équipements' },
    { to: '/ordres-travail', icon: ClipboardList, label: 'Ordres de travail' },
    { to: '/interventions', icon: History, label: 'Interventions' },
    { to: '/controles', icon: Shield, label: 'Contrôles' },
    { to: '/stock', icon: Package, label: 'Stock pièces' },
  ];

  const adminItems = [
    { to: '/utilisateurs', icon: Users, label: 'Utilisateurs' },
    { to: '/export', icon: Download, label: 'Export données' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${isOpen ? 'open' : ''} flex flex-col`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#005F73] rounded-sm flex items-center justify-center">
                <Gauge className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight font-['Barlow_Condensed'] uppercase">
                  HyperMaint
                </h1>
                <p className="text-xs text-slate-400">GMAO Caisson</p>
              </div>
            </div>
            <button
              className="md:hidden text-white p-2"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 px-4">
              Navigation
            </span>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link mx-3 ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
              data-testid={`nav-${item.to.replace('/', '') || 'dashboard'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isAdmin() && (
            <>
              <div className="px-3 mt-6 mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500 px-4">
                  Administration
                </span>
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar-link mx-3 ${isActive ? 'active' : ''}`
                  }
                  onClick={onClose}
                  data-testid={`nav-${item.to.replace('/', '')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info & logout */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#005F73] flex items-center justify-center text-white font-medium">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="main-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Gauge className="w-6 h-6 text-[#005F73]" />
              <span className="font-bold font-['Barlow_Condensed'] uppercase text-[#005F73]">
                HyperMaint
              </span>
            </div>
            <div className="w-10" />
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
