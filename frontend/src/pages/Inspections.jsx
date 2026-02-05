import React, { useState, useEffect } from 'react';
import { inspectionsAPI, caissonAPI, equipmentsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, daysUntil, equipmentTypeLabels, periodiciteLabels } from '../lib/utils';
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
  Calendar
} from 'lucide-react';

const PERIODICITES = ['hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel', 'biannuel', 'triennal', 'quinquennal', 'decennal'];

const Inspections = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [saving, setSaving] = useState(false);
  
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
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
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
        <Button 
          onClick={openCreateModal}
          className="bg-[#005F73] hover:bg-[#004C5C]"
          data-testid="add-inspection-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau contrôle
        </Button>
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
                      <TableCell>{getStatusBadge(inspection.date_validite)}</TableCell>
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
                            <DropdownMenuItem onClick={() => openEditModal(inspection)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
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
              <Input
                id="titre"
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                placeholder="Ex: Contrôle annuel de sécurité"
                data-testid="input-titre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type_controle">Type de contrôle *</Label>
              <Input
                id="type_controle"
                name="type_controle"
                value={formData.type_controle}
                onChange={handleChange}
                placeholder="Ex: Inspection réglementaire"
                data-testid="input-type"
              />
            </div>
            <div className="space-y-2">
              <Label>Périodicité *</Label>
              <Select value={formData.periodicite} onValueChange={(v) => handleSelectChange('periodicite', v)}>
                <SelectTrigger data-testid="input-periodicite">
                  <SelectValue placeholder="Sélectionner une périodicité" />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICITES.map(p => (
                    <SelectItem key={p} value={p}>
                      {periodiciteLabels[p]}
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
        <DialogContent className="max-w-lg">
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
