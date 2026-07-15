import React, { useState, useEffect } from 'react';
import { documentsAPI, equipmentsAPI, contractorsAPI } from '../lib/api';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Loader2,
  Download,
  Eye,
  Upload,
  File,
  FileCheck,
  FileCog,
  FileWarning,
  FolderOpen
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TYPES_DOCUMENT = [
  { value: 'notice', label: 'Notice technique', icon: FileCog, color: 'bg-blue-100 text-blue-800' },
  { value: 'rapport', label: 'Rapport', icon: FileText, color: 'bg-green-100 text-green-800' },
  { value: 'certificat', label: 'Certificat', icon: FileCheck, color: 'bg-purple-100 text-purple-800' },
  { value: 'plan', label: 'Plan', icon: File, color: 'bg-orange-100 text-orange-800' },
  { value: 'procedure', label: 'Procédure', icon: FileText, color: 'bg-indigo-100 text-indigo-800' },
  { value: 'pv_controle', label: 'PV de contrôle', icon: FileCheck, color: 'bg-teal-100 text-teal-800' },
  { value: 'autre', label: 'Autre', icon: File, color: 'bg-gray-100 text-gray-800' },
];

const CATEGORIES = [
  { value: 'equipement', label: 'Équipement' },
  { value: 'securite', label: 'Sécurité' },
  { value: 'reglementaire', label: 'Réglementaire' },
  { value: 'formation', label: 'Formation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'qualite', label: 'Qualité' },
];

const getTypeInfo = (type) => TYPES_DOCUMENT.find(t => t.value === type) || { label: type, color: 'bg-gray-100 text-gray-800', icon: File };

const Documents = () => {
  const { canCreate, canDelete, isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Dialog states
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Upload form state
  const [uploadData, setUploadData] = useState({
    titre: '',
    type_document: 'notice',
    categorie: '',
    description: '',
    equipment_id: '',
    date_validite: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [documentsRes, equipmentsRes, contractorsRes] = await Promise.all([
        documentsAPI.getAll(),
        equipmentsAPI.getAll(),
        contractorsAPI.getAll(),
      ]);
      setDocuments(documentsRes.data);
      setEquipments(equipmentsRes.data);
      setContractors(contractorsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await documentsAPI.upload(selectedFile, uploadData);
      await fetchData();
      setIsUploadDialogOpen(false);
      resetUploadForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await documentsAPI.delete(selectedDocument.id);
      await fetchData();
      setIsDeleteDialogOpen(false);
      setSelectedDocument(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      titre: '',
      type_document: 'notice',
      categorie: '',
      description: '',
      equipment_id: '',
      date_validite: '',
    });
    setSelectedFile(null);
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadData.titre) {
        setUploadData({ ...uploadData, titre: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const getEquipmentName = (id) => {
    const eq = equipments.find(e => e.id === id);
    return eq ? `${eq.type} - ${eq.reference}` : null;
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const expDate = new Date(dateStr);
    const today = new Date();
    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 30;
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = 
      doc.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.type_document === filterType;
    const matchesCategory = filterCategory === 'all' || doc.categorie === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Stats by type
  const statsByType = TYPES_DOCUMENT.map(type => ({
    ...type,
    count: documents.filter(d => d.type_document === type.value).length,
  })).filter(t => t.count > 0);

  const totalDocs = documents.length;
  const expiringDocs = documents.filter(d => d.date_validite && isExpiringSoon(d.date_validite)).length;
  const expiredDocs = documents.filter(d => d.date_validite && isExpired(d.date_validite)).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Gestion Documentaire</h1>
          <p className="text-gray-500">Notices, rapports, certificats, plans et procédures</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetUploadForm(); setIsUploadDialogOpen(true); }}>
            <Upload className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total documents</p>
                <p className="text-2xl font-bold">{totalDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Certificats</p>
                <p className="text-2xl font-bold">
                  {documents.filter(d => d.type_document === 'certificat').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileWarning className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expirent bientôt</p>
                <p className="text-2xl font-bold">{expiringDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FileWarning className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expirés</p>
                <p className="text-2xl font-bold">{expiredDocs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents by Type */}
      {statsByType.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {statsByType.map((type) => {
            const Icon = type.icon;
            return (
              <Badge 
                key={type.value} 
                className={`${type.color} cursor-pointer`}
                onClick={() => setFilterType(filterType === type.value ? 'all' : type.value)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {type.label} ({type.count})
              </Badge>
            );
          })}
        </div>
      )}

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
              value={filterType}
              onValueChange={setFilterType}
              className="w-full sm:w-48"
              data-testid="filter-type-doc"
              placeholder="Type"
              options={[{ value: 'all', label: 'Tous les types' }, ...TYPES_DOCUMENT.map(t => ({ value: t.value, label: t.label }))]}
            />
            <SearchableSelect
              value={filterCategory}
              onValueChange={setFilterCategory}
              className="w-full sm:w-48"
              data-testid="filter-category-doc"
              placeholder="Catégorie"
              options={[{ value: 'all', label: 'Toutes les catégories' }, ...CATEGORIES.map(c => ({ value: c.value, label: c.label }))]}
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
                <TableHead>Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Équipement</TableHead>
                <TableHead>Date validité</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Aucun document trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const typeInfo = getTypeInfo(doc.type_document);
                  const Icon = typeInfo.icon;
                  const expired = doc.date_validite && isExpired(doc.date_validite);
                  const expiringSoon = doc.date_validite && isExpiringSoon(doc.date_validite);
                  
                  return (
                    <TableRow key={doc.id} className={expired ? 'bg-red-50' : expiringSoon ? 'bg-orange-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{doc.titre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {CATEGORIES.find(c => c.value === doc.categorie)?.label || '-'}
                      </TableCell>
                      <TableCell>{getEquipmentName(doc.equipment_id) || '-'}</TableCell>
                      <TableCell>
                        {doc.date_validite ? (
                          <span className={expired ? 'text-red-600 font-medium' : expiringSoon ? 'text-orange-600' : ''}>
                            {formatDate(doc.date_validite)}
                            {expired && ' (expiré)'}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{formatDate(doc.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.fichier_url && (
                              <>
                                <DropdownMenuItem asChild>
                                  <a href={`${API_URL}${doc.fichier_url}`} target="_blank" rel="noopener noreferrer">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualiser
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={`${API_URL}${doc.fichier_url}`} download={doc.fichier_nom}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Télécharger
                                  </a>
                                </DropdownMenuItem>
                              </>
                            )}
                            {canDelete && (
                              <DropdownMenuItem 
                                onClick={() => { setSelectedDocument(doc); setIsDeleteDialogOpen(true); }}
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

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => { setIsUploadDialogOpen(open); if (!open) resetUploadForm(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            {/* File upload */}
            <div className="space-y-2">
              <Label>Fichier *</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? (
                      <span className="text-green-600 font-medium">{selectedFile.name}</span>
                    ) : (
                      'Cliquez pour sélectionner un fichier'
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, Images</p>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titre">Titre *</Label>
                <Input
                  id="titre"
                  value={uploadData.titre}
                  onChange={(e) => setUploadData({ ...uploadData, titre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type_document">Type *</Label>
                <SearchableSelect
                  value={uploadData.type_document}
                  onValueChange={(value) => setUploadData({ ...uploadData, type_document: value })}
                  data-testid="input-type-document"
                  options={TYPES_DOCUMENT.map(t => ({ value: t.value, label: t.label }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categorie">Catégorie</Label>
                <SearchableSelect
                  value={uploadData.categorie}
                  onValueChange={(value) => setUploadData({ ...uploadData, categorie: value })}
                  data-testid="input-categorie-doc"
                  placeholder="Sélectionner..."
                  options={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_validite">Date de validité</Label>
                <Input
                  id="date_validite"
                  type="date"
                  value={uploadData.date_validite}
                  onChange={(e) => setUploadData({ ...uploadData, date_validite: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipment_id">Équipement associé</Label>
              <SearchableSelect
                value={uploadData.equipment_id}
                onValueChange={(value) => setUploadData({ ...uploadData, equipment_id: value })}
                data-testid="input-equipment-doc"
                placeholder="Aucun"
                options={equipments.map(eq => ({ value: eq.id, label: `${eq.type} - ${eq.reference}` }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedFile}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Téléverser
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{selectedDocument?.titre}&quot; ?
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

export default Documents;
