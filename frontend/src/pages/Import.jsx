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
  Search,
  Settings,
  Trash2,
  Plus
} from 'lucide-react';

const CALENDAR_MONTHS = [
  { value: '1', label: 'Janvier' }, { value: '2', label: 'Février' }, { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' }, { value: '8', label: 'Août' }, { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' }, { value: '11', label: 'Novembre' }, { value: '12', label: 'Décembre' },
];
const CALENDAR_FIELDS = [
  { value: 'reference', label: 'Référence équipement (commence par)' },
  { value: 'type', label: "Type d'équipement (contient)" },
  { value: 'titre', label: 'Titre de la maintenance (contient)' },
];
const fieldLabel = (f) => (CALENDAR_FIELDS.find(x => x.value === f)?.label || f);
const monthLabel = (m) => (CALENDAR_MONTHS.find(x => x.value === String(m))?.label || m);

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
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState(null);
  const [isDeduping, setIsDeduping] = useState(false);
  const [dedupePreview, setDedupePreview] = useState(null);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [recomputePreview, setRecomputePreview] = useState(null);
  const [isCalendaring, setIsCalendaring] = useState(false);
  const [calendarPreview, setCalendarPreview] = useState(null);
  // Configuration des règles du calendrier annuel
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newRule, setNewRule] = useState({ match_field: 'reference', match_value: '', month: '2', label: '' });
  const [savingRule, setSavingRule] = useState(false);
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

  // Reclasser contrôles réglementaires -> maintenances préventives (inverse)
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseQ, setReverseQ] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const [revCandidates, setRevCandidates] = useState([]);
  const [revSelectedIds, setRevSelectedIds] = useState([]);
  const [reverseApplying, setReverseApplying] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);

  const openReverse = async () => {
    setReverseOpen(true);
    setRevSelectedIds([]);
    setReverseQ('');
    await loadRevCandidates('');
  };

  const loadRevCandidates = async (q) => {
    setReverseLoading(true);
    setError('');
    try {
      const res = await importAPI.inspectionCandidates(q);
      setRevCandidates(res.data.candidates || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setReverseLoading(false);
    }
  };

  const toggleRevSelect = (id) => {
    setRevSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleRevSelectAll = () => {
    if (revSelectedIds.length === revCandidates.length) {
      setRevSelectedIds([]);
    } else {
      setRevSelectedIds(revCandidates.map(c => c.id));
    }
  };

  const applyReverse = async () => {
    setReverseApplying(true);
    setError('');
    try {
      const res = await importAPI.transferToMaintenances(revSelectedIds);
      setResult({ type: 'transfer', message: `${res.data.transferred} contrôle(s) reclassé(s) en maintenance préventive.`, imported: res.data.transferred, errors: res.data.errors });
      setConfirmReverse(false);
      setReverseOpen(false);
      setRevSelectedIds([]);
    } catch (err) {
      setError(getErrorMessage(err));
      setConfirmReverse(false);
    } finally {
      setReverseApplying(false);
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

  const handleBackfillPreview = async () => {
    setIsBackfilling(true);
    setError('');
    setResult(null);
    try {
      const res = await importAPI.backfillActionsFromObservations(false);
      setBackfillPreview(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleBackfillApply = async () => {
    setIsBackfilling(true);
    setError('');
    try {
      const res = await importAPI.backfillActionsFromObservations(true);
      setResult({ type: 'correlate', message: `${res.data.matched} intervention(s) mise(s) à jour (Actions ← Observations).`, imported: res.data.matched });
      setBackfillPreview(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleDedupePreview = async () => {
    setIsDeduping(true);
    setError('');
    setResult(null);
    try {
      const res = await importAPI.dedupePreventiveWorkorders(false);
      setDedupePreview(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeduping(false);
    }
  };

  const handleDedupeApply = async () => {
    setIsDeduping(true);
    setError('');
    try {
      const res = await importAPI.dedupePreventiveWorkorders(true);
      setResult({ type: 'correlate', message: `${res.data.workorders_to_delete} doublon(s) fusionné(s), ${res.data.interventions_relinked} intervention(s) ré-attachée(s).`, imported: res.data.workorders_to_delete });
      setDedupePreview(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeduping(false);
    }
  };

  const handleRecomputePreview = async () => {
    setIsRecomputing(true);
    setError('');
    setResult(null);
    try {
      const res = await importAPI.recomputePreventiveSchedules(false);
      setRecomputePreview(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleRecomputeApply = async () => {
    setIsRecomputing(true);
    setError('');
    try {
      const res = await importAPI.recomputePreventiveSchedules(true);
      setResult({ type: 'correlate', message: `${res.data.changed} maintenance(s) recalées, dont ${res.data.reactivated} réactivée(s).`, imported: res.data.changed });
      setRecomputePreview(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleCalendarPreview = async () => {
    setIsCalendaring(true);
    setError('');
    setResult(null);
    try {
      const res = await importAPI.applyAnnualCalendar(false);
      setCalendarPreview(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCalendaring(false);
    }
  };

  const handleCalendarApply = async () => {
    setIsCalendaring(true);
    setError('');
    try {
      const res = await importAPI.applyAnnualCalendar(true, calendarPreview?.year);
      setResult({ type: 'correlate', message: `${res.data.changed} maintenance(s) re-ancrées sur le calendrier annuel ${res.data.year}.`, imported: res.data.changed });
      setCalendarPreview(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCalendaring(false);
    }
  };

  const loadRules = async () => {
    setRulesLoading(true);
    try {
      const res = await importAPI.getCalendarRules();
      setRules(res.data?.rules || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRulesLoading(false);
    }
  };

  const openRules = async () => {
    setRulesOpen(true);
    setNewRule({ match_field: 'reference', match_value: '', month: '2', label: '' });
    await loadRules();
  };

  const handleAddRule = async () => {
    if (!newRule.match_value.trim()) { setError('La valeur de correspondance est requise'); return; }
    setSavingRule(true);
    setError('');
    try {
      await importAPI.createCalendarRule({
        match_field: newRule.match_field,
        match_value: newRule.match_value.trim(),
        month: parseInt(newRule.month, 10),
        label: newRule.label.trim(),
      });
      setNewRule({ match_field: 'reference', match_value: '', month: '2', label: '' });
      await loadRules();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingRule(false);
    }
  };

  const handleUpdateRuleMonth = async (rule, month) => {
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, month: parseInt(month, 10) } : r));
    try {
      await importAPI.updateCalendarRule(rule.id, { month: parseInt(month, 10) });
    } catch (err) {
      setError(getErrorMessage(err));
      await loadRules();
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await importAPI.deleteCalendarRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleResetRules = async () => {
    if (!window.confirm('Réinitialiser les règles aux valeurs par défaut ? Vos règles personnalisées seront supprimées.')) return;
    setRulesLoading(true);
    try {
      const res = await importAPI.resetCalendarRules();
      setRules(res.data?.rules || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRulesLoading(false);
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

      {/* Recopier Observations -> Actions réalisées (migration ponctuelle) */}
      <Card className="border-amber-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            Corriger « Actions réalisées » à partir des « Observations »
          </CardTitle>
          <CardDescription>
            Action ponctuelle. Pour chaque intervention dont le champ « Actions réalisées » est vide, ou ne fait que répéter le motif de l'intervention ou le titre de la maintenance préventive liée, remplace « Actions réalisées » par le contenu des « Observations ». Si les observations sont vides, rien n'est modifié.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Un aperçu vous montre le nombre d'interventions concernées avant d'appliquer. Aucune donnée n'est supprimée.
            </p>
            <Button variant="outline" onClick={handleBackfillPreview} disabled={isBackfilling}
              className="text-amber-700 border-amber-200 hover:bg-amber-50 shrink-0" data-testid="backfill-preview-btn">
              {isBackfilling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Aperçu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fusionner les maintenances préventives en double */}
      <Card className="border-rose-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-rose-600" />
            Fusionner les maintenances préventives en double
          </CardTitle>
          <CardDescription>
            Regroupe les maintenances préventives ayant le même équipement et le même titre. Garde une seule fiche (celle qui a le plus d'interventions), y ré-attache les interventions des doublons, puis supprime les doublons. Corrige l'affichage en double (une « OK » et une « Jamais réalisée ») dans les check-listes et PV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Un aperçu vous indique combien de doublons seront fusionnés avant d'appliquer. Aucune intervention n'est supprimée.
            </p>
            <Button variant="outline" onClick={handleDedupePreview} disabled={isDeduping}
              className="text-rose-700 border-rose-200 hover:bg-rose-50 shrink-0" data-testid="dedupe-preview-btn">
              {isDeduping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Aperçu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recaler / réactiver les maintenances préventives récurrentes */}
      <Card className="border-teal-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-600" />
            Recalculer les échéances des maintenances préventives
          </CardTitle>
          <CardDescription>
            Une maintenance préventive récurrente ne doit jamais rester « Terminée ». Cet outil recale la prochaine échéance (= dernière réalisation + périodicité) et remet le statut sur « Planifiée » (elle apparaîtra « en retard » si l'échéance est dépassée). Les maintenances annulées ne sont pas touchées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              À lancer après la fusion des doublons pour remettre les maintenances « Terminée » en « Planifiée » avec la bonne date.
            </p>
            <Button variant="outline" onClick={handleRecomputePreview} disabled={isRecomputing}
              className="text-teal-700 border-teal-200 hover:bg-teal-50 shrink-0" data-testid="recompute-preview-btn">
              {isRecomputing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Aperçu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appliquer le calendrier annuel */}
      <Card className="border-amber-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-amber-600" />
            Appliquer le calendrier annuel
          </CardTitle>
          <CardDescription>
            Re-ancre la date planifiée des maintenances préventives sur les mois de votre planning : Compresseurs → Février, RES_ → Mai, CUV_ → Juillet, ARI → Juin, Extincteurs → Juin. Les maintenances semestrielles (Compresseurs, RES_, Extincteurs) verront leur 2e occurrence gérée automatiquement par la périodicité. Le jour du mois est conservé quand c'est possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Aligne le plan annuel de maintenance sur le calendrier opérationnel. Aperçu (aucune modification) avant application.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" onClick={openRules} disabled={isCalendaring}
                className="text-amber-700 border-amber-200 hover:bg-amber-50" data-testid="calendar-config-btn">
                <Settings className="h-4 w-4 mr-2" />
                Configurer les règles
              </Button>
              <Button variant="outline" onClick={handleCalendarPreview} disabled={isCalendaring}
                className="text-amber-700 border-amber-200 hover:bg-amber-50" data-testid="calendar-preview-btn">
                {isCalendaring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Aperçu
              </Button>
            </div>
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

      {/* Reclasser contrôles -> maintenances préventives (inverse) */}
      <Card className="border-amber-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-600" />
            Reclasser des contrôles réglementaires en Maintenance préventive
          </CardTitle>
          <CardDescription>
            Opération inverse : reclasse un ou plusieurs contrôles réglementaires en maintenances préventives. Le contrôle d'origine est supprimé. L'ancien historique d'interventions n'est pas re-rattaché automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Utile si un contrôle a été classé par erreur en « contrôle réglementaire » alors qu'il s'agit d'une maintenance préventive.
            </p>
            <Button variant="outline" onClick={openReverse} disabled={reverseApplying}
              className="text-amber-700 border-amber-200 hover:bg-amber-50 shrink-0" data-testid="open-reverse-btn">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Sélectionner à reclasser
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

      {/* Aperçu recopie Observations -> Actions */}
      <AlertDialog open={backfillPreview !== null} onOpenChange={(open) => { if (!open) setBackfillPreview(null); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Aperçu — Actions ← Observations</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{backfillPreview?.matched || 0}</strong> intervention(s) seront mises à jour
                  {' '}sur <strong>{backfillPreview?.total || 0}</strong> au total.
                </p>
                {backfillPreview?.examples?.length > 0 && (
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {backfillPreview.examples.map((ex, i) => (
                      <div key={i} className="p-2">
                        <div className="text-gray-500 text-xs">Avant : <span className="text-gray-700">{ex.avant}</span></div>
                        <div className="text-amber-700 text-xs">→ Après : {ex.apres}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">Seul le champ « Actions réalisées » est modifié, uniquement quand les observations ne sont pas vides. Aucune suppression.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackfillApply} disabled={isBackfilling || !backfillPreview?.matched} data-testid="backfill-apply-btn">
              {isBackfilling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Application...</> : `Appliquer (${backfillPreview?.matched || 0})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aperçu fusion des doublons de maintenances */}
      <AlertDialog open={dedupePreview !== null} onOpenChange={(open) => { if (!open) setDedupePreview(null); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Aperçu — Fusion des maintenances en double</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{dedupePreview?.duplicate_groups || 0}</strong> groupe(s) en double détecté(s),
                  {' '}<strong>{dedupePreview?.workorders_to_delete || 0}</strong> fiche(s) seront fusionnées,
                  {' '}<strong>{dedupePreview?.interventions_relinked || 0}</strong> intervention(s) ré-attachée(s).
                </p>
                {dedupePreview?.examples?.length > 0 && (
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {dedupePreview.examples.map((ex, i) => (
                      <div key={i} className="p-2 flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{ex.titre} <span className="text-gray-400">— {ex.equipement}</span></span>
                        <span className="text-rose-600 shrink-0">-{ex.doublons_supprimes}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">Aucune intervention n'est supprimée : elles sont ré-attachées à la fiche conservée.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDedupeApply} disabled={isDeduping || !dedupePreview?.workorders_to_delete} data-testid="dedupe-apply-btn">
              {isDeduping ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Application...</> : `Fusionner (${dedupePreview?.workorders_to_delete || 0})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aperçu recalcul des échéances */}
      <AlertDialog open={recomputePreview !== null} onOpenChange={(open) => { if (!open) setRecomputePreview(null); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Aperçu — Recalcul des échéances préventives</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{recomputePreview?.changed || 0}</strong> maintenance(s) seront recalées
                  {' '}(dont <strong>{recomputePreview?.reactivated || 0}</strong> « Terminée » → « Planifiée »)
                  {' '}sur <strong>{recomputePreview?.total || 0}</strong>.
                </p>
                {recomputePreview?.examples?.length > 0 && (
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {recomputePreview.examples.map((ex, i) => (
                      <div key={i} className="p-2">
                        <div className="text-gray-700 truncate">{ex.titre}</div>
                        <div className="text-xs text-teal-700">{ex.ancien_statut} → {ex.nouveau_statut} · échéance : {ex.nouvelle_echeance}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecomputeApply} disabled={isRecomputing || !recomputePreview?.changed} data-testid="recompute-apply-btn">
              {isRecomputing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Application...</> : `Appliquer (${recomputePreview?.changed || 0})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configuration des règles du calendrier annuel */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurer le calendrier annuel</DialogTitle>
            <DialogDescription>
              Définissez sur quel mois ancrer chaque type d'équipement ou maintenance. Les règles sont évaluées de haut en bas : la première qui correspond décide du mois. Pour les maintenances semestrielles, indiquez le 1er mois — la 2e occurrence est gérée par la périodicité.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Liste des règles */}
            <div className="border rounded-md divide-y" data-testid="calendar-rules-list">
              {rulesLoading && rules.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Chargement…</div>
              )}
              {!rulesLoading && rules.length === 0 && (
                <div className="p-4 text-center text-sm text-gray-400">Aucune règle définie.</div>
              )}
              {rules.map((r) => (
                <div key={r.id} className="p-3 flex items-center gap-3" data-testid={`calendar-rule-${r.id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {r.label || `${fieldLabel(r.match_field)} : « ${r.match_value} »`}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {fieldLabel(r.match_field)} · « {r.match_value} »
                    </div>
                  </div>
                  <div className="w-[140px] shrink-0">
                    <SearchableSelect
                      value={String(r.month)}
                      onValueChange={(v) => handleUpdateRuleMonth(r, v)}
                      options={CALENDAR_MONTHS}
                      sortOptions={false}
                      data-testid={`calendar-rule-month-${r.id}`}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(r.id)}
                    className="text-rose-600 hover:bg-rose-50 shrink-0" data-testid={`calendar-rule-delete-${r.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Ajouter une règle */}
            <div className="border rounded-md p-3 bg-slate-50 space-y-3">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2"><Plus className="h-4 w-4" />Ajouter une règle</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Critère</Label>
                  <SearchableSelect
                    value={newRule.match_field}
                    onValueChange={(v) => setNewRule({ ...newRule, match_field: v })}
                    options={CALENDAR_FIELDS}
                    sortOptions={false}
                    data-testid="new-rule-field"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mois</Label>
                  <SearchableSelect
                    value={newRule.month}
                    onValueChange={(v) => setNewRule({ ...newRule, month: v })}
                    options={CALENDAR_MONTHS}
                    sortOptions={false}
                    data-testid="new-rule-month"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Valeur à rechercher (ex. RES_, compresseur, extincteur)</Label>
                <Input value={newRule.match_value}
                  onChange={(e) => setNewRule({ ...newRule, match_value: e.target.value })}
                  placeholder="RES_" data-testid="new-rule-value" />
              </div>
              <div>
                <Label className="text-xs">Libellé (optionnel)</Label>
                <Input value={newRule.label}
                  onChange={(e) => setNewRule({ ...newRule, label: e.target.value })}
                  placeholder="Réservoirs → Mai" data-testid="new-rule-label" />
              </div>
              <Button onClick={handleAddRule} disabled={savingRule || !newRule.match_value.trim()}
                className="bg-amber-600 hover:bg-amber-700" data-testid="new-rule-add-btn">
                {savingRule ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Ajouter la règle
              </Button>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <Button variant="ghost" onClick={handleResetRules} disabled={rulesLoading}
              className="text-gray-500" data-testid="calendar-rules-reset-btn">
              Réinitialiser par défaut
            </Button>
            <Button variant="outline" onClick={() => setRulesOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aperçu — calendrier annuel */}
      <AlertDialog open={calendarPreview !== null} onOpenChange={(open) => { if (!open) setCalendarPreview(null); }}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Aperçu — Calendrier annuel {calendarPreview?.year}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{calendarPreview?.changed || 0}</strong> maintenance(s) seront re-ancrées
                  {' '}sur <strong>{calendarPreview?.total || 0}</strong> préventives.
                </p>
                {calendarPreview?.by_month && Object.keys(calendarPreview.by_month).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(calendarPreview.by_month).map(([mois, n]) => (
                      <span key={mois} className="px-2 py-1 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200">
                        {mois} : {n}
                      </span>
                    ))}
                  </div>
                )}
                {calendarPreview?.examples?.length > 0 && (
                  <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                    {calendarPreview.examples.map((ex, i) => (
                      <div key={i} className="p-2">
                        <div className="text-gray-700 truncate">{ex.titre} <span className="text-gray-400">— {ex.equipement}</span></div>
                        <div className="text-xs text-amber-700">{ex.ancienne_echeance || '—'} → {ex.nouvelle_echeance} ({ex.mois})</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400">Aucune intervention n'est modifiée : seule la date planifiée des maintenances est re-ancrée.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleCalendarApply} disabled={isCalendaring || !calendarPreview?.changed} data-testid="calendar-apply-btn">
              {isCalendaring ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Application...</> : `Appliquer (${calendarPreview?.changed || 0})`}
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

      {/* Reverse selection dialog (contrôles -> maintenances) */}
      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Reclasser des contrôles en Maintenance préventive</DialogTitle>
            <DialogDescription>
              Sélectionnez les contrôles réglementaires à reclasser en maintenances préventives. Le contrôle d'origine sera supprimé.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Filtrer par titre ou équipement..."
                value={reverseQ}
                onChange={(e) => setReverseQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadRevCandidates(reverseQ); }}
                className="pl-10"
                data-testid="reverse-search"
              />
            </div>
            <Button variant="outline" onClick={() => loadRevCandidates(reverseQ)} disabled={reverseLoading} data-testid="reverse-search-btn">
              {reverseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={toggleRevSelectAll} className="text-amber-700 hover:underline" data-testid="reverse-select-all">
              {revCandidates.length > 0 && revSelectedIds.length === revCandidates.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
            <span className="text-gray-500">{revSelectedIds.length} sélectionné(s) sur {revCandidates.length}</span>
          </div>

          <div className="border rounded-md overflow-y-auto flex-1 divide-y" style={{ maxHeight: '45vh' }}>
            {reverseLoading ? (
              <div className="p-6 text-center text-gray-400"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
            ) : revCandidates.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Aucun contrôle réglementaire trouvé.</div>
            ) : (
              revCandidates.map((c) => (
                <label key={c.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer" data-testid={`reverse-item-${c.id}`}>
                  <Checkbox checked={revSelectedIds.includes(c.id)} onCheckedChange={() => toggleRevSelect(c.id)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-800 truncate">{c.titre}</div>
                    <div className="text-xs text-gray-500">
                      {c.equipment_ref} · {c.periodicite || 'périodicité inconnue'} · {c.historique_count} réalisation(s) archivée(s)
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseOpen(false)}>Annuler</Button>
            <Button
              onClick={() => setConfirmReverse(true)}
              disabled={revSelectedIds.length === 0 || reverseApplying}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="reverse-apply-btn"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Reclasser ({revSelectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse confirmation */}
      <AlertDialog open={confirmReverse} onOpenChange={setConfirmReverse}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le reclassement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {revSelectedIds.length} contrôle(s) réglementaire(s) vont devenir des maintenances préventives. Le contrôle d'origine sera supprimé. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={applyReverse} disabled={reverseApplying} data-testid="reverse-confirm-btn">
              {reverseApplying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reclassement...</> : 'Confirmer le reclassement'}
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
