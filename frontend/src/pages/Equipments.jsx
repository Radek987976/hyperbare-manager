import React, { useState, useEffect } from 'react';
import { equipmentsAPI, caissonAPI, equipmentTypesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  formatDate, 
  statusLabels, 
  criticiteLabels,
  getStatusClass, 
  getCriticiteClass 
} from '../lib/utils';
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
  Settings2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  X,
  Clock,
  Activity
} from 'lucide-react';

const STATUTS = ['en_service', 'maintenance', 'hors_service'];
const CRITICITES = ['critique', 'haute', 'normale', 'basse'];

const Equipments = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [equipments, setEquipments] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterCriticite, setFilterCriticite] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompteurModal, setShowCompteurModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [compteurValue, setCompteurValue] = useState('');
  
  const [formData, setFormData] = useState({
    type: '',
    reference: '',
    numero_serie: '',
    criticite: 'normale',
    statut: 'en_service',
    description: '',
    date_installation: '',
    compteur_horaire: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [equipmentsRes, caissonRes, typesRes] = await Promise.all([
        equipmentsAPI.getAll(),
        caissonAPI.get(),
        equipmentTypesAPI.getAll()
      ]);
      setEquipments(equipmentsRes.data || []);
      setCaisson(caissonRes.data);
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
    setSelectedEquipment(null);
    setFormData({
      type: '',
      reference: '',
      numero_serie: '',
      criticite: 'normale',
      statut: 'en_service',
      description: '',
      date_installation: '',
      compteur_horaire: ''
    });
    setShowModal(true);
  };

  const openEditModal = (equipment) => {
    setSelectedEquipment(equipment);
    setFormData({
      type: equipment.type,
      reference: equipment.reference,
      numero_serie: equipment.numero_serie,
      criticite: equipment.criticite,
      statut: equipment.statut,
      description: equipment.description || '',
      date_installation: equipment.date_installation || '',
      compteur_horaire: equipment.compteur_horaire?.toString() || ''
    });
    setShowModal(true);
  };

  const openCompteurModal = (equipment) => {
    setSelectedEquipment(equipment);
    setCompteurValue(equipment.compteur_horaire?.toString() || '');
    setShowCompteurModal(true);
  };

  const handleUpdateCompteur = async () => {
    if (!selectedEquipment || !compteurValue) return;
    
    setSaving(true);
    try {
      const response = await equipmentsAPI.updateCompteurHoraire(selectedEquipment.id, {
        compteur_horaire: parseFloat(compteurValue)
      });
      
      if (response.data.alerts && response.data.alerts.length > 0) {
        alert(`⚠️ Maintenances à effectuer:\n${response.data.alerts.map(a => a.message).join('\n')}`);
      }
      
      await loadData();
      setShowCompteurModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!caisson) {
      alert('Veuillez d\'abord créer un caisson');
      return;
    }

    setSaving(true);
    try {
      const data = { ...formData, caisson_id: caisson.id };
      
      if (selectedEquipment) {
        await equipmentsAPI.update(selectedEquipment.id, data);
      } else {
        await equipmentsAPI.create(data);
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

  const handleDelete = async () => {
    if (!selectedEquipment) return;
    
    try {
      await equipmentsAPI.delete(selectedEquipment.id);
      await loadData();
      setShowDeleteDialog(false);
      setSelectedEquipment(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = 
      eq.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTypeLabel(eq.type).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || eq.type === filterType;
    const matchesStatut = filterStatut === 'all' || eq.statut === filterStatut;
    const matchesCriticite = filterCriticite === 'all' || eq.criticite === filterCriticite;
    
    return matchesSearch && matchesType && matchesStatut && matchesCriticite;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatut('all');
    setFilterCriticite('all');
  };

  const hasActiveFilters = searchTerm || filterType !== 'all' || filterStatut !== 'all' || filterCriticite !== 'all';

  if (loading) {
    return (
      <div className="space-y-6" data-testid="equipments-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="equipments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Équipements
          </h1>
          <p className="text-slate-500 mt-1">
            {equipments.length} équipement(s) enregistré(s)
          </p>
        </div>
        {canCreate() && (
          <Button 
            onClick={openCreateModal}
            className="bg-[#005F73] hover:bg-[#004C5C]"
            disabled={!caisson}
            data-testid="add-equipment-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un équipement
          </Button>
        )}
      </div>

      {!caisson && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md" data-testid="no-caisson-warning">
          Veuillez d'abord créer un caisson avant d'ajouter des équipements.
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par référence, N° série..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
              <SelectTrigger className="w-full md:w-40" data-testid="filter-type">
                <SelectValue placeholder="Type" />
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
            <Select value={filterStatut} onValueChange={(v) => setFilterStatut(v)}>
              <SelectTrigger className="w-full md:w-40" data-testid="filter-statut">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUTS.map(statut => (
                  <SelectItem key={statut} value={statut}>
                    {statusLabels[statut]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCriticite} onValueChange={(v) => setFilterCriticite(v)}>
              <SelectTrigger className="w-full md:w-40" data-testid="filter-criticite">
                <SelectValue placeholder="Criticité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {CRITICITES.map(crit => (
                  <SelectItem key={crit} value={crit}>
                    {criticiteLabels[crit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} size="icon">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-testid="equipments-table">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Référence</TableHead>
                  <TableHead className="font-semibold">N° Série</TableHead>
                  <TableHead className="font-semibold">Criticité</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Compteur h</TableHead>
                  <TableHead className="font-semibold">Installation</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      <Settings2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>{equipments.length === 0 ? 'Aucun équipement enregistré' : 'Aucun résultat'}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipments.map((equipment) => (
                    <TableRow key={equipment.id} data-testid={`equipment-row-${equipment.id}`}>
                      <TableCell className="font-medium">
                        {getTypeLabel(equipment.type)}
                      </TableCell>
                      <TableCell>{equipment.reference}</TableCell>
                      <TableCell className="font-mono text-sm">{equipment.numero_serie}</TableCell>
                      <TableCell>
                        <Badge className={`${getCriticiteClass(equipment.criticite)} text-xs`}>
                          {criticiteLabels[equipment.criticite]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusClass(equipment.statut)} text-xs`}>
                          {statusLabels[equipment.statut]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {equipment.type === 'compresseur' && equipment.compteur_horaire != null ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#005F73]" />
                            <span className="font-mono text-sm">{equipment.compteur_horaire.toLocaleString()} h</span>
                          </div>
                        ) : equipment.type === 'compresseur' ? (
                          <span className="text-slate-400 text-sm">Non renseigné</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(equipment.date_installation)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`equipment-actions-${equipment.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedEquipment(equipment);
                              setShowDetailModal(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {equipment.type === 'compresseur' && canModify() && (
                              <DropdownMenuItem onClick={() => openCompteurModal(equipment)}>
                                <Activity className="w-4 h-4 mr-2" />
                                Mettre à jour compteur
                              </DropdownMenuItem>
                            )}
                            {canModify() && (
                              <DropdownMenuItem onClick={() => openEditModal(equipment)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {canDelete() && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedEquipment(equipment);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            )}
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
              {selectedEquipment ? 'Modifier l\'équipement' : 'Ajouter un équipement'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(v) => handleSelectChange('type', v)}>
                <SelectTrigger data-testid="input-type">
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
              <Label htmlFor="reference">Référence *</Label>
              <Input
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="REF-001"
                data-testid="input-reference"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_serie">Numéro de série *</Label>
              <Input
                id="numero_serie"
                name="numero_serie"
                value={formData.numero_serie}
                onChange={handleChange}
                placeholder="SN-123456"
                data-testid="input-numero-serie"
              />
            </div>
            <div className="space-y-2">
              <Label>Criticité *</Label>
              <Select value={formData.criticite} onValueChange={(v) => handleSelectChange('criticite', v)}>
                <SelectTrigger data-testid="input-criticite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITICITES.map(crit => (
                    <SelectItem key={crit} value={crit}>
                      {criticiteLabels[crit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut *</Label>
              <Select value={formData.statut} onValueChange={(v) => handleSelectChange('statut', v)}>
                <SelectTrigger data-testid="input-statut">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map(statut => (
                    <SelectItem key={statut} value={statut}>
                      {statusLabels[statut]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_installation">Date d'installation</Label>
              <Input
                id="date_installation"
                name="date_installation"
                type="date"
                value={formData.date_installation}
                onChange={handleChange}
                data-testid="input-date-installation"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description de l'équipement"
                data-testid="input-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.type || !formData.reference || !formData.numero_serie}
              className="bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="save-equipment-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedEquipment ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Détails de l'équipement
            </DialogTitle>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Type</p>
                  <p className="font-medium">{getTypeLabel(selectedEquipment.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Référence</p>
                  <p className="font-medium">{selectedEquipment.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">N° Série</p>
                  <p className="font-mono">{selectedEquipment.numero_serie}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Criticité</p>
                  <Badge className={getCriticiteClass(selectedEquipment.criticite)}>
                    {criticiteLabels[selectedEquipment.criticite]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Statut</p>
                  <Badge className={getStatusClass(selectedEquipment.statut)}>
                    {statusLabels[selectedEquipment.statut]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Installation</p>
                  <p className="font-medium">{formatDate(selectedEquipment.date_installation)}</p>
                </div>
              </div>
              {selectedEquipment.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Description</p>
                  <p>{selectedEquipment.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'équipement "{selectedEquipment?.reference}" ?
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

export default Equipments;
