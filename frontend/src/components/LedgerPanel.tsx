// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Search, Copy, Check,
  Navigation, Archive, Shield, Brain, Package, Hash,
  ChevronDown, Activity, Link2, Layers, Box
} from 'lucide-react';
import { useSupplyChainStore, LedgerEntry, LedgerTxType } from '../store/supplyChainStore';

// ── Type → visual config ──────────────────────────────────────────────────

const TX_TYPE_CFG: Record<LedgerTxType, { label: string; color: string; icon: React.FC<any> }> = {
  ROUTE_CREATED:     { label: 'Route Created',     color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: Navigation },
  ROUTE_UPDATED:     { label: 'Route Updated',     color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', icon: Navigation },
  ROUTE_REROUTED:    { label: 'Route Rerouted',    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Navigation },
  ROUTE_CANCELLED:   { label: 'Route Cancelled',   color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',    icon: Navigation },
  INVENTORY_ADDED:   { label: 'Inventory Added',   color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: Archive },
  INVENTORY_UPDATED: { label: 'Inventory Updated', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: Archive },
  THREAT_ESCALATED:  { label: 'Threat Escalated',  color: 'text-red-400 bg-red-500/10 border-red-500/20',          icon: Shield },
  THREAT_ADDED:      { label: 'Threat Added',      color: 'text-red-400 bg-red-500/10 border-red-500/20',          icon: Shield },
  THREAT_RESOLVED:   { label: 'Threat Resolved',   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Shield },
  ORACLE_ALERT:      { label: 'Oracle Alert',      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',       icon: Brain },
};

const SOURCE_CFG: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  oracle:    { label: 'Oracle',    color: 'text-cyan-400',    icon: Brain },
  navigator: { label: 'Navigator', color: 'text-violet-400',  icon: Navigation },
  buffer:    { label: 'Buffer',    color: 'text-orange-400',  icon: Archive },
  fortress:  { label: 'Fortress',  color: 'text-red-400',     icon: Shield },
  manual:    { label: 'Manual',    color: 'text-slate-400',   icon: Package },
};

// ── Mining status badge ───────────────────────────────────────────────────

function MiningBadge({ status }: { status: 'pending' | 'confirmed' }) {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
        <Check size={8} /> Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse">
      <Activity size={8} /> Mining…
    </span>
  );
}

// ── Block chain visualization (horizontal linked blocks) ──────────────────

function BlockChainStrip({ entries }: { entries: LedgerEntry[] }) {
  const recent = entries.slice(0, 8);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="section-label mb-2 flex items-center gap-1.5">
        <Layers size={9} className="text-emerald-400" /> Live Chain — Latest Blocks
      </div>
      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {recent.map((entry, i) => {
          const cfg = TX_TYPE_CFG[entry.type];
          const Icon = cfg?.icon || Package;
          return (
            <React.Fragment key={entry.txHash}>
              <div className={`shrink-0 w-[72px] rounded-lg p-2 flex flex-col items-center gap-1 transition-all ${
                entry.status === 'pending'
                  ? 'border border-amber-500/30 bg-amber-500/5 animate-pulse'
                  : 'glass-card'
              }`}>
                <div className="flex items-center gap-1">
                  <Box size={8} className={entry.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'} />
                  <span className="text-[9px] font-mono text-slate-400">#{entry.blockHeight}</span>
                </div>
                <Icon size={11} className={cfg ? cfg.color.split(' ')[0] : 'text-slate-500'} />
                <span className="text-[8px] font-mono text-slate-600 truncate w-full text-center">
                  {entry.txHash.slice(0, 8)}…
                </span>
              </div>
              {i < recent.length - 1 && (
                <div className="flex items-center shrink-0">
                  <Link2 size={8} className="text-slate-700" />
                </div>
              )}
            </React.Fragment>
          );
        })}
        {entries.length === 0 && (
          <div className="text-[10px] font-mono text-slate-700 py-3 w-full text-center">
            No blocks yet — transactions from Navigator, Buffer, and Fortress appear here
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payload inspector ─────────────────────────────────────────────────────

function PayloadInspector({ payload }: { payload: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const keys = Object.keys(payload);
  if (keys.length === 0) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors">
        <Hash size={10} className="text-indigo-400" />
        <span className="section-label flex-1">Transaction Payload</span>
        <span className="text-[10px] font-mono text-slate-600">{keys.length} fields</span>
        <ChevronDown size={11} className={`text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="border-t border-white/[0.04] px-3 py-2 max-h-[160px] overflow-y-auto">
          {keys.map(k => {
            const val = payload[k];
            const display = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return (
              <div key={k} className="flex gap-2 py-1 border-b border-white/[0.02] last:border-0">
                <span className="text-[10px] font-mono text-indigo-400/70 shrink-0 w-24 truncate">{k}</span>
                <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{display}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Copy to clipboard helper ──────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handle} title="Copy hash"
      className="text-slate-600 hover:text-slate-400 transition-colors">
      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  );
}

// ── Main Ledger Panel ─────────────────────────────────────────────────────

export default function LedgerPanel() {
  const ledgerEntries = useSupplyChainStore(s => s.ledgerEntries);
  const blockHeight   = useSupplyChainStore(s => s.blockHeight);
  const [selected, setSelected]       = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [tick, setTick] = useState(0);

  // Re-render on confirmation updates
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 2500);
    return () => clearInterval(t);
  }, []);

  const sources = ['all', 'navigator', 'buffer', 'fortress', 'oracle', 'manual'];

  const filtered = ledgerEntries.filter(e => {
    const matchSource = sourceFilter === 'all' || e.initiatedBy === sourceFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.summary.toLowerCase().includes(q) ||
      e.txHash.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q);
    return matchSource && matchSearch;
  });

  const selectedEntry = selected ? ledgerEntries.find(e => e.txHash === selected) : null;
  const confirmedCount = ledgerEntries.filter(e => e.status === 'confirmed').length;
  const pendingCount   = ledgerEntries.filter(e => e.status === 'pending').length;

  // Chain integrity score (all confirmed = 100%)
  const integrity = ledgerEntries.length > 0
    ? Math.round((confirmedCount / ledgerEntries.length) * 100)
    : 100;

  return (
    <div className="flex flex-col h-full text-slate-300">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.04] flex items-center gap-3"
        style={{ background: 'rgba(16,185,129,0.03)' }}>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <BookOpen size={15} className="text-emerald-400" />
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.15em] text-emerald-400 font-display uppercase">LEDGER</div>
          <div className="section-label">Immutable blockchain audit · {ledgerEntries.length} tx</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full glass-card border border-emerald-500/15">
            <Layers size={9} className="text-emerald-400" />
            <span className="text-[10px] font-mono text-emerald-400">Block #{blockHeight}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-px border-b border-white/[0.04]" style={{ background: 'rgba(0,0,0,0.2)' }}>
        {[
          { label: 'Total Tx',   value: ledgerEntries.length, color: 'text-slate-300' },
          { label: 'Confirmed',  value: confirmedCount,       color: 'text-emerald-400' },
          { label: 'Pending',    value: pendingCount,          color: 'text-amber-400' },
          { label: 'Integrity',  value: `${integrity}%`,      color: integrity === 100 ? 'text-emerald-400' : 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-2.5 py-2" style={{ background: 'rgba(11,16,35,0.4)' }}>
            <div className="section-label">{label}</div>
            <div className={`text-sm font-bold font-mono ${color} mt-0.5`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Chain strip */}
      <div className="shrink-0 px-3 pt-3 pb-1">
        <BlockChainStrip entries={ledgerEntries} />
      </div>

      {/* Search + filter */}
      <div className="shrink-0 px-3 py-2 border-b border-white/[0.04] flex flex-col gap-2">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tx hash, summary, type..."
            className="w-full glass-card rounded-xl pl-7 pr-3 py-1.5 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
            style={{ background: 'rgba(11,16,35,0.7)' }}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {sources.map(s => {
            const cfg = s === 'all' ? null : SOURCE_CFG[s];
            return (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${
                  sourceFilter === s
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'text-slate-600 hover:text-slate-400'
                }`}>
                {cfg && React.createElement(cfg.icon, { size: 8 })}
                {s === 'all' ? 'All' : cfg?.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Master / Detail */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Transaction list */}
        <div className={`overflow-y-auto border-r border-white/[0.04] ${selectedEntry ? 'w-[45%]' : 'w-full'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 section-label">
              <BookOpen size={22} className="opacity-10" />
              {search ? 'No matching transactions' : 'Ledger is empty — actions from other modules appear here'}
            </div>
          ) : filtered.map(entry => {
            const cfg = TX_TYPE_CFG[entry.type];
            const Icon = cfg?.icon || Package;
            const src = SOURCE_CFG[entry.initiatedBy];
            const isSelected = selected === entry.txHash;
            const age = Date.now() - new Date(entry.timestamp).getTime();
            const ageStr = age < 60000 ? 'just now'
              : age < 3600000 ? `${Math.floor(age / 60000)}m ago`
              : age < 86400000 ? `${Math.floor(age / 3600000)}h ago`
              : `${Math.floor(age / 86400000)}d ago`;

            return (
              <button key={entry.txHash} onClick={() => setSelected(isSelected ? null : entry.txHash)}
                className={`w-full text-left px-3 py-2.5 border-b border-white/[0.03] transition-all ${
                  isSelected ? 'glass-highlight border-l-2 border-l-emerald-500/50' : 'hover:bg-white/[0.02]'
                }`}>
                {/* Row 1: icon + summary + mining badge */}
                <div className="flex items-start gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${cfg ? cfg.color : 'text-slate-500 bg-slate-500/10 border-slate-500/20'}`}>
                    <Icon size={10} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-slate-300 truncate">{entry.summary}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono text-slate-600">{entry.txHash.slice(0, 10)}…</span>
                      <span className="text-[9px] font-mono text-slate-700">#{entry.blockHeight}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <MiningBadge status={entry.status} />
                    <span className="text-[9px] font-mono text-slate-700">{ageStr}</span>
                  </div>
                </div>
                {/* Row 2: source chip */}
                <div className="flex items-center gap-1.5 ml-7">
                  {src && (
                    <span className={`text-[8px] font-mono ${src.color} opacity-60`}>
                      via {src.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail pane */}
        {selectedEntry && (
          <div className="w-[55%] overflow-y-auto p-3 flex flex-col gap-3 animate-fade-up">
            {/* Tx type + hash */}
            <div>
              {(() => {
                const cfg = TX_TYPE_CFG[selectedEntry.type];
                const Icon = cfg?.icon || Cube;
                return (
                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border mb-2 ${cfg?.color || ''}`}>
                    <Icon size={9} />
                    {cfg?.label || selectedEntry.type}
                  </div>
                );
              })()}
              <div className="text-sm font-semibold text-slate-200 leading-tight">{selectedEntry.summary}</div>
            </div>

            {/* Hash + block */}
            <div className="glass-card rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Hash size={10} className="text-emerald-400 shrink-0" />
                <span className="section-label shrink-0 w-14">Tx Hash</span>
                <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{selectedEntry.txHash}</span>
                <CopyButton text={selectedEntry.txHash} />
              </div>
              <div className="flex items-center gap-2">
                <Box size={10} className="text-emerald-400 shrink-0" />
                <span className="section-label shrink-0 w-14">Block</span>
                <span className="text-[10px] font-mono text-slate-300">#{selectedEntry.blockHeight}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity size={10} className={selectedEntry.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="section-label shrink-0 w-14">Status</span>
                <MiningBadge status={selectedEntry.status} />
              </div>
            </div>

            {/* Source + timestamps */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="glass-card rounded-xl p-2.5">
                <div className="section-label mb-1">Initiated By</div>
                {(() => {
                  const src = SOURCE_CFG[selectedEntry.initiatedBy];
                  const SrcIcon = src?.icon || Cube;
                  return (
                    <div className="flex items-center gap-1.5">
                      <SrcIcon size={11} className={src?.color || 'text-slate-500'} />
                      <span className={`text-xs font-mono font-medium ${src?.color || 'text-slate-400'}`}>
                        {src?.label || selectedEntry.initiatedBy}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="glass-card rounded-xl p-2.5">
                <div className="section-label mb-1">Timestamp</div>
                <div className="text-[10px] font-mono text-slate-300">
                  {new Date(selectedEntry.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="glass-card rounded-xl p-2.5">
                <div className="section-label mb-1">Confirmed At</div>
                <div className="text-[10px] font-mono text-slate-300">
                  {selectedEntry.confirmedAt
                    ? new Date(selectedEntry.confirmedAt).toLocaleString()
                    : <span className="text-amber-400 animate-pulse">Awaiting…</span>}
                </div>
              </div>
              <div className="glass-card rounded-xl p-2.5">
                <div className="section-label mb-1">Tx Type</div>
                <div className="text-[10px] font-mono text-slate-300">{selectedEntry.type}</div>
              </div>
            </div>

            {/* Payload inspector */}
            <PayloadInspector payload={selectedEntry.payload} />

            {/* Verification seal */}
            {selectedEntry.status === 'confirmed' && (
              <div className="glass-card rounded-xl p-3 border border-emerald-500/15 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check size={14} className="text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-emerald-400">Verified on NEXUS Chain</div>
                  <div className="text-[9px] font-mono text-slate-600">
                    Block #{selectedEntry.blockHeight} · SHA-256 integrity verified · Immutable record
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
