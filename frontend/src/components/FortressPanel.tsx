// @ts-nocheck
import React, { useState } from 'react';
import {
  Shield, ShieldAlert, Globe, Lock, Radio, Eye, AlertTriangle,
  Plus, X, Check, Trash2, TrendingUp, Zap, Link
} from 'lucide-react';
import { useSupplyChainStore, ThreatVector, ThreatType, ThreatStatus } from '../store/supplyChainStore';

// ── Config maps ───────────────────────────────────────────────────────────

const TYPE_ICON: Record<ThreatType, React.FC<any>> = {
  Geopolitical: Globe, Piracy: ShieldAlert, Sanctions: Lock,
  Cyber: Radio, Weather: Eye, Labor: AlertTriangle,
};

const TYPE_COLOR: Record<ThreatType, string> = {
  Geopolitical: 'text-red-400 bg-red-500/10 border-red-500/20',
  Piracy:       'text-orange-400 bg-orange-500/10 border-orange-500/20',
  Sanctions:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Cyber:        'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Weather:      'text-sky-400 bg-sky-500/10 border-sky-500/20',
  Labor:        'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

const STATUS_COLOR: Record<ThreatStatus, string> = {
  Active:     'text-red-400 bg-red-500/10 border-red-500/20',
  Monitoring: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Resolved:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const THREAT_TYPES: ThreatType[] = ['Geopolitical', 'Piracy', 'Sanctions', 'Cyber', 'Weather', 'Labor'];
const REGIONS = ['Middle East', 'Asia-Pacific', 'West Africa', 'Eastern Europe', 'Central America', 'North Europe', 'South Asia', 'Global'];

// ── Sub-components ────────────────────────────────────────────────────────

function SeverityBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.round(value * 100);
  const barColor = color || (value > 0.7 ? 'bg-red-500' : value > 0.4 ? 'bg-amber-500' : 'bg-emerald-500');
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/[0.05]">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-500 w-6 text-right">{pct}%</span>
    </div>
  );
}

// ── Threat Matrix (5×5 visual grid) ──────────────────────────────────────
function ThreatMatrix({ threats }: { threats: ThreatVector[] }) {
  const active = threats.filter(t => t.status !== 'Resolved');
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="section-label mb-2 flex items-center gap-1.5">
        <Zap size={9} className="text-red-400" /> Risk Matrix — Severity × Confidence
      </div>
      <div className="relative" style={{ height: 100 }}>
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map(v => (
            <React.Fragment key={v}>
              <line x1={`${v * 100}%`} y1="0" x2={`${v * 100}%`} y2="100%" stroke="rgba(255,255,255,0.04)" />
              <line x1="0" y1={`${v * 100}%`} x2="100%" y2={`${v * 100}%`} stroke="rgba(255,255,255,0.04)" />
            </React.Fragment>
          ))}
          {/* Danger zone (top-right) */}
          <rect x="50%" y="0" width="50%" height="50%" fill="rgba(239,68,68,0.04)" />
        </svg>
        {/* Axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          <span className="text-[8px] text-slate-700 font-mono">Low Sev.</span>
          <span className="text-[8px] text-slate-700 font-mono">High Sev.</span>
        </div>
        {/* Threat dots */}
        {active.map(t => (
          <div
            key={t.id}
            title={t.corridor}
            className={`absolute w-2.5 h-2.5 rounded-full border cursor-pointer transition-transform hover:scale-150 ${
              t.severity > 0.7 ? 'bg-red-500 border-red-400' :
              t.severity > 0.4 ? 'bg-amber-500 border-amber-400' : 'bg-emerald-500 border-emerald-400'
            }`}
            style={{
              left: `calc(${t.severity * 100}% - 5px)`,
              bottom: `calc(${t.confidence * 100}% - 5px)`,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 section-label">
        <span>Low Confidence</span><span>High Confidence</span>
      </div>
    </div>
  );
}

// ── Add Threat Modal ──────────────────────────────────────────────────────
function AddThreatModal({ onClose }: { onClose: () => void }) {
  const addThreat      = useSupplyChainStore(s => s.addThreat);
  const addLedgerEntry = useSupplyChainStore(s => s.addLedgerEntry);

  const [form, setForm] = useState({
    corridor: '', region: REGIONS[0], type: THREAT_TYPES[0] as ThreatType,
    status: 'Active' as ThreatStatus,
    severity: 0.5, confidence: 0.7,
    description: '', affectedCorridors: '', affectedRoutes: '',
  });
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleAdd = () => {
    if (!form.corridor.trim()) { setError('Corridor is required'); return; }
    if (!form.description.trim()) { setError('Description is required'); return; }
    const threat = {
      corridor: form.corridor,
      region: form.region,
      type: form.type,
      status: form.status,
      severity: form.severity,
      confidence: form.confidence,
      description: form.description,
      affectedCorridors: form.affectedCorridors.split(',').map(s => s.trim()).filter(Boolean),
      affectedRoutes: form.affectedRoutes.split(',').map(s => s.trim()).filter(Boolean),
      source: 'manual' as const,
    };
    addThreat(threat);
    addLedgerEntry({
      type: 'THREAT_ADDED',
      summary: `New threat registered: ${form.corridor} (${form.type}, ${Math.round(form.severity * 100)}% severity)`,
      payload: { ...threat },
      initiatedBy: 'fortress',
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  const inputCls = "w-full glass-card rounded-xl px-3 py-2 text-sm font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-red-500/20 transition-all";
  const selCls   = inputCls + " appearance-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass w-[460px] max-h-[90vh] rounded-2xl flex flex-col shadow-glow-red animate-fade-up">
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Plus size={14} className="text-red-400" />
          </div>
          <span className="text-sm font-semibold text-slate-200 font-display">Register Threat Vector</span>
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {/* Corridor + Region */}
          <div>
            <label className="section-label block mb-1">Corridor / Location</label>
            <input value={form.corridor} onChange={e => set('corridor', e.target.value)}
              placeholder="e.g. Red Sea / Bab-el-Mandeb" className={inputCls}
              style={{ background: 'rgba(11,16,35,0.8)' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Region</label>
              <select value={form.region} onChange={e => set('region', e.target.value)}
                className={selCls} style={{ background: 'rgba(11,16,35,0.8)' }}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value as ThreatType)}
                className={selCls} style={{ background: 'rgba(11,16,35,0.8)' }}>
                {THREAT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value as ThreatStatus)}
                className={selCls} style={{ background: 'rgba(11,16,35,0.8)' }}>
                {(['Active','Monitoring','Resolved'] as ThreatStatus[]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1">Severity: {Math.round(form.severity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.01" value={form.severity}
                onChange={e => set('severity', parseFloat(e.target.value))}
                className="w-full accent-red-500 mt-2" />
            </div>
          </div>
          <div>
            <label className="section-label block mb-1">Confidence: {Math.round(form.confidence * 100)}%</label>
            <input type="range" min="0" max="1" step="0.01" value={form.confidence}
              onChange={e => set('confidence', parseFloat(e.target.value))}
              className="w-full accent-indigo-500" />
          </div>
          <div>
            <label className="section-label block mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Threat assessment details..."
              className={inputCls + ' resize-none'} style={{ background: 'rgba(11,16,35,0.8)' }} />
          </div>
          <div>
            <label className="section-label block mb-1">Affected Corridors (comma-separated)</label>
            <input value={form.affectedCorridors} onChange={e => set('affectedCorridors', e.target.value)}
              placeholder="Red Sea, Suez Canal" className={inputCls} style={{ background: 'rgba(11,16,35,0.8)' }} />
          </div>
          <div>
            <label className="section-label block mb-1">Affected Routes (comma-separated)</label>
            <input value={form.affectedRoutes} onChange={e => set('affectedRoutes', e.target.value)}
              placeholder="EU–Asia, India–Europe" className={inputCls} style={{ background: 'rgba(11,16,35,0.8)' }} />
          </div>
          {error && <p className="text-[11px] text-red-400 font-mono">{error}</p>}
        </div>

        <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-white/[0.05]">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-all">
            Cancel
          </button>
          <button onClick={handleAdd}
            className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
            <Shield size={13} /> Register Threat
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Fortress Panel ───────────────────────────────────────────────────
export default function FortressPanel() {
  const threats        = useSupplyChainStore(s => s.threats);
  const routes         = useSupplyChainStore(s => s.routes);
  const updateThreat   = useSupplyChainStore(s => s.updateThreat);
  const removeThreat   = useSupplyChainStore(s => s.removeThreat);
  const addLedgerEntry = useSupplyChainStore(s => s.addLedgerEntry);

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected]   = useState<string>('th-1');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  const allTypes = ['All', ...THREAT_TYPES];
  const filtered = threats.filter(t => typeFilter === 'All' || t.type === typeFilter);
  const selectedThreat = threats.find(t => t.id === selected);

  const activeCount  = threats.filter(t => t.status === 'Active').length;
  const avgSeverity  = threats.length ? threats.reduce((s, t) => s + t.severity, 0) / threats.length : 0;
  const globalRisk   = avgSeverity > 0.6 ? 'ELEVATED' : avgSeverity > 0.35 ? 'MODERATE' : 'LOW';
  const globalColor  = avgSeverity > 0.6 ? 'text-red-400' : avgSeverity > 0.35 ? 'text-amber-400' : 'text-emerald-400';

  const handleEscalate = (t: ThreatVector) => {
    updateThreat(t.id, { escalatedToLedger: true });
    addLedgerEntry({
      type: 'THREAT_ESCALATED',
      summary: `FORTRESS escalated: ${t.corridor} — ${t.type} threat at ${Math.round(t.severity * 100)}% severity`,
      payload: { threatId: t.id, severity: t.severity, confidence: t.confidence, affectedCorridors: t.affectedCorridors },
      initiatedBy: 'fortress',
      timestamp: new Date().toISOString(),
    });
  };

  const handleResolve = (t: ThreatVector) => {
    updateThreat(t.id, { status: 'Resolved' });
    addLedgerEntry({
      type: 'THREAT_RESOLVED',
      summary: `Threat resolved: ${t.corridor}`,
      payload: { threatId: t.id },
      initiatedBy: 'fortress',
      timestamp: new Date().toISOString(),
    });
  };

  const handleDelete = (id: string) => {
    removeThreat(id);
    if (selected === id) setSelected('');
  };

  // Find navigator routes affected by selected threat
  const linkedRoutes = selectedThreat
    ? routes.filter(r =>
        selectedThreat.affectedCorridors.some(c =>
          r.origin.toLowerCase().includes(c.toLowerCase()) ||
          r.destination.toLowerCase().includes(c.toLowerCase())
        ) || r.riskScore > 0.65
      )
    : [];

  return (
    <div className="flex flex-col h-full text-slate-300">
      {showModal && <AddThreatModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.04] flex items-center gap-3"
        style={{ background: 'rgba(239,68,68,0.03)' }}>
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Shield size={15} className="text-red-400" />
          </div>
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#04060f] flex items-center justify-center text-[8px] font-bold text-white ring-pulse">
              {activeCount}
            </span>
          )}
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.15em] text-red-400 font-display uppercase">FORTRESS</div>
          <div className="section-label">Global threat intelligence · {threats.length} vectors</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border border-current/20 ${globalColor}`}>
            {globalRisk}
          </span>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl glass-card border border-red-500/20 text-red-400 text-[11px] font-mono hover:border-red-500/40 transition-all">
            <Plus size={11} /> Add
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-3 gap-px border-b border-white/[0.04]" style={{ background: 'rgba(0,0,0,0.2)' }}>
        {[
          { label: 'Active', value: activeCount, color: 'text-red-400' },
          { label: 'Monitoring', value: threats.filter(t => t.status === 'Monitoring').length, color: 'text-amber-400' },
          { label: 'Avg Severity', value: `${Math.round(avgSeverity * 100)}%`, color: avgSeverity > 0.6 ? 'text-red-400' : 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3 py-2" style={{ background: 'rgba(11,16,35,0.4)' }}>
            <div className="section-label">{label}</div>
            <div className={`text-sm font-bold font-mono ${color} mt-0.5`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Risk matrix */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <ThreatMatrix threats={threats} />
      </div>

      {/* Type filter */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-white/[0.04] overflow-x-auto">
        {allTypes.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${
              typeFilter === t ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'text-slate-600 hover:text-slate-400'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Master/Detail */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Threat list */}
        <div className="w-[45%] overflow-y-auto border-r border-white/[0.04]">
          {filtered.map(threat => {
            const Icon = TYPE_ICON[threat.type];
            const tc   = TYPE_COLOR[threat.type].split(' ')[0];
            const isSelected = selected === threat.id;
            return (
              <button key={threat.id} onClick={() => setSelected(threat.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-white/[0.03] transition-all ${
                  isSelected ? 'glass-highlight border-l-2 border-l-red-500/50' : 'hover:bg-white/[0.02]'
                }`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={10} className={tc} />
                  <span className="text-[11px] text-slate-300 font-medium truncate flex-1">{threat.corridor}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${STATUS_COLOR[threat.status]}`}>
                    {threat.status}
                  </span>
                </div>
                <SeverityBar value={threat.severity} />
                <div className="section-label mt-1">{threat.region} · {threat.type}</div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 section-label gap-1">
              <Shield size={18} className="opacity-10" />No threats
            </div>
          )}
        </div>

        {/* Detail pane */}
        <div className="w-[55%] overflow-y-auto p-3">
          {selectedThreat ? (
            <div className="flex flex-col gap-3 animate-fade-up">
              {/* Type badge + title */}
              <div>
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border mb-2 ${TYPE_COLOR[selectedThreat.type]}`}>
                  {React.createElement(TYPE_ICON[selectedThreat.type], { size: 9 })}
                  {selectedThreat.type}
                  {selectedThreat.source === 'oracle' && <span className="text-cyan-400">· ORACLE</span>}
                </div>
                <div className="text-sm font-semibold text-slate-200">{selectedThreat.corridor}</div>
                <div className="section-label mt-0.5">{selectedThreat.region}</div>
              </div>

              {/* Severity + Confidence */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Severity', value: selectedThreat.severity, barColor: 'bg-red-500' },
                  { label: 'Confidence', value: selectedThreat.confidence, barColor: 'bg-cyan-500' },
                ].map(({ label, value, barColor }) => (
                  <div key={label} className="glass-card rounded-xl p-2.5">
                    <div className="section-label mb-1">{label}</div>
                    <div className={`text-base font-bold font-mono ${barColor.replace('bg-', 'text-').replace('-500', '-400')}`}>
                      {Math.round(value * 100)}%
                    </div>
                    <SeverityBar value={value} color={barColor} />
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="glass-card rounded-xl p-3">
                <div className="section-label mb-1.5">Threat Assessment</div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">{selectedThreat.description}</p>
              </div>

              {/* Affected corridors */}
              {selectedThreat.affectedCorridors.length > 0 && (
                <div>
                  <div className="section-label mb-1.5">Affected Corridors</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedThreat.affectedCorridors.map(c => (
                      <span key={c} className="text-[10px] font-mono px-2 py-0.5 rounded glass-card border border-white/[0.06] text-slate-400">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked active routes */}
              {linkedRoutes.length > 0 && (
                <div>
                  <div className="section-label mb-1.5 flex items-center gap-1.5">
                    <Link size={9} className="text-violet-400" /> Linked Navigator Routes
                  </div>
                  <div className="flex flex-col gap-1">
                    {linkedRoutes.map(r => (
                      <div key={r.id} className="glass-card rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${r.riskScore > 0.7 ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <span className="text-[10px] font-mono text-slate-400 truncate">
                          {r.origin.replace('Port of ','')} → {r.destination.replace('Port of ','')}
                        </span>
                        <span className="ml-auto text-[9px] font-mono text-red-400">{Math.round(r.riskScore * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="section-label space-y-0.5">
                <div>Created: {new Date(selectedThreat.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(selectedThreat.updatedAt).toLocaleString()}</div>
                {selectedThreat.escalatedToLedger && (
                  <div className="text-emerald-500">✓ Recorded on blockchain</div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {!selectedThreat.escalatedToLedger && (
                  <button onClick={() => handleEscalate(selectedThreat)}
                    className="w-full py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-mono hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-2">
                    <TrendingUp size={11} /> Escalate to Ledger
                  </button>
                )}
                {selectedThreat.status !== 'Resolved' && (
                  <button onClick={() => handleResolve(selectedThreat)}
                    className="w-full py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2">
                    <Check size={11} /> Mark Resolved
                  </button>
                )}
                <button onClick={() => handleDelete(selectedThreat.id)}
                  className="w-full py-2 rounded-xl border border-red-500/15 text-red-400/60 text-[11px] font-mono hover:bg-red-500/5 transition-all flex items-center justify-center gap-2">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 section-label">
              <Shield size={22} className="opacity-10" />Select a threat
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
