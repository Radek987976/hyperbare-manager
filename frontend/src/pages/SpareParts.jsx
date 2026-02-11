import React, { useState, useEffect } from 'react';
import { sparePartsAPI, equipmentTypesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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
  Package,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Eye,
  Upload,
  FileText,
  Image,
  X
} from 'lucide-react';

const SpareParts = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [spareParts, setSpareParts] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  const [formData, setFormData] = useState({
    nom: '',
    reference_fabricant: '',
    equipment_type: '',
    quantite_stock: '',
    seuil_minimum: '',
    emplacement: '',
    fournisseur: '',
    prix_unitaire: ''
  });

  const [stockAdjustment, setStockAdjustment] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [partsRes, typesRes] = await Promise.all([
        sparePartsAPI.getAll(),
        equipmentTypesAPI.getAll()
      ]);
      setSpareParts(partsRes.data || []);
      setEquipmentTypes(typesRes.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get type label from dynamic types
  const getTypeLabel = (typeCode) => {
    const type = equipmentTypes.find(t => t.code === typeCode);
    return type ? type.nom : typeCode;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const openCreateModal = () => {
    setSelectedPart(null);
    setFormData({
      nom: '',
      reference_fabricant: '',
      equipment_type: '',
      quantite_stock: '0',
      seuil_minimum: '1',
      emplacement: '',
      fournisseur: '',
      prix_unitaire: ''
    });
    setShowModal(true);
  };

  const openEditModal = (part) => {
    setSelectedPart(part);
    setFormData({
      nom: part.nom,
      reference_fabricant: part.reference_fabricant,
      equipment_type: part.equipment_type,
      quantite_stock: part.quantite_stock.toString(),
      seuil_minimum: part.seuil_minimum.toString(),
      emplacement: part.emplacement || '',
      fournisseur: part.fournisseur || '',
      prix_unitaire: part.prix_unitaire?.toString() || ''
    });
    setShowModal(true);
  };

  const openStockModal = (part) => {
    setSelectedPart(part);
    setStockAdjustment('');
    setShowStockModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        nom: formData.nom,
        reference_fabricant: formData.reference_fabricant,
        equipment_type: formData.equipment_type,
        quantite_stock: parseInt(formData.quantite_stock) || 0,
        seuil_minimum: parseInt(formData.seuil_minimum) || 1,
        emplacement: formData.emplacement || null,
        fournisseur: formData.fournisseur || null,
        prix_unitaire: formData.prix_unitaire ? parseFloat(formData.prix_unitaire) : null
      };
      
      if (selectedPart) {
        await sparePartsAPI.update(selectedPart.id, data);
      } else {
        await sparePartsAPI.create(data);
      }
      
      await loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async (adjustment) => {
    if (!selectedPart) return;
    
    const newQuantity = selectedPart.quantite_stock + adjustment;
    if (newQuantity < 0) {
      alert('Le stock ne peut pas être négatif');
      return;
    }
    
    setSaving(true);
    try {
      await sparePartsAPI.update(selectedPart.id, { quantite_stock: newQuantity });
      await loadData();
      setShowStockModal(false);
    } catch (error) {
      console.error('Erreur mise à jour stock:', error);
      alert('Erreur lors de la mise à jour du stock');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPart) return;
    
    try {
      await sparePartsAPI.delete(selectedPart.id);
      await loadData();
      setShowDeleteDialog(false);
      setSelectedPart(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // File upload handlers
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPart) return;
    
    setUploading(true);
    try {
      await sparePartsAPI.uploadPhoto(selectedPart.id, file);
      const res = await sparePartsAPI.getById(selectedPart.id);
      setSelectedPart(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedPart) return;
    
    setUploading(true);
    try {
      await sparePartsAPI.uploadDocument(selectedPart.id, file);
      const res = await sparePartsAPI.getById(selectedPart.id);
      setSelectedPart(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!selectedPart) return;
    try {
      await sparePartsAPI.deletePhoto(selectedPart.id, photoUrl);
      const res = await sparePartsAPI.getById(selectedPart.id);
      setSelectedPart(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteDoc = async (docUrl) => {
    if (!selectedPart) return;
    try {
      await sparePartsAPI.deleteDocument(selectedPart.id, docUrl);
      const res = await sparePartsAPI.getById(selectedPart.id);
      setSelectedPart(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const isLowStock = (part) => part.quantite_stock <= part.seuil_minimum;

  const filteredParts = spareParts.filter(part => {
    const matchesSearch = 
      part.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.reference_fabricant.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || part.equipment_type === filterType;
    const matchesLowStock = !showLowStock || isLowStock(part);
    
    return matchesSearch && matchesType && matchesLowStock;
  });

  const lowStockCount = spareParts.filter(isLowStock).length;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="spare-parts-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="spare-parts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Stock de pièces
          </h1>
          <p className="text-slate-500 mt-1">
            {spareParts.length} référence(s) en stock
          </p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="bg-[#005F73] hover:bg-[#004C5C]"
          data-testid="add-spare-part-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une pièce
        </Button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <Card className="border-l-4 border-l-[#EE9B00] bg-[#EE9B00]/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-10 h-10 text-[#EE9B00]" />
              <div>
                <p className="text-lg font-semibold text-[#EE9B00]">
                  {lowStockCount} pièce(s) en stock bas
                </p>
                <p className="text-sm text-[#EE9B00]/80">
                  Quantité inférieure ou égale au seuil minimum
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowLowStock(!showLowStock)}
              className={showLowStock ? 'bg-[#EE9B00]/10' : ''}
              data-testid="toggle-low-stock"
            >
              {showLowStock ? 'Voir tout' : 'Voir stock bas'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
              <SelectTrigger className="w-full md:w-48" data-testid="filter-type">
                <SelectValue placeholder="Type d'équipement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {equipmentTypes.map(type => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-testid="spare-parts-table">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Référence</TableHead>
                  <TableHead className="font-semibold">Type équipement</TableHead>
                  <TableHead className="font-semibold">Stock</TableHead>
                  <TableHead className="font-semibold">Seuil</TableHead>
                  <TableHead className="font-semibold">Emplacement</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucune pièce en stock</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part) => (
                    <TableRow 
                      key={part.id} 
                      className={isLowStock(part) ? 'bg-amber-50/50' : ''}
                      data-testid={`spare-part-row-${part.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isLowStock(part) && (
                            <AlertTriangle className="w-4 h-4 text-[#EE9B00]" />
                          )}
                          <span className="font-medium">{part.nom}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{part.reference_fabricant}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeLabel(part.equipment_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            isLowStock(part)
                              ? 'bg-[#EE9B00] text-white'
                              : 'bg-[#0A9396] text-white'
                          }
                        >
                          {part.quantite_stock}
                        </Badge>
                      </TableCell>
                      <TableCell>{part.seuil_minimum}</TableCell>
                      <TableCell>{part.emplacement || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`spare-part-actions-${part.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPart(part);
                              setShowDetailModal(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails / Fichiers
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openStockModal(part)}>
                              <Package className="w-4 h-4 mr-2" />
                              Ajuster le stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditModal(part)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedPart(part);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              {selectedPart ? 'Modifier la pièce' : 'Ajouter une pièce'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="nom">Nom de la pièce *</Label>
              <Input
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Ex: Joint torique principal"
                data-testid="input-nom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_fabricant">Référence fabricant *</Label>
              <Input
                id="reference_fabricant"
                name="reference_fabricant"
                value={formData.reference_fabricant}
                onChange={handleChange}
                placeholder="Ex: JT-2024-001"
                data-testid="input-reference"
              />
            </div>
            <div className="space-y-2">
              <Label>Type d'équipement *</Label>
              <Select value={formData.equipment_type} onValueChange={(v) => handleSelectChange('equipment_type', v)}>
                <SelectTrigger data-testid="input-equipment-type">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantite_stock">Quantité en stock *</Label>
              <Input
                id="quantite_stock"
                name="quantite_stock"
                type="number"
                min="0"
                value={formData.quantite_stock}
                onChange={handleChange}
                data-testid="input-quantite"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seuil_minimum">Seuil minimum *</Label>
              <Input
                id="seuil_minimum"
                name="seuil_minimum"
                type="number"
                min="0"
                value={formData.seuil_minimum}
                onChange={handleChange}
                data-testid="input-seuil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emplacement">Emplacement</Label>
              <Input
                id="emplacement"
                name="emplacement"
                value={formData.emplacement}
                onChange={handleChange}
                placeholder="Ex: Étagère A-12"
                data-testid="input-emplacement"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur</Label>
              <Input
                id="fournisseur"
                name="fournisseur"
                value={formData.fournisseur}
                onChange={handleChange}
                placeholder="Nom du fournisseur"
                data-testid="input-fournisseur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prix_unitaire">Prix unitaire (€)</Label>
              <Input
                id="prix_unitaire"
                name="prix_unitaire"
                type="number"
                step="0.01"
                value={formData.prix_unitaire}
                onChange={handleChange}
                placeholder="0.00"
                data-testid="input-prix"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.nom || !formData.reference_fabricant || !formData.equipment_type}
              className="bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="save-spare-part-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedPart ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Ajuster le stock
            </DialogTitle>
          </DialogHeader>
          {selectedPart && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">{selectedPart.nom}</p>
                <p className="text-4xl font-bold font-['Barlow_Condensed'] text-[#005F73]">
                  {selectedPart.quantite_stock}
                </p>
                <p className="text-sm text-slate-500">unités en stock</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adjustment">Quantité à ajouter/retirer</Label>
                <Input
                  id="adjustment"
                  type="number"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  placeholder="Ex: 5 ou -3"
                  data-testid="input-adjustment"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleStockAdjust(-1)}
                  disabled={saving || selectedPart.quantite_stock <= 0}
                  data-testid="decrease-stock-btn"
                >
                  <MinusCircle className="w-4 h-4 mr-2" />
                  -1
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleStockAdjust(1)}
                  disabled={saving}
                  data-testid="increase-stock-btn"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  +1
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockModal(false)}>
              Fermer
            </Button>
            <Button 
              onClick={() => handleStockAdjust(parseInt(stockAdjustment) || 0)}
              disabled={saving || !stockAdjustment}
              className="bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="apply-adjustment-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Appliquer
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
              Êtes-vous sûr de vouloir supprimer la pièce "{selectedPart?.nom}" ?
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

      {/* Detail Modal with Files */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Détails de la pièce
            </DialogTitle>
          </DialogHeader>
          {selectedPart && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Informations */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Nom</p>
                  <p className="font-medium">{selectedPart.nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Référence</p>
                  <p className="font-medium">{selectedPart.reference_fabricant}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Stock actuel</p>
                  <p className="font-medium text-xl">{selectedPart.quantite_stock}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Fournisseur</p>
                  <p className="font-medium">{selectedPart.fournisseur || '-'}</p>
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Image className="w-4 h-4" /> Photos
                  </h4>
                  {canModify() && (
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
                          Ajouter photo
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedPart.photos || []).map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={`${backendUrl}${url}`}
                        alt=""
                        className="w-full h-24 object-cover rounded border"
                      />
                      {canDelete() && (
                        <button
                          onClick={() => handleDeletePhoto(url)}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!selectedPart.photos || selectedPart.photos.length === 0) && (
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
                  {canModify() && (
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
                          Ajouter PDF
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  {(selectedPart.documents || []).map((doc, i) => (
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
                      {canDelete() && (
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
                  {(!selectedPart.documents || selectedPart.documents.length === 0) && (
                    <p className="text-sm text-slate-400">Aucun document</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpareParts;
