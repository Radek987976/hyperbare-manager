import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { equipmentsAPI, caissonAPI, equipmentTypesAPI, reportsAPI, usersAPI, openStoredFile } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  formatDate, 
  statusLabels, 
  criticiteLabels,
  getStatusClass, 
  getCriticiteClass,
  getErrorMessage
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
import { SearchableSelect } from '../components/ui/searchable-select';
import { useColumnFilters, applyTableFilters, distinctValues, ColumnFilter } from '../components/ui/table-column-filter';
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
import { Settings2,
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
  Activity,
  Upload,
  Image,
  FileText,
  Archive
} from 'lucide-react';
import { Download } from 'lucide-react';
import { MaintenanceHistory } from '../components/MaintenanceHistory';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const STATUTS = ['en_service', 'maintenance', 'hors_service', 'reforme'];
const CRITICITES = ['critique', 'haute', 'normale', 'basse'];

const Equipments = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [equipments, setEquipments] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { sort, setSort, filters, setColumnFilter, clearAll, hasActive } = useColumnFilters({ key: 'reference', dir: 'asc' });
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompteurModal, setShowCompteurModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compteurValue, setCompteurValue] = useState('');
  const [showReformModal, setShowReformModal] = useState(false);
  const [reforming, setReforming] = useState(false);
  const [reformForm, setReformForm] = useState({ date_reforme: '', motif_reforme: '', technicien_reforme: '' });
  
  const [formData, setFormData] = useState({
    type: '',
    reference: '',
    numero_serie: '',
    criticite: 'normale',
    statut: 'en_service',
    description: '',
    date_installation: '',
    compteur_horaire: '',
    date_reforme: '',
    motif_reforme: '',
    technicien_reforme: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.state?.q) setSearchTerm(location.state.q);
  }, [location.state]);
  useEffect(() => {
    const openId = location.state?.openId;
    if (openId && equipments.length) {
      const eq = equipments.find(e => e.id === openId);
      if (eq) { setSelectedEquipment(eq); setShowDetailModal(true); }
    }
  }, [equipments, location.state]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const handleDownloadPDF = async () => {
    if (!selectedEquipment) return;
    setDownloadingPdf(true);
    try {
      const res = await reportsAPI.equipmentPDF(selectedEquipment.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiche_${(selectedEquipment.reference || selectedEquipment.id).replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('PDF download failed', e);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const loadData = async () => {
    try {
      const [equipmentsRes, caissonRes, typesRes] = await Promise.all([
        equipmentsAPI.getAll(),
        caissonAPI.get(),
        equipmentTypesAPI.getAll()
      ]);
      setEquipments(equipmentsRes.data || []);
      setCaisson(caissonRes.data);
      setEquipmentTypes([...(typesRes.data || [])].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' })));
      try {
        const techRes = await usersAPI.getTechnicians();
        setTechnicians(techRes.data || []);
      } catch (e) { /* noop */ }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get type label from dynamic types
  const getTypeLabel = (typeCode) => {
    const type = equipmentTypes.find(t => t.nom === typeCode);
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
      compteur_horaire: equipment.compteur_horaire?.toString() || '',
      date_reforme: equipment.date_reforme || '',
      motif_reforme: equipment.motif_reforme || '',
      technicien_reforme: equipment.technicien_reforme || ''
    });
    setShowModal(true);
  };

  const openCompteurModal = (equipment) => {
    setSelectedEquipment(equipment);
    setCompteurValue(equipment.compteur_horaire?.toString() || '');
    setShowCompteurModal(true);
  };

  const openReformModal = (equipment) => {
    setSelectedEquipment(equipment);
    setReformForm({ date_reforme: new Date().toISOString().split('T')[0], motif_reforme: '', technicien_reforme: '' });
    setShowReformModal(true);
  };

  const handleReform = async () => {
    if (!selectedEquipment) return;
    setReforming(true);
    try {
      const eq = selectedEquipment;
      const payload = {
        type: eq.type,
        reference: eq.reference,
        numero_serie: eq.numero_serie,
        criticite: eq.criticite,
        statut: 'reforme',
        caisson_id: eq.caisson_id,
        description: eq.description || null,
        date_installation: eq.date_installation || null,
        compteur_horaire: eq.compteur_horaire ?? null,
        gas_cylinder_id: eq.gas_cylinder_id || null,
        date_reforme: reformForm.date_reforme || null,
        motif_reforme: reformForm.motif_reforme || null,
        technicien_reforme: reformForm.technicien_reforme || null,
      };
      await equipmentsAPI.update(eq.id, payload);
      await loadData();
      setShowReformModal(false);
    } catch (e) {
      alert(getErrorMessage(e, 'Erreur lors de la réforme'));
    } finally {
      setReforming(false);
    }
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
      alert(getErrorMessage(error, 'Erreur lors de la mise à jour'));
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
      // Clean data - convert empty strings to null for optional fields
      const data = { 
        ...formData, 
        caisson_id: caisson.id,
        compteur_horaire: formData.compteur_horaire ? parseFloat(formData.compteur_horaire) : null,
        date_installation: formData.date_installation || null,
        description: formData.description || null,
        date_reforme: formData.statut === 'reforme' ? (formData.date_reforme || null) : null,
        motif_reforme: formData.statut === 'reforme' ? (formData.motif_reforme || null) : null,
        technicien_reforme: formData.statut === 'reforme' ? (formData.technicien_reforme || null) : null
      };
      
      if (selectedEquipment) {
        await equipmentsAPI.update(selectedEquipment.id, data);
      } else {
        await equipmentsAPI.create(data);
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

  // File upload handlers
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedEquipment) return;
    
    setUploading(true);
    try {
      await equipmentsAPI.uploadPhoto(selectedEquipment.id, file);
      const res = await equipmentsAPI.getById(selectedEquipment.id);
      setSelectedEquipment(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedEquipment) return;
    
    setUploading(true);
    try {
      await equipmentsAPI.uploadDocument(selectedEquipment.id, file);
      const res = await equipmentsAPI.getById(selectedEquipment.id);
      setSelectedEquipment(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de l\'upload du document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    if (!selectedEquipment) return;
    try {
      await equipmentsAPI.deletePhoto(selectedEquipment.id, photoUrl);
      const res = await equipmentsAPI.getById(selectedEquipment.id);
      setSelectedEquipment(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression de la photo');
    }
  };

  const handleDeleteDoc = async (docUrl) => {
    if (!selectedEquipment) return;
    try {
      await equipmentsAPI.deleteDocument(selectedEquipment.id, docUrl);
      const res = await equipmentsAPI.getById(selectedEquipment.id);
      setSelectedEquipment(res.data);
      await loadData();
    } catch (error) {
      alert('Erreur lors de la suppression du document');
    }
  };

  const columnsConfig = {
    type: (e) => getTypeLabel(e.type),
    reference: (e) => e.reference,
    numero_serie: (e) => e.numero_serie,
    criticite: (e) => criticiteLabels[e.criticite] || e.criticite,
    statut: (e) => statusLabels[e.statut] || e.statut,
    compteur: (e) => (e.compteur_horaire != null ? e.compteur_horaire : ''),
    date_installation: (e) => formatDate(e.date_installation),
  };

  const searchFiltered = equipments.filter(eq =>
    eq.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eq.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTypeLabel(eq.type).toLowerCase().includes(searchTerm.toLowerCase())
  );
  const distinctFor = (key) => distinctValues(searchFiltered, columnsConfig, key, filters);
  const filteredEquipments = applyTableFilters(searchFiltered, columnsConfig, { filters, sort });

  const clearFilters = () => {
    setSearchTerm('');
    clearAll();
  };

  const hasActiveFilters = searchTerm || hasActive;

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
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="shrink-0">
                <X className="w-4 h-4 mr-1" /> Réinitialiser les filtres
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">Astuce : cliquez sur l'icône entonnoir dans chaque colonne pour trier et filtrer comme dans Excel.</p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-testid="equipments-table">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead><ColumnFilter label="Type" columnKey="type" values={distinctFor('type')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
                  <TableHead><ColumnFilter label="Référence" columnKey="reference" values={distinctFor('reference')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
                  <TableHead><ColumnFilter label="N° Série" columnKey="numero_serie" values={distinctFor('numero_serie')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
                  <TableHead><ColumnFilter label="Criticité" columnKey="criticite" values={distinctFor('criticite')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
                  <TableHead><ColumnFilter label="Statut" columnKey="statut" values={distinctFor('statut')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
                  <TableHead><ColumnFilter label="Compteur h" columnKey="compteur" values={distinctFor('compteur')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
                  <TableHead><ColumnFilter label="Installation" columnKey="date_installation" values={distinctFor('date_installation')} filters={filters} sort={sort} setSort={setSort} setColumnFilter={setColumnFilter} /></TableHead>
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
                    <TableRow key={equipment.id} data-testid={`equipment-row-${equipment.id}`} className={equipment.statut === 'reforme' ? 'opacity-50 grayscale' : ''}>
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
                        {equipment.type?.toLowerCase() === 'compresseur' && equipment.compteur_horaire != null ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#005F73]" />
                            <span className="font-mono text-sm">{equipment.compteur_horaire.toLocaleString()} h</span>
                          </div>
                        ) : equipment.type?.toLowerCase() === 'compresseur' ? (
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
                            {equipment.type?.toLowerCase() === 'compresseur' && canModify() && (
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
                            {canModify() && equipment.statut !== 'reforme' && (
                              <DropdownMenuItem onClick={() => openReformModal(equipment)} className="text-amber-700" data-testid={`reform-${equipment.id}`}>
                                <Archive className="w-4 h-4 mr-2" />
                                Réformer
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
              <SearchableSelect
                value={formData.type}
                onValueChange={(v) => handleSelectChange('type', v)}
                data-testid="input-type"
                placeholder="Sélectionner un type"
                options={equipmentTypes.map(type => ({ value: type.nom, label: type.nom }))}
              />
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
              <SearchableSelect
                value={formData.criticite}
                onValueChange={(v) => handleSelectChange('criticite', v)}
                data-testid="input-criticite"
                options={CRITICITES.map(crit => ({ value: crit, label: criticiteLabels[crit] }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Statut *</Label>
              <SearchableSelect
                value={formData.statut}
                onValueChange={(v) => handleSelectChange('statut', v)}
                data-testid="input-statut"
                options={STATUTS.map(statut => ({ value: statut, label: statusLabels[statut] }))}
              />
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
            {formData.statut === 'reforme' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date_reforme">Date de réforme</Label>
                  <Input
                    id="date_reforme"
                    name="date_reforme"
                    type="date"
                    value={formData.date_reforme}
                    onChange={handleChange}
                    data-testid="input-date-reforme"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motif_reforme">Motif de réforme</Label>
                  <SearchableSelect
                    value={formData.motif_reforme}
                    onValueChange={(v) => handleSelectChange('motif_reforme', v)}
                    data-testid="select-motif-reforme"
                    placeholder="Sélectionner un motif"
                    options={[
                      { value: 'Usure / vétusté', label: 'Usure / vétusté' },
                      { value: 'Obsolescence', label: 'Obsolescence' },
                      { value: 'Panne majeure / irréparable', label: 'Panne majeure / irréparable' },
                      { value: 'Fin de vie réglementaire', label: 'Fin de vie réglementaire' },
                      { value: 'Accident', label: 'Accident' },
                      { value: 'Autre', label: 'Autre' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicien_reforme">Technicien responsable</Label>
                  <SearchableSelect
                    value={formData.technicien_reforme}
                    onValueChange={(v) => handleSelectChange('technicien_reforme', v)}
                    allowCustom
                    data-testid="select-technicien-reforme"
                    placeholder="Sélectionner ou saisir un nom"
                    searchPlaceholder="Rechercher ou saisir un nom..."
                    options={technicians.map(t => ({ value: `${t.prenom} ${t.nom}`, label: `${t.prenom} ${t.nom}` }))}
                  />
                </div>
              </>
            )}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
                Détails de l'équipement
              </DialogTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={downloadingPdf}
                data-testid="download-equipment-pdf-btn"
                className="mr-6"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                Fiche PDF
              </Button>
            </div>
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
                {selectedEquipment.statut === 'reforme' && (
                  <>
                    <div data-testid="detail-date-reforme">
                      <p className="text-xs text-slate-500 uppercase">Date de réforme</p>
                      <p className="font-medium">{selectedEquipment.date_reforme ? formatDate(selectedEquipment.date_reforme) : '—'}</p>
                    </div>
                    <div data-testid="detail-motif-reforme">
                      <p className="text-xs text-slate-500 uppercase">Motif de réforme</p>
                      <p className="font-medium">{selectedEquipment.motif_reforme || '—'}</p>
                    </div>
                    <div data-testid="detail-technicien-reforme">
                      <p className="text-xs text-slate-500 uppercase">Technicien responsable</p>
                      <p className="font-medium">{selectedEquipment.technicien_reforme || '—'}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs text-slate-500 uppercase">Installation</p>
                  <p className="font-medium">{formatDate(selectedEquipment.date_installation)}</p>
                </div>
                {selectedEquipment.type?.toLowerCase() === 'compresseur' && (
                  <div className="col-span-2 p-3 bg-[#005F73]/5 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Compteur horaire
                    </p>
                    <p className="text-2xl font-bold font-['Barlow_Condensed'] text-[#005F73]">
                      {selectedEquipment.compteur_horaire?.toLocaleString() || 0} h
                    </p>
                  </div>
                )}
              </div>
              {selectedEquipment.description && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Description</p>
                  <p>{selectedEquipment.description}</p>
                </div>
              )}

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
                          Ajouter photo
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedEquipment.photos || []).map((url) => (
                    <div key={url} className="relative group">
                      <img
                        src={`${API_URL}${url}`}
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
                  {(!selectedEquipment.photos || selectedEquipment.photos.length === 0) && (
                    <p className="text-sm text-slate-400 col-span-3">Aucune photo</p>
                  )}
                </div>
              </div>

              {/* Documents PDF */}
              <div className="space-y-3 pt-4 border-t">
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
                  {(selectedEquipment.documents || []).map((doc) => (
                    <div key={doc.url} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <a
                        href={`${API_URL}${doc.url}`}
                        onClick={(e) => { e.preventDefault(); openStoredFile(doc.url, doc.filename); }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#005F73] hover:underline flex items-center gap-2 cursor-pointer"
                        data-testid="equipment-doc-link"
                      >
                        <FileText className="w-4 h-4" />
                        {doc.filename}
                      </a>
                      {canDelete() && (
                        <button
                          onClick={() => handleDeleteDoc(doc.url)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!selectedEquipment.documents || selectedEquipment.documents.length === 0) && (
                    <p className="text-sm text-slate-400">Aucun document</p>
                  )}
                </div>
              </div>

              {/* Historique des changements de statut (réformes) */}
              {(selectedEquipment.historique_statut || []).length > 0 && (
                <div className="border border-slate-200 rounded-lg p-4" data-testid="statut-history-section">
                  <h4 className="font-['Barlow_Condensed'] uppercase text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#005F73]" />
                    Historique des réformes / changements de statut
                  </h4>
                  <div className="space-y-2">
                    {[...selectedEquipment.historique_statut].reverse().map((h, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm p-2 bg-slate-50 rounded" data-testid={`statut-history-item-${i}`}>
                        <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline" className="text-xs">{statusLabels[h.ancien_statut] || h.ancien_statut || '—'}</Badge>
                            <span className="text-slate-400">→</span>
                            <Badge className={h.nouveau_statut === 'reforme' ? 'bg-red-100 text-red-700 text-xs' : 'bg-emerald-100 text-emerald-700 text-xs'}>
                              {statusLabels[h.nouveau_statut] || h.nouveau_statut}
                            </Badge>
                          </div>
                          {h.motif && <p className="text-slate-600 mt-1">Motif : {h.motif}</p>}
                          {h.technicien_responsable && <p className="text-slate-600">Technicien : {h.technicien_responsable}</p>}
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(h.date)}{h.utilisateur ? ` · par ${h.utilisateur}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique & maintenances futures */}
              <MaintenanceHistory entityId={selectedEquipment.id} entityType="equipment" />
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

      {/* Compteur Horaire Modal */}
      <Dialog open={showCompteurModal} onOpenChange={setShowCompteurModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#005F73]" />
              Mettre à jour le compteur horaire
            </DialogTitle>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Compresseur</p>
                <p className="font-medium">{selectedEquipment.reference}</p>
                <p className="text-sm text-slate-500 mt-2">Valeur actuelle</p>
                <p className="text-2xl font-bold font-['Barlow_Condensed'] text-[#005F73]">
                  {selectedEquipment.compteur_horaire?.toLocaleString() || 0} h
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="compteur">Nouveau compteur horaire (heures)</Label>
                <Input
                  id="compteur"
                  type="number"
                  step="0.1"
                  min="0"
                  value={compteurValue}
                  onChange={(e) => setCompteurValue(e.target.value)}
                  placeholder="Ex: 1250.5"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompteurModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateCompteur}
              disabled={saving || !compteurValue}
              className="bg-[#005F73] hover:bg-[#004C5C]"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Réforme rapide (1 clic) */}
      <Dialog open={showReformModal} onOpenChange={setShowReformModal}>
        <DialogContent className="max-w-md" data-testid="reform-modal">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-600" />
              Réformer l'équipement
            </DialogTitle>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p className="font-medium">{selectedEquipment.reference} — {getTypeLabel(selectedEquipment.type)}</p>
                <p className="text-xs mt-1">L'équipement sera archivé et toutes ses maintenances préventives en cours seront automatiquement soldées (annulées).</p>
              </div>
              <div className="space-y-2">
                <Label>Date de réforme *</Label>
                <Input
                  type="date"
                  value={reformForm.date_reforme}
                  onChange={(e) => setReformForm(p => ({ ...p, date_reforme: e.target.value }))}
                  data-testid="reform-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Motif de réforme</Label>
                <SearchableSelect
                  value={reformForm.motif_reforme}
                  onValueChange={(v) => setReformForm(p => ({ ...p, motif_reforme: v }))}
                  data-testid="reform-motif"
                  placeholder="Sélectionner un motif"
                  options={[
                    { value: 'Usure / vétusté', label: 'Usure / vétusté' },
                    { value: 'Obsolescence', label: 'Obsolescence' },
                    { value: 'Panne majeure / irréparable', label: 'Panne majeure / irréparable' },
                    { value: 'Fin de vie réglementaire', label: 'Fin de vie réglementaire' },
                    { value: 'Accident', label: 'Accident' },
                    { value: 'Autre', label: 'Autre' },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Technicien responsable</Label>
                <SearchableSelect
                  value={reformForm.technicien_reforme}
                  onValueChange={(v) => setReformForm(p => ({ ...p, technicien_reforme: v }))}
                  allowCustom
                  data-testid="reform-technicien"
                  placeholder="Sélectionner ou saisir un nom"
                  searchPlaceholder="Rechercher ou saisir un nom..."
                  options={technicians.map(t => ({ value: `${t.prenom} ${t.nom}`, label: `${t.prenom} ${t.nom}` }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReformModal(false)}>Annuler</Button>
            <Button
              onClick={handleReform}
              disabled={reforming || !reformForm.date_reforme}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="reform-confirm"
            >
              {reforming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Réformer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Equipments;
