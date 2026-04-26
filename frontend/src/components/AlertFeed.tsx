// @ts-nocheck
import React from 'react';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { AlertTriangle, Shield, Globe, Lock, Radio, Eye, Anchor, ShieldAlert } from 'lucide-react';

const TYPE_ICON: Record<string, React.FC<any>> = {
  Geopolitical: Globe, Piracy: ShieldAlert, Sanctions: Lock,
  Cyber: Radio, Weather: Eye, Labor: AlertTriangle,
};

const SEV_CHIP: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high:     'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function sevLabel(v: number) {
  if (v > 0.8) return 'critical';
  if (v > 0.6) return 'high';
  if (v > 0.35) return 'medium';
  return 'low';
}

export default function AlertFeed() {
  const threats    = useSupplyChainStore(s => s.threats);
  const routes     = useSupplyChainStore(s => s.routes);
  const inventory  = useSupplyChainStore(s => s.inventory);

  // Active threats sorted by severity
  const activeThreats = threats
    .filter(t => t.status !== 'Resolved')
    .sort((a, b) => b.severity - a.severity);

  // At-risk routes
  const riskyRoutes = routes.filter(r => r.status === 'at_risk' || r.riskScore > 0.6);

  // Critical inventory
  const criticalInv = inventory.filter(i => i.currentStock <= i.safetyStock);

  const totalAlerts = activeThreats.length + riskyRoutes.length + criticalInv.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-white/[0.04] flex justify-between items-center" style={{ background: 'rgba(239,68,68,0.03)' }}>
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-red-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wide">Active Alerts</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
          totalAlerts > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30 ring-pulse' : 'bg-slate-700/20 text-slate-500'
        }`}>{totalAlerts}</span>
      </div>

      {/* Scrollable feed */}
      <div className="flex-1 overflow-y-auto">

        {/* Threat vectors */}
        {activeThreats.length > 0 && (
          <div>
            <div className="px-3 py-1.5 section-label flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <ShieldAlert size={8} className="text-red-400" /> Threat Vectors ({activeThreats.length})
            </div>
            {activeThreats.map(threat => {
              const Icon = TYPE_ICON[threat.type] || AlertTriangle;
              const sev = sevLabel(threat.severity);
              return (
                <div key={threat.id} className="px-3 py-2.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-2 mb-1">
                    <Icon size={11} className={`mt-0.5 shrink-0 ${
                      threat.severity > 0.7 ? 'text-red-400' : threat.severity > 0.4 ? 'text-amber-400' : 'text-emerald-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-slate-300 truncate">{threat.corridor}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${SEV_CHIP[sev]}`}>
                          {sev.toUpperCase()} {Math.round(threat.severity * 100)}%
                        </span>
                        <span className="text-[8px] font-mono text-slate-600">{threat.type}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${
                      threat.status === 'Active' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}>{threat.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 line-clamp-2 ml-5 font-mono leading-relaxed">
                    {threat.description.slice(0, 120)}{threat.description.length > 120 ? '…' : ''}
                  </p>
                  <div className="text-[8px] text-slate-700 font-mono mt-1 ml-5">
                    {threat.region} · Updated {new Date(threat.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* At-risk routes */}
        {riskyRoutes.length > 0 && (
          <div>
            <div className="px-3 py-1.5 section-label flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <Anchor size={8} className="text-violet-400" /> Route Risks ({riskyRoutes.length})
            </div>
            {riskyRoutes.map(r => (
              <div key={r.id} className="px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${r.riskScore > 0.7 ? 'bg-red-400 ring-pulse' : 'bg-amber-400'}`} />
                  <span className="text-[11px] text-slate-300 truncate flex-1">
                    {r.origin.replace('Port of ', '')} → {r.destination.replace('Port of ', '')}
                  </span>
                  <span className="text-[9px] font-mono text-red-400">{Math.round(r.riskScore * 100)}%</span>
                </div>
                <div className="text-[9px] font-mono text-slate-600 ml-4 mt-0.5">{r.cargo} · {r.status}</div>
              </div>
            ))}
          </div>
        )}

        {/* Critical inventory */}
        {criticalInv.length > 0 && (
          <div>
            <div className="px-3 py-1.5 section-label flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <AlertTriangle size={8} className="text-orange-400" /> Critical Stock ({criticalInv.length})
            </div>
            {criticalInv.map(item => (
              <div key={item.id} className="px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 ring-pulse" />
                  <span className="text-[11px] text-slate-300 truncate flex-1">{item.product}</span>
                  <span className="chip-critical">{item.currentStock}/{item.safetyStock}</span>
                </div>
                <div className="text-[9px] font-mono text-slate-600 ml-4 mt-0.5">{item.location}</div>
              </div>
            ))}
          </div>
        )}

        {totalAlerts === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-6">
            <Shield size={20} className="text-emerald-400/20" />
            <p className="text-[11px] text-slate-600 font-mono text-center">All clear — no active threats, route risks, or stock alerts</p>
          </div>
        )}
      </div>
    </div>
  );
}
