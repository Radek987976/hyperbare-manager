import React, { useState, useEffect } from 'react';
import { subEquipmentsAPI, equipmentsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, statusLabels, getStatusClass } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Upload,
  FileText,
  Image,
  X
} from 'lucide-react';

const STATUTS = ['en_service', 'maintenance', 'hors_service'];

const SubEquipments = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [subEquipments, setSubEquipments] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterParent, setFilterParent] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    reference: '',
    numero_serie: '',
    parent_equipment_id: '',
    description: '',
    date_installation: '',
    statut: 'en_service'
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, eqRes] = await Promise.all([
        subEquipmentsAPI.getAll(),
        equipmentsAPI.getAll()
      ]);
      setSubEquipments(subRes.data || []);
      setEquipments(eqRes.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const openCreateModal = () => {
    setSelectedItem(null);
    setFormData({
      nom: '',
      reference: '',
      numero_serie: '',
      parent_equipment_id: '',
      description: '',
      date_installation: '',
      statut: 'en_service'
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      nom: item.nom,
      reference: item.reference,
      numero_serie: item.numero_serie || '',
      parent_equipment_id: item.parent_equipment_id,
      description: item.description || '',
      date_installation: item.date_installation || '',
      statut: item.statut
    });
    setShowModal(true);
  };

  const openDetailModal = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleSave = async () => {
    if (!formData.nom || !formData.reference || !formData.parent_equipment_id) {
      alert('Le nom, la référence et l\'équipement parent sont obligatoires');
      return;
    }
    
    setSaving(true);
    try {
      if (selectedItem) {
        await subEquipmentsAPI.update(selectedItem.id, formData);
      } else {
        await subEquipmentsAPI.create(formData);
      }
      await loadData();
      setShowModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      await subEquipmentsAPI.delete(selectedItem.id);
      await loadData();
      setShowDeleteDialog(false);
      setShowDetailModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedItem) return;
    
    setUploading(true);
    try {
      await subEquipmentsAPI.uploadPhoto(selectedItem.id, file);
      const res = await subEquipmentsAPI.getById(selectedItem.id);
      setSelectedItem(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedItem) return;
    
    setUploading(true);
    try {
      await subEquipmentsAPI.uploadDocument(selectedItem.id, file);
      const res = await subEquipmentsAPI.getById(selectedItem.id);
      setSelectedItem(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!selectedItem) return;
    try {
      await subEquipmentsAPI.deletePhoto(selectedItem.id, photoUrl);
      const res = await subEquipmentsAPI.getById(selectedItem.id);
      setSelectedItem(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteDoc = async (docUrl) => {
    if (!selectedItem) return;
    try {
      await subEquipmentsAPI.deleteDocument(selectedItem.id, docUrl);
      const res = await subEquipmentsAPI.getById(selectedItem.id);
      setSelectedItem(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const getParentName = (parentId) => {
    const parent = equipments.find(e => e.id === parentId);
    return parent ? `${parent.type} - ${parent.reference}` : '-';
  };

  const filtered = subEquipments.filter(item => {
    const matchSearch = item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchParent = filterParent === 'all' || item.parent_equipment_id === filterParent;
    return matchSearch && matchParent;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="subequipments-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Sous-équipements
          </h1>
          <p className="text-slate-500 mt-1">
            Gérez les composants rattachés aux équipements
          </p>
        </div>
        
        {canCreate && (
          <Button onClick={openCreateModal} className="bg-[#005F73] hover:bg-[#004C5C]">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau sous-équipement
          </Button>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterParent} onValueChange={setFilterParent}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrer par équipement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les équipements</SelectItem>
                {equipments.map(eq => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.type} - {eq.reference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#005F73]" />
            Liste des sous-équipements ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Équipement parent</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nom}</TableCell>
                  <TableCell>{item.reference}</TableCell>
                  <TableCell>{getParentName(item.parent_equipment_id)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusClass(item.statut)}>
                      {statusLabels[item.statut] || item.statut}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDetailModal(item)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canModify && (
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            setSelectedItem(item);
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Aucun sous-équipement trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal création/édition */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase">
              {selectedItem ? 'Modifier' : 'Nouveau sous-équipement'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Équipement parent *</Label>
              <Select
                value={formData.parent_equipment_id}
                onValueChange={(v) => handleSelectChange('parent_equipment_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'équipement parent" />
                </SelectTrigger>
                <SelectContent>
                  {equipments.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.type} - {eq.reference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Nom du composant"
                />
              </div>
              <div className="space-y-2">
                <Label>Référence *</Label>
                <Input
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="Référence"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° Série</Label>
                <Input
                  name="numero_serie"
                  value={formData.numero_serie}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.statut}
                  onValueChange={(v) => handleSelectChange('statut', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map(s => (
                      <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Date d'installation</Label>
              <Input
                type="date"
                name="date_installation"
                value={formData.date_installation}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#005F73] hover:bg-[#004C5C]">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedItem ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal détail */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase">
              Détails du sous-équipement
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nom</p>
                  <p className="font-medium">{selectedItem.nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Référence</p>
                  <p className="font-medium">{selectedItem.reference}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Équipement parent</p>
                  <p className="font-medium">{getParentName(selectedItem.parent_equipment_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  <Badge className={getStatusClass(selectedItem.statut)}>
                    {statusLabels[selectedItem.statut]}
                  </Badge>
                </div>
              </div>
              
              {selectedItem.description && (
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p>{selectedItem.description}</p>
                </div>
              )}

              {/* Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Image className="w-4 h-4" /> Photos
                  </h4>
                  {canModify && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          Ajouter
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedItem.photos || []).map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={`${backendUrl}${url}`}
                        alt=""
                        className="w-full h-24 object-cover rounded border"
                      />
                      {canDelete && (
                        <button
                          onClick={() => handleDeletePhoto(url)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!selectedItem.photos || selectedItem.photos.length === 0) && (
                    <p className="text-sm text-slate-400 col-span-3">Aucune photo</p>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents PDF
                  </h4>
                  {canModify && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleDocUpload}
                        disabled={uploading}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                          Ajouter
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  {(selectedItem.documents || []).map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <a
                        href={`${backendUrl}${doc.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#005F73] hover:underline flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        {doc.filename}
                      </a>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteDoc(doc.url)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(!selectedItem.documents || selectedItem.documents.length === 0) && (
                    <p className="text-sm text-slate-400">Aucun document</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Fermer</Button>
            {canModify && (
              <Button onClick={() => { setShowDetailModal(false); openEditModal(selectedItem); }}>
                <Edit className="w-4 h-4 mr-2" /> Modifier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedItem?.nom}" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubEquipments;
