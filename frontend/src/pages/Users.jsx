import React, { useState, useEffect } from 'react';
import { usersAPI, reportsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Users,
  Search,
  Shield,
  User,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  UserCheck,
  UserX,
  Download,
  FileText,
  BarChart3,
  Loader2,
  Plus,
  UserPlus
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const UsersPage = () => {
  const { user: currentUser, getRoleLabel } = useAuth();
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [exportLoading, setExportLoading] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    password: '',
    role: 'technicien'
  });

  const resetForm = () => {
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      password: '',
      role: 'technicien'
    });
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.nom || !formData.prenom || !formData.password) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      await usersAPI.create(formData);
      await loadData();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      alert(getErrorMessage(error, 'Erreur lors de la création de l\'utilisateur'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, pendingRes] = await Promise.all([
        usersAPI.getAll(),
        usersAPI.getPending()
      ]);
      setUsers(usersRes.data || []);
      setPendingUsers(pendingRes.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await usersAPI.updateRole(userId, newRole);
      await loadData();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour du rôle');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (userId) => {
    setActionLoading(userId);
    try {
      await usersAPI.approve(userId);
      await loadData();
    } catch (error) {
      console.error('Erreur approbation:', error);
      alert('Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId) => {
    setActionLoading(userId);
    try {
      await usersAPI.reject(userId);
      await loadData();
    } catch (error) {
      console.error('Erreur refus:', error);
      alert('Erreur lors du refus');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (userId) => {
    setActionLoading(userId);
    try {
      await usersAPI.suspend(userId);
      await loadData();
    } catch (error) {
      console.error('Erreur suspension:', error);
      alert('Erreur lors de la suspension');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (userId) => {
    setActionLoading(userId);
    try {
      await usersAPI.activate(userId);
      await loadData();
    } catch (error) {
      console.error('Erreur activation:', error);
      alert('Erreur lors de l\'activation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser.id);
    try {
      await usersAPI.delete(selectedUser.id);
      await loadData();
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert(getErrorMessage(error, 'Erreur lors de la suppression'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportStatistics = async () => {
    setExportLoading('statistics');
    try {
      const response = await reportsAPI.exportStatisticsCSV();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistiques_hyperbaremanager_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export des statistiques');
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportMaintenance = async () => {
    setExportLoading('maintenance');
    try {
      const response = await reportsAPI.exportMaintenanceCSV();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_maintenance_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export du rapport');
    } finally {
      setExportLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.prenom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUsers = filteredUsers.filter(u => u.is_active && u.is_approved);
  const suspendedUsers = filteredUsers.filter(u => !u.is_active && u.is_approved);

  const getRoleIcon = (role) => {
    switch (role) {
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

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-[#005F73] text-white';
      case 'technicien':
        return 'bg-blue-100 text-blue-700';
      case 'invite':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="users-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Gestion des utilisateurs
          </h1>
          <p className="text-slate-500 mt-1">
            {users.length} utilisateur(s) • {pendingUsers.length} en attente
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          {currentUser?.role === 'admin' && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#005F73] hover:bg-[#004a5c]"
              data-testid="add-user-btn"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter un utilisateur
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportStatistics}
            disabled={exportLoading === 'statistics'}
            data-testid="export-statistics-btn"
          >
            {exportLoading === 'statistics' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            Exporter statistiques
          </Button>
          <Button
            variant="outline"
            onClick={handleExportMaintenance}
            disabled={exportLoading === 'maintenance'}
            data-testid="export-maintenance-btn"
          >
            {exportLoading === 'maintenance' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Rapport maintenance
          </Button>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <Clock className="w-5 h-5" />
              {pendingUsers.length} demande(s) d'accès en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200"
                  data-testid={`pending-user-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-medium">
                      {user.prenom?.[0]}{user.nom?.[0]}
                    </div>
                    <div>
                      <p className="font-medium">{user.prenom} {user.nom}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 border-red-200"
                      onClick={() => handleReject(user.id)}
                      disabled={actionLoading === user.id}
                      data-testid={`reject-btn-${user.id}`}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Refuser
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(user.id)}
                      disabled={actionLoading === user.id}
                      data-testid={`approve-btn-${user.id}`}
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approuver
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, prénom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for users */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tous ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Actifs ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="suspended" className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Suspendus ({suspendedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <UserTable
            users={filteredUsers}
            currentUser={currentUser}
            getRoleLabel={getRoleLabel}
            getRoleIcon={getRoleIcon}
            getRoleBadgeClass={getRoleBadgeClass}
            handleRoleChange={handleRoleChange}
            handleSuspend={handleSuspend}
            handleActivate={handleActivate}
            setSelectedUser={setSelectedUser}
            setShowDeleteDialog={setShowDeleteDialog}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <UserTable
            users={activeUsers}
            currentUser={currentUser}
            getRoleLabel={getRoleLabel}
            getRoleIcon={getRoleIcon}
            getRoleBadgeClass={getRoleBadgeClass}
            handleRoleChange={handleRoleChange}
            handleSuspend={handleSuspend}
            handleActivate={handleActivate}
            setSelectedUser={setSelectedUser}
            setShowDeleteDialog={setShowDeleteDialog}
            actionLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="suspended" className="mt-4">
          <UserTable
            users={suspendedUsers}
            currentUser={currentUser}
            getRoleLabel={getRoleLabel}
            getRoleIcon={getRoleIcon}
            getRoleBadgeClass={getRoleBadgeClass}
            handleRoleChange={handleRoleChange}
            handleSuspend={handleSuspend}
            handleActivate={handleActivate}
            setSelectedUser={setSelectedUser}
            setShowDeleteDialog={setShowDeleteDialog}
            actionLoading={actionLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Permissions Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Légende des permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3 p-3 bg-[#005F73]/5 rounded-lg">
              <Badge className="bg-[#005F73] text-white">
                <Shield className="w-3 h-3 mr-1" />
                Administrateur
              </Badge>
              <span className="text-slate-600">Tous les droits : créer, modifier, supprimer, exporter, gérer les utilisateurs</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Badge className="bg-blue-100 text-blue-700">
                <User className="w-3 h-3 mr-1" />
                Technicien
              </Badge>
              <span className="text-slate-600">Peut créer et modifier des équipements, interventions, procédures. Ne peut pas supprimer.</span>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <Badge className="bg-slate-100 text-slate-600">
                <Eye className="w-3 h-3 mr-1" />
                Invité
              </Badge>
              <span className="text-slate-600">Lecture seule. Ne peut ni créer, ni modifier, ni supprimer, ni exporter.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md" data-testid="create-user-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#005F73]" />
              Ajouter un utilisateur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  placeholder="Jean"
                  data-testid="input-prenom"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Dupont"
                  data-testid="input-nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jean.dupont@example.com"
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center">
                      <Shield className="w-3 h-3 mr-2" />
                      Administrateur
                    </div>
                  </SelectItem>
                  <SelectItem value="technicien">
                    <div className="flex items-center">
                      <User className="w-3 h-3 mr-2" />
                      Technicien
                    </div>
                  </SelectItem>
                  <SelectItem value="invite">
                    <div className="flex items-center">
                      <Eye className="w-3 h-3 mr-2" />
                      Invité
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={saving || !formData.email || !formData.nom || !formData.prenom || !formData.password}
              className="bg-[#005F73] hover:bg-[#004a5c]"
              data-testid="save-user-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer l\'utilisateur'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur "{selectedUser?.prenom} {selectedUser?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-[#AE2012] hover:bg-[#8a1a0f]"
              data-testid="confirm-delete-btn"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Extracted UserTable component
const UserTable = ({
  users,
  currentUser,
  getRoleLabel,
  getRoleIcon,
  getRoleBadgeClass,
  handleRoleChange,
  handleSuspend,
  handleActivate,
  setSelectedUser,
  setShowDeleteDialog,
  actionLoading
}) => (
  <Card>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table data-testid="users-table">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Utilisateur</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Rôle</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Aucun utilisateur trouvé</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                        !user.is_active ? 'bg-slate-200 text-slate-500' : 'bg-[#005F73]/10 text-[#005F73]'
                      }`}>
                        {user.prenom?.[0]}{user.nom?.[0]}
                      </div>
                      <div>
                        <p className={`font-medium ${!user.is_active ? 'text-slate-400' : ''}`}>
                          {user.prenom} {user.nom}
                        </p>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-slate-500">(Vous)</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={!user.is_active ? 'text-slate-400' : ''}>
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {user.id === currentUser?.id ? (
                      <Badge className={getRoleBadgeClass(user.role)}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{getRoleLabel(user.role)}</span>
                      </Badge>
                    ) : (
                      <Select 
                        value={user.role} 
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                        disabled={actionLoading === user.id}
                      >
                        <SelectTrigger className="w-40" data-testid={`role-select-${user.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <Shield className="w-3 h-3 mr-2" />
                              Administrateur
                            </div>
                          </SelectItem>
                          <SelectItem value="technicien">
                            <div className="flex items-center">
                              <User className="w-3 h-3 mr-2" />
                              Technicien
                            </div>
                          </SelectItem>
                          <SelectItem value="invite">
                            <div className="flex items-center">
                              <Eye className="w-3 h-3 mr-2" />
                              Invité
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={user.is_active 
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {user.is_active ? 'Actif' : 'Suspendu'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.id !== currentUser?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`user-menu-${user.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {user.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleSuspend(user.id)}
                              className="text-amber-600"
                              data-testid={`suspend-btn-${user.id}`}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Suspendre
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivate(user.id)}
                              className="text-green-600"
                              data-testid={`activate-btn-${user.id}`}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Réactiver
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default UsersPage;
