import React, { useState, useEffect } from 'react';
import { interventionsAPI, workOrdersAPI, sparePartsAPI, usersAPI, inspectionsAPI } from '../lib/api';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { History, Plus, Search, Eye, Loader2, Clock, User, Package, Wrench } from 'lucide-react';

function Interventions() {
  const [data, setData] = useState({
    interventions: [],
    workOrders: [],
    spareParts: [],
    technicians: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
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
    pieces_utilisees: []
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        interventionsAPI.getAll(),
        workOrdersAPI.getAll(),
        sparePartsAPI.getAll(),
        usersAPI.getTechnicians()
      ]);
      setData({
        interventions: r1.data || [],
        workOrders: r2.data || [],
        spareParts: r3.data || [],
        technicians: r4.data || []
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
        pieces_utilisees: formData.pieces_utilisees.map(p => ({
          spare_part_id: p.spare_part_id,
          quantite: p.quantite
        }))
      };
      await interventionsAPI.create(payload);
      await loadData();
      setShowModal(false);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur');
    }
    setSaving(false);
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
          <DialogHeader><DialogTitle>Enregistrer une intervention</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Type d'intervention */}
            <div>
              <Label>Type d'intervention *</Label>
              <Select value={formData.type_intervention} onValueChange={v => setFormData(p => ({ ...p, type_intervention: v, work_order_id: '', maintenance_preventive_id: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="curative">Maintenance curative (ordre de travail)</SelectItem>
                  <SelectItem value="preventive">Maintenance préventive planifiée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.type_intervention === 'curative' ? (
                <div>
                  <Label>Ordre de travail</Label>
                  <Select value={formData.work_order_id} onValueChange={v => setFormData(p => ({ ...p, work_order_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {pendingWo.map(wo => <SelectItem key={wo.id} value={wo.id}>{wo.titre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Maintenance préventive</Label>
                  <Select value={formData.maintenance_preventive_id} onValueChange={v => setFormData(p => ({ ...p, maintenance_preventive_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {data.inspections.map(insp => <SelectItem key={insp.id} value={insp.id}>{insp.titre} ({insp.periodicite})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">La prochaine date sera recalculée automatiquement</p>
                </div>
              )}
              <div>
                <Label>Date</Label>
                <Input name="date_intervention" type="date" value={formData.date_intervention} onChange={handleChange} />
              </div>
              <div>
                <Label>Technicien *</Label>
                {!showCustomTechnicien ? (
                  <Select 
                    value={formData.technicien || "none"} 
                    onValueChange={v => {
                      if (v === "custom") {
                        setShowCustomTechnicien(true);
                        setFormData(p => ({ ...p, technicien: '' }));
                      } else {
                        setFormData(p => ({ ...p, technicien: v === "none" ? "" : v }));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sélectionner un technicien</SelectItem>
                      {data.technicians.map(tech => (
                        <SelectItem key={tech.id} value={`${tech.prenom} ${tech.nom}`}>
                          {tech.prenom} {tech.nom}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-[#005F73] font-medium">
                        + Saisir un autre nom...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={formData.technicien}
                      onChange={(e) => setFormData(p => ({ ...p, technicien: e.target.value }))}
                      placeholder="Nom du technicien"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        setShowCustomTechnicien(false);
                        setFormData(p => ({ ...p, technicien: '' }));
                      }}
                    >
                      ×
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Durée (min)</Label>
                <Input name="duree_minutes" type="number" value={formData.duree_minutes} onChange={handleChange} />
              </div>
            </div>
            <div>
              <Label>Actions réalisées</Label>
              <Textarea name="actions_realisees" value={formData.actions_realisees} onChange={handleChange} rows={3} />
            </div>
            <div>
              <Label>Observations</Label>
              <Textarea name="observations" value={formData.observations} onChange={handleChange} rows={2} />
            </div>
            <div className="border-t pt-4">
              <Label className="flex items-center gap-2 mb-2"><Package className="w-4 h-4" />Pièces utilisées</Label>
              <div className="flex gap-2 mb-2">
                <Select value={partSelect.part} onValueChange={v => setPartSelect(p => ({ ...p, part: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pièce" /></SelectTrigger>
                  <SelectContent>
                    {data.spareParts.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" className="w-20" value={partSelect.qty} onChange={e => setPartSelect(p => ({ ...p, qty: e.target.value }))} />
                <Button variant="outline" onClick={addPiece}><Plus className="w-4 h-4" /></Button>
              </div>
              {formData.pieces_utilisees.map(p => (
                <div key={p.spare_part_id} className="flex justify-between p-2 bg-slate-50 rounded mb-1">
                  <span>{p.nom}</span>
                  <div><Badge variant="outline">x{p.quantite}</Badge> <Button variant="ghost" size="sm" onClick={() => removePiece(p.spare_part_id)}>×</Button></div>
                </div>
              ))}
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
        <DialogContent>
          <DialogHeader><DialogTitle>Détails</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <p><strong>Date:</strong> {formatDate(selectedItem.date_intervention)}</p>
              <p><strong>Technicien:</strong> {selectedItem.technicien}</p>
              <p><strong>OT:</strong> {getWoTitle(selectedItem.work_order_id)}</p>
              <p><strong>Actions:</strong> {selectedItem.actions_realisees}</p>
              {selectedItem.observations && <p><strong>Observations:</strong> {selectedItem.observations}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Interventions;
