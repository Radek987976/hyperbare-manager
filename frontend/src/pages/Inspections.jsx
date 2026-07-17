import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { inspectionsAPI, caissonAPI, equipmentsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { formatDate, daysUntil, equipmentTypeLabels, periodiciteLabels, getErrorMessage } from '../lib/utils';
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
  DialogDescription,
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
import {
  Shield,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
  Upload,
  RotateCw,
  History
} from 'lucide-react';

const PERIODICITES = ['hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel', 'biannuel', 'triennal', 'quinquennal', 'decennal'];

const Inspections = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const _loc = useLocation();
  useEffect(() => { if (_loc.state?.q) setSearchTerm(_loc.state.q); }, [_loc.state]);
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewTarget, setRenewTarget] = useState(null);
  const [savingRenew, setSavingRenew] = useState(false);
  const emptyRenew = { date_realisation: new Date().toISOString().split('T')[0], resultat: '', organisme_certificateur: '', observations: '' };
  const [renewForm, setRenewForm] = useState(emptyRenew);

  const openRenewModal = (inspection) => {
    setRenewTarget(inspection);
    setRenewForm({
      date_realisation: new Date().toISOString().split('T')[0],
      resultat: '',
      organisme_certificateur: inspection.organisme_certificateur || '',
      observations: '',
    });
    setShowDetailModal(false);
    setShowRenewModal(true);
  };

  const handleRenew = async () => {
    if (!renewTarget || !renewForm.date_realisation) return;
    setSavingRenew(true);
    try {
      await inspectionsAPI.renew(renewTarget.id, renewForm);
      setShowRenewModal(false);
      setRenewTarget(null);
      await loadData();
    } catch (e) {
      alert(getErrorMessage(e, 'Erreur lors du renouvellement'));
    } finally {
      setSavingRenew(false);
    }
  };
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedInspection) return;
    setUploadingPdf(true);
    try {
      await inspectionsAPI.uploadProcedure(selectedInspection.id, file);
      const res = await inspectionsAPI.getById(selectedInspection.id);
      setSelectedInspection(res.data);
      loadData();
      toast.success('PDF ajouté au contrôle');
    } catch (err) {
      toast.error(getErrorMessage(err) || "Échec de l'ajout du PDF");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleDeletePdf = async (url) => {
    if (!selectedInspection) return;
    try {
      await inspectionsAPI.deleteProcedure(selectedInspection.id, url);
      const res = await inspectionsAPI.getById(selectedInspection.id);
      setSelectedInspection(res.data);
      loadData();
      toast.success('PDF supprimé');
    } catch (err) {
      toast.error('Échec de la suppression');
    }
  };
  
  const [formData, setFormData] = useState({
    titre: '',
    type_controle: '',
    periodicite: 'annuel',
    caisson_id: '',
    equipment_id: '',
    date_realisation: '',
    organisme_certificateur: '',
    resultat: '',
    observations: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [inspectionsRes, caissonRes, equipmentsRes] = await Promise.all([
        inspectionsAPI.getAll(),
        caissonAPI.get(),
        equipmentsAPI.getAll()
      ]);
      setInspections(inspectionsRes.data || []);
      setCaisson(caissonRes.data);
      setEquipments(equipmentsRes.data || []);
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
    setSelectedInspection(null);
    setFormData({
      titre: '',
      type_controle: '',
      periodicite: 'annuel',
      caisson_id: caisson?.id || '',
      equipment_id: '',
      date_realisation: new Date().toISOString().split('T')[0],
      organisme_certificateur: '',
      resultat: '',
      observations: ''
    });
    setShowModal(true);
  };

  const openEditModal = (inspection) => {
    setSelectedInspection(inspection);
    setFormData({
      titre: inspection.titre,
      type_controle: inspection.type_controle,
      periodicite: inspection.periodicite || 'annuel',
      caisson_id: inspection.caisson_id || '',
      equipment_id: inspection.equipment_id || '',
      date_realisation: inspection.date_realisation || '',
      organisme_certificateur: inspection.organisme_certificateur || '',
      resultat: inspection.resultat || '',
      observations: inspection.observations || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        equipment_id: formData.equipment_id || null,
        caisson_id: formData.caisson_id || null
      };
      
      if (selectedInspection) {
        await inspectionsAPI.update(selectedInspection.id, data);
      } else {
        await inspectionsAPI.create(data);
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
    if (!selectedInspection) return;
    
    try {
      await inspectionsAPI.delete(selectedInspection.id);
      await loadData();
      setShowDeleteDialog(false);
      setSelectedInspection(null);
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (dateValidite) => {
    const days = daysUntil(dateValidite);
    if (days === null) return null;
    
    if (days < 0) {
      return (
        <Badge className="bg-[#AE2012] text-white">
          <XCircle className="w-3 h-3 mr-1" />
          Expiré
        </Badge>
      );
    } else if (days <= 30) {
      return (
        <Badge className="bg-[#EE9B00] text-white">
          <AlertTriangle className="w-3 h-3 mr-1" />
          {days}j restants
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-[#0A9396] text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Valide
        </Badge>
      );
    }
  };

  const getEquipmentLabel = (equipmentId) => {
    const equipment = equipments.find(e => e.id === equipmentId);
    if (!equipment) return 'Caisson';
    return `${equipmentTypeLabels[equipment.type]} - ${equipment.reference}`;
  };

  const filteredInspections = inspections.filter(insp =>
    insp.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insp.type_controle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort by date_validite (expiring soon first)
  filteredInspections.sort((a, b) => {
    const daysA = daysUntil(a.date_validite) ?? 9999;
    const daysB = daysUntil(b.date_validite) ?? 9999;
    return daysA - daysB;
  });

  // Stats
  const expiredCount = inspections.filter(i => (daysUntil(i.date_validite) ?? 1) < 0).length;
  const expiringSoonCount = inspections.filter(i => {
    const days = daysUntil(i.date_validite);
    return days !== null && days >= 0 && days <= 30;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="inspections-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inspections-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Contrôles réglementaires
          </h1>
          <p className="text-slate-500 mt-1">
            Suivi des contrôles obligatoires et certifications
          </p>
        </div>
        {canCreate() && (
          <Button 
            onClick={openCreateModal}
            className="bg-[#005F73] hover:bg-[#004C5C]"
            data-testid="add-inspection-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contrôle
          </Button>
        )}
      </div>

      {/* Stats */}
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expiredCount > 0 && (
            <Card className="border-l-4 border-l-[#AE2012] bg-[#AE2012]/5">
              <CardContent className="p-4 flex items-center gap-4">
                <XCircle className="w-10 h-10 text-[#AE2012]" />
                <div>
                  <p className="text-2xl font-bold font-['Barlow_Condensed'] text-[#AE2012]">
                    {expiredCount}
                  </p>
                  <p className="text-sm text-[#AE2012]">contrôle(s) expiré(s)</p>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringSoonCount > 0 && (
            <Card className="border-l-4 border-l-[#EE9B00] bg-[#EE9B00]/5">
              <CardContent className="p-4 flex items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-[#EE9B00]" />
                <div>
                  <p className="text-2xl font-bold font-['Barlow_Condensed'] text-[#EE9B00]">
                    {expiringSoonCount}
                  </p>
                  <p className="text-sm text-[#EE9B00]">contrôle(s) à renouveler sous 30 jours</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par titre, type de contrôle..."
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
            <Table data-testid="inspections-table">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold">Titre</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Périodicité</TableHead>
                  <TableHead className="font-semibold">Prochaine échéance</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Organisme</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucun contrôle enregistré</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((inspection) => (
                    <TableRow key={inspection.id} data-testid={`inspection-row-${inspection.id}`}>
                      <TableCell className="font-medium">{inspection.titre}</TableCell>
                      <TableCell>{inspection.type_controle}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {periodiciteLabels[inspection.periodicite] || inspection.periodicite || 'Annuel'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(inspection.date_validite)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(inspection.date_validite)}
                          {canModify() && (daysUntil(inspection.date_validite) ?? 9999) < 30 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-[#0A9396] text-[#0A9396] hover:bg-[#0A9396]/5"
                              onClick={() => openRenewModal(inspection)}
                              data-testid={`quick-renew-${inspection.id}`}
                            >
                              <RotateCw className="w-3.5 h-3.5 mr-1" /> Renouveler
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{inspection.organisme_certificateur || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`inspection-actions-${inspection.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedInspection(inspection);
                              setShowDetailModal(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {canModify() && (
                              <DropdownMenuItem onClick={() => openRenewModal(inspection)} data-testid={`renew-${inspection.id}`}>
                                <RotateCw className="w-4 h-4 mr-2" />
                                Renouveler
                              </DropdownMenuItem>
                            )}
                            {canModify() && (
                              <DropdownMenuItem onClick={() => openEditModal(inspection)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                            )}
                            {canDelete() && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedInspection(inspection);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              {selectedInspection ? 'Modifier le contrôle' : 'Nouveau contrôle'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="titre">Titre *</Label>
              <SearchableSelect
                value={formData.titre}
                onValueChange={(v) => handleSelectChange('titre', v)}
                allowCustom
                data-testid="input-titre"
                placeholder="Sélectionner ou saisir un titre"
                searchPlaceholder="Rechercher ou saisir un titre..."
                options={[...new Set(inspections.map(i => i.titre).filter(Boolean))]
                  .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
                  .map(t => ({ value: t, label: t }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_controle">Type de contrôle *</Label>
              <SearchableSelect
                value={formData.type_controle}
                onValueChange={(v) => handleSelectChange('type_controle', v)}
                allowCustom
                data-testid="input-type"
                placeholder="Sélectionner ou saisir un type"
                searchPlaceholder="Rechercher ou saisir un type..."
                options={[...new Set([...inspections.map(i => i.type_controle), 'reglementaire', 'constructeur'].filter(Boolean))]
                  .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
                  .map(t => ({ value: t, label: t }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Périodicité *</Label>
              <SearchableSelect
                value={formData.periodicite}
                onValueChange={(v) => handleSelectChange('periodicite', v)}
                data-testid="input-periodicite"
                placeholder="Sélectionner une périodicité"
                options={PERIODICITES.map(p => ({ value: p, label: periodiciteLabels[p] }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Équipement concerné</Label>
              <SearchableSelect
                value={formData.equipment_id || "caisson"}
                onValueChange={(v) => handleSelectChange('equipment_id', v === "caisson" ? "" : v)}
                data-testid="input-equipment"
                placeholder="Caisson entier"
                options={[{ value: 'caisson', label: 'Caisson entier' }, ...equipments.map(eq => ({ value: eq.id, label: `${equipmentTypeLabels[eq.type] || eq.type} - ${eq.reference}` }))]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_realisation">Date de réalisation *</Label>
              <Input
                id="date_realisation"
                name="date_realisation"
                type="date"
                value={formData.date_realisation}
                onChange={handleChange}
                data-testid="input-date-realisation"
              />
              <p className="text-xs text-slate-500">La prochaine échéance sera calculée automatiquement</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organisme_certificateur">Organisme certificateur</Label>
              <Input
                id="organisme_certificateur"
                name="organisme_certificateur"
                value={formData.organisme_certificateur}
                onChange={handleChange}
                placeholder="Ex: Bureau Veritas"
                data-testid="input-organisme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultat">Résultat</Label>
              <Input
                id="resultat"
                name="resultat"
                value={formData.resultat}
                onChange={handleChange}
                placeholder="Ex: Conforme"
                data-testid="input-resultat"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                placeholder="Remarques, recommandations..."
                rows={3}
                data-testid="input-observations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.titre || !formData.type_controle || !formData.periodicite || !formData.date_realisation}
              className="bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="save-inspection-btn"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedInspection ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Détails du contrôle
            </DialogTitle>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Titre</p>
                <p className="font-medium text-lg">{selectedInspection.titre}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Type</p>
                  <p className="font-medium">{selectedInspection.type_controle}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Équipement</p>
                  <p className="font-medium">{getEquipmentLabel(selectedInspection.equipment_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Date de réalisation</p>
                  <p className="font-medium">{formatDate(selectedInspection.date_realisation)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Date de validité</p>
                  <p className="font-medium">{formatDate(selectedInspection.date_validite)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Statut</p>
                  {getStatusBadge(selectedInspection.date_validite)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Organisme</p>
                  <p className="font-medium">{selectedInspection.organisme_certificateur || '-'}</p>
                </div>
                {selectedInspection.resultat && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Résultat</p>
                    <p className="font-medium">{selectedInspection.resultat}</p>
                  </div>
                )}
              </div>
              {selectedInspection.observations && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Observations</p>
                  <p className="text-slate-700 mt-1">{selectedInspection.observations}</p>
                </div>
              )}

              {/* Documents PDF (procédures / PV signés) */}
              <div className="pt-4 border-t" data-testid="pdf-section">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500 uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Documents PDF (PV / procédures)
                  </p>
                  {canModify() && (
                    <>
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={handleUploadPdf}
                        data-testid="pdf-file-input"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadingPdf}
                        onClick={() => pdfInputRef.current?.click()}
                        data-testid="upload-pdf-btn"
                      >
                        {uploadingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                        Ajouter un PDF
                      </Button>
                    </>
                  )}
                </div>
                {(selectedInspection.procedure_documents || []).length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun document</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInspection.procedure_documents.map((doc) => (
                      <div key={doc.url} className="flex items-center justify-between p-2 rounded border border-slate-200" data-testid="pdf-doc-item">
                        <a
                          href={`${process.env.REACT_APP_BACKEND_URL}${doc.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-[#005F73] hover:underline text-sm truncate"
                        >
                          <FileText className="w-4 h-4 shrink-0" /> {doc.filename}
                        </a>
                        {canModify() && (
                          <button
                            onClick={() => handleDeletePdf(doc.url)}
                            className="text-slate-400 hover:text-red-600 shrink-0"
                            data-testid="delete-pdf-btn"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historique des contrôles (traçabilité) */}
              <div className="border-t pt-4">
                <p className="font-semibold flex items-center gap-2 mb-2">
                  <History className="w-4 h-4" /> Historique des contrôles
                </p>
                {(selectedInspection.historique_controles || []).length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun renouvellement enregistré. La réalisation courante est la première.</p>
                ) : (
                  <div className="space-y-2" data-testid="controle-history">
                    {[...selectedInspection.historique_controles].reverse().map((h, i) => (
                      <div key={i} className="text-sm p-2 bg-slate-50 rounded border border-slate-100">
                        <div className="flex justify-between">
                          <span>Réalisé le <strong>{formatDate(h.date_realisation)}</strong></span>
                          <span className="text-slate-500">Échéance : {formatDate(h.date_validite)}</span>
                        </div>
                        {(h.resultat || h.organisme_certificateur) && (
                          <p className="text-slate-500 text-xs mt-1">
                            {h.resultat ? `Résultat : ${h.resultat}` : ''}{h.resultat && h.organisme_certificateur ? ' · ' : ''}{h.organisme_certificateur ? `Organisme : ${h.organisme_certificateur}` : ''}
                          </p>
                        )}
                        {h.observations && <p className="text-slate-500 text-xs mt-1">{h.observations}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {canModify() && (
                  <Button
                    className="mt-3 bg-[#0A9396] hover:bg-[#087f81]"
                    onClick={() => openRenewModal(selectedInspection)}
                    data-testid="detail-renew-btn"
                  >
                    <RotateCw className="w-4 h-4 mr-2" /> Enregistrer un renouvellement
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renewal Modal */}
      <Dialog open={showRenewModal} onOpenChange={setShowRenewModal}>
        <DialogContent data-testid="renew-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-[#0A9396]" /> Renouveler le contrôle
            </DialogTitle>
            <DialogDescription>
              {renewTarget?.titre} — la réalisation actuelle sera archivée dans l'historique et l'échéance recalculée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date de réalisation *</Label>
              <Input
                type="date"
                value={renewForm.date_realisation}
                onChange={(e) => setRenewForm(p => ({ ...p, date_realisation: e.target.value }))}
                data-testid="renew-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Résultat</Label>
                <Input
                  value={renewForm.resultat}
                  onChange={(e) => setRenewForm(p => ({ ...p, resultat: e.target.value }))}
                  placeholder="conforme, non conforme..."
                  data-testid="renew-resultat"
                />
              </div>
              <div className="space-y-2">
                <Label>Organisme</Label>
                <Input
                  value={renewForm.organisme_certificateur}
                  onChange={(e) => setRenewForm(p => ({ ...p, organisme_certificateur: e.target.value }))}
                  data-testid="renew-organisme"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observations</Label>
              <Textarea
                value={renewForm.observations}
                onChange={(e) => setRenewForm(p => ({ ...p, observations: e.target.value }))}
                rows={2}
                data-testid="renew-observations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewModal(false)}>Annuler</Button>
            <Button
              className="bg-[#0A9396] hover:bg-[#087f81]"
              onClick={handleRenew}
              disabled={savingRenew || !renewForm.date_realisation}
              data-testid="renew-submit"
            >
              {savingRenew ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
              Enregistrer le renouvellement
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
              Êtes-vous sûr de vouloir supprimer le contrôle "{selectedInspection?.titre}" ?
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

export default Inspections;
