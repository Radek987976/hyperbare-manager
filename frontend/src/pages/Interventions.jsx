import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { interventionsAPI, workOrdersAPI, sparePartsAPI, usersAPI, equipmentsAPI, subEquipmentsAPI, contractorsAPI, reportsAPI, openStoredFile, openBlobPdf } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, subEquipmentMatchesEquipment } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { SearchableSelect } from '../components/ui/searchable-select';
import { useColumnFilters, useSessionState, applyTableFilters, distinctValues, ColumnFilter } from '../components/ui/table-column-filter';
import { History, Plus, Search, Eye, Loader2, Clock, User, Package, Wrench, Activity, FileText, Upload, Edit, Trash2, X, Printer } from 'lucide-react';

// Paramètres de l'analyse de l'air respirable (Classeur2)
const AIR_RESPIRABLE_ROWS = [
  { key: 'h2o', label: "Vapeur d'eau H2O", max: 'max 100 mg/m³', unit: 'mg/m³' },
  { key: 'co', label: 'Monoxyde de carbone CO', max: 'max 5 ppm', unit: 'ppm' },
  { key: 'co2', label: 'Dioxyde de carbone CO2', max: 'max 500 ppm', unit: 'ppm' },
  { key: 'huile', label: "Vapeur d'huile", max: 'max 0,5 mg/m³', unit: 'mg/m³' },
  { key: 'odeur_gout', label: 'Odeur et goût', max: '', unit: '' },
];
const SERVOMEX_ROWS = ['LOW', 'HIGH', 'ECHELLE'];
const SERVOMEX_COLS = ['I1', 'I2', 'I3', 'I4'];

function defaultMesures(type) {
  if (type === 'servomex_calibrage') {
    const grille = {};
    SERVOMEX_ROWS.forEach(r => { grille[r] = { I1: '', I2: '', I3: '', I4: '' }; });
    return { type, grille };
  }
  if (type === 'air_respirable') {
    const valeurs = {};
    AIR_RESPIRABLE_ROWS.forEach(r => { valeurs[r.key] = ''; });
    return { type, valeurs };
  }
  return null;
}

function Interventions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const [data, setData] = useState({
    interventions: [],
    workOrders: [],
    spareParts: [],
    technicians: [],
    equipments: [],
    subEquipments: [],
    contractors: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState('interventions:search', '');
  const { sort: colSort, setSort: setColSort, filters: colFilters, setColumnFilter: setColColumnFilter, clearAll: clearColFilters, hasActive: hasColFilters } = useColumnFilters(null, 'interventions:cols');
  const [filterDateFrom, setFilterDateFrom] = useSessionState('interventions:dateFrom', '');
  const [filterDateTo, setFilterDateTo] = useSessionState('interventions:dateTo', '');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const _loc = useLocation();
  useEffect(() => { if (_loc.state?.q) setSearchTerm(_loc.state.q); }, [_loc.state]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [partSelect, setPartSelect] = useState({ part: '', qty: '1' });
  const [showCustomTechnicien, setShowCustomTechnicien] = useState(false);
  
  const emptyForm = {
    type_intervention: 'curative',
    work_order_id: '',
    maintenance_preventive_id: '',
    equipment_id: '',
    sous_equipement_ids: [],
    prestataire_id: '',
    titre: '',
    date_intervention: new Date().toISOString().split('T')[0],
    technicien: '',
    actions_realisees: '',
    observations: '',
    duree_minutes: '',
    compteur_horaire: '',
    pieces_utilisees: [],
    mesures: null
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  // Open a pre-filled "new intervention" form when arriving from the Dashboard
  useEffect(() => {
    const woId = _loc.state?.openWorkOrderId;
    if (woId && data.workOrders.length) {
      const wo = data.workOrders.find(w => w.id === woId);
      if (wo) {
        const isPreventive = wo.type_maintenance === 'preventive';
        setEditingId(null);
        setFormData({
          ...emptyForm,
          type_intervention: isPreventive ? 'preventive' : 'curative',
          equipment_id: wo.equipment_id || '',
          maintenance_preventive_id: isPreventive ? wo.id : '',
          titre: isPreventive ? '' : (wo.titre || ''),
        });
        setShowCustomTechnicien(false);
        setShowModal(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.workOrders, _loc.state]);

  // Détection automatique du tableau de relevés selon la maintenance sélectionnée
  useEffect(() => {
    if (!showModal) return;
    const wo = data.workOrders.find(w => w.id === formData.maintenance_preventive_id);
    const text = `${formData.titre || ''} ${wo?.titre || ''}`.toLowerCase();
    let t = null;
    if (text.includes('servomex') && text.includes('analyseur')) t = 'servomex_calibrage';
    else if (text.includes("analyse de l'air respirable")) t = 'air_respirable';
    setFormData(prev => {
      if (t && (!prev.mesures || prev.mesures.type !== t)) {
        return { ...prev, mesures: defaultMesures(t) };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.titre, formData.maintenance_preventive_id, showModal]);

  async function loadData() {
    try {
      const [r1, r2, r3, r5, r6, r7] = await Promise.all([
        interventionsAPI.getAll(),
        workOrdersAPI.getAll(),
        sparePartsAPI.getAll(),
        equipmentsAPI.getAll(),
        subEquipmentsAPI.getAll(),
        contractorsAPI.getAll()
      ]);
      // Technicien: admin voit tous les utilisateurs ; technicien = lui-même (+ saisie libre)
      let technicians = [];
      if (isAdmin) {
        try { const ru = await usersAPI.getAll(); technicians = ru.data || []; } catch (e) { /* noop */ }
      } else if (user) {
        technicians = [{ id: user.id, prenom: user.prenom, nom: user.nom }];
      }
      setData({
        interventions: r1.data || [],
        workOrders: r2.data || [],
        spareParts: r3.data || [],
        technicians,
        equipments: r5.data || [],
        subEquipments: r6.data || [],
        contractors: r7.data || []
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Maintenances préventives disponibles pour l'équipement sélectionné
  const preventiveWorkOrders = data.workOrders.filter(wo => 
    wo.type_maintenance === 'preventive' &&
    (wo.statut === 'planifiee' || wo.statut === 'en_cours') &&
    (!formData.equipment_id || wo.equipment_id === formData.equipment_id)
  );

  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function addPiece() {
    if (!partSelect.part) return;
    const part = data.spareParts.find(p => p.id === partSelect.part);
    if (!part) return;
    
    const existingIdx = formData.pieces_utilisees.findIndex(p => p.spare_part_id === partSelect.part);
    if (existingIdx >= 0) {
      const updated = [...formData.pieces_utilisees];
      updated[existingIdx].quantite += parseInt(partSelect.qty);
      setFormData(prev => ({ ...prev, pieces_utilisees: updated }));
    } else {
      setFormData(prev => ({
        ...prev,
        pieces_utilisees: [...prev.pieces_utilisees, {
          spare_part_id: partSelect.part,
          quantite: parseInt(partSelect.qty),
          nom: part.nom
        }]
      }));
    }
    setPartSelect({ part: '', qty: '1' });
  }

  function removePiece(partId) {
    setFormData(prev => ({
      ...prev,
      pieces_utilisees: prev.pieces_utilisees.filter(p => p.spare_part_id !== partId)
    }));
  }

  const [genAirPdf, setGenAirPdf] = useState(false);
  async function printAirRespirableModel() {
    setGenAirPdf(true);
    try {
      const res = await reportsAPI.airRespirablePDF({
        equipment_id: formData.equipment_id || null,
        valeurs: formData.mesures?.valeurs || {},
        technicien: formData.technicien || null,
        date_intervention: formData.date_intervention || null,
        observations: formData.observations || null,
      });
      const ref = getSelectedEquipment()?.reference || 'compresseur';
      openBlobPdf(res.data, `analyse_air_respirable_${ref}.pdf`);
    } catch (e) {
      alert('Erreur lors de la génération du modèle PDF');
    }
    setGenAirPdf(false);
  }

  // Récupérer l'équipement concerné (choisi directement pour les deux types)
  function getSelectedEquipment() {
    if (!formData.equipment_id) return null;
    return data.equipments.find(e => e.id === formData.equipment_id) || null;
  }

  const selectedEquipment = getSelectedEquipment();
  const isCompressor = (selectedEquipment?.type || '').toLowerCase() === 'compresseur';
  // Sous-équipements rattachés à l'équipement sélectionné (pour le curatif)
  const availableSubEquipments = formData.equipment_id
    ? data.subEquipments.filter(s => subEquipmentMatchesEquipment(s, formData.equipment_id, data.equipments))
    : [];

  // Pièces détachées destinées au type de l'équipement sélectionné
  const equipTypeLc = (selectedEquipment?.type || '').trim().toLowerCase();
  const matchingSpareParts = equipTypeLc
    ? data.spareParts.filter(p => (p.equipment_type || '').trim().toLowerCase() === equipTypeLc)
    : [];
  const availableSpareParts = matchingSpareParts.length > 0 ? matchingSpareParts : data.spareParts;

  // Prestataires dont la spécialité correspond STRICTEMENT au type de l'équipement sélectionné
  const matchingContractors = selectedEquipment
    ? data.contractors.filter(c =>
        Array.isArray(c.specialites) &&
        c.specialites.some(s => (s || '').trim().toLowerCase() === equipTypeLc)
      )
    : [];

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        type_intervention: formData.type_intervention,
        work_order_id: null,
        maintenance_preventive_id: formData.type_intervention === 'preventive' ? formData.maintenance_preventive_id : null,
        titre: formData.type_intervention === 'curative' ? formData.titre : null,
        equipment_id: formData.equipment_id || null,
        sous_equipement_ids: formData.sous_equipement_ids,
        sous_equipement_id: formData.sous_equipement_ids[0] || null,
        prestataire_id: formData.prestataire_id || null,
        date_intervention: formData.date_intervention,
        technicien: formData.technicien,
        actions_realisees: formData.actions_realisees,
        observations: formData.observations,
        duree_minutes: formData.duree_minutes ? parseInt(formData.duree_minutes) : null,
        compteur_horaire: formData.compteur_horaire ? parseFloat(formData.compteur_horaire) : null,
        pieces_utilisees: formData.pieces_utilisees.map(p => ({
          spare_part_id: p.spare_part_id,
          quantite: p.quantite
        })),
        mesures: formData.mesures || null
      };
      if (editingId) {
        await interventionsAPI.update(editingId, payload);
      } else {
        await interventionsAPI.create(payload);
      }
      await loadData();
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
    setSaving(false);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setFormData({
      type_intervention: item.type_intervention || 'curative',
      work_order_id: item.work_order_id || '',
      maintenance_preventive_id: item.maintenance_preventive_id || '',
      equipment_id: item.equipment_id || '',
      sous_equipement_ids: (item.sous_equipement_ids && item.sous_equipement_ids.length)
        ? item.sous_equipement_ids
        : (item.sous_equipement_id ? [item.sous_equipement_id] : []),
      prestataire_id: item.prestataire_id || '',
      titre: item.titre || '',
      date_intervention: item.date_intervention || new Date().toISOString().split('T')[0],
      technicien: item.technicien || '',
      actions_realisees: item.actions_realisees || '',
      observations: item.observations || '',
      duree_minutes: item.duree_minutes?.toString() || '',
      compteur_horaire: item.compteur_horaire?.toString() || '',
      pieces_utilisees: (item.pieces_utilisees || []).map(p => ({
        spare_part_id: p.spare_part_id,
        quantite: p.quantite,
        nom: getPartName(p.spare_part_id),
      })),
      mesures: item.mesures || null,
    });
    setShowCustomTechnicien(false);
    setShowDetailModal(false);
    setShowModal(true);
  }

  function getPartName(id) {
    const p = data.spareParts.find(sp => sp.id === id);
    return p ? p.nom : id;
  }

  async function handleDelete(item) {
    if (!window.confirm('Supprimer définitivement cette intervention ? Le stock des pièces utilisées sera re-crédité.')) return;
    try {
      await interventionsAPI.delete(item.id);
      setShowDetailModal(false);
      setSelectedItem(null);
      await loadData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la suppression');
    }
  }

  async function refreshSelected(id) {
    try {
      const res = await interventionsAPI.getById(id);
      setSelectedItem(res.data);
    } catch (e) { /* noop */ }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files[0];
    if (!file || !selectedItem) return;
    setUploadingPdf(true);
    try {
      await interventionsAPI.uploadDocument(selectedItem.id, file);
      await refreshSelected(selectedItem.id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur lors de l'ajout du PDF");
    }
    setUploadingPdf(false);
    e.target.value = '';
  }

  async function handleDeletePdf(docUrl) {
    if (!selectedItem) return;
    try {
      await interventionsAPI.deleteDocument(selectedItem.id, docUrl);
      await refreshSelected(selectedItem.id);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  }

  function getWoTitle(id) {
    const wo = data.workOrders.find(w => w.id === id);
    return wo ? wo.titre : '-';
  }

  function getPreventiveTitle(id) {
    const wo = data.workOrders.find(w => w.id === id);
    return wo ? wo.titre : '-';
  }

  function getEquipmentName(id) {
    const e = data.equipments.find(x => x.id === id);
    return e ? (e.reference || e.type) : null;
  }

  function getSubEquipmentName(id) {
    const s = data.subEquipments.find(x => x.id === id);
    return s ? (s.nom || s.reference) : null;
  }

  function subIdsOf(item) {
    if (item.sous_equipement_ids && item.sous_equipement_ids.length) return item.sous_equipement_ids;
    return item.sous_equipement_id ? [item.sous_equipement_id] : [];
  }

  function getSubEquipmentNames(item) {
    return subIdsOf(item).map(getSubEquipmentName).filter(Boolean).join(', ');
  }

  function getContractorName(id) {
    const c = data.contractors.find(x => x.id === id);
    return c ? c.nom : null;
  }

  // Libellé affiché dans la liste / le détail
  function getInterventionLabel(item) {
    if (item.type_intervention === 'preventive') {
      return getPreventiveTitle(item.maintenance_preventive_id);
    }
    const parts = [];
    if (item.titre) parts.push(item.titre);
    const eq = getEquipmentName(item.equipment_id);
    const sub = getSubEquipmentNames(item);
    const loc = [eq, sub].filter(Boolean).join(' › ');
    if (loc) parts.push(loc);
    return parts.join(' — ') || (item.work_order_id ? getWoTitle(item.work_order_id) : '-');
  }
  
  const filtered = data.interventions.filter(i => {
    const term = searchTerm.toLowerCase();
    const matchSearch = (i.technicien || '').toLowerCase().includes(term) || 
           (i.actions_realisees || '').toLowerCase().includes(term) ||
           getInterventionLabel(i).toLowerCase().includes(term);
    const d = (i.date_intervention || '').slice(0, 10);
    const matchDateFrom = !filterDateFrom || (d && d >= filterDateFrom);
    const matchDateTo = !filterDateTo || (d && d <= filterDateTo);
    return matchSearch && matchDateFrom && matchDateTo;
  });

  const intColumns = {
    date_intervention: (i) => formatDate(i.date_intervention),
    objet: (i) => i.type_intervention === 'preventive' ? getPreventiveTitle(i.maintenance_preventive_id) : getInterventionLabel(i),
    equipment: (i) => getEquipmentName(i.equipment_id) || '-',
    technicien: (i) => i.technicien,
    actions: (i) => i.actions_realisees,
    duree: (i) => i.duree_minutes ? `${i.duree_minutes} min` : '-',
  };
  const intDistinct = (key) => distinctValues(filtered, intColumns, key, colFilters);
  const colFiltered = applyTableFilters(filtered, intColumns, { filters: colFilters, sort: colSort });

  const pageCount = Math.max(1, Math.ceil(colFiltered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = colFiltered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="interventions-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Historique des interventions
          </h1>
          <p className="text-slate-500 mt-1">{data.interventions.length} intervention(s)</p>
        </div>
        <Button 
          onClick={() => { setFormData(emptyForm); setShowCustomTechnicien(false); setShowModal(true); }}
          className="bg-[#005F73] hover:bg-[#004C5C]"
          data-testid="add-intervention-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Rechercher..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} className="pl-10" data-testid="interv-search" />
            </div>
            {(searchTerm || filterDateFrom || filterDateTo || hasColFilters) && (
              <Button variant="ghost" onClick={() => { setSearchTerm(''); setFilterDateFrom(''); setFilterDateTo(''); clearColFilters(); setPage(1); }} className="shrink-0" data-testid="clear-filters-btn">
                <X className="w-4 h-4 mr-1" /> Effacer tous les filtres
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto_1fr] items-center gap-3 mt-3">
            <Label className="text-sm text-slate-600 whitespace-nowrap">Date d'intervention — du</Label>
            <Input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }} data-testid="interv-filter-date-from" />
            <Label className="text-sm text-slate-600 whitespace-nowrap">au</Label>
            <Input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(1); }} data-testid="interv-filter-date-to" />
          </div>
          <p className="text-xs text-slate-400 mt-2">Astuce : cliquez sur l'icône entonnoir dans chaque colonne pour trier et filtrer comme dans Excel.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead><ColumnFilter label="Date" columnKey="date_intervention" values={intDistinct('date_intervention')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Objet" columnKey="objet" values={intDistinct('objet')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Équipement" columnKey="equipment" values={intDistinct('equipment')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Technicien" columnKey="technicien" values={intDistinct('technicien')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead>Actions</TableHead>
                <TableHead><ColumnFilter label="Durée" columnKey="duree" values={intDistinct('duree')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colFiltered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Aucune intervention</p>
                  </TableCell>
                </TableRow>
              ) : paged.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.date_intervention)}</TableCell>
                  <TableCell>
                    {item.type_intervention === 'preventive' 
                      ? <span className="inline-flex items-center gap-2"><Badge variant="outline" className="bg-[#0A9396]/10 text-[#0A9396] border-[#0A9396]/30">Préventive</Badge>{getPreventiveTitle(item.maintenance_preventive_id)}</span>
                      : <span className="inline-flex items-center gap-2"><Badge variant="outline" className="bg-[#EE9B00]/10 text-[#EE9B00] border-[#EE9B00]/30">Curative</Badge>{getInterventionLabel(item)}</span>}
                  </TableCell>
                  <TableCell>
                    {getEquipmentName(item.equipment_id) ? (
                      <span className="text-sm">
                        {getEquipmentName(item.equipment_id)}
                        {getSubEquipmentNames(item) && (
                          <span className="text-slate-400"> › {getSubEquipmentNames(item)}</span>
                        )}
                      </span>
                    ) : <span className="text-slate-400">-</span>}
                  </TableCell>
                  <TableCell><User className="w-4 h-4 inline mr-1 text-slate-400" />{item.technicien}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.actions_realisees}</TableCell>
                  <TableCell>{item.duree_minutes ? `${item.duree_minutes} min` : '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setShowDetailModal(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1" data-testid="interventions-pagination">
          <p className="text-sm text-slate-500">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} sur {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} data-testid="interv-prev-page">
              Précédent
            </Button>
            <span className="text-sm text-slate-600">Page {currentPage} / {pageCount}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount} data-testid="interv-next-page">
              Suivant
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 !flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>{editingId ? 'Modifier l\'intervention' : 'Enregistrer une intervention'}</DialogTitle>
            <DialogDescription>Renseignez la maintenance concernée, le technicien et les actions réalisées.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
            {/* Type d'intervention */}
            <div>
              <Label>Type d'intervention *</Label>
              <SearchableSelect
                value={formData.type_intervention}
                onValueChange={v => setFormData(p => ({ ...p, type_intervention: v, work_order_id: '', maintenance_preventive_id: '' }))}
                options={[
                  { value: 'curative', label: 'Maintenance curative' },
                  { value: 'preventive', label: 'Maintenance préventive' },
                ]}
                data-testid="interv-type-select"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Équipement *</Label>
                <SearchableSelect
                  value={formData.equipment_id}
                  onValueChange={v => setFormData(p => ({ ...p, equipment_id: v, sous_equipement_ids: [], maintenance_preventive_id: '' }))}
                  placeholder="Sélectionner un équipement"
                  searchPlaceholder="Rechercher un équipement..."
                  options={[...data.equipments]
                    .filter(e => e.statut !== 'reforme')
                    .sort((a, b) => (a.reference || '').localeCompare(b.reference || ''))
                    .map(e => ({ value: e.id, label: `${e.reference}${e.type ? ` (${e.type})` : ''}` }))}
                  data-testid="interv-equipment-select"
                />
              </div>
              <div>
                <Label>Sous-équipement(s)</Label>
                {formData.sous_equipement_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2" data-testid="interv-sub-chips">
                    {formData.sous_equipement_ids.map((sid) => {
                      const s = data.subEquipments.find(x => x.id === sid);
                      return (
                        <span key={sid} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-[#005F73]/10 text-[#005F73] text-sm">
                          {s ? (s.nom || s.reference) : sid}
                          <button
                            type="button"
                            data-testid={`interv-remove-sub-${sid}`}
                            onClick={() => setFormData(p => ({ ...p, sous_equipement_ids: p.sous_equipement_ids.filter(x => x !== sid) }))}
                            className="ml-1 rounded-full hover:bg-[#005F73]/20 w-5 h-5 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <SearchableSelect
                  value=""
                  onValueChange={v => {
                    if (v && !formData.sous_equipement_ids.includes(v)) {
                      setFormData(p => ({ ...p, sous_equipement_ids: [...p.sous_equipement_ids, v] }));
                    }
                  }}
                  placeholder={formData.equipment_id ? 'Ajouter un sous-équipement (optionnel)' : 'Choisir un équipement d\'abord'}
                  searchPlaceholder="Rechercher un sous-équipement..."
                  options={availableSubEquipments
                    .filter(s => !formData.sous_equipement_ids.includes(s.id))
                    .map(s => ({ value: s.id, label: `${s.nom || s.reference}${s.reference && s.nom ? ` (${s.reference})` : ''}` }))}
                  emptyText={formData.equipment_id ? 'Aucun autre sous-équipement' : 'Choisir un équipement d\'abord'}
                  data-testid="interv-subequipment-select"
                />
              </div>

              {formData.type_intervention === 'curative' ? (
                <div className="col-span-2">
                  <Label>Motif / désignation *</Label>
                  <Input
                    name="titre"
                    value={formData.titre}
                    onChange={handleChange}
                    placeholder="Ex: Dépannage, remplacement soupape..."
                    data-testid="interv-titre-input"
                  />
                </div>
              ) : (
                <div className="col-span-2">
                  <Label>Maintenance préventive concernée *</Label>
                  <SearchableSelect
                    value={formData.maintenance_preventive_id}
                    onValueChange={v => setFormData(p => ({ ...p, maintenance_preventive_id: v }))}
                    placeholder={formData.equipment_id ? 'Sélectionner une maintenance' : 'Choisir un équipement d\'abord'}
                    searchPlaceholder="Rechercher une maintenance..."
                    options={preventiveWorkOrders.map(wo => ({
                      value: wo.id,
                      label: `${wo.titre}${wo.periodicite_heures ? ` (${wo.periodicite_heures}h)` : wo.periodicite_jours ? ` (${wo.periodicite_jours}j)` : ''}`,
                    }))}
                    emptyText={formData.equipment_id ? 'Aucune maintenance pour cet équipement' : 'Choisir un équipement d\'abord'}
                    data-testid="interv-preventive-select"
                  />
                </div>
              )}
              <div>
                <Label>Date</Label>
                <Input name="date_intervention" type="date" value={formData.date_intervention} onChange={handleChange} />
              </div>
              <div>
                <Label>Technicien *</Label>
                <SearchableSelect
                  value={formData.technicien}
                  onValueChange={(v) => setFormData(p => ({ ...p, technicien: v }))}
                  allowCustom
                  placeholder="Sélectionner ou saisir un technicien"
                  searchPlaceholder="Rechercher ou saisir un nom..."
                  options={data.technicians.map(tech => ({
                    value: `${tech.prenom} ${tech.nom}`,
                    label: `${tech.prenom} ${tech.nom}`,
                  }))}
                  data-testid="interv-technicien-select"
                />
              </div>
              <div>
                <Label>Durée (min)</Label>
                <Input name="duree_minutes" type="number" value={formData.duree_minutes} onChange={handleChange} />
              </div>
              <div className="col-span-2">
                <Label>Prestataire externe</Label>
                <SearchableSelect
                  value={formData.prestataire_id}
                  onValueChange={v => setFormData(p => ({ ...p, prestataire_id: v }))}
                  placeholder={formData.equipment_id ? (matchingContractors.length ? 'Optionnel — prestataire de ce type d\'équipement' : 'Aucun prestataire pour ce type d\'équipement') : 'Choisir un équipement d\'abord'}
                  searchPlaceholder="Rechercher un prestataire..."
                  options={matchingContractors.map(c => ({ value: c.id, label: c.nom }))}
                  emptyText={formData.equipment_id ? 'Aucun prestataire dont la spécialité correspond à ce type' : 'Choisir un équipement d\'abord'}
                  data-testid="interv-prestataire-select"
                />
              </div>
            </div>
            
            {/* Compteur horaire pour les compresseurs */}
            {isCompressor && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-amber-600" />
                  <Label className="text-amber-800 font-medium">Compteur horaire compresseur</Label>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-amber-700">
                    Valeur actuelle: <span className="font-bold">{selectedEquipment?.compteur_horaire?.toLocaleString() || 0} h</span>
                  </div>
                  <div className="flex-1">
                    <Input
                      name="compteur_horaire"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.compteur_horaire}
                      onChange={handleChange}
                      placeholder="Nouveau compteur (heures)"
                      className="bg-white"
                    />
                  </div>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Saisissez la valeur actuelle du compteur horaire du compresseur
                </p>
              </div>
            )}
            <div>
              <Label>Actions réalisées</Label>
              <Textarea name="actions_realisees" value={formData.actions_realisees} onChange={handleChange} rows={3} />
            </div>

            {formData.mesures?.type === 'servomex_calibrage' && (
              <div className="border rounded-lg p-4 bg-slate-50" data-testid="mesures-servomex">
                <Label className="mb-3 block font-semibold text-[#005F73]">Calibrage de l'analyseur de gaz Servomex</Label>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-slate-100 text-left"></th>
                        {SERVOMEX_COLS.map(c => <th key={c} className="border p-2 bg-slate-100 text-center">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {SERVOMEX_ROWS.map(row => (
                        <tr key={row}>
                          <td className="border p-2 font-medium bg-slate-100">{row}</td>
                          {SERVOMEX_COLS.map(col => (
                            <td key={col} className="border p-1">
                              <Input
                                value={formData.mesures.grille?.[row]?.[col] ?? ''}
                                onChange={e => setFormData(prev => ({
                                  ...prev,
                                  mesures: { ...prev.mesures, grille: { ...prev.mesures.grille, [row]: { ...prev.mesures.grille[row], [col]: e.target.value } } }
                                }))}
                                className="h-9 text-center"
                                data-testid={`servomex-${row}-${col}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {formData.mesures?.type === 'air_respirable' && (
              <div className="border rounded-lg p-4 bg-slate-50" data-testid="mesures-air-respirable">
                <Label className="mb-3 block font-semibold text-[#005F73]">Analyse de l'air respirable des compresseurs (6 mois)</Label>
                <div className="space-y-2">
                  {AIR_RESPIRABLE_ROWS.map(r => (
                    <div key={r.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                      <div>
                        <span className="text-sm font-medium text-slate-700">{r.label}</span>
                        {r.max && <span className="text-xs text-slate-400 ml-2">{r.max}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.mesures.valeurs?.[r.key] ?? ''}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            mesures: { ...prev.mesures, valeurs: { ...prev.mesures.valeurs, [r.key]: e.target.value } }
                          }))}
                          className="h-9 w-40"
                          placeholder={r.key === 'odeur_gout' ? 'Conforme / Non conforme' : 'Valeur mesurée'}
                          data-testid={`air-${r.key}`}
                        />
                        {r.unit && <span className="text-xs text-slate-500 w-14">{r.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={printAirRespirableModel}
                    disabled={genAirPdf || !formData.equipment_id}
                    className="border-[#005F73] text-[#005F73] hover:bg-[#005F73]/10"
                    data-testid="print-air-respirable-btn"
                  >
                    {genAirPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                    Imprimer / Télécharger le modèle
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>Observations</Label>
              <Textarea name="observations" value={formData.observations} onChange={handleChange} rows={2} />
            </div>
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-3"><Package className="w-4 h-4" />Pièces utilisées</Label>
              
              {/* Liste des pièces ajoutées */}
              {formData.pieces_utilisees.length > 0 && (
                <div className="mb-3 space-y-2">
                  {formData.pieces_utilisees.map((p, index) => (
                    <div key={p.spare_part_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">#{index + 1}</span>
                        <span className="font-medium">{p.nom}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-[#005F73]/10 text-[#005F73]">Qté: {p.quantite}</Badge>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removePiece(p.spare_part_id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Formulaire d'ajout de pièce */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 mb-2 font-medium">Ajouter une pièce :</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs text-slate-500">Pièce détachée{selectedEquipment && matchingSpareParts.length > 0 ? ` (${selectedEquipment.type})` : ''}</Label>
                    <SearchableSelect
                      value={partSelect.part}
                      onValueChange={v => setPartSelect(p => ({ ...p, part: v }))}
                      placeholder="Sélectionner une pièce"
                      options={availableSpareParts.map(p => ({
                        value: p.id,
                        label: `${p.nom}${p.reference_fabricant ? ` — ${p.reference_fabricant}` : ''}${p.quantite_stock !== undefined ? ` (stock: ${p.quantite_stock})` : ''}`,
                      }))}
                      searchPlaceholder="Rechercher par nom ou référence..."
                      emptyText="Aucune pièce"
                      data-testid="interv-piece-select"
                    />
                  </div>
                  <div className="w-20 shrink-0">
                    <Label className="text-xs text-slate-500">Quantité</Label>
                    <Input 
                      type="number" 
                      min="1"
                      value={partSelect.qty} 
                      onChange={e => setPartSelect(p => ({ ...p, qty: e.target.value }))} 
                    />
                  </div>
                  <Button 
                    type="button"
                    onClick={addPiece}
                    disabled={!partSelect.part || !partSelect.qty}
                    className="bg-[#005F73] hover:bg-[#004a5c] shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Vous pouvez ajouter plusieurs types de pièces à cette intervention.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.technicien || !formData.equipment_id ||
                (formData.type_intervention === 'curative' && !formData.titre) ||
                (formData.type_intervention === 'preventive' && !formData.maintenance_preventive_id)} 
              className="bg-[#005F73]"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Détails de l'intervention</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <p><strong>Date:</strong> {formatDate(selectedItem.date_intervention)}</p>
              <p><strong>Technicien:</strong> {selectedItem.technicien}</p>
              {selectedItem.prestataire_id && getContractorName(selectedItem.prestataire_id) && (
                <p><strong>Prestataire:</strong> {getContractorName(selectedItem.prestataire_id)}</p>
              )}
              <p><strong>Objet:</strong> {getInterventionLabel(selectedItem)}</p>
              <p><strong>Actions:</strong> {selectedItem.actions_realisees}</p>
              {selectedItem.observations && <p><strong>Observations:</strong> {selectedItem.observations}</p>}
              {selectedItem.duree_minutes ? <p><strong>Durée:</strong> {selectedItem.duree_minutes} min</p> : null}
              {selectedItem.compteur_horaire != null && <p><strong>Compteur horaire:</strong> {selectedItem.compteur_horaire?.toLocaleString()} h</p>}

              {selectedItem.mesures?.type === 'servomex_calibrage' && (
                <div className="border-t pt-3">
                  <p className="font-semibold mb-2">Calibrage analyseur Servomex</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead><tr><th className="border p-1 bg-slate-100"></th>{SERVOMEX_COLS.map(c => <th key={c} className="border p-1 bg-slate-100 text-center">{c}</th>)}</tr></thead>
                      <tbody>
                        {SERVOMEX_ROWS.map(row => (
                          <tr key={row}>
                            <td className="border p-1 font-medium bg-slate-100">{row}</td>
                            {SERVOMEX_COLS.map(col => <td key={col} className="border p-1 text-center">{selectedItem.mesures.grille?.[row]?.[col] || '-'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {selectedItem.mesures?.type === 'air_respirable' && (
                <div className="border-t pt-3">
                  <p className="font-semibold mb-2">Analyse de l'air respirable (6 mois)</p>
                  <div className="space-y-1">
                    {AIR_RESPIRABLE_ROWS.map(r => (
                      <div key={r.key} className="flex justify-between text-sm">
                        <span className="text-slate-600">{r.label} {r.max && <span className="text-xs text-slate-400">({r.max})</span>}</span>
                        <span className="font-medium">{selectedItem.mesures.valeurs?.[r.key] || '-'} {r.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pièces utilisées */}
              {(selectedItem.pieces_utilisees || []).length > 0 && (
                <div className="border-t pt-3">
                  <p className="font-semibold flex items-center gap-2 mb-2"><Package className="w-4 h-4" /> Pièces utilisées</p>
                  <div className="space-y-1">
                    {selectedItem.pieces_utilisees.map((p) => (
                      <div key={p.spare_part_id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                        <span>{getPartName(p.spare_part_id)}</span>
                        <Badge variant="secondary" className="bg-[#005F73]/10 text-[#005F73]">Qté: {p.quantite}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents PDF (PV) */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> PV / Documents PDF</p>
                  <label className="cursor-pointer">
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} data-testid="interv-pdf-input" />
                    <Button variant="outline" size="sm" asChild>
                      <span>{uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}Ajouter un PDF</span>
                    </Button>
                  </label>
                </div>
                {(selectedItem.documents || []).length === 0 ? (
                  <p className="text-sm text-slate-400">Aucun document</p>
                ) : (
                  <div className="space-y-2">
                    {selectedItem.documents.map((doc) => (
                      <div key={doc.url} className="flex items-center justify-between p-2 rounded border border-slate-200" data-testid="interv-pdf-item">
                        <a href={`${backendUrl}${doc.url}`} onClick={(e) => { e.preventDefault(); openStoredFile(doc.url, doc.filename); }} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#005F73] hover:underline text-sm truncate cursor-pointer" data-testid="interv-pdf-link">
                          <FileText className="w-4 h-4 shrink-0" /> {doc.filename}
                        </a>
                        <button onClick={() => handleDeletePdf(doc.url)} className="text-slate-400 hover:text-red-600 shrink-0" data-testid="interv-pdf-delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="border-t pt-3 flex justify-between">
                  <Button variant="outline" onClick={() => handleDelete(selectedItem)} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" data-testid="interv-delete-btn">
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                  </Button>
                  <Button onClick={() => openEdit(selectedItem)} className="bg-[#005F73] hover:bg-[#004C5C]" data-testid="interv-edit-btn">
                    <Edit className="w-4 h-4 mr-2" /> Rectifier cette intervention
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Interventions;
