import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { interventionsAPI, workOrdersAPI, sparePartsAPI, usersAPI, equipmentsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { SearchableSelect } from '../components/ui/searchable-select';
import { History, Plus, Search, Eye, Loader2, Clock, User, Package, Wrench, Activity, FileText, Upload, Edit, Trash2, X } from 'lucide-react';

function Interventions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const [data, setData] = useState({
    interventions: [],
    workOrders: [],
    spareParts: [],
    technicians: [],
    equipments: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
    date_intervention: new Date().toISOString().split('T')[0],
    technicien: '',
    actions_realisees: '',
    observations: '',
    duree_minutes: '',
    compteur_horaire: '',
    pieces_utilisees: []
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [r1, r2, r3, r4, r5] = await Promise.all([
        interventionsAPI.getAll(),
        workOrdersAPI.getAll(),
        sparePartsAPI.getAll(),
        usersAPI.getTechnicians(),
        equipmentsAPI.getAll()
      ]);
      setData({
        interventions: r1.data || [],
        workOrders: r2.data || [],
        spareParts: r3.data || [],
        technicians: r4.data || [],
        equipments: r5.data || []
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Filtrer les work orders par type
  const curativeWorkOrders = data.workOrders.filter(wo => 
    wo.type_maintenance === 'corrective' && (wo.statut === 'planifiee' || wo.statut === 'en_cours')
  );
  const preventiveWorkOrders = data.workOrders.filter(wo => 
    wo.type_maintenance === 'preventive' && (wo.statut === 'planifiee' || wo.statut === 'en_cours')
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

  // Récupérer l'équipement concerné par le work order sélectionné
  function getSelectedEquipment() {
    let woId = formData.type_intervention === 'curative' ? formData.work_order_id : formData.maintenance_preventive_id;
    if (!woId) return null;
    const wo = data.workOrders.find(w => w.id === woId);
    if (!wo || !wo.equipment_id) return null;
    return data.equipments.find(e => e.id === wo.equipment_id);
  }

  const selectedEquipment = getSelectedEquipment();
  const isCompressor = (selectedEquipment?.type || '').toLowerCase() === 'compresseur';

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        type_intervention: formData.type_intervention,
        work_order_id: formData.type_intervention === 'curative' ? formData.work_order_id : null,
        maintenance_preventive_id: formData.type_intervention === 'preventive' ? formData.maintenance_preventive_id : null,
        date_intervention: formData.date_intervention,
        technicien: formData.technicien,
        actions_realisees: formData.actions_realisees,
        observations: formData.observations,
        duree_minutes: formData.duree_minutes ? parseInt(formData.duree_minutes) : null,
        compteur_horaire: formData.compteur_horaire ? parseFloat(formData.compteur_horaire) : null,
        equipment_id: selectedEquipment?.id || null,
        pieces_utilisees: formData.pieces_utilisees.map(p => ({
          spare_part_id: p.spare_part_id,
          quantite: p.quantite
        }))
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
    });
    setShowCustomTechnicien(false);
    setShowDetailModal(false);
    setShowModal(true);
  }

  function getPartName(id) {
    const p = data.spareParts.find(sp => sp.id === id);
    return p ? p.nom : id;
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
  
  const filtered = data.interventions.filter(i => {
    const term = searchTerm.toLowerCase();
    return i.technicien.toLowerCase().includes(term) || 
           i.actions_realisees.toLowerCase().includes(term) ||
           getWoTitle(i.work_order_id).toLowerCase().includes(term) ||
           getPreventiveTitle(i.maintenance_preventive_id).toLowerCase().includes(term);
  });

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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Date</TableHead>
                <TableHead>Ordre de travail</TableHead>
                <TableHead>Technicien</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>Aucune intervention</p>
                  </TableCell>
                </TableRow>
              ) : filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{formatDate(item.date_intervention)}</TableCell>
                  <TableCell>
                    {item.type_intervention === 'preventive' 
                      ? <><Wrench className="w-4 h-4 inline mr-1 text-green-600" />{getPreventiveTitle(item.maintenance_preventive_id)}</>
                      : getWoTitle(item.work_order_id)}
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Modifier l\'intervention' : 'Enregistrer une intervention'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
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
              {formData.type_intervention === 'curative' ? (
                <div>
                  <Label>Maintenance corrective</Label>
                  <SearchableSelect
                    value={formData.work_order_id}
                    onValueChange={v => setFormData(p => ({ ...p, work_order_id: v }))}
                    placeholder="Sélectionner"
                    options={curativeWorkOrders.map(wo => ({ value: wo.id, label: wo.titre }))}
                    emptyText="Aucune maintenance corrective en attente"
                    data-testid="interv-wo-select"
                  />
                </div>
              ) : (
                <div>
                  <Label>Maintenance préventive</Label>
                  <SearchableSelect
                    value={formData.maintenance_preventive_id}
                    onValueChange={v => setFormData(p => ({ ...p, maintenance_preventive_id: v }))}
                    placeholder="Sélectionner"
                    options={preventiveWorkOrders.map(wo => ({
                      value: wo.id,
                      label: `${wo.titre}${wo.periodicite_heures ? ` (${wo.periodicite_heures}h)` : wo.periodicite_jours ? ` (${wo.periodicite_jours}j)` : ''}`,
                    }))}
                    emptyText="Aucune maintenance préventive planifiée"
                    data-testid="interv-preventive-select"
                  />
                  <p className="text-xs text-slate-500 mt-1">Une nouvelle maintenance sera créée automatiquement</p>
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
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">Pièce détachée</Label>
                    <SearchableSelect
                      value={partSelect.part}
                      onValueChange={v => setPartSelect(p => ({ ...p, part: v }))}
                      placeholder="Sélectionner une pièce"
                      options={data.spareParts.map(p => ({
                        value: p.id,
                        label: `${p.nom}${p.quantite_stock !== undefined ? ` (stock: ${p.quantite_stock})` : ''}`,
                      }))}
                      data-testid="interv-piece-select"
                    />
                  </div>
                  <div className="w-24">
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
                    className="bg-[#005F73] hover:bg-[#004a5c]"
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.technicien || 
                (formData.type_intervention === 'curative' && !formData.work_order_id) ||
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
              <p><strong>Maintenance:</strong> {selectedItem.type_intervention === 'preventive' ? getPreventiveTitle(selectedItem.maintenance_preventive_id) : getWoTitle(selectedItem.work_order_id)}</p>
              <p><strong>Actions:</strong> {selectedItem.actions_realisees}</p>
              {selectedItem.observations && <p><strong>Observations:</strong> {selectedItem.observations}</p>}
              {selectedItem.duree_minutes ? <p><strong>Durée:</strong> {selectedItem.duree_minutes} min</p> : null}
              {selectedItem.compteur_horaire != null && <p><strong>Compteur horaire:</strong> {selectedItem.compteur_horaire?.toLocaleString()} h</p>}

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
                        <a href={`${backendUrl}${doc.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#005F73] hover:underline text-sm truncate">
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
                <div className="border-t pt-3 flex justify-end">
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
