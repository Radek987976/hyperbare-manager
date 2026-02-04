import React, { useState, useEffect } from 'react';
import { workOrdersAPI, equipmentsAPI, caissonAPI, usersAPI } from '../lib/api';
import { 
  formatDate, 
  statusLabels, 
  priorityLabels,
  maintenanceTypeLabels,
  equipmentTypeLabels,
  getStatusClass, 
  getPriorityClass,
  daysUntil
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  ClipboardList,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  X,
  Calendar,
  Wrench,
  AlertTriangle
} from 'lucide-react';

const STATUTS = ['planifiee', 'en_cours', 'terminee', 'annulee'];
const PRIORITES = ['urgente', 'haute', 'normale', 'basse'];
const TYPES_MAINTENANCE = ['preventive', 'corrective'];

const WorkOrders = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  
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
    technicien_assigne: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workOrdersRes, equipmentsRes, caissonRes, techniciansRes] = await Promise.all([
        workOrdersAPI.getAll(),
        equipmentsAPI.getAll(),
        caissonAPI.get(),
        usersAPI.getTechnicians()
      ]);
      setWorkOrders(workOrdersRes.data || []);
      setEquipments(equipmentsRes.data || []);
      setCaisson(caissonRes.data);
      setTechnicians(techniciansRes.data || []);
        caissonAPI.get()
      ]);
      setWorkOrders(workOrdersRes.data || []);
      setEquipments(equipmentsRes.data || []);
      setCaisson(caissonRes.data);
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
      technicien_assigne: ''
    });
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
      technicien_assigne: wo.technicien_assigne || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        periodicite_jours: formData.periodicite_jours ? parseInt(formData.periodicite_jours) : null,
        equipment_id: formData.equipment_id || null,
        caisson_id: formData.caisson_id || null
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
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
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
    return `${equipmentTypeLabels[equipment.type]} - ${equipment.reference}`;
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
            Ordres de travail
          </h1>
          <p className="text-slate-500 mt-1">
            Gestion des maintenances préventives et correctives
          </p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="bg-[#005F73] hover:bg-[#004C5C]"
          data-testid="add-work-order-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvel ordre
        </Button>
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
            <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
              <SelectTrigger className="w-full md:w-44" data-testid="filter-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {TYPES_MAINTENANCE.map(type => (
                  <SelectItem key={type} value={type}>
                    {maintenanceTypeLabels[type]}
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
                              <DropdownMenuItem onClick={() => openEditModal(wo)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
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
              <Select value={formData.type_maintenance} onValueChange={(v) => handleSelectChange('type_maintenance', v)}>
                <SelectTrigger data-testid="input-type-maintenance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_MAINTENANCE.map(type => (
                    <SelectItem key={type} value={type}>
                      {maintenanceTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité *</Label>
              <Select value={formData.priorite} onValueChange={(v) => handleSelectChange('priorite', v)}>
                <SelectTrigger data-testid="input-priorite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITES.map(p => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
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
                  {STATUTS.map(s => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Équipement concerné</Label>
              <Select value={formData.equipment_id || "caisson"} onValueChange={(v) => handleSelectChange('equipment_id', v === "caisson" ? "" : v)}>
                <SelectTrigger data-testid="input-equipment">
                  <SelectValue placeholder="Caisson entier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caisson">Caisson entier</SelectItem>
                  {equipments.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {equipmentTypeLabels[eq.type]} - {eq.reference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label htmlFor="technicien_assigne">Technicien assigné</Label>
              <Input
                id="technicien_assigne"
                name="technicien_assigne"
                value={formData.technicien_assigne}
                onChange={handleChange}
                placeholder="Nom du technicien"
                data-testid="input-technicien"
              />
            </div>
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
