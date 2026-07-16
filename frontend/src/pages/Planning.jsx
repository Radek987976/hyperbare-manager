import React, { useState, useEffect, useCallback } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, addMonths, subMonths, isSameMonth, isSameDay, isToday
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Wrench, ShieldCheck, AlertTriangle, CheckCircle2, RotateCw, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { planningAPI, workOrdersAPI } from '../lib/api';
import { equipmentsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  SearchableSelect
} from '../components/ui/searchable-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const safeFormat = (value, pattern) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return format(d, pattern, { locale: fr });
};

const eventStyle = (ev) => {
  if (ev.origine === 'formation') return 'bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/30';
  if (ev.statut === 'terminee') return 'bg-[#0A9396]/15 text-[#0A9396] border-[#0A9396]/30 line-through';
  if (ev.is_overdue) return 'bg-[#AE2012]/10 text-[#AE2012] border-[#AE2012]/30';
  if (ev.origine === 'reglementaire') return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  if (ev.origine === 'corrective') return 'bg-[#EE9B00]/15 text-[#BB8A00] border-[#EE9B00]/40';
  return 'bg-[#005F73]/10 text-[#005F73] border-[#005F73]/30';
};

export default function Planning() {
  const [view, setView] = useState('month'); // 'month' | 'year'
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [equipments, setEquipments] = useState([]);
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [dragId, setDragId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeData, setCompleteData] = useState({ date_realisation: '', technicien: '', observations: '' });
  const [saving, setSaving] = useState(false);

  const monthStart = startOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(current), { weekStartsOn: 1 });

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const start = format(gridStart, 'yyyy-MM-dd');
      const end = format(gridEnd, 'yyyy-MM-dd');
      const eq = equipmentFilter === 'all' ? undefined : equipmentFilter;
      const res = await planningAPI.getEvents(start, end, eq);
      setEvents(res.data || []);
    } catch (e) {
      toast.error('Erreur chargement du planning');
    } finally {
      setLoading(false);
    }
  }, [gridStart, gridEnd, equipmentFilter]);

  const loadYear = useCallback(async () => {
    setLoading(true);
    try {
      const eq = equipmentFilter === 'all' ? undefined : equipmentFilter;
      const res = await planningAPI.getSummary(current.getFullYear(), eq);
      setSummary(res.data);
    } catch (e) {
      toast.error('Erreur chargement de la vue annuelle');
    } finally {
      setLoading(false);
    }
  }, [current, equipmentFilter]);

  useEffect(() => {
    equipmentsAPI.getAll().then(res => setEquipments(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (view === 'month') loadMonth();
    else loadYear();
  }, [view, loadMonth, loadYear]);

  const eventsByDay = (day) => {
    const key = format(day, 'yyyy-MM-dd');
    return events.filter(e => e.date === key);
  };

  const handleDrop = async (day) => {
    if (!dragId) return;
    const ev = events.find(e => e.id === dragId);
    setDragId(null);
    if (!ev) return;
    const newDate = format(day, 'yyyy-MM-dd');
    if (ev.date === newDate) return;
    try {
      await planningAPI.reschedule({ item_type: ev.item_type, item_id: ev.id, new_date: newDate });
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, date: newDate } : e));
      toast.success(`Replanifié au ${safeFormat(day, 'dd MMMM yyyy')}`);
    } catch (e) {
      toast.error('Échec de la replanification');
    }
  };

  const openComplete = () => {
    setCompleteData({ date_realisation: format(new Date(), 'yyyy-MM-dd'), technicien: '', observations: '' });
    setCompleteOpen(true);
  };

  const handleComplete = async () => {
    if (!selectedEvent) return;
    setSaving(true);
    try {
      const res = await workOrdersAPI.complete(selectedEvent.id, completeData);
      const next = res.data?.next_work_order;
      toast.success(next
        ? `Maintenance réalisée. Prochaine occurrence générée au ${safeFormat(next.date_planifiee, 'dd MMMM yyyy')}`
        : 'Maintenance marquée comme réalisée');
      setCompleteOpen(false);
      setSelectedEvent(null);
      loadMonth();
    } catch (e) {
      toast.error('Échec de la clôture');
    } finally {
      setSaving(false);
    }
  };

  const goToMonth = (monthIndex) => {
    setCurrent(new Date(current.getFullYear(), monthIndex, 1));
    setView('month');
  };

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="space-y-6" data-testid="planning-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-['Barlow_Condensed'] font-bold uppercase tracking-tight text-slate-900">
            Planning des maintenances
          </h1>
          <p className="text-slate-500 mt-1">Calendrier automatique basé sur les périodicités réglementaires</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchableSelect
            value={equipmentFilter}
            onValueChange={setEquipmentFilter}
            className="w-[220px]"
            data-testid="planning-equipment-filter"
            placeholder="Tous les équipements"
            options={[{ value: 'all', label: 'Tous les équipements' }, ...equipments.map(eq => ({ value: eq.id, label: eq.reference || eq.type }))]}
          />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden" data-testid="view-toggle">
            <button
              onClick={() => setView('month')}
              data-testid="view-month-btn"
              className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'month' ? 'bg-[#005F73] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >Mois</button>
            <button
              onClick={() => setView('year')}
              data-testid="view-year-btn"
              className={`px-4 py-2 text-sm font-medium transition-colors ${view === 'year' ? 'bg-[#005F73] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >Année</button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm" data-testid="planning-legend">
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#005F73]/40 border border-[#005F73]"></span> Préventif</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-indigo-200 border border-indigo-400"></span> Contrôle réglementaire</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#EE9B00]/30 border border-[#EE9B00]"></span> Correctif</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#AE2012]/20 border border-[#AE2012]"></span> En retard</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#0A9396]/30 border border-[#0A9396]"></span> Réalisé</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#7c3aed]/20 border border-[#7c3aed]"></span> Formation</span>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" data-testid="nav-prev"
            onClick={() => setCurrent(view === 'month' ? subMonths(current, 1) : new Date(current.getFullYear() - 1, current.getMonth(), 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" data-testid="nav-next"
            onClick={() => setCurrent(view === 'month' ? addMonths(current, 1) : new Date(current.getFullYear() + 1, current.getMonth(), 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="nav-today" onClick={() => setCurrent(new Date())}>Aujourd'hui</Button>
        </div>
        <h2 className="text-2xl font-['Barlow_Condensed'] font-semibold text-slate-800" data-testid="planning-title">
          {view === 'month' ? `${MONTHS_FR[current.getMonth()]} ${current.getFullYear()}` : current.getFullYear()}
        </h2>
      </div>

      {/* Month view */}
      {view === 'month' && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {WEEKDAYS.map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold uppercase text-slate-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayEvents = eventsByDay(day);
              const inMonth = isSameMonth(day, current);
              return (
                <div
                  key={day.toISOString()}
                  data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(day)}
                  className={`min-h-[110px] border-b border-r border-slate-100 p-1.5 ${inMonth ? 'bg-white' : 'bg-slate-50/50'} ${isToday(day) ? 'ring-1 ring-inset ring-[#005F73]' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${inMonth ? 'text-slate-700' : 'text-slate-300'} ${isToday(day) ? 'text-[#005F73] font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 4).map(ev => (
                      <div
                        key={ev.id}
                        draggable={ev.item_type !== 'formation'}
                        onDragStart={() => { if (ev.item_type !== 'formation') setDragId(ev.id); }}
                        onClick={() => setSelectedEvent(ev)}
                        data-testid={`event-${ev.id}`}
                        title={ev.titre}
                        className={`text-[11px] leading-tight px-1.5 py-1 rounded border cursor-pointer truncate ${eventStyle(ev)}`}
                      >
                        {ev.origine === 'formation'
                          ? <GraduationCap className="w-3 h-3 inline mr-1" />
                          : ev.origine === 'reglementaire'
                            ? <ShieldCheck className="w-3 h-3 inline mr-1" />
                            : <Wrench className="w-3 h-3 inline mr-1" />}
                        {ev.titre}
                      </div>
                    ))}
                    {dayEvents.length > 4 && (
                      <div className="text-[10px] text-slate-400 pl-1">+{dayEvents.length - 4} de plus</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Year view */}
      {view === 'year' && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="year-grid">
          {MONTHS_FR.map((name, idx) => {
            const m = summary.months[idx + 1] || { preventive: 0, reglementaire: 0, overdue: 0 };
            const total = m.preventive + m.reglementaire;
            return (
              <Card
                key={name}
                data-testid={`year-month-${idx + 1}`}
                onClick={() => goToMonth(idx)}
                className="cursor-pointer card-hover transition-all hover:shadow-md hover:border-[#005F73]/40"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-['Barlow_Condensed'] uppercase flex items-center justify-between">
                    {name}
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold text-slate-900">{total}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.preventive > 0 && (
                      <Badge variant="outline" className="bg-[#005F73]/10 text-[#005F73] border-[#005F73]/20 text-xs">
                        <Wrench className="w-3 h-3 mr-1" />{m.preventive} préventif
                      </Badge>
                    )}
                    {m.reglementaire > 0 && (
                      <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 text-xs">
                        <ShieldCheck className="w-3 h-3 mr-1" />{m.reglementaire} réglem.
                      </Badge>
                    )}
                    {m.overdue > 0 && (
                      <Badge variant="outline" className="bg-[#AE2012]/10 text-[#AE2012] border-[#AE2012]/20 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />{m.overdue} en retard
                      </Badge>
                    )}
                    {total === 0 && <span className="text-xs text-slate-400">Aucune maintenance</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {loading && <div className="text-center text-slate-400 py-4" data-testid="planning-loading">Chargement…</div>}

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent && !completeOpen} onOpenChange={(o) => !o && setSelectedEvent(null)}>
        <DialogContent data-testid="event-detail-dialog">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{selectedEvent.titre}</DialogTitle>
                <DialogDescription>
                  {selectedEvent.origine === 'formation' ? 'Créneau de formation' : selectedEvent.origine === 'reglementaire' ? 'Contrôle réglementaire' : (selectedEvent.origine === 'corrective' ? 'Maintenance corrective' : 'Maintenance préventive')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Date planifiée</span>
                  <span className="font-medium">{safeFormat(selectedEvent.date, 'dd MMMM yyyy')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Statut</span>
                  <Badge variant="outline" className={eventStyle(selectedEvent).replace('line-through', '')}>
                    {selectedEvent.is_overdue ? 'En retard' : (selectedEvent.statut === 'terminee' ? 'Réalisé' : 'Planifié')}
                  </Badge></div>
                {selectedEvent.periodicite_jours && (
                  <div className="flex justify-between"><span className="text-slate-500">Périodicité</span>
                    <span className="font-medium">{selectedEvent.periodicite_jours} jours</span></div>
                )}
                {selectedEvent.periodicite && (
                  <div className="flex justify-between"><span className="text-slate-500">Périodicité</span>
                    <span className="font-medium">{selectedEvent.periodicite}</span></div>
                )}
              </div>
              <DialogFooter>
                {selectedEvent.item_type === 'work_order' && selectedEvent.statut !== 'terminee' && (
                  <Button onClick={openComplete} data-testid="mark-complete-btn" className="bg-[#0A9396] hover:bg-[#0A9396]/90">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marquer réalisé & planifier la suite
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent data-testid="complete-dialog">
          <DialogHeader>
            <DialogTitle>Clôturer la maintenance</DialogTitle>
            <DialogDescription>
              La prochaine occurrence sera générée automatiquement selon la périodicité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date_realisation">Date de réalisation</Label>
              <Input id="date_realisation" type="date" data-testid="complete-date"
                value={completeData.date_realisation}
                onChange={(e) => setCompleteData({ ...completeData, date_realisation: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="technicien">Technicien</Label>
              <Input id="technicien" data-testid="complete-technicien" placeholder="Nom du technicien"
                value={completeData.technicien}
                onChange={(e) => setCompleteData({ ...completeData, technicien: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="observations">Observations</Label>
              <Textarea id="observations" data-testid="complete-observations" placeholder="Observations…"
                value={completeData.observations}
                onChange={(e) => setCompleteData({ ...completeData, observations: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Annuler</Button>
            <Button onClick={handleComplete} disabled={saving} data-testid="complete-confirm-btn" className="bg-[#0A9396] hover:bg-[#0A9396]/90">
              {saving ? <RotateCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
