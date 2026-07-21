import React, { useState, useEffect } from 'react';
import { contractorsAPI, equipmentTypesAPI } from '../lib/api';
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
import { useColumnFilters, useSessionState, applyTableFilters, distinctValues, ColumnFilter } from '../components/ui/table-column-filter';
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
  Building2,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Wrench,
  Package,
  Shield,
  X
} from 'lucide-react';

const TYPES = [
  { value: 'prestataire', label: 'Prestataire', icon: Wrench },
  { value: 'fournisseur', label: 'Fournisseur', icon: Package },
  { value: 'organisme_controle', label: 'Organisme de contrôle', icon: Shield },
];

const typeLabels = {
  prestataire: 'Prestataire',
  fournisseur: 'Fournisseur',
  organisme_controle: 'Organisme de contrôle',
};

const typeColors = {
  prestataire: 'bg-blue-100 text-blue-800',
  fournisseur: 'bg-green-100 text-green-800',
  organisme_controle: 'bg-purple-100 text-purple-800',
};

const Contractors = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [contractors, setContractors] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useSessionState('contractors:search', '');
  const { sort: colSort, setSort: setColSort, filters: colFilters, setColumnFilter: setColColumnFilter, clearAll: clearColFilters, hasActive: hasColFilters } = useColumnFilters({ key: 'nom', dir: 'asc' }, 'contractors:cols');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    type: 'prestataire',
    specialite: '',
    specialites: [],
    contact_nom: '',
    contact_email: '',
    contact_telephone: '',
    adresse: '',
    siret: '',
    notes: '',
  });

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const [response, typesRes] = await Promise.all([
        contractorsAPI.getAll(),
        equipmentTypesAPI.getAll(),
      ]);
      setContractors(response.data);
      setEquipmentTypes((typesRes.data || []).map(t => t.nom).sort((a, b) => a.localeCompare(b, 'fr')));
    } catch (err) {
      console.error('Error fetching contractors:', err);
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
      if (selectedContractor) {
        await contractorsAPI.update(selectedContractor.id, formData);
      } else {
        await contractorsAPI.create(formData);
      }
      await fetchContractors();
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
      await contractorsAPI.delete(selectedContractor.id);
      await fetchContractors();
      setIsDeleteDialogOpen(false);
      setSelectedContractor(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openEditDialog = (contractor) => {
    setSelectedContractor(contractor);
    setFormData({
      nom: contractor.nom || '',
      type: contractor.type || 'prestataire',
      specialite: contractor.specialite || '',
      specialites: contractor.specialites || (contractor.specialite ? [contractor.specialite] : []),
      contact_nom: contractor.contact_nom || '',
      contact_email: contractor.contact_email || '',
      contact_telephone: contractor.contact_telephone || '',
      adresse: contractor.adresse || '',
      siret: contractor.siret || '',
      notes: contractor.notes || '',
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (contractor) => {
    setSelectedContractor(contractor);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      type: 'prestataire',
      specialite: '',
      specialites: [],
      contact_nom: '',
      contact_email: '',
      contact_telephone: '',
      adresse: '',
      siret: '',
      notes: '',
    });
    setSelectedContractor(null);
    setError('');
  };

  // Filter contractors
  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch = 
      contractor.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contractor.specialite?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contractor.specialites || []).some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contractor.contact_nom?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const coColumns = {
    nom: (c) => c.nom,
    type: (c) => typeLabels[c.type] || c.type,
    specialite: (c) => (c.specialites && c.specialites.length ? c.specialites.join(', ') : (c.specialite || '-')),
    contact_nom: (c) => c.contact_nom || '-',
    contact_telephone: (c) => c.contact_telephone || '-',
  };
  const coDistinct = (key) => distinctValues(filteredContractors, coColumns, key, colFilters);
  const displayContractors = applyTableFilters(filteredContractors, coColumns, { filters: colFilters, sort: colSort });

  // Stats
  const stats = {
    total: contractors.length,
    prestataires: contractors.filter(c => c.type === 'prestataire').length,
    fournisseurs: contractors.filter(c => c.type === 'fournisseur').length,
    organismes: contractors.filter(c => c.type === 'organisme_controle').length,
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
          <h1 className="text-2xl font-bold text-gray-900">Prestataires & Fournisseurs</h1>
          <p className="text-gray-500">Gestion des prestataires, fournisseurs et organismes de contrôle</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau prestataire
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Prestataires</p>
                <p className="text-2xl font-bold">{stats.prestataires}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Fournisseurs</p>
                <p className="text-2xl font-bold">{stats.fournisseurs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Organismes</p>
                <p className="text-2xl font-bold">{stats.organismes}</p>
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
                data-testid="search-input"
              />
            </div>
            {(searchTerm || hasColFilters) && (
              <Button variant="ghost" onClick={() => { setSearchTerm(''); clearColFilters(); }} className="shrink-0" data-testid="clear-filters-btn">
                <X className="w-4 h-4 mr-1" /> Effacer tous les filtres
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">Astuce : cliquez sur l'icône entonnoir dans chaque colonne pour trier et filtrer comme dans Excel.</p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><ColumnFilter label="Nom" columnKey="nom" values={coDistinct('nom')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Type" columnKey="type" values={coDistinct('type')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Spécialité" columnKey="specialite" values={coDistinct('specialite')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Contact" columnKey="contact_nom" values={coDistinct('contact_nom')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead><ColumnFilter label="Téléphone" columnKey="contact_telephone" values={coDistinct('contact_telephone')} filters={colFilters} sort={colSort} setSort={setColSort} setColumnFilter={setColColumnFilter} /></TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayContractors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Aucun prestataire trouvé
                  </TableCell>
                </TableRow>
              ) : (
                displayContractors.map((contractor) => (
                  <TableRow key={contractor.id}>
                    <TableCell className="font-medium">{contractor.nom}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[contractor.type]}>
                        {typeLabels[contractor.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(contractor.specialites && contractor.specialites.length > 0) ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {contractor.specialites.map((s) => (
                            <Badge key={s} variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">{s}</Badge>
                          ))}
                        </div>
                      ) : (contractor.specialite || '-')}
                    </TableCell>
                    <TableCell>
                      {contractor.contact_nom && (
                        <div className="text-sm">
                          <div>{contractor.contact_nom}</div>
                          {contractor.contact_email && (
                            <div className="text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contractor.contact_email}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {contractor.contact_telephone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {contractor.contact_telephone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canModify && (
                            <DropdownMenuItem onClick={() => openEditDialog(contractor)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(contractor)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContractor ? 'Modifier le prestataire' : 'Nouveau prestataire'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <SearchableSelect
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  data-testid="input-type-contractor"
                  options={TYPES.map(type => ({ value: type.value, label: type.label }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Spécialités (types d'équipements)</Label>
              <p className="text-xs text-gray-500">Sélectionnez les types d'équipements pris en charge. Utilisé pour filtrer les prestataires proposés lors d'une intervention.</p>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md max-h-48 overflow-y-auto" data-testid="contractor-specialites">
                {equipmentTypes.length === 0 ? (
                  <span className="text-sm text-gray-400">Aucun type d'équipement défini</span>
                ) : equipmentTypes.map((type) => {
                  const active = formData.specialites.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      data-testid={`specialite-toggle-${type}`}
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        specialites: active
                          ? prev.specialites.filter((s) => s !== type)
                          : [...prev.specialites, type],
                      }))}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${active ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'}`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_nom">Nom du contact</Label>
                <Input
                  id="contact_nom"
                  value={formData.contact_nom}
                  onChange={(e) => setFormData({ ...formData, contact_nom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_telephone">Téléphone</Label>
                <Input
                  id="contact_telephone"
                  value={formData.contact_telephone}
                  onChange={(e) => setFormData({ ...formData, contact_telephone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET / N° identification</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Textarea
                id="adresse"
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedContractor ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le prestataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{selectedContractor?.nom}&quot; ?
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

export default Contractors;
