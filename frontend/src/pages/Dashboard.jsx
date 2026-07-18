import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardAPI, caissonAPI, alertsAPI, formationsAPI, usersAPI } from '../lib/api';
import { formatDate, daysUntil } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { GlobalSearch } from '../components/GlobalSearch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { SearchableSelect } from '../components/ui/searchable-select';
import {
  Box,
  Settings2,
  ClipboardList,
  AlertTriangle,
  Package,
  Calendar,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge,
  Activity,
  Mail,
  Loader2,
  Bell,
  Wrench,
  GraduationCap,
  Plus,
  Trash2,
  UserPlus,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [alertResult, setAlertResult] = useState(null);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [formations, setFormations] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [showFormationModal, setShowFormationModal] = useState(false);
  const [savingFormation, setSavingFormation] = useState(false);
  const emptyFormation = { nom: '', technicien: '', date_debut: '', date_fin: '', description: '' };
  const [formationForm, setFormationForm] = useState(emptyFormation);
  const [adminRequests, setAdminRequests] = useState(null);
  const [processingReq, setProcessingReq] = useState(null);

  const loadAdminRequests = async () => {
    if (user?.role !== 'admin') return;
    try {
      const res = await dashboardAPI.getAdminRequests();
      setAdminRequests(res.data);
    } catch (e) { /* noop */ }
  };

  const handleApproveUser = async (u) => {
    setProcessingReq(`user-${u.id}`);
    try {
      await usersAPI.approve(u.id);
      await loadAdminRequests();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la validation');
    } finally {
      setProcessingReq(null);
    }
  };

  const handleSendTempPassword = async (req) => {
    setProcessingReq(`reset-${req.id}`);
    try {
      await usersAPI.sendTempPassword(req.user_id);
      await loadAdminRequests();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de l\'envoi du mot de passe');
    } finally {
      setProcessingReq(null);
    }
  };

  const goToAlert = (a) => {
    if (a.item_type === 'work_order') navigate('/interventions', { state: { openWorkOrderId: a.item_id } });
    else if (a.item_type === 'inspection') navigate('/controles');
    else if (a.item_type === 'spare_part') navigate('/stock');
    else if (a.item_type === 'equipment') navigate('/equipements', { state: { openId: a.item_id } });
  };

  const goToUpcoming = (wo) => {
    if (wo.origine === 'controle_reglementaire') navigate('/controles');
    else navigate('/interventions', { state: { openWorkOrderId: wo.id } });
  };

  const saveFormation = async () => {
    if (!formationForm.nom || !formationForm.technicien || !formationForm.date_debut || !formationForm.date_fin) return;
    setSavingFormation(true);
    try {
      const selTech = technicians.find(t => t.id === formationForm.technicien);
      const payload = {
        nom: formationForm.nom,
        technicien: selTech ? `${selTech.prenom} ${selTech.nom}` : formationForm.technicien,
        technicien_id: selTech ? selTech.id : null,
        date_debut: formationForm.date_debut,
        date_fin: formationForm.date_fin,
        description: formationForm.description || null,
      };
      await formationsAPI.create(payload);
      setFormationForm(emptyFormation);
      await loadDashboardData();
    } catch (e) {
      alert(e.response?.data?.detail || 'Erreur lors de la création de la formation');
    }
    setSavingFormation(false);
  };

  const deleteFormation = async (id) => {
    try {
      await formationsAPI.delete(id);
      await loadDashboardData();
    } catch (e) {
      alert('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadAdminRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendAlerts = async () => {
    setSendingAlerts(true);
    setAlertResult(null);
    try {
      const res = await alertsAPI.checkAndSend();
      setAlertResult({
        success: true,
        message: `${res.data.total} notification(s) envoyée(s)`,
        details: res.data.alerts_sent
      });
    } catch (error) {
      setAlertResult({
        success: false,
        message: error.response?.data?.detail || 'Erreur lors de l\'envoi des notifications'
      });
    } finally {
      setSendingAlerts(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [statsRes, alertsRes, upcomingRes, caissonRes, calendarRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getAlerts(),
        dashboardAPI.getUpcomingMaintenance(),
        caissonAPI.get(),
        dashboardAPI.getCalendar()
      ]);
      
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setUpcoming(upcomingRes.data);
      setCaisson(caissonRes.data);
      setCalendar(calendarRes.data || []);
      setCaisson(caissonRes.data);
      try {
        const [formRes, techRes] = await Promise.all([
          formationsAPI.getAll(),
          usersAPI.getTechnicians().catch(() => ({ data: [] })),
        ]);
        setFormations(formRes.data || []);
        setTechnicians(techRes.data || []);
      } catch (e) { /* noop */ }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-[#AE2012]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#EE9B00]" />;
      default:
        return <Clock className="w-5 h-5 text-[#005F73]" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Barlow_Condensed'] uppercase tracking-tight text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-slate-500 mt-1">
            Vue d'ensemble de votre installation
          </p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <Button 
              variant="outline"
              onClick={handleSendAlerts}
              disabled={sendingAlerts}
              className="border-[#005F73] text-[#005F73] hover:bg-[#005F73]/5"
              data-testid="send-alerts-btn"
            >
              {sendingAlerts ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              Envoyer alertes
            </Button>
          )}
          <Link to="/interventions">
            <Button variant="outline" className="border-[#0A9396] text-[#0A9396] hover:bg-[#0A9396]/5" data-testid="new-intervention-btn">
              <Wrench className="w-4 h-4 mr-2" />
              Nouvelle intervention
            </Button>
          </Link>
          <Link to="/ordres-travail">
            <Button className="bg-[#005F73] hover:bg-[#004C5C]" data-testid="new-work-order-btn">
              <ClipboardList className="w-4 h-4 mr-2" />
              Nouvelle maintenance
            </Button>
          </Link>
        </div>
      </div>

      {/* Barre de recherche globale */}
      <GlobalSearch />

      {/* Alert Result Notification */}
      {alertResult && (
        <div className={`p-4 rounded-lg flex items-center justify-between ${
          alertResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            {alertResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className={alertResult.success ? 'text-green-800' : 'text-red-800'}>
                {alertResult.message}
              </p>
              {alertResult.details && (
                <p className="text-sm text-green-600 mt-1">
                  Rappels: {alertResult.details.maintenance_reminders} | 
                  Retards: {alertResult.details.maintenance_overdue} | 
                  Stock bas: {alertResult.details.low_stock} | 
                  Compteur: {alertResult.details.hour_counter}
                </p>
              )}
            </div>
          </div>
          <button onClick={() => setAlertResult(null)} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Compresseur Compteur Horaire - En haut */}
      {stats?.compresseurs && stats.compresseurs.length > 0 && (
        <Card className="border-l-4 border-l-[#EE9B00] bg-gradient-to-r from-amber-50 to-white" data-testid="compressor-header">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#EE9B00]/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#EE9B00]" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Compteur Horaire Compresseur</p>
                  <div className="flex items-baseline gap-3">
                    {stats.compresseurs.map((comp, idx) => (
                      <div key={comp.id} className="flex items-baseline gap-1">
                        {idx > 0 && <span className="text-slate-300 mx-2">|</span>}
                        <span className="text-3xl font-bold font-['Barlow_Condensed'] text-[#005F73]">
                          {comp.compteur_horaire?.toLocaleString() || 0}
                        </span>
                        <span className="text-sm text-slate-500">h</span>
                        <span className="text-xs text-slate-400 ml-1">({comp.reference})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Link to="/equipements">
                <Button variant="outline" size="sm">
                  <Settings2 className="w-4 h-4 mr-1" /> Gérer
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Caisson Status Card */}
      {caisson && (
        <Card className="border-l-4 border-l-[#005F73]" data-testid="caisson-status-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#005F73]/10 rounded-lg flex items-center justify-center">
                  <Gauge className="w-8 h-8 text-[#005F73]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold font-['Barlow_Condensed'] uppercase">
                    {caisson.identifiant}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {caisson.modele} • {caisson.fabricant}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="text-center px-4 py-2 bg-slate-50 rounded-md">
                  <div className="text-2xl font-bold font-['Barlow_Condensed'] text-[#005F73]">
                    {caisson.pression_maximale}
                  </div>
                  <div className="text-xs text-slate-500 uppercase">Bar max</div>
                </div>
                <div className="text-center px-4 py-2 bg-slate-50 rounded-md">
                  <div className="text-2xl font-bold font-['Barlow_Condensed'] text-[#0A9396]">
                    {stats?.equipment_stats.total || 0}
                  </div>
                  <div className="text-xs text-slate-500 uppercase">Équipements</div>
                </div>
                <Link to="/caisson">
                  <Button variant="outline" size="sm">
                    Voir détails
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="dashboard-widget card-hover" data-testid="stat-equipments">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Équipements</p>
                <p className="text-4xl font-bold font-['Barlow_Condensed'] text-[#005F73] mt-2">
                  {stats?.equipment_stats.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#005F73]/10 rounded-lg flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-[#005F73]" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-xs">
              <Badge variant="outline" className="status-en_service">
                {stats?.equipment_stats.en_service || 0} actifs
              </Badge>
              {stats?.equipment_stats.hors_service > 0 && (
                <Badge variant="outline" className="status-hors_service">
                  {stats.equipment_stats.hors_service} HS
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-widget card-hover" data-testid="stat-work-orders">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Ordres de travail</p>
                <p className="text-4xl font-bold font-['Barlow_Condensed'] text-[#005F73] mt-2">
                  {stats?.work_order_stats.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#EE9B00]/10 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-[#EE9B00]" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-xs">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {stats?.work_order_stats.planifiee || 0} planifiés
              </Badge>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {stats?.work_order_stats.en_cours || 0} en cours
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-widget card-hover" data-testid="stat-alerts">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Alertes actives</p>
                <p className="text-4xl font-bold font-['Barlow_Condensed'] text-[#AE2012] mt-2">
                  {alerts.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#AE2012]/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#AE2012]" />
              </div>
            </div>
            <div className="mt-4 text-xs">
              {alerts.filter(a => a.severity === 'critical').length > 0 && (
                <Badge variant="outline" className="status-hors_service">
                  {alerts.filter(a => a.severity === 'critical').length} critiques
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-widget card-hover" data-testid="stat-stock">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Stock bas</p>
                <p className="text-4xl font-bold font-['Barlow_Condensed'] text-[#EE9B00] mt-2">
                  {stats?.low_stock_count || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[#EE9B00]/10 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-[#EE9B00]" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              sur {stats?.total_spare_parts || 0} pièces
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demandes à traiter (admin) */}
      {isAdmin && adminRequests && adminRequests.total > 0 && (
        <Card className="dashboard-widget border-[#EE9B00]/40" data-testid="admin-requests">
          <CardHeader>
            <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#EE9B00]" />
              Demandes à traiter
              <Badge className="ml-1 bg-[#EE9B00] text-white">{adminRequests.total}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Inscriptions à valider */}
            {adminRequests.inscriptions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#005F73]" /> Inscriptions à valider ({adminRequests.inscriptions.length})
                </p>
                <div className="space-y-2">
                  {adminRequests.inscriptions.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2" data-testid={`req-inscription-${u.id}`}>
                      <div className="text-sm">
                        <span className="font-medium">{u.prenom} {u.nom}</span>
                        <span className="text-slate-500"> — {u.email} ({u.role})</span>
                      </div>
                      <Button size="sm" className="bg-[#0A9396] hover:bg-[#087a7d]" disabled={processingReq === `user-${u.id}`}
                        onClick={() => handleApproveUser(u)} data-testid={`approve-user-${u.id}`}>
                        {processingReq === `user-${u.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Valider</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mots de passe à réinitialiser */}
            {adminRequests.reset_mdp.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#005F73]" /> Réinitialisations de mot de passe ({adminRequests.reset_mdp.length})
                </p>
                <div className="space-y-2">
                  {adminRequests.reset_mdp.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2" data-testid={`req-reset-${r.id}`}>
                      <div className="text-sm">
                        <span className="font-medium">{r.prenom} {r.nom}</span>
                        <span className="text-slate-500"> — {r.email}</span>
                      </div>
                      <Button size="sm" className="bg-[#005F73] hover:bg-[#004855]" disabled={processingReq === `reset-${r.id}`}
                        onClick={() => handleSendTempPassword(r)} data-testid={`send-temp-${r.id}`}>
                        {processingReq === `reset-${r.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-1" /> Envoyer MDP</>}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Irrégularités */}
            {adminRequests.irregularites.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#AE2012]" /> Irrégularités ({adminRequests.irregularites.length})
                </p>
                <div className="space-y-2">
                  {adminRequests.irregularites.map((irr, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-md px-3 py-2 cursor-pointer hover:bg-red-100/60"
                      onClick={() => navigate(irr.lien)} data-testid={`req-irregularite-${idx}`}>
                      <div className="text-sm text-slate-700">
                        {irr.label}
                        {irr.equipement ? <span className="text-slate-500"> — {irr.equipement}</span> : null}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts & Upcoming Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="dashboard-widget" data-testid="alerts-list">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg">
              Alertes actives
            </CardTitle>
            <Badge variant="outline" className="bg-[#AE2012]/10 text-[#AE2012]">
              {alerts.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#0A9396]" />
                <p>Aucune alerte active</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    onClick={() => goToAlert(alert)}
                    className={`alert-card ${alert.severity} cursor-pointer hover:shadow-sm transition-shadow`}
                    data-testid={`alert-item-${index}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Maintenance */}
        <Card className="dashboard-widget" data-testid="upcoming-maintenance">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg">
              Maintenances à venir
            </CardTitle>
            <Link to="/ordres-travail">
              <Button variant="ghost" size="sm">
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune maintenance planifiée</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {upcoming.slice(0, 5).map((wo, index) => (
                  <div
                    key={wo.id}
                    onClick={() => goToUpcoming(wo)}
                    className={`p-3 rounded-md border cursor-pointer hover:shadow-sm transition-shadow ${
                      wo.is_overdue ? 'border-[#AE2012]/30 bg-[#AE2012]/5' : 'border-slate-200'
                    }`}
                    data-testid={`upcoming-item-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {wo.titre}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(wo.date_planifiee)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          wo.is_overdue
                            ? 'bg-[#AE2012]/10 text-[#AE2012] border-[#AE2012]/20'
                            : wo.days_until <= 7
                            ? 'bg-[#EE9B00]/10 text-[#EE9B00] border-[#EE9B00]/20'
                            : 'bg-[#005F73]/10 text-[#005F73] border-[#005F73]/20'
                        }
                      >
                        {wo.is_overdue
                          ? `${Math.abs(wo.days_until)}j retard`
                          : wo.days_until === 0
                          ? "Aujourd'hui"
                          : `${wo.days_until}j`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendrier hebdomadaire */}
      <Card className="dashboard-widget" data-testid="maintenance-calendar">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#005F73]" />
            Calendrier des maintenances (semaine par semaine)
          </CardTitle>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowFormationModal(true)} data-testid="add-formation-btn"
              className="border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed]/5">
              <GraduationCap className="w-4 h-4 mr-1" /> Ajouter une formation
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#0A9396]"></span>Préventive</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500"></span>Réglementaire</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#EE9B00]"></span>Corrective</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#AE2012]"></span>En retard</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#94D2BD]"></span>Terminée</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#7c3aed]"></span>Formation</span>
          </div>
          {(() => {
            const today0 = new Date(); today0.setHours(0, 0, 0, 0);
            const mondayOf = (dstr) => { const d = new Date(dstr); d.setHours(0, 0, 0, 0); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d; };
            const map = {};
            (calendar || []).forEach(m => {
              if (!m.date_planifiee) return;
              const mon = mondayOf(m.date_planifiee);
              const key = mon.toISOString().slice(0, 10);
              if (!map[key]) map[key] = { monday: mon, items: [] };
              map[key].items.push(m);
            });
            const weeks = Object.values(map)
              .filter(w => { const sun = new Date(w.monday); sun.setDate(sun.getDate() + 6); return sun >= today0; })
              .sort((a, b) => a.monday - b.monday)
              .slice(0, 12);
            if (weeks.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">Aucune maintenance planifiée</p>;
            const colorOf = (m) => {
              const d = new Date(m.date_planifiee); d.setHours(0, 0, 0, 0);
              const overdue = d < today0 && m.statut !== 'terminee' && !m.is_formation;
              if (m.is_formation) return 'border-[#7c3aed] bg-[#7c3aed]/5';
              if (m.statut === 'terminee') return 'border-[#94D2BD] bg-[#94D2BD]/10';
              if (overdue) return 'border-[#AE2012] bg-[#AE2012]/5';
              if (m.type_maintenance === 'corrective') return 'border-[#EE9B00] bg-[#EE9B00]/5';
              if (m.type_maintenance === 'reglementaire') return 'border-indigo-500 bg-indigo-50';
              return 'border-[#0A9396] bg-[#0A9396]/5';
            };
            return (
              <div className="space-y-4" data-testid="weekly-agenda">
                {weeks.map(w => {
                  const sun = new Date(w.monday); sun.setDate(sun.getDate() + 6);
                  const items = [...w.items].sort((a, b) => (a.date_planifiee || '').localeCompare(b.date_planifiee || ''));
                  return (
                    <div key={w.monday.toISOString()} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                        Semaine du {formatDate(w.monday.toISOString().slice(0, 10))} au {formatDate(sun.toISOString().slice(0, 10))}
                        <span className="ml-2 text-xs font-normal text-slate-400">({items.length})</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {items.map(m => (
                          <div key={`${m.id}-${m.date_planifiee}`}
                            onClick={() => {
                              if (m.is_formation) return;
                              if (m.type_maintenance === 'reglementaire') navigate('/controles');
                              else navigate('/interventions', { state: { openWorkOrderId: m.id } });
                            }}
                            data-testid={`agenda-item-${m.id}`}
                            className={`flex items-center justify-between gap-3 px-3 py-2 text-sm border-l-4 ${colorOf(m)} ${m.is_formation ? '' : 'cursor-pointer hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {m.is_formation ? <GraduationCap className="w-4 h-4 text-[#7c3aed] shrink-0" /> : <Wrench className="w-4 h-4 text-slate-400 shrink-0" />}
                              <span className="truncate">{m.titre}</span>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {m.is_formation && m.date_fin ? `${formatDate(m.date_planifiee)} → ${formatDate(m.date_fin)}` : formatDate(m.date_planifiee)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Formation modal (admin) */}
      <Dialog open={showFormationModal} onOpenChange={setShowFormationModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-['Barlow_Condensed'] uppercase flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#7c3aed]" /> Créneaux de formation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de la formation *</Label>
              <Input value={formationForm.nom} onChange={e => setFormationForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: Recyclage sécurité hyperbare" data-testid="formation-nom" />
            </div>
            <div className="space-y-2">
              <Label>Technicien *</Label>
              <SearchableSelect
                value={formationForm.technicien}
                onValueChange={(v) => setFormationForm(p => ({ ...p, technicien: v }))}
                allowCustom
                placeholder="Sélectionner ou saisir un nom"
                searchPlaceholder="Rechercher ou saisir..."
                options={technicians.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom}` }))}
                data-testid="formation-technicien"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Du *</Label>
                <Input type="date" value={formationForm.date_debut} onChange={e => setFormationForm(p => ({ ...p, date_debut: e.target.value }))} data-testid="formation-debut" />
              </div>
              <div className="space-y-2">
                <Label>Au *</Label>
                <Input type="date" value={formationForm.date_fin} onChange={e => setFormationForm(p => ({ ...p, date_fin: e.target.value }))} data-testid="formation-fin" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formationForm.description} onChange={e => setFormationForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <Button onClick={saveFormation} disabled={savingFormation || !formationForm.nom || !formationForm.technicien || !formationForm.date_debut || !formationForm.date_fin} className="w-full bg-[#7c3aed] hover:bg-[#6d28d9]" data-testid="formation-save">
              {savingFormation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Ajouter la formation
            </Button>

            {formations.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Formations enregistrées</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formations.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{f.nom}</p>
                        <p className="text-xs text-slate-500">{f.technicien} · {formatDate(f.date_debut)} → {formatDate(f.date_fin)}</p>
                      </div>
                      <button onClick={() => deleteFormation(f.id)} className="text-slate-400 hover:text-red-600 shrink-0" data-testid={`formation-delete-${f.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormationModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper pour obtenir le numéro de semaine
Date.prototype.getWeek = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export default Dashboard;
