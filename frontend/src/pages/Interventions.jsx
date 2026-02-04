import React, { useState, useEffect } from 'react';
import { interventionsAPI, workOrdersAPI, sparePartsAPI } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { History, Plus, Search, Eye, Loader2, Clock, User, Package } from 'lucide-react';

const Interventions = () => {
  const [interventions, setInterventions] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedPart, setSelectedPart] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  
  const [formData, setFormData] = useState({
    work_order_id: '',
    date_intervention: '',
    technicien: '',
    actions_realisees: '',
    observations: '',
    duree_minutes: '',
    pieces_utilisees: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const results = await Promise.all([
        interventionsAPI.getAll(),
        workOrdersAPI.getAll(),
        sparePartsAPI.getAll()
      ]);
      setInterventions(results[0].data || []);
      setWorkOrders(results[1].data || []);
      setSpareParts(results[2].data || []);
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

  const addPiece = () => {
    if (!selectedPart || !partQuantity) return;
    const part = spareParts.find(p => p.id === selectedPart);
    if (!part) return;
    
    const existing = formData.pieces_utilisees.find(p => p.spare_part_id === selectedPart);
    if (existing) {
      setFormData({
        ...formData,
        pieces_utilisees: formData.pieces_utilisees.map(p =>
          p.spare_part_id === selectedPart
            ? { ...p, quantite: p.quantite + parseInt(partQuantity) }
            : p
        )
      });
    } else {
      setFormData({
        ...formData,
        pieces_utilisees: [
          ...formData.pieces_utilisees,
          { spare_part_id: selectedPart, quantite: parseInt(partQuantity), nom: part.nom }
        ]
      });
    }
    setSelectedPart('');
    setPartQuantity('1');
  };

  const removePiece = (partId) => {
    setFormData({
      ...formData,
      pieces_utilisees: formData.pieces_utilisees.filter(p => p.spare_part_id !== partId)
    });
  };

  const openCreateModal = () => {
    setSelectedIntervention(null);
    setFormData({
      work_order_id: '',
      date_intervention: new Date().toISOString().split('T')[0],
      technicien: '',
      actions_realisees: '',
      observations: '',
      duree_minutes: '',
      pieces_utilisees: []
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        duree_minutes: formData.duree_minutes ? parseInt(formData.duree_minutes) : null,
        pieces_utilisees: formData.pieces_utilisees.map(p => ({
          spare_part_id: p.spare_part_id,
          quantite: p.quantite
        }))
      };
      await interventionsAPI.create(data);
      await loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getWorkOrderTitle = (woId) => {
    const wo = workOrders.find(w => w.id === woId);
    return wo?.titre || '-';
  };

  const filteredInterventions = interventions.filter(int => {
    const woTitle = getWorkOrderTitle(int.work_order_id).toLowerCase();
    return (
      int.technicien.toLowerCase().includes(searchTerm.toLowerCase()) ||
      int.actions_realisees.toLowerCase().includes(searchTerm.toLowerCase()) ||
      woTitle.includes(searchTerm.toLowerCase())
    );
  });

  const pendingWorkOrders = workOrders.filter(wo => 
    wo.statut === 'planifiee' || wo.statut === 'en_cours'
  );

  if (loading) {
    return (
      <div className="space-y-6" data-testid="interventions-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="interventions-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Historique des interventions
          </h1>
          <p className="text-slate-500 mt-1">{interventions.length} intervention(s)</p>
        </div>
        <Button 
          onClick={openCreateModal}
          className="bg-[#005F73] hover:bg-[#004C5C]"
          disabled={pendingWorkOrders.length === 0}
          data-testid="add-intervention-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Enregistrer une intervention
        </Button>
      </div>

      {pendingWorkOrders.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
          Aucun ordre de travail en attente.
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-testid="interventions-table">
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
                {filteredInterventions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucune intervention</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInterventions.map((intervention) => (
                    <TableRow key={intervention.id}>
                      <TableCell>{formatDate(intervention.date_intervention)}</TableCell>
                      <TableCell>{getWorkOrderTitle(intervention.work_order_id)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {intervention.technicien}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{intervention.actions_realisees}</TableCell>
                      <TableCell>
                        {intervention.duree_minutes ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {intervention.duree_minutes} min
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedIntervention(intervention);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Enregistrer une intervention
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordre de travail *</Label>
                <Select value={formData.work_order_id} onValueChange={(v) => handleSelectChange('work_order_id', v)}>
                  <SelectTrigger data-testid="input-work-order">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingWorkOrders.map(wo => (
                      <SelectItem key={wo.id} value={wo.id}>{wo.titre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_intervention">Date *</Label>
                <Input
                  id="date_intervention"
                  name="date_intervention"
                  type="date"
                  value={formData.date_intervention}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="technicien">Technicien *</Label>
                <Input
                  id="technicien"
                  name="technicien"
                  value={formData.technicien}
                  onChange={handleChange}
                  placeholder="Nom du technicien"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duree_minutes">Durée (minutes)</Label>
                <Input
                  id="duree_minutes"
                  name="duree_minutes"
                  type="number"
                  value={formData.duree_minutes}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actions_realisees">Actions réalisées *</Label>
              <Textarea
                id="actions_realisees"
                name="actions_realisees"
                value={formData.actions_realisees}
                onChange={handleChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                name="observations"
                value={formData.observations}
                onChange={handleChange}
                rows={2}
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Pièces utilisées
              </Label>
              
              <div className="flex gap-2">
                <Select value={selectedPart} onValueChange={setSelectedPart}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner une pièce" />
                  </SelectTrigger>
                  <SelectContent>
                    {spareParts.map(part => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.nom} (stock: {part.quantite_stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={partQuantity}
                  onChange={(e) => setPartQuantity(e.target.value)}
                  className="w-20"
                />
                <Button type="button" variant="outline" onClick={addPiece}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.pieces_utilisees.length > 0 && (
                <div className="space-y-2">
                  {formData.pieces_utilisees.map((piece) => (
                    <div key={piece.spare_part_id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                      <span>{piece.nom}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">x{piece.quantite}</Badge>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePiece(piece.spare_part_id)}>×</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.work_order_id || !formData.technicien || !formData.actions_realisees}
              className="bg-[#005F73] hover:bg-[#004C5C]"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
              Détails de l'intervention
            </DialogTitle>
          </DialogHeader>
          {selectedIntervention && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Date</p>
                  <p className="font-medium">{formatDate(selectedIntervention.date_intervention)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Technicien</p>
                  <p className="font-medium">{selectedIntervention.technicien}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Ordre de travail</p>
                  <p className="font-medium">{getWorkOrderTitle(selectedIntervention.work_order_id)}</p>
                </div>
                {selectedIntervention.duree_minutes && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Durée</p>
                    <p className="font-medium">{selectedIntervention.duree_minutes} minutes</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Actions réalisées</p>
                <p className="text-slate-700 mt-1">{selectedIntervention.actions_realisees}</p>
              </div>
              {selectedIntervention.observations && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Observations</p>
                  <p className="text-slate-700 mt-1">{selectedIntervention.observations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Interventions;
