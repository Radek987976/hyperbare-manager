import React, { useState, useEffect } from 'react';
import { budgetAPI, contractorsAPI } from '../lib/api';
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
  Calculator,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  Wrench,
  Shield,
  Package,
  RefreshCw,
  Download
} from 'lucide-react';

// Taux de conversion XPF -> EUR
const XPF_TO_EUR = 0.00838;

const CATEGORIES = [
  { value: 'maintenance_preventive', label: 'Maintenance préventive', color: 'bg-blue-100 text-blue-800', icon: Wrench },
  { value: 'maintenance_corrective', label: 'Maintenance corrective', color: 'bg-orange-100 text-orange-800', icon: RefreshCw },
  { value: 'controle_reglementaire', label: 'Contrôle réglementaire', color: 'bg-purple-100 text-purple-800', icon: Shield },
  { value: 'pieces_detachees', label: 'Pièces détachées', color: 'bg-green-100 text-green-800', icon: Package },
  { value: 'consommables', label: 'Consommables', color: 'bg-yellow-100 text-yellow-800', icon: Package },
  { value: 'prestation_externe', label: 'Prestation externe', color: 'bg-indigo-100 text-indigo-800', icon: Wrench },
  { value: 'renouvellement', label: 'Renouvellement équipement', color: 'bg-red-100 text-red-800', icon: RefreshCw },
];

const STATUTS = [
  { value: 'prevu', label: 'Prévu', color: 'bg-gray-100 text-gray-800' },
  { value: 'en_cours', label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'realise', label: 'Réalisé', color: 'bg-green-100 text-green-800' },
  { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-800' },
];

const getCategoryInfo = (cat) => CATEGORIES.find(c => c.value === cat) || { label: cat, color: 'bg-gray-100 text-gray-800' };
const getStatutInfo = (stat) => STATUTS.find(s => s.value === stat) || { label: stat, color: 'bg-gray-100 text-gray-800' };

const formatCurrency = (amount, currency = 'XPF') => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'EUR' ? 'EUR' : 'XPF',
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'EUR' ? 2 : 0,
  }).format(amount);
};

const Budget = () => {
  const { canCreate, canDelete } = useAuth();
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState('all');
  const [showInEur, setShowInEur] = useState(false);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    annee: selectedYear,
    categorie: 'maintenance_preventive',
    designation: '',
    description: '',
    periodicite: '',
    montant_prevu_xpf: '',
    date_prevue: '',
    statut: 'prevu',
    notes: '',
    contractor_id: '',
  });

  const years = [2024, 2025, 2026, 2027, 2028];

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryRes, contractorsRes] = await Promise.all([
        budgetAPI.getSummary(selectedYear),
        contractorsAPI.getAll(),
      ]);
      setSummary(summaryRes.data);
      setItems(summaryRes.data.items || []);
      setContractors(contractorsRes.data);
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
        annee: selectedYear,
        montant_prevu_xpf: parseFloat(formData.montant_prevu_xpf) || 0,
      };

      if (selectedItem) {
        await budgetAPI.update(selectedItem.id, dataToSend);
      } else {
        await budgetAPI.create(dataToSend);
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
      await budgetAPI.delete(selectedItem.id);
      await fetchData();
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openEditDialog = (item) => {
    setSelectedItem(item);
    setFormData({
      annee: item.annee || selectedYear,
      categorie: item.categorie || 'maintenance_preventive',
      designation: item.designation || '',
      description: item.description || '',
      periodicite: item.periodicite || '',
      montant_prevu_xpf: item.montant_prevu_xpf || '',
      date_prevue: item.date_prevue || '',
      statut: item.statut || 'prevu',
      notes: item.notes || '',
      contractor_id: item.contractor_id || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      annee: selectedYear,
      categorie: 'maintenance_preventive',
      designation: '',
      description: '',
      periodicite: '',
      montant_prevu_xpf: '',
      date_prevue: '',
      statut: 'prevu',
      notes: '',
      contractor_id: '',
    });
    setSelectedItem(null);
    setError('');
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    return filterCategory === 'all' || item.categorie === filterCategory;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Catégorie', 'Désignation', 'Périodicité', 'Montant XPF', 'Montant EUR', 'Statut'];
    const rows = filteredItems.map(item => [
      getCategoryInfo(item.categorie).label,
      item.designation,
      item.periodicite || '',
      item.montant_prevu_xpf || 0,
      (item.montant_prevu_xpf * XPF_TO_EUR).toFixed(2),
      getStatutInfo(item.statut).label,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `budget_previsionnel_${selectedYear}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
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
          <h1 className="text-2xl font-bold text-gray-900">Budget Prévisionnel</h1>
          <p className="text-gray-500">Planification budgétaire annuelle</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowInEur(!showInEur)}>
            {showInEur ? 'Afficher XPF' : 'Afficher EUR'}
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {canCreate && (
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Budget Total Prévu</p>
                <p className="text-3xl font-bold mt-1">
                  {showInEur 
                    ? formatCurrency(summary?.total_prevu_eur || 0, 'EUR')
                    : formatCurrency(summary?.total_prevu_xpf || 0, 'XPF')
                  }
                </p>
              </div>
              <Calculator className="h-10 w-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Réalisé</p>
                <p className="text-3xl font-bold mt-1">
                  {showInEur 
                    ? formatCurrency(summary?.total_realise_eur || 0, 'EUR')
                    : formatCurrency(summary?.total_realise_xpf || 0, 'XPF')
                  }
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Nombre de postes</p>
                <p className="text-3xl font-bold mt-1">{items.length}</p>
              </div>
              <Package className="h-10 w-10 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const catData = summary?.par_categorie?.[cat.value] || { prevu_xpf: 0, prevu_eur: 0, count: 0 };
              const Icon = cat.icon;
              return (
                <div key={cat.value} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${cat.color.split(' ')[0]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                  <p className="text-xl font-bold">
                    {showInEur 
                      ? formatCurrency(catData.prevu_eur, 'EUR')
                      : formatCurrency(catData.prevu_xpf, 'XPF')
                    }
                  </p>
                  <p className="text-xs text-gray-500">{catData.count} poste(s)</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Périodicité</TableHead>
                <TableHead className="text-right">Montant prévu</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Aucun poste budgétaire pour {selectedYear}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const catInfo = getCategoryInfo(item.categorie);
                  const statutInfo = getStatutInfo(item.statut);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={catInfo.color}>
                          {catInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">
                        {item.designation}
                      </TableCell>
                      <TableCell>{item.periodicite || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {showInEur 
                          ? formatCurrency(item.montant_prevu_xpf * XPF_TO_EUR, 'EUR')
                          : formatCurrency(item.montant_prevu_xpf, 'XPF')
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={statutInfo.color}>
                          {statutInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem 
                                onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}
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
              {selectedItem ? 'Modifier le poste budgétaire' : 'Nouveau poste budgétaire'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categorie">Catégorie *</Label>
                <Select 
                  value={formData.categorie} 
                  onValueChange={(value) => setFormData({ ...formData, categorie: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <Select 
                  value={formData.statut} 
                  onValueChange={(value) => setFormData({ ...formData, statut: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">Désignation *</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="montant_prevu_xpf">Montant prévu (XPF) *</Label>
                <Input
                  id="montant_prevu_xpf"
                  type="number"
                  value={formData.montant_prevu_xpf}
                  onChange={(e) => setFormData({ ...formData, montant_prevu_xpf: e.target.value })}
                  required
                />
                {formData.montant_prevu_xpf && (
                  <p className="text-xs text-gray-500">
                    ≈ {formatCurrency(parseFloat(formData.montant_prevu_xpf) * XPF_TO_EUR, 'EUR')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodicite">Périodicité</Label>
                <Input
                  id="periodicite"
                  value={formData.periodicite}
                  onChange={(e) => setFormData({ ...formData, periodicite: e.target.value })}
                  placeholder="ex: 1 mois, 1 an, 1000h..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_prevue">Date prévue</Label>
                <Input
                  id="date_prevue"
                  type="date"
                  value={formData.date_prevue}
                  onChange={(e) => setFormData({ ...formData, date_prevue: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractor_id">Fournisseur/Prestataire</Label>
              <Select 
                value={formData.contractor_id || undefined} 
                onValueChange={(value) => setFormData({ ...formData, contractor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  {contractors.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedItem ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le poste budgétaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{selectedItem?.designation}&quot; ?
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

export default Budget;
