import React, { useState, useEffect } from 'react';
import { reportsAPI, equipmentsAPI } from '../lib/api';
import { openPdf } from '../components/PdfViewer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SearchableSelect } from '../components/ui/searchable-select';
import {
  FileText,
  Download,
  Loader2,
  BarChart3,
  Wrench,
  ClipboardList,
  Calendar,
  Settings2,
  Eye,
  CalendarDays,
  ClipboardCheck,
  CalendarRange
} from 'lucide-react';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const Reports = () => {
  const [loading, setLoading] = useState({});
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const nowYear = new Date().getFullYear();
  const [planYear, setPlanYear] = useState(nowYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Génère l'URL /api d'un rapport planning/PV selon sa clé
  const planUrl = {
    plan: (y, m) => `/api/reports/pdf/plan-maintenance/${y}`,
    checkliste: (y, m) => `/api/reports/pdf/check-liste/${y}/${m}`,
    'checkliste-annuelle': (y, m) => `/api/reports/pdf/check-liste-annuelle/${y}`,
    'pv-mensuel': (y, m) => `/api/reports/pdf/pv-controle-mensuel/${y}/${m}`,
    'pv-annuel': (y, m) => `/api/reports/pdf/pv-controle-annuel/${y}`,
    registre: (y, m) => `/api/reports/pdf/registre-controles`,
  };
  const planApi = {
    plan: (y, m) => reportsAPI.planMaintenancePDF(y),
    checkliste: (y, m) => reportsAPI.checkListePDF(y, m),
    'checkliste-annuelle': (y, m) => reportsAPI.checkListeAnnuellePDF(y),
    'pv-mensuel': (y, m) => reportsAPI.pvMensuelPDF(y, m),
    'pv-annuel': (y, m) => reportsAPI.pvAnnuelPDF(y),
    registre: (y, m) => reportsAPI.registreControlesPDF(),
  };

  const downloadAuditZip = async () => {
    setLoading(prev => ({ ...prev, auditZip: true }));
    try {
      const response = await reportsAPI.auditZip(planYear);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_${planYear}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Erreur lors de la génération du dossier d'audit");
    } finally {
      setLoading(prev => ({ ...prev, auditZip: false }));
    }
  };

  const previewPlan = (kind, filename) => {
    openPdf(planUrl[kind](planYear, month), filename);
  };

  const downloadPlan = async (kind, filename) => {
    setLoading(prev => ({ ...prev, [kind]: true }));
    try {
      const response = await planApi[kind](planYear, month);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors de la génération du document');
    } finally {
      setLoading(prev => ({ ...prev, [kind]: false }));
    }
  };

  useEffect(() => {
    loadEquipments();
  }, []);

  const loadEquipments = async () => {
    try {
      const res = await equipmentsAPI.getAll();
      setEquipments(res.data || []);
    } catch (error) {
      console.error('Error loading equipments:', error);
    }
  };

  const downloadPDF = async (type, filename) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      let response;
      
      switch (type) {
        case 'statistics':
          response = await reportsAPI.statisticsPDF();
          break;
        case 'maintenance':
          response = await reportsAPI.maintenancePDF(dateRange.start, dateRange.end);
          break;
        case 'equipment':
          if (!selectedEquipment) {
            alert('Veuillez sélectionner un équipement');
            return;
          }
          response = await reportsAPI.equipmentPDF(selectedEquipment);
          break;
        case 'interventions':
          response = await reportsAPI.interventionsPDF(dateRange.start, dateRange.end);
          break;
        case 'planning':
          response = await reportsAPI.planningPDF();
          break;
        default:
          return;
      }

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const reports = [
    {
      id: 'statistics',
      title: 'Rapport de Statistiques',
      description: 'Vue d\'ensemble complète : équipements, maintenances, stock',
      icon: BarChart3,
      color: 'bg-blue-500',
      filename: `statistiques_${new Date().toISOString().split('T')[0]}.pdf`
    },
    {
      id: 'maintenance',
      title: 'Rapport de Maintenance',
      description: 'Historique des maintenances préventives et curatives',
      icon: Wrench,
      color: 'bg-orange-500',
      filename: `maintenance_${new Date().toISOString().split('T')[0]}.pdf`,
      hasDateFilter: true
    },
    {
      id: 'interventions',
      title: 'Rapport des Interventions',
      description: 'Détail des interventions réalisées avec pièces utilisées',
      icon: ClipboardList,
      color: 'bg-green-500',
      filename: `interventions_${new Date().toISOString().split('T')[0]}.pdf`,
      hasDateFilter: true
    },
    {
      id: 'planning',
      title: 'Planning de Maintenance',
      description: 'Calendrier des maintenances sur 52 semaines',
      icon: Calendar,
      color: 'bg-purple-500',
      filename: `planning_${new Date().toISOString().split('T')[0]}.pdf`
    }
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
          Rapports PDF
        </h1>
        <p className="text-slate-500 mt-1">
          Générez et téléchargez vos rapports au format PDF
        </p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtres de période</CardTitle>
          <CardDescription>Applicable aux rapports de maintenance et d'interventions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-48"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({ start: '', end: '' })}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${report.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <report.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900">{report.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                  {report.hasDateFilter && dateRange.start && dateRange.end && (
                    <p className="text-xs text-[#005F73] mt-2">
                      Période : {dateRange.start} → {dateRange.end}
                    </p>
                  )}
                  <Button
                    onClick={() => downloadPDF(report.id, report.filename)}
                    disabled={loading[report.id]}
                    className="mt-4 bg-[#005F73] hover:bg-[#004a5c]"
                    data-testid={`download-${report.id}-pdf`}
                  >
                    {loading[report.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Equipment Report - Special Card */}
        <Card className="hover:shadow-md transition-shadow md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Settings2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-900">Fiche Équipement</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Fiche détaillée d'un équipement avec son historique de maintenance et d'interventions
                </p>
                
                <div className="flex flex-wrap items-end gap-4 mt-4">
                  <div className="space-y-2 flex-1 min-w-[200px] max-w-[300px]">
                    <Label>Sélectionner un équipement</Label>
                    <SearchableSelect
                      value={selectedEquipment}
                      onValueChange={setSelectedEquipment}
                      data-testid="select-equipment"
                      placeholder="Choisir un équipement"
                      options={equipments.map(eq => ({ value: eq.id, label: `${eq.reference} (${eq.type})` }))}
                    />
                  </div>
                  
                  <Button
                    onClick={() => downloadPDF('equipment', `fiche_equipement_${selectedEquipment}.pdf`)}
                    disabled={loading.equipment || !selectedEquipment}
                    className="bg-[#005F73] hover:bg-[#004a5c]"
                    data-testid="download-equipment-pdf"
                  >
                    {loading.equipment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger Fiche PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan & Check-listes / PV de contrôle */}
      <Card data-testid="plan-controles-section">
        <CardHeader>
          <CardTitle className="text-lg">Plan de maintenance, check-listes & PV de contrôle</CardTitle>
          <CardDescription>
            Générés automatiquement à partir des maintenances préventives planifiées (hors journalières / hebdomadaires).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-year">Année</Label>
              <Input
                id="plan-year"
                type="number"
                min="2020"
                max="2100"
                value={planYear}
                onChange={(e) => setPlanYear(parseInt(e.target.value) || nowYear)}
                className="w-32"
                data-testid="plan-year-input"
              />
            </div>
            <div className="space-y-2 min-w-[180px]">
              <Label>Mois (check-liste & PV mensuel)</Label>
              <SearchableSelect
                value={String(month)}
                onValueChange={(v) => setMonth(parseInt(v))}
                data-testid="plan-month-select"
                sortOptions={false}
                options={MONTHS_FR.map((m, i) => ({ value: String(i + 1), label: m }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { kind: 'plan', title: 'Plan de maintenance annuel', desc: 'Maintenances regroupées par mois puis par type d\'équipement.', icon: CalendarRange, color: 'bg-indigo-500', file: () => `plan_maintenance_${planYear}.pdf`, monthly: false },
              { kind: 'checkliste', title: 'Check-liste mensuelle', desc: 'Liste des maintenances préventives à réaliser ce mois (à cocher).', icon: ClipboardCheck, color: 'bg-teal-500', file: () => `checkliste_${planYear}_${String(month).padStart(2, '0')}.pdf`, monthly: true },
              { kind: 'checkliste-annuelle', title: 'Check-liste annuelle', desc: 'Récapitulatif de toutes les maintenances préventives de l\'année (à cocher).', icon: ClipboardCheck, color: 'bg-teal-600', file: () => `checkliste_annuelle_${planYear}.pdf`, monthly: false },
              { kind: 'pv-mensuel', title: 'PV de contrôle mensuel', desc: 'Procès-verbal de contrôle du mois, groupé par équipement.', icon: ClipboardList, color: 'bg-orange-500', file: () => `pv_controle_mensuel_${planYear}_${String(month).padStart(2, '0')}.pdf`, monthly: true },
              { kind: 'pv-annuel', title: 'PV de contrôle annuel', desc: 'Toutes les maintenances de l\'année avec le nombre de fois / an.', icon: CalendarDays, color: 'bg-purple-500', file: () => `pv_controle_annuel_${planYear}.pdf`, monthly: false },
            ].map((r) => (
              <Card key={r.kind} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${r.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <r.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900">{r.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
                      <p className="text-xs text-[#005F73] mt-2">
                        {r.monthly ? `${MONTHS_FR[month - 1]} ${planYear}` : `Année ${planYear}`}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => previewPlan(r.kind, r.file())}
                          className="border-[#005F73] text-[#005F73] hover:bg-[#005F73]/10"
                          data-testid={`preview-${r.kind}-btn`}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Aperçu / Imprimer
                        </Button>
                        <Button
                          onClick={() => downloadPlan(r.kind, r.file())}
                          disabled={loading[r.kind]}
                          className="bg-[#005F73] hover:bg-[#004a5c]"
                          data-testid={`download-${r.kind}-btn`}
                        >
                          {loading[r.kind] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Registre des contrôles réglementaires */}
          <Card className="hover:shadow-md transition-shadow border-[#005F73]/20 bg-[#005F73]/[0.03]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#005F73] rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900">Registre des contrôles réglementaires</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Registre complet de tous les contrôles réglementaires (échéances, statut, organisme, résultat) avec en-tête officiel CHPF — destiné aux dossiers d'audit. Les contrôles expirés apparaissent en rouge.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => previewPlan('registre', 'registre_controles.pdf')}
                      className="border-[#005F73] text-[#005F73] hover:bg-[#005F73]/10"
                      data-testid="preview-registre-btn"
                    >
                      <Eye className="w-4 h-4 mr-2" /> Aperçu / Imprimer
                    </Button>
                    <Button
                      onClick={() => downloadPlan('registre', 'registre_controles.pdf')}
                      disabled={loading.registre}
                      className="bg-[#005F73] hover:bg-[#004a5c]"
                      data-testid="download-registre-btn"
                    >
                      {loading.registre ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      Télécharger le registre PDF
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dossier d'audit ZIP */}
          <Card className="hover:shadow-md transition-shadow border-[#0A9396]/30 bg-[#0A9396]/[0.04]">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0A9396] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900">Dossier d'audit complet ({planYear}) — ZIP</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Télécharge en une archive ZIP tous les documents de l'année : plan de maintenance, les 12 check-listes mensuelles, les 12 PV mensuels, le PV annuel et le registre des contrôles réglementaires.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      onClick={downloadAuditZip}
                      disabled={loading.auditZip}
                      className="bg-[#0A9396] hover:bg-[#087f81]"
                      data-testid="download-audit-zip-btn"
                    >
                      {loading.auditZip ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      Tout télécharger en ZIP
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-400" />
            <p className="text-sm text-slate-600">
              Les rapports sont générés au format PDF et peuvent être imprimés ou partagés facilement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
