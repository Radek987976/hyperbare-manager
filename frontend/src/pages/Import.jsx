import React, { useState } from 'react';
import { importAPI, interventionsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SearchableSelect } from '../components/ui/searchable-select';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
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
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  Database,
  AlertTriangle,
  Info,
  Download,
  ArrowRightLeft,
  Search
} from 'lucide-react';

const IMPORT_TYPES = [
  { 
    value: 'prestataires', 
    label: 'Prestataires & Fournisseurs', 
    description: 'Importer la liste des prestataires, fournisseurs et organismes de contrôle. Colonnes : NOM, TYPE (prestataire/fournisseur/organisme_controle), SPECIALITES (types d\'équipements séparés par ;), CONTACT_NOM, EMAIL, TELEPHONE, ADRESSE, SIRET, NOTES. Anti-doublon par NOM.',
    icon: '🏢'
  },
  { 
    value: 'bouteilles', 
    label: 'Bouteilles de gaz', 
    description: 'Importer le suivi des bouteilles. Colonnes : N°_BOUTEILLE, TYPE_DE_GAZ (O2 / Air Médical / Héliox / Nitrox / Air Respirable ou type personnalisé), VOLUME, PRESSION_DE_SERVICE, STATUT (Pleine/En cours/Vide/Hors service), LOCALISATION, DATE_DE_REMPLISSAGE, DATE_D\'EXPIRATION, DATE_D\'EPREUVE, PROCHAINE_EPREUVE, OBSERVATIONS, NOM_AGENT. Anti-doublon par N° + type (mise à jour si déjà présent).',
    icon: '🔵'
  },
  { 
    value: 'budget', 
    label: 'Budget prévisionnel', 
    description: 'Importer les postes budgétaires depuis le fichier de dépenses prévisionnelles',
    icon: '💰'
  },
  { 
    value: 'maintenance', 
    label: 'Maintenances préventives', 
    description: 'Importer les maintenances préventives récurrentes. Colonnes : EQUIPEMENT, TITRE, DESCRIPTION, PERIODICITE_JOURS, PERIODICITE_HEURES, DATE_PLANIFIEE, PRIORITE, TECHNICIEN.',
    icon: '🔧'
  },
  { 
    value: 'controles', 
    label: 'Contrôles périodiques', 
    description: 'Importer les contrôles réglementaires. Colonnes : EQUIPEMENT, TITRE, TYPE_CONTROLE, PERIODICITE (annuel/biannuel...), DATE_REALISATION, ORGANISME, RESULTAT, OBSERVATIONS.',
    icon: '📋'
  },
  {
    value: 'equipements',
    label: 'Équipements',
    description: 'Importer une base d\'équipements (REFERENCE, TYPE, N_SERIE, CRITICITE, STATUT...). Colonnes en 1re ligne.',
    icon: '🛠️'
  },
  {
    value: 'sous-equipements',
    label: 'Sous-équipements (soupapes, manomètres, déverseurs)',
    description: 'Importer les sous-équipements rattachés à un ou plusieurs équipements parents. Colonnes : PARENT_EQUIPEMENT (plusieurs parents possibles séparés par « ; »), NOM, REFERENCE, N_SERIE, DATE_INSTALLATION, STATUT, DESCRIPTION.',
    icon: '⚙️'
  },
  {
    value: 'interventions',
    label: 'Interventions (base de données)',
    description: 'Importer l\'historique complet des interventions, rattachées par EQUIPEMENT ou N_SERIE (ou nom d\'un sous-équipement). Colonnes: EQUIPEMENT, TYPE (curative/preventive), DATE, INTERVENANT, DESIGNATION/MOTIF, ACTIONS_REALISEES, OBSERVATION, PIECES_UTILISEES, COMPTEUR_HORAIRE.',
    icon: '📝'
  },
  {
    value: 'pieces',
    label: 'Pièces détachées (stock)',
    description: 'Importer le stock de pièces détachées. Colonnes : NOM, REFERENCE_FABRICANT, TYPE_EQUIPEMENT, QUANTITE_STOCK, SEUIL_MINIMUM, EMPLACEMENT, FOURNISSEUR, PRIX_UNITAIRE. Anti-doublon par référence fabricant.',
    icon: '📦'
  },
];

const Import = () => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isCorrelating, setIsCorrelating] = useState(false);
  const [correlationPreview, setCorrelationPreview] = useState(null);
  // Transfert maintenances -> contrôles réglementaires
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferQ, setTransferQ] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [transferApplying, setTransferApplying] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const openTransfer = async () => {
    setTransferOpen(true);
    setSelectedIds([]);
    setTransferQ('');
    await loadCandidates('');
  };

  const loadCandidates = async (q) => {
    setTransferLoading(true);
    setError('');
    try {
      const res = await importAPI.transferCandidates(q);
      setCandidates(res.data.candidates || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTransferLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map(c => c.id));
    }
  };

  const applyTransfer = async () => {
    setTransferApplying(true);
    setError('');
    try {
      const res = await importAPI.transferToInspections(selectedIds);
      setResult({ type: 'transfer', message: `${res.data.transferred} maintenance(s) transférée(s) vers les contrôles réglementaires.`, imported: res.data.transferred, errors: res.data.errors });
      setConfirmTransfer(false);
      setTransferOpen(false);
      setSelectedIds([]);
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmTransfer(false);
    } finally {
      setTransferApplying(false);
    }
  };

  const handleCorrelatePreview = async () => {
    setIsCorrelating(true);
    setError('');
    setResult(null);
    try {
      const res = await importAPI.correlateInterventions(false);
      setCorrelationPreview(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCorrelating(false);
    }
  };

  const handleCorrelateApply = async () => {
    setIsCorrelating(true);
    setError('');
    try {
      const res = await importAPI.correlateInterventions(true);
      setResult({ type: 'correlate', message: `${res.data.matched} intervention(s) rattachée(s) à leur maintenance préventive.`, imported: res.data.matched });
      setCorrelationPreview(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCorrelating(false);
    }
  };

  const handleCleanupFakeCorrective = async () => {
    if (!window.confirm('Supprimer les faux ordres correctifs pollués (« Formation CAH », « Y_Dépannage », « Y_Mise en service ») ? Les interventions réelles ne sont pas touchées.')) return;
    setIsCleaning(true);
    setError('');
    try {
      const res = await interventionsAPI.cleanupFakeCorrective();
      setResult({ type: 'cleanup', message: `${res.data.deleted} faux ordre(s) correctif(s) supprimé(s).`, imported: res.data.deleted });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!/\.(xlsx|xls|csv|numbers)$/i.test(file.name)) {
        setError('Format non supporté. Utilisez .xlsx, .csv ou .numbers');
        return;
      }
      setSelectedFile(file);
      setError('');
      setResult(null);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/import/template/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Téléchargement impossible');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modele_import_${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Impossible de télécharger le modèle.');
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedType) {
      setError('Veuillez sélectionner un type d\'import et un fichier');
      return;
    }

    setIsUploading(true);
    setError('');
    setResult(null);

    try {
      const response = await importAPI.excel(selectedFile, selectedType);
      setResult(response.data);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleInitDefaultData = async () => {
    setIsInitializing(true);
    setError('');

    try {
      const response = await importAPI.initDefaultData();
      setResult({
        type: 'init',
        message: response.data.message,
        imported: response.data.results.contractors + response.data.results.templates,
        details: response.data.results
      });
      setIsInitDialogOpen(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsInitializing(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Accès restreint</h2>
            <p className="text-gray-500">
              L&apos;import de données est réservé aux administrateurs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import de données</h1>
        <p className="text-gray-500">Importer des données depuis des fichiers Excel</p>
      </div>

      {/* Initialize Default Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Initialisation des données de base
          </CardTitle>
          <CardDescription>
            Créer les prestataires par défaut et les modèles de PV de contrôle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>Cette action va créer :</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Les prestataires standards (Bauer, Comex, Métrologie de Tahiti, etc.)</li>
                <li>Les modèles de PV (Analyse air, Contrôle annuel, Étalonnage...)</li>
              </ul>
            </div>
            <Button onClick={() => setIsInitDialogOpen(true)}>
              <Database className="h-4 w-4 mr-2" />
              Initialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nettoyage des données */}
      <Card className="border-red-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Maintenance des données
          </CardTitle>
          <CardDescription>
            Supprimer les faux ordres de travail correctifs issus d'anciens imports (« Formation CAH », « Y_Dépannage », « Y_Mise en service »)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Les formations ne sont pas des maintenances : cette action retire uniquement les ordres correctifs parasites. Vos interventions réelles restent intactes.
            </p>
            <Button variant="outline" onClick={handleCleanupFakeCorrective} disabled={isCleaning}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0" data-testid="cleanup-fake-corrective-btn">
              {isCleaning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Nettoyer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Corrélation interventions ↔ maintenances préventives */}
      <Card className="border-teal-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-600" />
            Corréler interventions ↔ maintenances préventives
          </CardTitle>
          <CardDescription>
            Rattache automatiquement les interventions non liées à la maintenance préventive correspondante (même équipement, titre similaire à l'action).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Évite d'ouvrir chaque intervention terminée pour choisir sa maintenance. Un aperçu vous montre le nombre de correspondances avant d'appliquer.
            </p>
            <Button variant="outline" onClick={handleCorrelatePreview} disabled={isCorrelating}
              className="text-teal-700 border-teal-200 hover:bg-teal-50 shrink-0" data-testid="correlate-preview-btn">
              {isCorrelating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Aperçu de la corrélation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfert maintenances -> contrôles réglementaires */}
      <Card className="border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
            Transférer des maintenances vers les Contrôles réglementaires
          </CardTitle>
          <CardDescription>
            Reclasse une ou plusieurs maintenances préventives en contrôles réglementaires. Tout l'historique des interventions liées devient l'historique du contrôle, et la maintenance d'origine est retirée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Utile pour les entrées importées comme « maintenance » qui sont en réalité des contrôles réglementaires (visite annuelle, requalification, contrôle d'un organisme...).
            </p>
            <Button variant="outline" onClick={openTransfer} disabled={transferApplying}
              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 shrink-0" data-testid="open-transfer-btn">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Sélectionner à transférer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Excel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Excel
          </CardTitle>
          <CardDescription>
            Importer des données depuis un fichier Excel (.xlsx), CSV ou Numbers (.numbers)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Type selection */}
          <div className="space-y-2">
            <Label>Type d&apos;import *</Label>
            <SearchableSelect
              value={selectedType}
              onValueChange={setSelectedType}
              placeholder="Sélectionner le type de données à importer"
              options={IMPORT_TYPES.map(type => ({ value: type.value, label: `${type.icon} ${type.label}` }))}
            />
            {selectedType && (
              <p className="text-sm text-gray-500">
                {IMPORT_TYPES.find(t => t.value === selectedType)?.description}
              </p>
            )}
            {['equipements', 'sous-equipements', 'interventions', 'maintenance', 'controles', 'pieces', 'prestataires', 'bouteilles'].includes(selectedType) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(selectedType)}
                className="mt-2 border-[#005F73] text-[#005F73] hover:bg-[#005F73]/5"
                data-testid="download-template-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger le modèle (.xlsx)
              </Button>
            )}
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Fichier Excel *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv,.numbers"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? (
                    <span className="text-green-600 font-medium">{selectedFile.name}</span>
                  ) : (
                    'Cliquez pour sélectionner un fichier ou glissez-déposez'
                  )}
                </p>
                <p className="text-xs text-gray-400">Fichiers acceptés : .xlsx, .csv, .numbers (Mac)</p>
              </label>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
              <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              result.errors?.length > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'
            }`}>
              <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {['init', 'transfer', 'correlate', 'cleanup'].includes(result.type)
                    ? result.message 
                    : `Import terminé : ${result.imported} élément(s) importé(s)`
                  }
                </p>
                {result.details && (
                  <p className="text-sm mt-1">
                    {result.details.contractors} prestataires, {result.details.templates} modèles de PV
                  </p>
                )}
                {result.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Erreurs ({result.errors.length}) :</p>
                    <ul className="text-sm list-disc list-inside mt-1">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... et {result.errors.length - 5} autres erreurs</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit button */}
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || !selectedType || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importer les données
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900">Format des fichiers</h4>
            <p>Les fichiers Excel doivent contenir les colonnes correspondant au type de données importées. Le système essaiera de mapper automatiquement les colonnes.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Prestataires & Fournisseurs</h4>
            <p>Colonnes : <strong>NOM</strong>*, TYPE (prestataire/fournisseur/organisme_controle), <strong>SPECIALITES</strong> (types d'équipements séparés par « ; » — ex : « Extincteur hyperbare; Cuve incendie »), CONTACT_NOM, EMAIL, TELEPHONE, ADRESSE, SIRET, NOTES. Mise à jour si le NOM existe déjà.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Bouteilles de gaz</h4>
            <p>Colonnes recommandées : N° bouteille, Type de gaz, Volume, Agent responsable, Observations</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Budget prévisionnel</h4>
            <p>Colonnes recommandées : Désignation, Montant, Fréquence, Fournisseur</p>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900">Maintenances</h4>
            <p>Colonnes recommandées : Détail intervention, Périodicité, Observation technique</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">Équipements (base de données)</h4>
            <p>Colonnes : <strong>REFERENCE</strong>*, <strong>TYPE</strong>*, MARQUE, MODELE, N_SERIE, DATE_INSTALLATION (JJ/MM/AAAA), CRITICITE (critique/haute/normale/basse), STATUT (en_service/maintenance/hors_service/reforme), LOCALISATION, COMPTEUR_HORAIRE. Mise à jour si la REFERENCE existe déjà.</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900">Interventions (base de données)</h4>
            <p>Colonnes : <strong>EQUIPEMENT</strong>* (réf. exacte) ou N_SERIE, <strong>TYPE</strong>* (preventive/curative), <strong>DATE</strong>* (JJ/MM/AAAA), <strong>INTERVENANT</strong>*, <strong>ACTIONS_REALISEES</strong>*, OBSERVATION, COMPTEUR_HORAIRE, PIECES_UTILISEES. Rattachement automatique à l'équipement par REFERENCE ou N_SERIE.</p>
          </div>

          <div className="p-2 bg-slate-50 rounded text-xs">
            💡 <strong>Fichier Mac (.numbers)</strong> : accepté directement (1re feuille lue). Importez d'abord les équipements, puis les interventions.
          </div>
        </CardContent>
      </Card>

      {/* Correlation preview dialog */}
      <AlertDialog open={correlationPreview !== null} onOpenChange={(open) => { if (!open) setCorrelationPreview(null); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Aperçu de la corrélation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{correlationPreview?.matched || 0}</strong> intervention(s) seront rattachées à leur maintenance préventive
                  {' '}sur <strong>{correlationPreview?.total_sans_lien || 0}</strong> non liées ({correlationPreview?.unmatched || 0} sans correspondance).
                </p>
                {correlationPreview?.examples?.length > 0 && (
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {correlationPreview.examples.map((ex, i) => (
                      <div key={i} className="p-2">
                        <div className="text-xs text-gray-400">{ex.equipement} · score {ex.score}</div>
                        <div className="text-gray-700"><span className="text-gray-500">Action :</span> {ex.action}</div>
                        <div className="text-teal-700"><span className="text-gray-500">→ Maintenance :</span> {ex.maintenance}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">Les interventions rattachées passent en type « préventive ». Cette action ne supprime aucune donnée.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleCorrelateApply} disabled={isCorrelating || !correlationPreview?.matched} data-testid="correlate-apply-btn">
              {isCorrelating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Application...</> : `Appliquer (${correlationPreview?.matched || 0})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer selection dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Transférer vers les Contrôles réglementaires</DialogTitle>
            <DialogDescription>
              Sélectionnez les maintenances préventives à reclasser en contrôles réglementaires. Leur historique d'interventions sera repris comme historique du contrôle.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filtrer par titre ou équipement..."
                value={transferQ}
                onChange={(e) => setTransferQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadCandidates(transferQ); }}
                className="pl-10"
                data-testid="transfer-search"
              />
            </div>
            <Button variant="outline" onClick={() => loadCandidates(transferQ)} disabled={transferLoading} data-testid="transfer-search-btn">
              {transferLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={toggleSelectAll} className="text-indigo-700 hover:underline" data-testid="transfer-select-all">
              {candidates.length > 0 && selectedIds.length === candidates.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <span className="text-gray-500">{selectedIds.length} sélectionnée(s) sur {candidates.length}</span>
          </div>

          <div className="border rounded-md overflow-y-auto flex-1 divide-y" style={{ maxHeight: '45vh' }}>
            {transferLoading ? (
              <div className="p-6 text-center text-gray-400"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
            ) : candidates.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Aucune maintenance préventive trouvée.</div>
            ) : (
              candidates.map((c) => (
                <label key={c.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer" data-testid={`transfer-item-${c.id}`}>
                  <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleSelect(c.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-800 truncate">{c.titre}</div>
                    <div className="text-xs text-gray-500">
                      {c.equipment_ref} · {c.periodicite} · {c.interventions_count} intervention(s)
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Annuler</Button>
            <Button
              onClick={() => setConfirmTransfer(true)}
              disabled={selectedIds.length === 0 || transferApplying}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="transfer-apply-btn"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transférer ({selectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer confirmation */}
      <AlertDialog open={confirmTransfer} onOpenChange={setConfirmTransfer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le transfert ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.length} maintenance(s) préventive(s) vont devenir des contrôles réglementaires. L'historique lié devient l'historique du contrôle et la maintenance d'origine sera supprimée. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={applyTransfer} disabled={transferApplying} data-testid="transfer-confirm-btn">
              {transferApplying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Transfert...</> : 'Confirmer le transfert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Init Dialog */}
      <AlertDialog open={isInitDialogOpen} onOpenChange={setIsInitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Initialiser les données de base ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va créer les prestataires standards et les modèles de PV de contrôle.
              Les données existantes ne seront pas écrasées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleInitDefaultData} disabled={isInitializing}>
              {isInitializing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initialisation...
                </>
              ) : (
                'Initialiser'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Import;
