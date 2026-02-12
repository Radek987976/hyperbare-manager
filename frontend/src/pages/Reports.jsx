import React, { useState, useEffect } from 'react';
import { reportsAPI, equipmentsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  FileText,
  Download,
  Loader2,
  BarChart3,
  Wrench,
  ClipboardList,
  Calendar,
  Settings2
} from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState({});
  const [equipments, setEquipments] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

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
                    <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                      <SelectTrigger data-testid="select-equipment">
                        <SelectValue placeholder="Choisir un équipement" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipments.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.reference} ({eq.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
