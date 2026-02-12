import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, caissonAPI, alertsAPI } from '../lib/api';
import { formatDate, daysUntil } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
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
  Bell
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0A9396', '#EE9B00', '#AE2012'];

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

  useEffect(() => {
    loadDashboardData();
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
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const equipmentChartData = stats ? [
    { name: 'En service', value: stats.equipment_stats.en_service, color: '#0A9396' },
    { name: 'Maintenance', value: stats.equipment_stats.maintenance, color: '#EE9B00' },
    { name: 'Hors service', value: stats.equipment_stats.hors_service, color: '#AE2012' }
  ] : [];

  const workOrderChartData = stats ? [
    { name: 'Planifiées', value: stats.work_order_stats.planifiee },
    { name: 'En cours', value: stats.work_order_stats.en_cours },
    { name: 'Terminées', value: stats.work_order_stats.terminee }
  ] : [];

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
          <Link to="/ordres-travail">
            <Button className="bg-[#005F73] hover:bg-[#004C5C]" data-testid="new-work-order-btn">
              <ClipboardList className="w-4 h-4 mr-2" />
              Nouvelle maintenance
            </Button>
          </Link>
        </div>
      </div>

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Status Chart */}
        <Card className="dashboard-widget" data-testid="equipment-chart">
          <CardHeader>
            <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg">
              État des équipements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={equipmentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {equipmentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {equipmentChartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Work Orders Chart */}
        <Card className="dashboard-widget" data-testid="work-orders-chart">
          <CardHeader>
            <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg">
              Ordres de travail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workOrderChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#005F73" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    className={`alert-card ${alert.severity}`}
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
                    className={`p-3 rounded-md border ${
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

      {/* Compresseurs - Compteurs horaires */}
      {stats?.compresseurs && stats.compresseurs.length > 0 && (
        <Card className="dashboard-widget" data-testid="compressors-counters">
          <CardHeader>
            <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#005F73]" />
              Compteurs horaires des compresseurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.compresseurs.map((comp) => (
                <div 
                  key={comp.id} 
                  className={`p-4 rounded-lg border ${
                    comp.statut === 'hors_service' ? 'border-red-200 bg-red-50' :
                    comp.statut === 'maintenance' ? 'border-yellow-200 bg-yellow-50' :
                    'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{comp.reference}</span>
                    <Badge variant="outline" className={
                      comp.statut === 'hors_service' ? 'bg-red-100 text-red-700' :
                      comp.statut === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }>
                      {comp.statut === 'en_service' ? 'Actif' : 
                       comp.statut === 'maintenance' ? 'Maintenance' : 'HS'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold font-['Barlow_Condensed'] text-[#005F73]">
                    {comp.compteur_horaire ? comp.compteur_horaire.toLocaleString() : '0'} h
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    S/N: {comp.numero_serie || '-'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendrier de Maintenance 52 semaines */}
      <Card className="dashboard-widget" data-testid="maintenance-calendar">
        <CardHeader>
          <CardTitle className="font-['Barlow_Condensed'] uppercase text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#005F73]" />
            Calendrier de Maintenance (52 semaines)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Légende */}
              <div className="flex gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#0A9396]"></div>
                  <span>Préventive planifiée</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#EE9B00]"></div>
                  <span>Corrective planifiée</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#94D2BD]"></div>
                  <span>Terminée</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#AE2012]"></div>
                  <span>En retard</span>
                </div>
              </div>
              
              {/* Grille des semaines */}
              <div className="grid grid-cols-13 gap-1">
                {/* En-têtes des mois */}
                {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc', ''].map((month, idx) => (
                  <div key={idx} className="text-xs text-center text-slate-500 font-medium py-1">
                    {month}
                  </div>
                ))}
                
                {/* Semaines */}
                {Array.from({ length: 52 }, (_, weekIdx) => {
                  const currentWeek = new Date().getWeek();
                  const weekNum = ((currentWeek + weekIdx - 1) % 52) + 1;
                  const isCurrentWeek = weekIdx === 0;
                  
                  // Trouver les maintenances de cette semaine
                  const weekMaintenances = calendar.filter(m => {
                    const mDate = new Date(m.date_planifiee);
                    const mWeek = mDate.getWeek();
                    return mWeek === weekNum;
                  });
                  
                  const hasPreventive = weekMaintenances.some(m => m.type_maintenance === 'preventive' && m.statut !== 'terminee');
                  const hasCorrective = weekMaintenances.some(m => m.type_maintenance === 'corrective' && m.statut !== 'terminee');
                  const hasCompleted = weekMaintenances.some(m => m.statut === 'terminee');
                  const hasOverdue = weekMaintenances.some(m => {
                    const mDate = new Date(m.date_planifiee);
                    return mDate < new Date() && m.statut !== 'terminee';
                  });
                  
                  let bgColor = 'bg-slate-100';
                  if (hasOverdue) bgColor = 'bg-[#AE2012]';
                  else if (hasCorrective) bgColor = 'bg-[#EE9B00]';
                  else if (hasPreventive) bgColor = 'bg-[#0A9396]';
                  else if (hasCompleted) bgColor = 'bg-[#94D2BD]';
                  
                  return (
                    <div
                      key={weekIdx}
                      className={`h-6 rounded ${bgColor} ${isCurrentWeek ? 'ring-2 ring-[#005F73]' : ''} 
                        ${weekMaintenances.length > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
                      title={weekMaintenances.length > 0 ? 
                        `S${weekNum}: ${weekMaintenances.map(m => m.titre).join(', ')}` : 
                        `S${weekNum}`
                      }
                    >
                      {weekMaintenances.length > 0 && (
                        <div className="text-[10px] text-white text-center leading-6 font-medium">
                          {weekMaintenances.length}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Détail des maintenances du mois en cours */}
              {calendar.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-slate-700 mb-2">Maintenances à venir (4 prochaines semaines)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {calendar
                      .filter(m => {
                        const mDate = new Date(m.date_planifiee);
                        const fourWeeksLater = new Date();
                        fourWeeksLater.setDate(fourWeeksLater.getDate() + 28);
                        return mDate >= new Date() && mDate <= fourWeeksLater && m.statut !== 'terminee';
                      })
                      .slice(0, 8)
                      .map(m => (
                        <div 
                          key={m.id} 
                          className={`p-2 rounded text-xs border-l-2 ${
                            m.type_maintenance === 'preventive' ? 'border-[#0A9396] bg-[#0A9396]/5' : 'border-[#EE9B00] bg-[#EE9B00]/5'
                          }`}
                        >
                          <p className="font-medium truncate">{m.titre}</p>
                          <p className="text-slate-500">{formatDate(m.date_planifiee)}</p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
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
