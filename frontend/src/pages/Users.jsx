import React, { useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
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
  Users,
  Search,
  Shield,
  User,
  Trash2
} from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersAPI.updateRole(userId, newRole);
      await loadUsers();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      alert('Erreur lors de la mise à jour du rôle');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    
    try {
      await usersAPI.delete(selectedUser.id);
      await loadUsers();
      setShowDeleteDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.prenom.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            {users.length} utilisateur(s) enregistré(s)
          </p>
        </div>
      </div>

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

      {/* Table */}
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
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucun utilisateur trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#005F73]/10 flex items-center justify-center text-[#005F73] font-medium">
                            {user.prenom?.[0]}{user.nom?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{user.prenom} {user.nom}</p>
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-slate-500">(Vous)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.id === currentUser?.id ? (
                          <Badge className={
                            user.role === 'admin' 
                              ? 'bg-[#005F73] text-white'
                              : 'bg-slate-100 text-slate-700'
                          }>
                            {user.role === 'admin' ? (
                              <>
                                <Shield className="w-3 h-3 mr-1" />
                                Administrateur
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 mr-1" />
                                Technicien
                              </>
                            )}
                          </Badge>
                        ) : (
                          <Select 
                            value={user.role} 
                            onValueChange={(v) => handleRoleChange(user.id, v)}
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
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.id !== currentUser?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

export default UsersPage;
