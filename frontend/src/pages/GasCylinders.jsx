import React, { useState, useEffect } from 'react';
import { gasCylindersAPI, contractorsAPI } from '../lib/api';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Cylinder,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Droplets
} from 'lucide-react';

const GAS_TYPES = [
  { value: 'O2', label: 'Oxygène (O2)', color: 'bg-blue-100 text-blue-800' },
  { value: 'air_medicale', label: 'Air Médical', color: 'bg-green-100 text-green-800' },
  { value: 'heliox', label: 'Héliox', color: 'bg-purple-100 text-purple-800' },
  { value: 'nitrox', label: 'Nitrox', color: 'bg-orange-100 text-orange-800' },
];

const VOLUMES = ['B5', 'B50', 'B57'];

const STATUTS = [
  { value: 'pleine', label: 'Pleine', color: 'bg-green-100 text-green-800' },
  { value: 'en_cours', label: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'vide', label: 'Vide', color: 'bg-gray-100 text-gray-800' },
  { value: 'hors_service', label: 'Hors service', color: 'bg-red-100 text-red-800' },
];

const getGasTypeLabel = (type) => GAS_TYPES.find(t => t.value === type)?.label || type;
const getGasTypeColor = (type) => GAS_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
const getStatutColor = (statut) => STATUTS.find(s => s.value === statut)?.color || 'bg-gray-100 text-gray-800';
const getStatutLabel = (statut) => STATUTS.find(s => s.value === statut)?.label || statut;

const GasCylinders = () => {
  const { canCreate, canModify, canDelete } = useAuth();
  const [cylinders, setCylinders] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefillDialogOpen, setIsRefillDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCylinder, setSelectedCylinder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    numero_bouteille: '',
    type_gaz: 'O2',
    volume: 'B50',
    pression_service: '',
    fournisseur_id: '',
    localisation: '',
    date_remplissage: '',
    date_expiration_gaz: '',
    date_epreuve: '',
    date_prochaine_epreuve: '',
    statut: 'pleine',
    observations: '',
    agent_responsable: '',
  });

  // Refill form
  const [refillData, setRefillData] = useState({
    date_remplissage: new Date().toISOString().split('T')[0],
    date_expiration: '',
    pression: '',
    agent: '',
    observations: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cylindersRes, contractorsRes, alertsRes] = await Promise.all([
        gasCylindersAPI.getAll(),
        contractorsAPI.getAll(),
        gasCylindersAPI.getAlerts(),
      ]);
      setCylinders(cylindersRes.data);
      setContractors(contractorsRes.data.filter(c => c.type === 'fournisseur'));
      setAlerts(alertsRes.data);
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
      const dataToSend = { ...formData };
      if (dataToSend.pression_service) {
        dataToSend.pression_service = parseFloat(dataToSend.pression_service);
      }

      if (selectedCylinder) {
        await gasCylindersAPI.update(selectedCylinder.id, dataToSend);
      } else {
        await gasCylindersAPI.create(dataToSend);
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

  const handleRefill = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await gasCylindersAPI.refill(selectedCylinder.id, refillData);
      await fetchData();
      setIsRefillDialogOpen(false);
      setSelectedCylinder(null);
      setRefillData({
        date_remplissage: new Date().toISOString().split('T')[0],
        date_expiration: '',
        pression: '',
        agent: '',
        observations: '',
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await gasCylindersAPI.delete(selectedCylinder.id);
      await fetchData();
      setIsDeleteDialogOpen(false);
      setSelectedCylinder(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const openEditDialog = (cylinder) => {
    setSelectedCylinder(cylinder);
    setFormData({
      numero_bouteille: cylinder.numero_bouteille || '',
      type_gaz: cylinder.type_gaz || 'O2',
      volume: cylinder.volume || 'B50',
      pression_service: cylinder.pression_service || '',
      fournisseur_id: cylinder.fournisseur_id || '',
      localisation: cylinder.localisation || '',
      date_remplissage: cylinder.date_remplissage || '',
      date_expiration_gaz: cylinder.date_expiration_gaz || '',
      date_epreuve: cylinder.date_epreuve || '',
      date_prochaine_epreuve: cylinder.date_prochaine_epreuve || '',
      statut: cylinder.statut || 'pleine',
      observations: cylinder.observations || '',
      agent_responsable: cylinder.agent_responsable || '',
    });
    setIsDialogOpen(true);
  };

  const openRefillDialog = (cylinder) => {
    setSelectedCylinder(cylinder);
    setRefillData({
      date_remplissage: new Date().toISOString().split('T')[0],
      date_expiration: '',
      pression: cylinder.pression_service || '',
      agent: '',
      observations: '',
    });
    setIsRefillDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      numero_bouteille: '',
      type_gaz: 'O2',
      volume: 'B50',
      pression_service: '',
      fournisseur_id: '',
      localisation: '',
      date_remplissage: '',
      date_expiration_gaz: '',
      date_epreuve: '',
      date_prochaine_epreuve: '',
      statut: 'pleine',
      observations: '',
      agent_responsable: '',
    });
    setSelectedCylinder(null);
    setError('');
  };

  // Filter cylinders
  const filteredCylinders = cylinders.filter((cylinder) => {
    const matchesSearch = 
      cylinder.numero_bouteille?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cylinder.localisation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || cylinder.type_gaz === filterType;
    const matchesStatut = filterStatut === 'all' || cylinder.statut === filterStatut;
    return matchesSearch && matchesType && matchesStatut;
  });

  // Stats by gas type
  const statsByType = GAS_TYPES.map(type => ({
    ...type,
    count: cylinders.filter(c => c.type_gaz === type.value).length,
    pleine: cylinders.filter(c => c.type_gaz === type.value && c.statut === 'pleine').length,
    vide: cylinders.filter(c => c.type_gaz === type.value && c.statut === 'vide').length,
  }));

  const totalAlerts = alerts ? 
    alerts.gaz_expire.length + alerts.epreuve_expire.length + 
    alerts.gaz_expire_30j.length + alerts.epreuve_expire_90j.length : 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Bouteilles de Gaz</h1>
          <p className="text-gray-500">Suivi des bouteilles O2, Air Médical, Héliox, Nitrox</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle bouteille
          </Button>
        )}
      </div>

      {/* Alerts Banner */}
      {totalAlerts > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  {totalAlerts} alerte(s) sur les bouteilles de gaz
                </p>
                <p className="text-sm text-orange-600">
                  {alerts?.gaz_expire.length > 0 && `${alerts.gaz_expire.length} gaz expiré(s), `}
                  {alerts?.epreuve_expire.length > 0 && `${alerts.epreuve_expire.length} épreuve(s) expirée(s), `}
                  {alerts?.gaz_expire_30j.length > 0 && `${alerts.gaz_expire_30j.length} gaz expire dans 30j, `}
                  {alerts?.epreuve_expire_90j.length > 0 && `${alerts.epreuve_expire_90j.length} épreuve dans 90j`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats by Type */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsByType.map((type) => (
          <Card key={type.value}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.color.replace('text-', 'bg-').split(' ')[0]}`}>
                    <Cylinder className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{type.label}</p>
                    <p className="text-2xl font-bold">{type.count}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-green-600">{type.pleine} pleine(s)</div>
                  <div className="text-gray-500">{type.vide} vide(s)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Toutes ({cylinders.length})</TabsTrigger>
          <TabsTrigger value="alerts" className="text-orange-600">
            Alertes ({totalAlerts})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par numéro ou localisation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type de gaz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les gaz</SelectItem>
                    {GAS_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatut} onValueChange={setFilterStatut}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {STATUTS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Bouteille</TableHead>
                    <TableHead>Type de gaz</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Expiration gaz</TableHead>
                    <TableHead>Prochaine épreuve</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCylinders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Aucune bouteille trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCylinders.map((cylinder) => (
                      <TableRow key={cylinder.id}>
                        <TableCell className="font-medium">{cylinder.numero_bouteille}</TableCell>
                        <TableCell>
                          <Badge className={getGasTypeColor(cylinder.type_gaz)}>
                            {getGasTypeLabel(cylinder.type_gaz)}
                          </Badge>
                        </TableCell>
                        <TableCell>{cylinder.volume}</TableCell>
                        <TableCell>
                          <Badge className={getStatutColor(cylinder.statut)}>
                            {getStatutLabel(cylinder.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell>{cylinder.localisation || '-'}</TableCell>
                        <TableCell>
                          {cylinder.date_expiration_gaz ? (
                            <span className={
                              new Date(cylinder.date_expiration_gaz) < new Date() 
                                ? 'text-red-600 font-medium' 
                                : ''
                            }>
                              {formatDate(cylinder.date_expiration_gaz)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {cylinder.date_prochaine_epreuve ? (
                            <span className={
                              new Date(cylinder.date_prochaine_epreuve) < new Date() 
                                ? 'text-red-600 font-medium' 
                                : ''
                            }>
                              {formatDate(cylinder.date_prochaine_epreuve)}
                            </span>
                          ) : '-'}
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
                                <>
                                  <DropdownMenuItem onClick={() => openRefillDialog(cylinder)}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Enregistrer remplissage
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(cylinder)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                </>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  onClick={() => { setSelectedCylinder(cylinder); setIsDeleteDialogOpen(true); }}
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
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts && (
            <>
              {alerts.gaz_expire.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Gaz expiré ({alerts.gaz_expire.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.gaz_expire.map((cyl) => (
                        <div key={cyl.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span>{cyl.numero_bouteille} - {getGasTypeLabel(cyl.type_gaz)}</span>
                          <span className="text-red-600 font-medium">Expiré depuis {cyl.jours_depasses} jour(s)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {alerts.epreuve_expire.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Épreuve expirée ({alerts.epreuve_expire.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.epreuve_expire.map((cyl) => (
                        <div key={cyl.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span>{cyl.numero_bouteille} - {getGasTypeLabel(cyl.type_gaz)}</span>
                          <span className="text-red-600 font-medium">Expirée depuis {cyl.jours_depasses} jour(s)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {alerts.gaz_expire_30j.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-orange-600 flex items-center gap-2">
                      <Droplets className="h-5 w-5" />
                      Gaz expire dans 30 jours ({alerts.gaz_expire_30j.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.gaz_expire_30j.map((cyl) => (
                        <div key={cyl.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <span>{cyl.numero_bouteille} - {getGasTypeLabel(cyl.type_gaz)}</span>
                          <span className="text-orange-600">Dans {cyl.jours_restants} jour(s)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {alerts.epreuve_expire_90j.length > 0 && (
                <Card className="border-yellow-200">
                  <CardHeader>
                    <CardTitle className="text-yellow-700 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Épreuve dans 90 jours ({alerts.epreuve_expire_90j.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {alerts.epreuve_expire_90j.map((cyl) => (
                        <div key={cyl.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <span>{cyl.numero_bouteille} - {getGasTypeLabel(cyl.type_gaz)}</span>
                          <span className="text-yellow-700">Dans {cyl.jours_restants} jour(s)</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {totalAlerts === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500">
                    <Cylinder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    Aucune alerte en cours
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCylinder ? 'Modifier la bouteille' : 'Nouvelle bouteille'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_bouteille">N° Bouteille *</Label>
                <Input
                  id="numero_bouteille"
                  value={formData.numero_bouteille}
                  onChange={(e) => setFormData({ ...formData, numero_bouteille: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_gaz">Type de gaz *</Label>
                <Select 
                  value={formData.type_gaz} 
                  onValueChange={(value) => setFormData({ ...formData, type_gaz: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAS_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="volume">Volume</Label>
                <Select 
                  value={formData.volume} 
                  onValueChange={(value) => setFormData({ ...formData, volume: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUMES.map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pression_service">Pression service (bars)</Label>
                <Input
                  id="pression_service"
                  type="number"
                  value={formData.pression_service}
                  onChange={(e) => setFormData({ ...formData, pression_service: e.target.value })}
                />
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
              <div className="space-y-2">
                <Label htmlFor="localisation">Localisation</Label>
                <Input
                  id="localisation"
                  value={formData.localisation}
                  onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                  placeholder="ex: TAB, Rampe, Réserve..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_remplissage">Date de remplissage</Label>
                <Input
                  id="date_remplissage"
                  type="date"
                  value={formData.date_remplissage}
                  onChange={(e) => setFormData({ ...formData, date_remplissage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_expiration_gaz">Date d&apos;expiration du gaz</Label>
                <Input
                  id="date_expiration_gaz"
                  type="date"
                  value={formData.date_expiration_gaz}
                  onChange={(e) => setFormData({ ...formData, date_expiration_gaz: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_epreuve">Dernière épreuve</Label>
                <Input
                  id="date_epreuve"
                  type="date"
                  value={formData.date_epreuve}
                  onChange={(e) => setFormData({ ...formData, date_epreuve: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_prochaine_epreuve">Prochaine épreuve (requalification)</Label>
                <Input
                  id="date_prochaine_epreuve"
                  type="date"
                  value={formData.date_prochaine_epreuve}
                  onChange={(e) => setFormData({ ...formData, date_prochaine_epreuve: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent_responsable">Agent responsable</Label>
              <Input
                id="agent_responsable"
                value={formData.agent_responsable}
                onChange={(e) => setFormData({ ...formData, agent_responsable: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedCylinder ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Refill Dialog */}
      <Dialog open={isRefillDialogOpen} onOpenChange={setIsRefillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Enregistrer un remplissage - {selectedCylinder?.numero_bouteille}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRefill} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refill_date">Date de remplissage *</Label>
                <Input
                  id="refill_date"
                  type="date"
                  value={refillData.date_remplissage}
                  onChange={(e) => setRefillData({ ...refillData, date_remplissage: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refill_expiration">Date d&apos;expiration *</Label>
                <Input
                  id="refill_expiration"
                  type="date"
                  value={refillData.date_expiration}
                  onChange={(e) => setRefillData({ ...refillData, date_expiration: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refill_pression">Pression (bars)</Label>
                <Input
                  id="refill_pression"
                  type="number"
                  value={refillData.pression}
                  onChange={(e) => setRefillData({ ...refillData, pression: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refill_agent">Agent *</Label>
                <Input
                  id="refill_agent"
                  value={refillData.agent}
                  onChange={(e) => setRefillData({ ...refillData, agent: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refill_observations">Observations</Label>
              <Textarea
                id="refill_observations"
                value={refillData.observations}
                onChange={(e) => setRefillData({ ...refillData, observations: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRefillDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la bouteille ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la bouteille &quot;{selectedCylinder?.numero_bouteille}&quot; ?
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

export default GasCylinders;
