import React, { useState, useEffect } from 'react';
import { caissonAPI, equipmentsAPI } from '../lib/api';
import { formatDate, equipmentTypeLabels, statusLabels, getStatusClass } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Box,
  Edit,
  Save,
  X,
  Gauge,
  Calendar,
  Building,
  FileText,
  Settings2,
  Plus,
  Loader2
} from 'lucide-react';

const Caisson = () => {
  const [caisson, setCaisson] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    identifiant: '',
    modele: '',
    fabricant: '',
    date_mise_en_service: '',
    pression_maximale: '',
    normes_applicables: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [caissonRes, equipmentsRes] = await Promise.all([
        caissonAPI.get(),
        equipmentsAPI.getAll()
      ]);
      
      if (caissonRes.data) {
        setCaisson(caissonRes.data);
        setFormData({
          ...caissonRes.data,
          normes_applicables: caissonRes.data.normes_applicables?.join(', ') || '',
          pression_maximale: caissonRes.data.pression_maximale?.toString() || ''
        });
      }
      setEquipments(equipmentsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        pression_maximale: parseFloat(formData.pression_maximale),
        normes_applicables: formData.normes_applicables
          .split(',')
          .map(n => n.trim())
          .filter(n => n)
      };

      if (caisson) {
        await caissonAPI.update(caisson.id, data);
      } else {
        await caissonAPI.create(data);
      }
      
      await loadData();
      setEditing(false);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert(error.response?.data?.detail || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const equipmentsByType = equipments.reduce((acc, eq) => {
    if (!acc[eq.type]) acc[eq.type] = [];
    acc[eq.type].push(eq);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6" data-testid="caisson-loading">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!caisson && !showCreateModal) {
    return (
      <div className="space-y-6" data-testid="caisson-empty">
        <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
          Caisson hyperbare
        </h1>
        
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Box className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold mb-2">Aucun caisson configuré</h2>
            <p className="text-slate-500 mb-6">
              Commencez par créer la fiche de votre caisson hyperbare
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#005F73] hover:bg-[#004C5C]"
              data-testid="create-caisson-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer le caisson
            </Button>
          </CardContent>
        </Card>

        {/* Create Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-['Barlow_Condensed'] uppercase text-xl">
                Créer le caisson
              </DialogTitle>
            </DialogHeader>
            <CaissonForm 
              formData={formData} 
              onChange={handleChange} 
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-[#005F73] hover:bg-[#004C5C]"
                data-testid="save-caisson-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="caisson-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
          Caisson hyperbare
        </h1>
        {!editing && (
          <Button 
            variant="outline" 
            onClick={() => setEditing(true)}
            data-testid="edit-caisson-btn"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>

      {/* Caisson Details */}
      <Card className="border-l-4 border-l-[#005F73]" data-testid="caisson-details">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#005F73]/10 rounded-lg flex items-center justify-center">
              <Gauge className="w-8 h-8 text-[#005F73]" />
            </div>
            <div>
              <CardTitle className="text-2xl font-['Barlow_Condensed'] uppercase">
                {caisson?.identifiant}
              </CardTitle>
              <p className="text-slate-500">{caisson?.modele}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-6">
              <CaissonForm formData={formData} onChange={handleChange} />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-[#005F73] hover:bg-[#004C5C]"
                  data-testid="save-caisson-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <InfoItem 
                icon={Building} 
                label="Fabricant" 
                value={caisson?.fabricant} 
              />
              <InfoItem 
                icon={Calendar} 
                label="Mise en service" 
                value={formatDate(caisson?.date_mise_en_service)} 
              />
              <InfoItem 
                icon={Gauge} 
                label="Pression maximale" 
                value={`${caisson?.pression_maximale} bar`} 
              />
              <InfoItem 
                icon={FileText} 
                label="Normes applicables" 
                value={caisson?.normes_applicables?.join(', ') || '-'} 
              />
              <InfoItem 
                icon={Settings2} 
                label="Équipements rattachés" 
                value={`${equipments.length} équipement(s)`} 
              />
            </div>
          )}
          
          {caisson?.description && !editing && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Description</h3>
              <p className="text-slate-700">{caisson.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Summary */}
      <Card data-testid="equipment-summary">
        <CardHeader>
          <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg">
            Équipements rattachés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {equipments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Settings2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Aucun équipement enregistré</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(equipmentsByType).map(([type, items]) => (
                <div 
                  key={type}
                  className="p-4 border rounded-md bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-slate-900">
                      {equipmentTypeLabels[type] || type}
                    </h3>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.slice(0, 3).map(eq => (
                      <div key={eq.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 truncate">{eq.reference}</span>
                        <Badge className={`${getStatusClass(eq.statut)} text-xs`}>
                          {statusLabels[eq.statut]}
                        </Badge>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-xs text-slate-500">
                        +{items.length - 3} autre(s)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Info Item Component
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-slate-500" />
    </div>
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="font-medium text-slate-900">{value || '-'}</p>
    </div>
  </div>
);

// Caisson Form Component
const CaissonForm = ({ formData, onChange }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="identifiant">Identifiant *</Label>
      <Input
        id="identifiant"
        name="identifiant"
        value={formData.identifiant}
        onChange={onChange}
        placeholder="CAI-001"
        required
        data-testid="input-identifiant"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="modele">Modèle *</Label>
      <Input
        id="modele"
        name="modele"
        value={formData.modele}
        onChange={onChange}
        placeholder="Modèle du caisson"
        required
        data-testid="input-modele"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="fabricant">Fabricant *</Label>
      <Input
        id="fabricant"
        name="fabricant"
        value={formData.fabricant}
        onChange={onChange}
        placeholder="Nom du fabricant"
        required
        data-testid="input-fabricant"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="date_mise_en_service">Date de mise en service *</Label>
      <Input
        id="date_mise_en_service"
        name="date_mise_en_service"
        type="date"
        value={formData.date_mise_en_service}
        onChange={onChange}
        required
        data-testid="input-date"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="pression_maximale">Pression maximale (bar) *</Label>
      <Input
        id="pression_maximale"
        name="pression_maximale"
        type="number"
        step="0.1"
        value={formData.pression_maximale}
        onChange={onChange}
        placeholder="6.0"
        required
        data-testid="input-pression"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="normes_applicables">Normes applicables</Label>
      <Input
        id="normes_applicables"
        name="normes_applicables"
        value={formData.normes_applicables}
        onChange={onChange}
        placeholder="ISO 13485, EN 14931 (séparées par virgule)"
        data-testid="input-normes"
      />
    </div>
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="description">Description</Label>
      <Input
        id="description"
        name="description"
        value={formData.description}
        onChange={onChange}
        placeholder="Description du caisson"
        data-testid="input-description"
      />
    </div>
  </div>
);

export default Caisson;
