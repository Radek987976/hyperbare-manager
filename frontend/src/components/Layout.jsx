import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
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
  Gauge,
  User,
  Eye,
  Layers,
  Wrench,
  FileText,
  Key,
  Loader2
} from 'lucide-react';
import { usersAPI } from '../lib/api';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin, canExport, getRoleLabel } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    setError('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setSaving(true);
    try {
      await usersAPI.changePassword(user.id, passwordData.currentPassword, passwordData.newPassword);
      alert('Mot de passe modifié avec succès !');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const message = err.response?.data?.detail || 'Erreur lors du changement de mot de passe';
      setError(typeof message === 'string' ? message : 'Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin':
        return <Shield className="w-3 h-3" />;
      case 'technicien':
        return <User className="w-3 h-3" />;
      case 'invite':
        return <Eye className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const getRoleBadgeClass = () => {
    switch (user?.role) {
      case 'admin':
        return 'bg-[#005F73] text-white border-0';
      case 'technicien':
        return 'bg-blue-500/20 text-blue-300 border-0';
      case 'invite':
        return 'bg-slate-500/20 text-slate-300 border-0';
      default:
        return 'bg-slate-500/20 text-slate-300 border-0';
    }
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/caisson', icon: Box, label: 'Caisson' },
    { to: '/equipements', icon: Settings2, label: 'Équipements' },
    { to: '/sous-equipements', icon: Layers, label: 'Sous-équipements' },
    { to: '/ordres-travail', icon: ClipboardList, label: 'Maintenance préventive' },
    { to: '/interventions', icon: History, label: 'Interventions' },
    { to: '/stock', icon: Package, label: 'Stock pièces' },
    { to: '/rapports', icon: FileText, label: 'Rapports PDF' },
  ];

  const adminItems = [
    { to: '/types-equipement', icon: Settings2, label: 'Types équipement', adminOnly: true },
    { to: '/utilisateurs', icon: Users, label: 'Utilisateurs', adminOnly: true },
    { to: '/export', icon: Download, label: 'Export données', requireExport: true },
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
                  HyperbareManager
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

          {/* Admin section - show to admin, and export to technicien */}
          {(isAdmin() || canExport()) && (
            <>
              <div className="px-3 mt-6 mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-500 px-4">
                  Administration
                </span>
              </div>
              {adminItems.map((item) => {
                // Check permissions
                if (item.adminOnly && !isAdmin()) return null;
                if (item.requireExport && !canExport()) return null;
                
                return (
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
                );
              })}
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
              <Badge className={`text-[10px] px-1.5 py-0 ${getRoleBadgeClass()}`}>
                {getRoleIcon()}
                <span className="ml-1">{getRoleLabel(user?.role)}</span>
              </Badge>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
            data-testid="change-password-btn"
          >
            <Key className="w-4 h-4" />
            <span className="text-sm">Modifier mon mot de passe</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>

        {/* Password Change Modal */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-[#005F73]" />
                Modifier mon mot de passe
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Entrez votre mot de passe actuel"
                  data-testid="current-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Minimum 6 caractères"
                  data-testid="new-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirmez le nouveau mot de passe"
                  data-testid="confirm-password-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setError('');
                }}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="bg-[#005F73] hover:bg-[#004855]"
                data-testid="save-password-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                HyperbareManager
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
