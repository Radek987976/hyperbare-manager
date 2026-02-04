import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, caissonAPI } from '../lib/api';
import { formatDate, daysUntil } from '../lib/utils';
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
  Activity
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
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [caisson, setCaisson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, alertsRes, upcomingRes, caissonRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getAlerts(),
        dashboardAPI.getUpcomingMaintenance(),
        caissonAPI.get()
      ]);
      
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setUpcoming(upcomingRes.data);
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
              Nouvel ordre
            </Button>
          </Link>
        </div>
      </div>

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
    </div>
  );
};

export default Dashboard;
