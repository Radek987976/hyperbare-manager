import React, { useState, useEffect } from 'react';
import { equipmentTypesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Settings2,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';

const EquipmentTypes = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nom: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await equipmentTypesAPI.getAll();
      setTypes(res.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const openCreateModal = () => {
    setSelectedType(null);
    setFormData({ nom: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (type) => {
    setSelectedType(type);
    setFormData({
      nom: type.nom,
      description: type.description || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nom) {
      setError('Le nom est obligatoire');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      if (selectedType) {
        await equipmentTypesAPI.update(selectedType.id, formData);
      } else {
        await equipmentTypesAPI.create(formData);
      }
      await loadData();
      setShowModal(false);
    } catch (error) {
      setError(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;
    
    try {
      await equipmentTypesAPI.delete(selectedType.id);
      await loadData();
      setShowDeleteDialog(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="equipment-types-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Types d'équipement
          </h1>
          <p className="text-slate-500 mt-1">
            Gérez les types d'équipement disponibles
          </p>
        </div>
        
        {canCreate && (
          <Button onClick={openCreateModal} className="bg-[#005F73] hover:bg-[#004C5C]">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau type
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#005F73]" />
            Liste des types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.nom}</TableCell>
                  <TableCell className="text-slate-500">{type.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canModify && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(type)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedType(type);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                    Aucun type d'équipement défini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal création/édition */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase">
              {selectedType ? 'Modifier le type' : 'Nouveau type d\'équipement'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Ex: Valve de sécurité"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description du type d'équipement"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-[#005F73] hover:bg-[#004C5C]"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedType ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le type "{selectedType?.nom}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquipmentTypes;
