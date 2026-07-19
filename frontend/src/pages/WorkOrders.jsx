import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { workOrdersAPI, equipmentsAPI, caissonAPI, usersAPI, equipmentTypesAPI, sparePartsAPI, contractorsAPI, openStoredFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  formatDate, 
  statusLabels, 
  priorityLabels,
  maintenanceTypeLabels,
  getStatusClass, 
  getPriorityClass,
  daysUntil,
  getErrorMessage
} from '../lib/utils';
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
import { SearchableSelect } from '../components/ui/searchable-select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  X,
  Calendar,
  Wrench,
  AlertTriangle,
  Clock,
  Upload,
  FileText,
  Image
} from 'lucide-react';

const STATUTS = ['planifiee', 'en_cours', 'terminee', 'annulee'];
const PRIORITES = ['urgente', 'haute', 'normale', 'basse'];
const TYPES_MAINTENANCE = ['preventive', 'corrective'];

const WorkOrders = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [workOrders, setWorkOrders] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const _loc = useLocation();
  useEffect(() => { if (_loc.state?.q) setSearchTerm(_loc.state.q); }, [_loc.state]);
  useEffect(() => {
    const openId = _loc.state?.openId;
    if (openId && workOrders.length) {
      const wo = workOrders.find(w => w.id === openId);
      if (wo) { setSelectedWorkOrder(wo); setShowDetailModal(true); }
    }
  }, [workOrders, _loc.state]);
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCustomTechnicien, setShowCustomTechnicien] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [spareParts, setSpareParts] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [pieceToAdd, setPieceToAdd] = useState('');
  const [pieceQte, setPieceQte] = useState('1');
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    type_maintenance: 'preventive',
    priorite: 'normale',
    statut: 'planifiee',
    caisson_id: '',
    equipment_id: '',
    date_planifiee: '',
    periodicite_jours: '',
    periodicite_heures: '',
    compteur_declenchement: '',
    technicien_assigne: '',
    pieces_prevues: [],
    cout_prestataire: '',
    prestataire_id: '',
    devise_prestataire: 'XPF'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workOrdersRes, equipmentsRes, caissonRes, techniciansRes, typesRes, sparePartsRes, contractorsRes] = await Promise.all([
        workOrdersAPI.getAll(),
        equipmentsAPI.getAll(),
        caissonAPI.get(),
        usersAPI.getTechnicians(),
        equipmentTypesAPI.getAll(),
        sparePartsAPI.getAll(),
        contractorsAPI.getAll()
      ]);
      setWorkOrders(workOrdersRes.data || []);
      setEquipments(equipmentsRes.data || []);
      setCaisson(caissonRes.data);
      setTechnicians(techniciansRes.data || []);
      setEquipmentTypes(typesRes.data || []);
      setSpareParts(sparePartsRes.data || []);
      setContractors(contractorsRes.data || []);
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

  const addPiecePrevue = () => {
    if (!pieceToAdd) return;
    const qte = parseInt(pieceQte) || 1;
    const existing = formData.pieces_prevues.find(p => p.spare_part_id === pieceToAdd);
    let next;
    if (existing) {
      next = formData.pieces_prevues.map(p => p.spare_part_id === pieceToAdd ? { ...p, quantite: qte } : p);
    } else {
      next = [...formData.pieces_prevues, { spare_part_id: pieceToAdd, quantite: qte }];
    }
    setFormData({ ...formData, pieces_prevues: next });
    setPieceToAdd('');
    setPieceQte('1');
  };

  const removePiecePrevue = (spid) => {
    setFormData({ ...formData, pieces_prevues: formData.pieces_prevues.filter(p => p.spare_part_id !== spid) });
  };

  const prefillFromHistory = async () => {
    if (!selectedWorkOrder?.id) return;
    try {
      const res = await workOrdersAPI.getSuggestedPieces(selectedWorkOrder.id);
      const pieces = (res.data.pieces || []).map(p => ({ spare_part_id: p.spare_part_id, quantite: p.quantite || 1 }));
      if (pieces.length === 0) {
        alert(res.data.message || "Aucune pièce trouvée dans l'historique des interventions");
        return;
      }
      setFormData(prev => ({ ...prev, pieces_prevues: pieces }));
    } catch (e) {
      alert(getErrorMessage(e, 'Erreur lors du pré-remplissage'));
    }
  };

  const getPartName = (spid) => {
    const p = spareParts.find(s => s.id === spid);
    return p ? `${p.nom} (${p.reference_fabricant})` : spid;
  };

  const openCreateModal = () => {
    setSelectedWorkOrder(null);
    setFormData({
      titre: '',
      description: '',
      type_maintenance: 'preventive',
      priorite: 'normale',
      statut: 'planifiee',
      caisson_id: caisson?.id || '',
      equipment_id: '',
      date_planifiee: '',
      periodicite_jours: '',
      periodicite_heures: '',
      compteur_declenchement: '',
      technicien_assigne: '',
      pieces_prevues: [],
      cout_prestataire: '',
      prestataire_id: '',
      devise_prestataire: 'XPF'
    });
    setShowCustomTechnicien(false);
    setShowModal(true);
  };

  const openEditModal = (wo) => {
    setSelectedWorkOrder(wo);
    setFormData({
      titre: wo.titre,
      description: wo.description,
      type_maintenance: wo.type_maintenance,
      priorite: wo.priorite,
      statut: wo.statut,
      caisson_id: wo.caisson_id || '',
      equipment_id: wo.equipment_id || '',
      date_planifiee: wo.date_planifiee,
      periodicite_jours: wo.periodicite_jours?.toString() || '',
      periodicite_heures: wo.periodicite_heures?.toString() || '',
      compteur_declenchement: wo.compteur_declenchement?.toString() || '',
      technicien_assigne: wo.technicien_assigne || '',
      pieces_prevues: wo.pieces_prevues || [],
      cout_prestataire: wo.cout_prestataire?.toString() || '',
      prestataire_id: wo.prestataire_id || '',
      devise_prestataire: wo.devise_prestataire || 'XPF'
    });
    // Check if technicien is not in the list
    const isInList = technicians.some(t => `${t.prenom} ${t.nom}` === wo.technicien_assigne);
    setShowCustomTechnicien(wo.technicien_assigne && !isInList);
    setShowModal(true);
  };

  // Get selected equipment to check if it's a compressor
  const getSelectedEquipment = () => {
    return equipments.find(eq => eq.id === formData.equipment_id);
  };

  // Prestataires dont la spécialité correspond STRICTEMENT au type de l'équipement sélectionné
  const selectedEquipmentType = (getSelectedEquipment()?.type || '').trim().toLowerCase();
  const matchingContractors = selectedEquipmentType
    ? contractors.filter(c =>
        Array.isArray(c.specialites) &&
        c.specialites.some(s => (s || '').trim().toLowerCase() === selectedEquipmentType)
      )
    : contractors;

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedEq = getSelectedEquipment();
      const data = {
        ...formData,
        periodicite_jours: formData.periodicite_jours ? parseInt(formData.periodicite_jours) : null,
        periodicite_heures: formData.periodicite_heures ? parseInt(formData.periodicite_heures) : null,
        compteur_declenchement: formData.compteur_declenchement ? parseFloat(formData.compteur_declenchement) : 
          (selectedEq && selectedEq.type === 'compresseur' && formData.periodicite_heures ? 
            (selectedEq.compteur_horaire || 0) + parseInt(formData.periodicite_heures) : null),
        equipment_id: formData.equipment_id || null,
        caisson_id: formData.caisson_id || null,
        cout_prestataire: formData.cout_prestataire ? parseFloat(formData.cout_prestataire) : null,
        prestataire_id: formData.prestataire_id || null,
        devise_prestataire: formData.devise_prestataire || 'XPF'
      };
      
      if (selectedWorkOrder) {
        await workOrdersAPI.update(selectedWorkOrder.id, data);
      } else {
        await workOrdersAPI.create(data);
      }
      
      await loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert(getErrorMessage(error, 'Erreur lors de la sauvegarde'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkOrder) return;
    
    try {
      await workOrdersAPI.delete(selectedWorkOrder.id);
      await loadData();
      setShowDeleteDialog(false);
      setSelectedWorkOrder(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getEquipmentLabel = (equipmentId) => {
    const equipment = equipments.find(e => e.id === equipmentId);
    if (!equipment) return '-';
    return `${getTypeLabel(equipment.type)} - ${equipment.reference}`;
  };

  // File upload handlers
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedWorkOrder) return;
    
    setUploading(true);
    try {
      await workOrdersAPI.uploadPhoto(selectedWorkOrder.id, file);
      const res = await workOrdersAPI.getById(selectedWorkOrder.id);
      setSelectedWorkOrder(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedWorkOrder) return;
    
    setUploading(true);
    try {
      await workOrdersAPI.uploadDocument(selectedWorkOrder.id, file);
      const res = await workOrdersAPI.getById(selectedWorkOrder.id);
      setSelectedWorkOrder(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!selectedWorkOrder) return;
    try {
      await workOrdersAPI.deletePhoto(selectedWorkOrder.id, photoUrl);
      const res = await workOrdersAPI.getById(selectedWorkOrder.id);
      setSelectedWorkOrder(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteDoc = async (docUrl) => {
    if (!selectedWorkOrder) return;
    try {
      await workOrdersAPI.deleteDocument(selectedWorkOrder.id, docUrl);
      const res = await workOrdersAPI.getById(selectedWorkOrder.id);
      setSelectedWorkOrder(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    const matchesSearch = 
      wo.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatut = filterStatut === 'all' || wo.statut === filterStatut;
    const matchesType = filterType === 'all' || wo.type_maintenance === filterType;
    
    // Tab filter
    const matchesTab = 
      activeTab === 'all' ||
      (activeTab === 'planifiee' && wo.statut === 'planifiee') ||
      (activeTab === 'en_cours' && wo.statut === 'en_cours') ||
      (activeTab === 'terminee' && wo.statut === 'terminee');
    
    return matchesSearch && matchesStatut && matchesType && matchesTab;
  });

  const getStatusCount = (status) => workOrders.filter(wo => wo.statut === status).length;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="work-orders-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="work-orders-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Maintenance préventive
          </h1>
          <p className="text-slate-500 mt-1">
            Gestion des maintenances préventives et correctives
          </p>
        </div>
        {canCreate() && (
          <Button 
            onClick={openCreateModal}
            className="bg-[#005F73] hover:bg-[#004C5C]"
            data-testid="add-work-order-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle maintenance
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="all" data-testid="tab-all">
            Tous ({workOrders.length})
          </TabsTrigger>
          <TabsTrigger value="planifiee" data-testid="tab-planifiee">
            Planifiés ({getStatusCount('planifiee')})
          </TabsTrigger>
          <TabsTrigger value="en_cours" data-testid="tab-en-cours">
            En cours ({getStatusCount('en_cours')})
          </TabsTrigger>
          <TabsTrigger value="terminee" data-testid="tab-terminee">
            Terminés ({getStatusCount('terminee')})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher un ordre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <SearchableSelect
              value={filterType}
              onValueChange={(v) => setFilterType(v)}
              className="w-full md:w-44"
              data-testid="filter-type"
              placeholder="Type"
              options={[{ value: 'all', label: 'Tous les types' }, ...TYPES_MAINTENANCE.map(type => ({ value: type, label: maintenanceTypeLabels[type] }))]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-testid="work-orders-table">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Titre</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Priorité</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Équipement</TableHead>
                  <TableHead className="font-semibold">Date planifiée</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucun ordre de travail</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkOrders.map((wo) => {
                    const days = daysUntil(wo.date_planifiee);
                    const isOverdue = days !== null && days < 0 && wo.statut !== 'terminee' && wo.statut !== 'annulee';
                    
                    return (
                      <TableRow 
                        key={wo.id} 
                        className={isOverdue ? 'bg-red-50/50' : ''}
                        data-testid={`work-order-row-${wo.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isOverdue && <AlertTriangle className="w-4 h-4 text-[#AE2012]" />}
                            <span className="font-medium">{wo.titre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            wo.type_maintenance === 'preventive' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-orange-50 text-orange-700 border-orange-200'
                          }>
                            {maintenanceTypeLabels[wo.type_maintenance]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getPriorityClass(wo.priorite)} text-xs`}>
                            {priorityLabels[wo.priorite]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusClass(wo.statut)} text-xs`}>
                            {statusLabels[wo.statut]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getEquipmentLabel(wo.equipment_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{formatDate(wo.date_planifiee)}</span>
                            {isOverdue && (
                              <Badge className="bg-[#AE2012] text-white text-xs">
                                {Math.abs(days)}j retard
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`work-order-actions-${wo.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedWorkOrder(wo);
                                setShowDetailModal(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              {canModify() && (
                                <DropdownMenuItem onClick={() => openEditModal(wo)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                              )}
                              {canDelete() && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedWorkOrder(wo);
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              {selectedWorkOrder ? 'Modifier l\'ordre de travail' : 'Nouvel ordre de travail'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                placeholder="Titre de l'intervention"
                data-testid="input-titre"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description détaillée de l'intervention..."
                rows={3}
                data-testid="input-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Type de maintenance *</Label>
              <SearchableSelect
                value={formData.type_maintenance}
                onValueChange={(v) => handleSelectChange('type_maintenance', v)}
                data-testid="input-type-maintenance"
                options={TYPES_MAINTENANCE.map(type => ({ value: type, label: maintenanceTypeLabels[type] }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Priorité *</Label>
              <SearchableSelect
                value={formData.priorite}
                onValueChange={(v) => handleSelectChange('priorite', v)}
                data-testid="input-priorite"
                options={PRIORITES.map(p => ({ value: p, label: priorityLabels[p] }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Statut *</Label>
              <SearchableSelect
                value={formData.statut}
                onValueChange={(v) => handleSelectChange('statut', v)}
                data-testid="input-statut"
                options={STATUTS.map(s => ({ value: s, label: statusLabels[s] }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Équipement concerné</Label>
              <SearchableSelect
                value={formData.equipment_id || "caisson"}
                onValueChange={(v) => handleSelectChange('equipment_id', v === "caisson" ? "" : v)}
                data-testid="input-equipment"
                placeholder="Caisson entier"
                options={[
                  { value: 'caisson', label: 'Caisson entier' },
                  ...equipments
                    .filter(eq => !(formData.type_maintenance === 'preventive' && eq.statut === 'reforme'))
                    .map(eq => ({ value: eq.id, label: `${getTypeLabel(eq.type)} - ${eq.reference}` })),
                ]}
              />
              {formData.type_maintenance === 'preventive' && (
                <p className="text-xs text-slate-500">Les équipements réformés ne sont pas proposés pour une maintenance préventive.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_planifiee">Date planifiée *</Label>
              <Input
                id="date_planifiee"
                name="date_planifiee"
                type="date"
                value={formData.date_planifiee}
                onChange={handleChange}
                data-testid="input-date-planifiee"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodicite_jours">Périodicité (jours)</Label>
              <Input
                id="periodicite_jours"
                name="periodicite_jours"
                type="number"
                value={formData.periodicite_jours}
                onChange={handleChange}
                placeholder="Ex: 30"
                data-testid="input-periodicite"
              />
            </div>
            
            {/* Périodicité horaire pour les compresseurs */}
            {getSelectedEquipment()?.type === 'compresseur' && (
              <>
                <div className="space-y-2 md:col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Maintenance basée sur le compteur horaire
                  </p>
                  <p className="text-xs text-blue-600">
                    Compteur actuel: {getSelectedEquipment()?.compteur_horaire?.toLocaleString() || 0} h
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodicite_heures">Périodicité (heures de fonctionnement)</Label>
                  <Input
                    id="periodicite_heures"
                    name="periodicite_heures"
                    type="number"
                    value={formData.periodicite_heures}
                    onChange={handleChange}
                    placeholder="Ex: 500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compteur_declenchement">Compteur de déclenchement (h)</Label>
                  <Input
                    id="compteur_declenchement"
                    name="compteur_declenchement"
                    type="number"
                    step="0.1"
                    value={formData.compteur_declenchement || (
                      formData.periodicite_heures ? 
                        (getSelectedEquipment()?.compteur_horaire || 0) + parseInt(formData.periodicite_heures || 0) : ''
                    )}
                    onChange={handleChange}
                    placeholder="Auto-calculé"
                  />
                  <p className="text-xs text-slate-500">
                    Maintenance à effectuer quand le compteur atteint cette valeur
                  </p>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label>Technicien assigné</Label>
              <SearchableSelect
                value={formData.technicien_assigne}
                onValueChange={(v) => handleSelectChange('technicien_assigne', v)}
                allowCustom
                data-testid="input-technicien"
                placeholder="Sélectionner ou saisir un technicien"
                searchPlaceholder="Rechercher ou saisir un nom..."
                options={technicians.map(tech => ({ value: `${tech.prenom} ${tech.nom}`, label: `${tech.prenom} ${tech.nom} (${tech.role})` }))}
              />
            </div>

            {formData.type_maintenance === 'preventive' && (
              <div className="space-y-2 border-t pt-4">
                <Label>Pièces prévues par intervention</Label>
                <p className="text-xs text-slate-500 -mt-1">Utilisé pour le budget prévisionnel N+1 (quantité consommée à chaque passage).</p>
                {selectedWorkOrder?.id && (
                  <Button type="button" variant="ghost" size="sm" onClick={prefillFromHistory} className="h-7 text-[#005F73]" data-testid="prefill-history-btn">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Pré-remplir depuis l'historique
                  </Button>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <SearchableSelect
                      value={pieceToAdd}
                      onValueChange={setPieceToAdd}
                      data-testid="select-piece-prevue"
                      placeholder="Sélectionner une pièce"
                      searchPlaceholder="Rechercher par nom ou référence..."
                      options={spareParts.map(p => ({ value: p.id, label: `${p.nom} (${p.reference_fabricant})` }))}
                    />
                  </div>
                  <Input
                    type="number"
                    min="1"
                    value={pieceQte}
                    onChange={(e) => setPieceQte(e.target.value)}
                    className="w-20"
                    data-testid="input-piece-qte"
                  />
                  <Button type="button" variant="outline" onClick={addPiecePrevue} data-testid="add-piece-prevue-btn">
                    Ajouter
                  </Button>
                </div>
                {formData.pieces_prevues.length > 0 && (
                  <div className="space-y-1 mt-2" data-testid="pieces-prevues-list">
                    {formData.pieces_prevues.map((p) => (
                      <div key={p.spare_part_id} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                        <span>{getPartName(p.spare_part_id)} — <b>{p.quantite}</b> / intervention</span>
                        <button type="button" onClick={() => removePiecePrevue(p.spare_part_id)} className="text-red-500 hover:text-red-700" data-testid="remove-piece-prevue">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 mt-2 border-t">
                  <Label>Prestation externe (sous-traitant)</Label>
                  <p className="text-xs text-slate-500 -mt-0.5 mb-2">Coût par passage facturé par le prestataire pour cette maintenance.</p>
                  <div className="space-y-2">
                    <SearchableSelect
                      value={formData.prestataire_id}
                      onValueChange={(v) => handleSelectChange('prestataire_id', v)}
                      data-testid="select-prestataire"
                      placeholder="Sélectionner un prestataire (optionnel)"
                      searchPlaceholder="Rechercher un prestataire..."
                      options={matchingContractors.map(c => ({ value: c.id, label: c.nom }))}
                      emptyText={selectedEquipmentType ? 'Aucun prestataire dont la spécialité correspond à ce type d\'équipement' : 'Aucun prestataire'}
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.cout_prestataire}
                          onChange={(e) => setFormData({ ...formData, cout_prestataire: e.target.value })}
                          placeholder="Coût par passage"
                          data-testid="input-cout-prestataire"
                        />
                      </div>
                      <SearchableSelect
                        value={formData.devise_prestataire}
                        onValueChange={(v) => handleSelectChange('devise_prestataire', v)}
                        data-testid="select-devise-prestataire"
                        className="w-28"
                        options={[{ value: 'XPF', label: 'XPF' }, { value: 'EUR', label: 'EUR' }]}
                      />
                    </div>
                    {formData.devise_prestataire === 'EUR' && formData.cout_prestataire && (
                      <p className="text-xs text-slate-500">≈ {(parseFloat(formData.cout_prestataire) * 119.3).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} XPF / passage</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.titre || !formData.description || !formData.date_planifiee}
              className="bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="save-work-order-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedWorkOrder ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Détails de l'ordre
            </DialogTitle>
          </DialogHeader>
          {selectedWorkOrder && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Titre</p>
                <p className="font-medium text-lg">{selectedWorkOrder.titre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Description</p>
                <p className="text-slate-700">{selectedWorkOrder.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Type</p>
                  <Badge variant="outline" className={
                    selectedWorkOrder.type_maintenance === 'preventive' 
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-orange-50 text-orange-700'
                  }>
                    {maintenanceTypeLabels[selectedWorkOrder.type_maintenance]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Priorité</p>
                  <Badge className={getPriorityClass(selectedWorkOrder.priorite)}>
                    {priorityLabels[selectedWorkOrder.priorite]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Statut</p>
                  <Badge className={getStatusClass(selectedWorkOrder.statut)}>
                    {statusLabels[selectedWorkOrder.statut]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Date planifiée</p>
                  <p className="font-medium">{formatDate(selectedWorkOrder.date_planifiee)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Équipement</p>
                  <p className="font-medium">{getEquipmentLabel(selectedWorkOrder.equipment_id)}</p>
                </div>
                {selectedWorkOrder.periodicite_jours && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Périodicité</p>
                    <p className="font-medium">{selectedWorkOrder.periodicite_jours} jours</p>
                  </div>
                )}
                {selectedWorkOrder.technicien_assigne && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Technicien</p>
                    <p className="font-medium">{selectedWorkOrder.technicien_assigne}</p>
                  </div>
                )}
              </div>

              {/* Photos */}
              <div className="space-y-3 pt-4 border-t">
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
                          Ajouter
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedWorkOrder.photos || []).map((url) => (
                    <div key={url} className="relative group">
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
                  {(!selectedWorkOrder.photos || selectedWorkOrder.photos.length === 0) && (
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
                          Ajouter
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  {(selectedWorkOrder.documents || []).map((doc) => (
                    <div key={doc.url} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <a
                        href={`${backendUrl}${doc.url}`}
                        onClick={(e) => { e.preventDefault(); openStoredFile(doc.url, doc.filename); }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#005F73] hover:underline flex items-center gap-2 cursor-pointer"
                        data-testid="workorder-doc-link"
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
                  {(!selectedWorkOrder.documents || selectedWorkOrder.documents.length === 0) && (
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'ordre "{selectedWorkOrder?.titre}" ?
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

export default WorkOrders;
