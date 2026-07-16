import React, { useState } from 'react';
import { importAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SearchableSelect } from '../components/ui/searchable-select';
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
  Info
} from 'lucide-react';

const IMPORT_TYPES = [
  { 
    value: 'prestataires', 
    label: 'Prestataires & Fournisseurs', 
    description: 'Importer la liste des prestataires, fournisseurs et organismes de contrôle',
    icon: '🏢'
  },
  { 
    value: 'bouteilles', 
    label: 'Bouteilles de gaz', 
    description: 'Importer le suivi des bouteilles O2, Air Médical, Héliox, Nitrox',
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
    label: 'Maintenances & Interventions', 
    description: 'Importer l\'historique des maintenances et interventions',
    icon: '🔧'
  },
  { 
    value: 'controles', 
    label: 'Contrôles périodiques', 
    description: 'Importer le suivi des contrôles périodiques des organes de sécurité',
    icon: '📋'
  },
  {
    value: 'equipements',
    label: 'Équipements',
    description: 'Importer une base d\'équipements (REFERENCE, TYPE, N_SERIE, CRITICITE, STATUT...). Colonnes en 1re ligne.',
    icon: '🛠️'
  },
  {
    value: 'interventions',
    label: 'Interventions (base de données)',
    description: 'Importer l\'historique complet des interventions, rattachées par EQUIPEMENT ou N_SERIE. Colonnes: EQUIPEMENT, TYPE, DATE, INTERVENANT, ACTIONS_REALISEES...',
    icon: '📝'
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
                  {result.type === 'init' 
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
            <p>Colonnes recommandées : Nom, Type (prestataire/fournisseur/organisme_controle), Spécialité, Contact, Email, Téléphone</p>
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
