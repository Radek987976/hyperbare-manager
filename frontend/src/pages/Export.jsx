import React, { useState } from 'react';
import { exportAPI } from '../lib/api';
import { downloadBlob } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Download,
  FileText,
  Database,
  FileJson,
  Loader2,
  CheckCircle2
} from 'lucide-react';

const Export = () => {
  const [exporting, setExporting] = useState({});
  const [success, setSuccess] = useState({});

  const handleExportCSV = async (collection, label) => {
    setExporting({ ...exporting, [collection]: true });
    setSuccess({ ...success, [collection]: false });
    
    try {
      const response = await exportAPI.csv(collection);
      downloadBlob(response.data, `${collection}.csv`);
      setSuccess({ ...success, [collection]: true });
      setTimeout(() => setSuccess({ ...success, [collection]: false }), 3000);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setExporting({ ...exporting, [collection]: false });
    }
  };

  const handleExportSQL = async () => {
    setExporting({ ...exporting, sql: true });
    setSuccess({ ...success, sql: false });
    
    try {
      const response = await exportAPI.sql();
      downloadBlob(response.data, 'hyperbaremanager_export.sql');
      setSuccess({ ...success, sql: true });
      setTimeout(() => setSuccess({ ...success, sql: false }), 3000);
    } catch (error) {
      console.error('Erreur export SQL:', error);
      alert('Erreur lors de l\'export SQL');
    } finally {
      setExporting({ ...exporting, sql: false });
    }
  };

  const handleExportJSON = async () => {
    setExporting({ ...exporting, json: true });
    setSuccess({ ...success, json: false });
    
    try {
      const response = await exportAPI.json();
      downloadBlob(response.data, 'hyperbaremanager_export.json');
      setSuccess({ ...success, json: true });
      setTimeout(() => setSuccess({ ...success, json: false }), 3000);
    } catch (error) {
      console.error('Erreur export JSON:', error);
      alert('Erreur lors de l\'export JSON');
    } finally {
      setExporting({ ...exporting, json: false });
    }
  };

  const csvExports = [
    { collection: 'equipments', label: 'Équipements' },
    { collection: 'work_orders', label: 'Ordres de travail' },
    { collection: 'interventions', label: 'Interventions' },
    { collection: 'inspections', label: 'Contrôles réglementaires' },
    { collection: 'spare_parts', label: 'Pièces détachées' }
  ];

  return (
    <div className="space-y-6" data-testid="export-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
          Export des données
        </h1>
        <p className="text-slate-500 mt-1">
          Téléchargez vos données en différents formats
        </p>
      </div>

      {/* CSV Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#005F73]" />
            Export CSV
          </CardTitle>
          <CardDescription>
            Exportez chaque collection de données au format CSV (tableur)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {csvExports.map(({ collection, label }) => (
              <Card key={collection} className="border border-slate-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-medium">{label}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExportCSV(collection, label)}
                    disabled={exporting[collection]}
                    data-testid={`export-csv-${collection}`}
                  >
                    {exporting[collection] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : success[collection] ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        CSV
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Exports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SQL Export */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
              <Database className="w-5 h-5 text-[#005F73]" />
              Export SQL
            </CardTitle>
            <CardDescription>
              Export complet de la base de données au format SQL.
              Idéal pour la sauvegarde et la migration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExportSQL}
              disabled={exporting.sql}
              className="w-full bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="export-sql"
            >
              {exporting.sql ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : success.sql ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Téléchargé !
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le dump SQL
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* JSON Export */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
              <FileJson className="w-5 h-5 text-[#005F73]" />
              Export JSON
            </CardTitle>
            <CardDescription>
              Export complet au format JSON.
              Idéal pour l'intégration avec d'autres systèmes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExportJSON}
              disabled={exporting.json}
              className="w-full bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="export-json"
            >
              {exporting.json ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Export en cours...
                </>
              ) : success.json ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Téléchargé !
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger le fichier JSON
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">À propos des exports</h3>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li><strong>CSV</strong> : Format tableur compatible avec Excel, LibreOffice, Google Sheets</li>
            <li><strong>SQL</strong> : Instructions SQL pour recréer les tables et insérer les données</li>
            <li><strong>JSON</strong> : Format structuré pour l'intégration API et développement</li>
          </ul>
          <p className="text-sm text-slate-500 mt-4">
            Les exports incluent toutes les données sans les informations sensibles (mots de passe).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
