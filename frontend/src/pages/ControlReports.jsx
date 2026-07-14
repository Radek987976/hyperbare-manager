import React, { useState, useEffect } from 'react';
import { reportTemplatesAPI, controlReportsAPI, equipmentsAPI, inspectionsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, getErrorMessage } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  FileCheck,
  Plus,
  Search,
  Loader2,
  ClipboardCheck,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Printer
} from 'lucide-react';

const RESULT_OPTIONS = [
  { value: 'conforme', label: 'Conforme', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  { value: 'non_conforme', label: 'Non conforme', color: 'bg-red-100 text-red-800', icon: XCircle },
  { value: 'avec_reserves', label: 'Avec réserves', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
];

const getResultInfo = (result) => RESULT_OPTIONS.find(r => r.value === result) || { label: result, color: 'bg-gray-100 text-gray-800' };

const ControlReports = () => {
  const { user, canCreate } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [reports, setReports] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    template_id: '',
    equipment_id: '',
    inspection_id: '',
    numero_pv: '',
    date_controle: new Date().toISOString().split('T')[0],
    controleur: '',
    organisme: '',
    valeurs: {},
    resultat: 'conforme',
    observations: '',
    validite_jusqua: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, reportsRes, equipmentsRes, inspectionsRes] = await Promise.all([
        reportTemplatesAPI.getAll(),
        controlReportsAPI.getAll(),
        equipmentsAPI.getAll(),
        inspectionsAPI.getAll(),
      ]);
      setTemplates(templatesRes.data);
      setReports(reportsRes.data);
      setEquipments(equipmentsRes.data);
      setInspections(inspectionsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template);
    
    // Initialize form values based on template fields
    const initialValues = {};
    if (template?.champs) {
      template.champs.forEach(champ => {
        if (champ.type === 'checkbox') {
          initialValues[champ.nom] = false;
        } else {
          initialValues[champ.nom] = champ.valeur_defaut || '';
        }
      });
    }
    
    // Generate PV number
    const pvNumber = `PV-${template?.type_controle?.toUpperCase() || 'CTRL'}-${Date.now().toString().slice(-6)}`;
    
    setFormData({
      ...formData,
      template_id: templateId,
      numero_pv: pvNumber,
      valeurs: initialValues,
      controleur: user?.prenom ? `${user.prenom} ${user.nom}` : '',
    });
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData({
      ...formData,
      valeurs: {
        ...formData.valeurs,
        [fieldName]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await controlReportsAPI.create(formData);
      await fetchData();
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      template_id: '',
      equipment_id: '',
      inspection_id: '',
      numero_pv: '',
      date_controle: new Date().toISOString().split('T')[0],
      controleur: '',
      organisme: '',
      valeurs: {},
      resultat: 'conforme',
      observations: '',
      validite_jusqua: '',
    });
    setSelectedTemplate(null);
    setError('');
  };

  const viewReport = (report) => {
    setSelectedReport(report);
    const template = templates.find(t => t.id === report.template_id);
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const printReport = (report) => {
    const template = templates.find(t => t.id === report.template_id);
    const equipment = equipments.find(e => e.id === report.equipment_id);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PV de Contrôle - ${report.numero_pv}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #005F73; border-bottom: 2px solid #005F73; padding-bottom: 10px; }
          h2 { color: #005F73; margin-top: 30px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .field { margin-bottom: 10px; }
          .field-label { font-weight: bold; color: #333; }
          .field-value { margin-left: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #005F73; color: white; }
          .result { font-size: 18px; font-weight: bold; padding: 10px; text-align: center; border-radius: 5px; }
          .conforme { background: #d4edda; color: #155724; }
          .non_conforme { background: #f8d7da; color: #721c24; }
          .avec_reserves { background: #fff3cd; color: #856404; }
          .signature { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${template?.nom || 'PV de Contrôle'}</h1>
        
        <div class="info-box">
          <div class="field"><span class="field-label">N° PV:</span><span class="field-value">${report.numero_pv}</span></div>
          <div class="field"><span class="field-label">Date du contrôle:</span><span class="field-value">${formatDate(report.date_controle)}</span></div>
          <div class="field"><span class="field-label">Contrôleur:</span><span class="field-value">${report.controleur}</span></div>
          ${report.organisme ? `<div class="field"><span class="field-label">Organisme:</span><span class="field-value">${report.organisme}</span></div>` : ''}
          ${equipment ? `<div class="field"><span class="field-label">Équipement:</span><span class="field-value">${equipment.type} - ${equipment.reference}</span></div>` : ''}
        </div>

        ${template?.normes_reference?.length > 0 ? `
          <h2>Normes de référence</h2>
          <ul>
            ${template.normes_reference.map(n => `<li>${n}</li>`).join('')}
          </ul>
        ` : ''}

        <h2>Résultats du contrôle</h2>
        <table>
          <thead>
            <tr>
              <th>Paramètre</th>
              <th>Valeur mesurée</th>
              ${template?.criteres_conformite?.length > 0 ? '<th>Critère</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${template?.champs?.map(champ => {
              const valeur = report.valeurs[champ.nom];
              const critere = template.criteres_conformite?.find(c => c.parametre === champ.nom);
              return `
                <tr>
                  <td>${champ.nom.replace(/_/g, ' ')}</td>
                  <td>${champ.type === 'checkbox' ? (valeur ? '✓ OK' : '✗ NON') : (valeur || '-')} ${champ.unite || ''}</td>
                  ${template?.criteres_conformite?.length > 0 ? `<td>${critere ? `Max: ${critere.valeur_max} ${critere.unite || ''}` : '-'}</td>` : ''}
                </tr>
              `;
            }).join('') || ''}
          </tbody>
        </table>

        <h2>Conclusion</h2>
        <div class="result ${report.resultat}">${getResultInfo(report.resultat).label.toUpperCase()}</div>
        
        ${report.observations ? `
          <h2>Observations</h2>
          <p>${report.observations}</p>
        ` : ''}

        ${report.validite_jusqua ? `
          <div class="info-box">
            <div class="field"><span class="field-label">Validité jusqu'au:</span><span class="field-value">${formatDate(report.validite_jusqua)}</span></div>
          </div>
        ` : ''}

        <div class="signature">
          <div class="signature-box">Le Contrôleur</div>
          <div class="signature-box">Le Responsable</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getEquipmentName = (id) => {
    const eq = equipments.find(e => e.id === id);
    return eq ? `${eq.type} - ${eq.reference}` : null;
  };

  const getTemplateName = (id) => {
    const t = templates.find(t => t.id === id);
    return t?.nom || '-';
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    return report.numero_pv?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           report.controleur?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Stats
  const stats = {
    total: reports.length,
    conformes: reports.filter(r => r.resultat === 'conforme').length,
    nonConformes: reports.filter(r => r.resultat === 'non_conforme').length,
    avecReserves: reports.filter(r => r.resultat === 'avec_reserves').length,
  };

  const renderField = (champ) => {
    const value = formData.valeurs[champ.nom];
    
    switch (champ.type) {
      case 'checkbox':
        return (
          <div key={champ.nom} className="flex items-center space-x-2">
            <Checkbox
              id={champ.nom}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(champ.nom, checked)}
            />
            <Label htmlFor={champ.nom} className="flex-1">
              {champ.nom.replace(/_/g, ' ')}
              {champ.obligatoire && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
        );
      
      case 'select':
        return (
          <div key={champ.nom} className="space-y-2">
            <Label htmlFor={champ.nom}>
              {champ.nom.replace(/_/g, ' ')}
              {champ.obligatoire && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value || ''} onValueChange={(v) => handleFieldChange(champ.nom, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {champ.options?.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'number':
        return (
          <div key={champ.nom} className="space-y-2">
            <Label htmlFor={champ.nom}>
              {champ.nom.replace(/_/g, ' ')} {champ.unite && `(${champ.unite})`}
              {champ.obligatoire && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={champ.nom}
              type="number"
              step="0.01"
              value={value || ''}
              onChange={(e) => handleFieldChange(champ.nom, e.target.value)}
              required={champ.obligatoire}
            />
          </div>
        );
      
      default:
        return (
          <div key={champ.nom} className="space-y-2">
            <Label htmlFor={champ.nom}>
              {champ.nom.replace(/_/g, ' ')}
              {champ.obligatoire && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={champ.nom}
              value={value || ''}
              onChange={(e) => handleFieldChange(champ.nom, e.target.value)}
              required={champ.obligatoire}
            />
          </div>
        );
    }
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
          <h1 className="text-2xl font-bold text-gray-900">PV de Contrôle</h1>
          <p className="text-gray-500">Génération et suivi des procès-verbaux de contrôle</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau PV
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total PV</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conformes</p>
                <p className="text-2xl font-bold">{stats.conformes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avec réserves</p>
                <p className="text-2xl font-bold">{stats.avecReserves}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Non conformes</p>
                <p className="text-2xl font-bold">{stats.nonConformes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates quick access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modèles de PV disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  handleTemplateSelect(template.id);
                  setIsCreateDialogOpen(true);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                {template.nom}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par n° PV ou contrôleur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
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
                <TableHead>N° PV</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Équipement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Contrôleur</TableHead>
                <TableHead>Résultat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Aucun PV de contrôle trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => {
                  const resultInfo = getResultInfo(report.resultat);
                  const ResultIcon = resultInfo.icon;
                  
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.numero_pv}</TableCell>
                      <TableCell>{getTemplateName(report.template_id)}</TableCell>
                      <TableCell>{getEquipmentName(report.equipment_id) || '-'}</TableCell>
                      <TableCell>{formatDate(report.date_controle)}</TableCell>
                      <TableCell>{report.controleur}</TableCell>
                      <TableCell>
                        <Badge className={resultInfo.color}>
                          <ResultIcon className="h-3 w-3 mr-1" />
                          {resultInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => viewReport(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => printReport(report)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? `Nouveau PV - ${selectedTemplate.nom}` : 'Nouveau PV de Contrôle'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>
            )}
            
            {/* Template selection */}
            {!selectedTemplate && (
              <div className="space-y-2">
                <Label>Modèle de PV *</Label>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTemplate && (
              <>
                {/* Header info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_pv">N° PV *</Label>
                    <Input
                      id="numero_pv"
                      value={formData.numero_pv}
                      onChange={(e) => setFormData({ ...formData, numero_pv: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_controle">Date du contrôle *</Label>
                    <Input
                      id="date_controle"
                      type="date"
                      value={formData.date_controle}
                      onChange={(e) => setFormData({ ...formData, date_controle: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="controleur">Contrôleur *</Label>
                    <Input
                      id="controleur"
                      value={formData.controleur}
                      onChange={(e) => setFormData({ ...formData, controleur: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organisme">Organisme</Label>
                    <Input
                      id="organisme"
                      value={formData.organisme}
                      onChange={(e) => setFormData({ ...formData, organisme: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment_id">Équipement</Label>
                  <Select 
                    value={formData.equipment_id} 
                    onValueChange={(v) => setFormData({ ...formData, equipment_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un équipement..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {equipments.map(eq => (
                        <SelectItem key={eq.id} value={eq.id}>
                          {eq.type} - {eq.reference}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template fields */}
                {selectedTemplate.champs?.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-4">Mesures et vérifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.champs.map(champ => renderField(champ))}
                    </div>
                  </div>
                )}

                {/* Criteria reference */}
                {selectedTemplate.criteres_conformite?.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="font-medium text-blue-800 mb-2">Critères de conformité</h4>
                    <div className="text-sm text-blue-600 space-y-1">
                      {selectedTemplate.criteres_conformite.map((c, i) => (
                        <div key={i}>
                          {c.parametre}: max {c.valeur_max} {c.unite}
                          {c.note && <span className="text-blue-400 ml-2">({c.note})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Result */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resultat">Résultat *</Label>
                    <Select 
                      value={formData.resultat} 
                      onValueChange={(v) => setFormData({ ...formData, resultat: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESULT_OPTIONS.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validite_jusqua">Validité jusqu&apos;au</Label>
                    <Input
                      id="validite_jusqua"
                      type="date"
                      value={formData.validite_jusqua}
                      onChange={(e) => setFormData({ ...formData, validite_jusqua: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observations">Observations</Label>
                  <Textarea
                    id="observations"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedTemplate}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Créer le PV
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              PV de Contrôle - {selectedReport?.numero_pv}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Date:</span> {formatDate(selectedReport.date_controle)}</div>
                <div><span className="font-medium">Contrôleur:</span> {selectedReport.controleur}</div>
                {selectedReport.organisme && (
                  <div><span className="font-medium">Organisme:</span> {selectedReport.organisme}</div>
                )}
                {selectedReport.equipment_id && (
                  <div><span className="font-medium">Équipement:</span> {getEquipmentName(selectedReport.equipment_id)}</div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Résultats</h3>
                <div className="space-y-2">
                  {selectedTemplate.champs?.map(champ => {
                    const value = selectedReport.valeurs[champ.nom];
                    return (
                      <div key={champ.nom} className="flex justify-between py-1 border-b">
                        <span className="text-gray-600">{champ.nom.replace(/_/g, ' ')}</span>
                        <span className="font-medium">
                          {champ.type === 'checkbox' 
                            ? (value ? '✓ OK' : '✗ NON') 
                            : (value || '-')} {champ.unite || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center py-4">
                <Badge className={`${getResultInfo(selectedReport.resultat).color} text-lg px-4 py-2`}>
                  {getResultInfo(selectedReport.resultat).label}
                </Badge>
              </div>

              {selectedReport.observations && (
                <div>
                  <h3 className="font-medium mb-2">Observations</h3>
                  <p className="text-gray-600">{selectedReport.observations}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => printReport(selectedReport)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ControlReports;
