import React, { useState, useEffect } from 'react';
import { equipmentsAPI, subEquipmentsAPI } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Badge } from './ui/badge';
import { History, CalendarClock, Wrench, ShieldCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const sourceIcon = (source) => {
  if (source === 'inspection') return <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />;
  return <Wrench className="w-3.5 h-3.5 text-[#005F73]" />;
};

const EventRow = ({ ev, future }) => (
  <div
    data-testid={`maint-${future ? 'future' : 'past'}-item`}
    className={`flex items-start gap-3 p-2.5 rounded-md border ${
      ev.is_overdue ? 'border-[#AE2012]/30 bg-[#AE2012]/5' : 'border-slate-200 bg-white'
    }`}
  >
    <div className="mt-0.5">{sourceIcon(ev.source)}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-800 truncate" title={ev.titre}>{ev.titre}</p>
      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
        <span className="text-xs text-slate-500">{ev.type}</span>
        {ev.acteur && <span className="text-xs text-slate-400">• {ev.acteur}</span>}
        {ev.periodicite && <span className="text-xs text-slate-400">• {ev.periodicite}</span>}
      </div>
    </div>
    <div className="text-right shrink-0">
      <p className="text-xs font-medium text-slate-700">{formatDate(ev.date)}</p>
      {future ? (
        ev.is_overdue
          ? <Badge variant="outline" className="bg-[#AE2012]/10 text-[#AE2012] border-[#AE2012]/20 text-[10px] mt-1"><AlertTriangle className="w-2.5 h-2.5 mr-1" />En retard</Badge>
          : <Badge variant="outline" className="bg-[#005F73]/10 text-[#005F73] border-[#005F73]/20 text-[10px] mt-1">Planifié</Badge>
      ) : (
        <Badge variant="outline" className="bg-[#0A9396]/10 text-[#0A9396] border-[#0A9396]/20 text-[10px] mt-1"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Réalisé</Badge>
      )}
    </div>
  </div>
);

export const MaintenanceHistory = ({ entityId, entityType = 'equipment' }) => {
  const [data, setData] = useState({ historique: [], futures: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) return;
    let active = true;
    setLoading(true);
    const api = entityType === 'subequipment' ? subEquipmentsAPI : equipmentsAPI;
    api.getHistory(entityId)
      .then(res => { if (active) setData(res.data || { historique: [], futures: [] }); })
      .catch(() => { if (active) setData({ historique: [], futures: [] }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entityId, entityType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-400" data-testid="maint-history-loading">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="maintenance-history">
      {/* Maintenances futures */}
      <div className="space-y-2 pt-4 border-t">
        <h4 className="font-semibold flex items-center gap-2 text-slate-800">
          <CalendarClock className="w-4 h-4 text-[#005F73]" /> Maintenances à venir
          <Badge variant="outline" className="ml-1">{data.futures.length}</Badge>
        </h4>
        {data.futures.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune maintenance planifiée pour cet élément</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data.futures.map((ev, i) => <EventRow key={`f-${i}`} ev={ev} future />)}
          </div>
        )}
      </div>

      {/* Historique */}
      <div className="space-y-2 pt-4 border-t">
        <h4 className="font-semibold flex items-center gap-2 text-slate-800">
          <History className="w-4 h-4 text-[#0A9396]" /> Historique
          <Badge variant="outline" className="ml-1">{data.historique.length}</Badge>
        </h4>
        {data.historique.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun historique de maintenance</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {data.historique.map((ev, i) => <EventRow key={`h-${i}`} ev={ev} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceHistory;
