import React, { useState, useEffect } from 'react';
import { contractsAPI, contractorsAPI, equipmentsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
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
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const TYPES_CONTRAT = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'controle', label: 'Contrôle réglementaire' },
  { value: 'fourniture', label: 'Fourniture' },
];

const STATUTS = [
  { value: 'actif', label: 'Actif', color: 'bg-green-100 text-green-800' },
  { value: 'suspendu', label: 'Suspendu', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'expire', label: 'Expiré', color: 'bg-red-100 text-red-800' },
  { value: 'resilie', label: 'Résilié', color: 'bg-gray-100 text-gray-800' },
];

const PERIODICITES = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
];

const XPF_TO_EUR = 0.00838;

const formatCurrency = (amount) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' XPF';
};

const getStatutInfo = (statut) => STATUTS.find(s => s.value === statut) || { label: statut, color: 'bg-gray-100 text-gray-800' };

const Contracts = () => {
  const { canCreate, canDelete, isAdmin } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    numero_contrat: '',
    titre: '',
    contractor_id: '',
    type_contrat: 'maintenance',
    date_debut: '',
    date_fin: '',
    montant_annuel: '',
    devise: 'XPF',
    periodicite_facturation: 'annuel',
    prestations_incluses: [],
    equipements_couverts: [],
    conditions_particulieres: '',
    statut: 'actif',
  });

  const [newPrestation, setNewPrestation] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsRes, contractorsRes, equipmentsRes] = await Promise.all([
        contractsAPI.getAll(),
        contractorsAPI.getAll(),
        equipmentsAPI.getAll(),
      ]);
      setContracts(contractsRes.data);
      setContractors(contractorsRes.data);
      setEquipments(equipmentsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const dataToSend = {
        ...formData,
        montant_annuel: formData.montant_annuel ? parseFloat(formData.montant_annuel) : null,
      };

      if (selectedContract) {
        await contractsAPI.update(selectedContract.id, dataToSend);
      } else {
        await contractsAPI.create(dataToSend);
      }
      await fetchData();
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await contractsAPI.delete(selectedContract.id);
      await fetchData();
      setIsDeleteDialogOpen(false);
      setSelectedContract(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openEditDialog = (contract) => {
    setSelectedContract(contract);
    setFormData({
      numero_contrat: contract.numero_contrat || '',
      titre: contract.titre || '',
      contractor_id: contract.contractor_id || '',
      type_contrat: contract.type_contrat || 'maintenance',
      date_debut: contract.date_debut || '',
      date_fin: contract.date_fin || '',
      montant_annuel: contract.montant_annuel || '',
      devise: contract.devise || 'XPF',
      periodicite_facturation: contract.periodicite_facturation || 'annuel',
      prestations_incluses: contract.prestations_incluses || [],
      equipements_couverts: contract.equipements_couverts || [],
      conditions_particulieres: contract.conditions_particulieres || '',
      statut: contract.statut || 'actif',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      numero_contrat: '',
      titre: '',
      contractor_id: '',
      type_contrat: 'maintenance',
      date_debut: '',
      date_fin: '',
      montant_annuel: '',
      devise: 'XPF',
      periodicite_facturation: 'annuel',
      prestations_incluses: [],
      equipements_couverts: [],
      conditions_particulieres: '',
      statut: 'actif',
    });
    setSelectedContract(null);
    setError('');
    setNewPrestation('');
  };

  const addPrestation = () => {
    if (newPrestation.trim()) {
      setFormData({
        ...formData,
        prestations_incluses: [...formData.prestations_incluses, newPrestation.trim()]
      });
      setNewPrestation('');
    }
  };

  const removePrestation = (index) => {
    setFormData({
      ...formData,
      prestations_incluses: formData.prestations_incluses.filter((_, i) => i !== index)
    });
  };

  const getContractorName = (id) => {
    const contractor = contractors.find(c => c.id === id);
    return contractor ? contractor.nom : '-';
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const endDate = new Date(dateStr);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 60;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const endDate = new Date(dateStr);
    return endDate < new Date();
  };

  // Filter contracts
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch = 
      contract.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.numero_contrat?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatut = filterStatut === 'all' || contract.statut === filterStatut;
    return matchesSearch && matchesStatut;
  });

  // Stats
  const stats = {
    total: contracts.length,
    actifs: contracts.filter(c => c.statut === 'actif').length,
    expirant: contracts.filter(c => c.statut === 'actif' && isExpiringSoon(c.date_fin)).length,
    montantTotal: contracts
      .filter(c => c.statut === 'actif')
      .reduce((sum, c) => sum + (c.montant_annuel || 0), 0),
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats de Maintenance</h1>
          <p className="text-gray-500">Gestion des contrats avec les prestataires</p>
        </div>
        {isAdmin() && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total contrats</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Actifs</p>
                <p className="text-2xl font-bold">{stats.actifs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expirent bientôt</p>
                <p className="text-2xl font-bold">{stats.expirant}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant annuel</p>
                <p className="text-xl font-bold">{formatCurrency(stats.montantTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <SearchableSelect
              value={filterStatut}
              onValueChange={setFilterStatut}
              className="w-full sm:w-40"
              data-testid="filter-statut-contract"
              placeholder="Statut"
              options={[{ value: 'all', label: 'Tous les statuts' }, ...STATUTS.map(s => ({ value: s.value, label: s.label }))]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Contrat</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Prestataire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant annuel</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Aucun contrat trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredContracts.map((contract) => {
                  const statutInfo = getStatutInfo(contract.statut);
                  const expiringSoon = contract.statut === 'actif' && isExpiringSoon(contract.date_fin);
                  const expired = isExpired(contract.date_fin);
                  
                  return (
                    <TableRow key={contract.id} className={expired ? 'bg-red-50' : expiringSoon ? 'bg-orange-50' : ''}>
                      <TableCell className="font-medium">{contract.numero_contrat}</TableCell>
                      <TableCell>{contract.titre}</TableCell>
                      <TableCell>{getContractorName(contract.contractor_id)}</TableCell>
                      <TableCell>
                        {TYPES_CONTRAT.find(t => t.value === contract.type_contrat)?.label || contract.type_contrat}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(contract.date_debut)}</div>
                          <div className="text-gray-500">au {formatDate(contract.date_fin)}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(contract.montant_annuel)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={statutInfo.color}>
                            {statutInfo.label}
                          </Badge>
                          {expiringSoon && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdmin() && (
                              <>
                                <DropdownMenuItem onClick={() => openEditDialog(contract)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => { setSelectedContract(contract); setIsDeleteDialogOpen(true); }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContract ? 'Modifier le contrat' : 'Nouveau contrat'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_contrat">N° Contrat *</Label>
                <Input
                  id="numero_contrat"
                  value={formData.numero_contrat}
                  onChange={(e) => setFormData({ ...formData, numero_contrat: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_contrat">Type *</Label>
                <SearchableSelect
                  value={formData.type_contrat}
                  onValueChange={(value) => setFormData({ ...formData, type_contrat: value })}
                  data-testid="input-type-contrat"
                  options={TYPES_CONTRAT.map(t => ({ value: t.value, label: t.label }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titre">Titre *</Label>
              <Input
                id="titre"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractor_id">Prestataire *</Label>
              <SearchableSelect
                value={formData.contractor_id}
                onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
                data-testid="input-contractor-contract"
                placeholder="Sélectionner un prestataire"
                options={contractors.map(c => ({ value: c.id, label: c.nom }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_debut">Date de début *</Label>
                <Input
                  id="date_debut"
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_fin">Date de fin *</Label>
                <Input
                  id="date_fin"
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montant_annuel">Montant annuel (XPF)</Label>
                <Input
                  id="montant_annuel"
                  type="number"
                  value={formData.montant_annuel}
                  onChange={(e) => setFormData({ ...formData, montant_annuel: e.target.value })}
                />
                {formData.montant_annuel && (
                  <p className="text-xs text-gray-500">
                    ≈ {(parseFloat(formData.montant_annuel) * XPF_TO_EUR).toFixed(2)} EUR
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodicite_facturation">Facturation</Label>
                <SearchableSelect
                  value={formData.periodicite_facturation}
                  onValueChange={(value) => setFormData({ ...formData, periodicite_facturation: value })}
                  data-testid="input-facturation"
                  options={PERIODICITES.map(p => ({ value: p.value, label: p.label }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <SearchableSelect
                  value={formData.statut}
                  onValueChange={(value) => setFormData({ ...formData, statut: value })}
                  data-testid="input-statut-contract"
                  options={STATUTS.map(s => ({ value: s.value, label: s.label }))}
                />
              </div>
            </div>

            {/* Prestations incluses */}
            <div className="space-y-2">
              <Label>Prestations incluses</Label>
              <div className="flex gap-2">
                <Input
                  value={newPrestation}
                  onChange={(e) => setNewPrestation(e.target.value)}
                  placeholder="Ajouter une prestation..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrestation())}
                />
                <Button type="button" variant="outline" onClick={addPrestation}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.prestations_incluses.map((p, i) => (
                  <Badge key={`${p}-${i}`} variant="secondary" className="cursor-pointer" onClick={() => removePrestation(i)}>
                    {p} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions_particulieres">Conditions particulières</Label>
              <Textarea
                id="conditions_particulieres"
                value={formData.conditions_particulieres}
                onChange={(e) => setFormData({ ...formData, conditions_particulieres: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedContract ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le contrat &quot;{selectedContract?.titre}&quot; ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contracts;
