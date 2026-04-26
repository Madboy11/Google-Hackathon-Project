// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Archive, Plus, Trash2, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, BarChart2, X, Check, Minus } from 'lucide-react';
import { useSupplyChainStore, InventoryItem } from '../store/supplyChainStore';

// ── Helpers ───────────────────────────────────────────────────────────────
type StockLevel = 'CRITICAL' | 'LOW' | 'OK' | 'SURPLUS';

function getStockLevel(item: InventoryItem): StockLevel {
  if (item.currentStock <= item.safetyStock)            return 'CRITICAL';
  if (item.currentStock <= item.reorderPoint)           return 'LOW';
  if (item.currentStock >= item.maxCapacity * 0.9)     return 'SURPLUS';
  return 'OK';
}

const LEVEL_CFG: Record<StockLevel, { chip: string; bar: string; label: string }> = {
  CRITICAL: { chip: 'chip-critical', bar: 'bg-red-500',     label: 'CRITICAL' },
  LOW:      { chip: 'chip-medium',   bar: 'bg-amber-500',   label: 'LOW' },
  OK:       { chip: 'chip-ok',       bar: 'bg-emerald-500', label: 'OK' },
  SURPLUS:  { chip: 'chip-low',      bar: 'bg-blue-400',    label: 'SURPLUS' },
};

function daysToReorder(item: InventoryItem): number {
  if (item.consumptionRate <= 0) return 999;
  return Math.max(0, Math.floor((item.currentStock - item.reorderPoint) / item.consumptionRate));
}

const CATEGORIES = ['Electronics', 'Energy', 'Networking', 'Industrial', 'Pharma', 'Materials', 'Food', 'Chemicals', 'Automotive', 'Other'];
const UNITS      = ['units', 'kg', 'litres', 'km', 'cells', 'tonnes', 'boxes', 'pallets'];

// ── Stock bar ─────────────────────────────────────────────────────────────
function StockBar({ item }: { item: InventoryItem }) {
  const level  = getStockLevel(item);
  const cfg    = LEVEL_CFG[level];
  const pct    = Math.min(100, (item.currentStock / item.maxCapacity) * 100);
  const safPct = (item.safetyStock  / item.maxCapacity) * 100;
  const roPct  = (item.reorderPoint / item.maxCapacity) * 100;
  return (
    <div className="relative h-1.5 w-full rounded-full bg-white/[0.05] mt-2 overflow-visible">
      <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${pct}%` }} />
      {/* Safety stock marker */}
      <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-red-400/60" style={{ left: `${safPct}%` }} title="Safety stock" />
      {/* Reorder point marker */}
      <div className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-amber-400/60" style={{ left: `${roPct}%` }} title="Reorder point" />
    </div>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────────────
interface Field { label: string; key: keyof Omit<InventoryItem,'id'|'createdAt'|'updatedAt'|'trend'>; type: 'text'|'number'|'select'; options?: string[] }

const FIELDS: Field[] = [
  { label: 'Product Name',    key: 'product',         type: 'text' },
  { label: 'SKU',             key: 'sku',             type: 'text' },
  { label: 'Category',        key: 'category',        type: 'select', options: CATEGORIES },
  { label: 'Warehouse / Location', key: 'location',   type: 'text' },
  { label: 'Unit',            key: 'unit',            type: 'select', options: UNITS },
  { label: 'Current Stock',   key: 'currentStock',    type: 'number' },
  { label: 'Safety Stock',    key: 'safetyStock',     type: 'number' },
  { label: 'Reorder Point',   key: 'reorderPoint',    type: 'number' },
  { label: 'Max Capacity',    key: 'maxCapacity',     type: 'number' },
  { label: 'Lead Time (days)',key: 'leadTimeDays',    type: 'number' },
  { label: 'Consumption/day', key: 'consumptionRate', type: 'number' },
];

function AddItemModal({ onClose }: { onClose: () => void }) {
  const addInventoryItem = useSupplyChainStore(s => s.addInventoryItem);
  const addLedgerEntry   = useSupplyChainStore(s => s.addLedgerEntry);

  const [form, setForm] = useState<Record<string, string | number>>({
    product: '', sku: '', category: CATEGORIES[0], location: '', unit: UNITS[0],
    currentStock: 0, safetyStock: 0, reorderPoint: 0, maxCapacity: 0, leadTimeDays: 14, consumptionRate: 10,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.product) e.product = 'Required';
    if (!form.sku)     e.sku     = 'Required';
    if (!form.location) e.location = 'Required';
    if ((form.maxCapacity as number) <= 0) e.maxCapacity = 'Must be > 0';
    if ((form.safetyStock as number) >= (form.maxCapacity as number)) e.safetyStock = 'Must be < Max Capacity';
    if ((form.reorderPoint as number) <= (form.safetyStock as number)) e.reorderPoint = 'Must be > Safety Stock';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    const item: Omit<InventoryItem,'id'|'createdAt'|'updatedAt'> = {
      product:         form.product as string,
      sku:             form.sku as string,
      category:        form.category as string,
      location:        form.location as string,
      unit:            form.unit as string,
      currentStock:    Number(form.currentStock),
      safetyStock:     Number(form.safetyStock),
      reorderPoint:    Number(form.reorderPoint),
      maxCapacity:     Number(form.maxCapacity),
      leadTimeDays:    Number(form.leadTimeDays),
      consumptionRate: Number(form.consumptionRate),
      trend:           'stable',
    };
    addInventoryItem(item);
    addLedgerEntry({
      type: 'INVENTORY_ADDED',
      summary: `Inventory added: ${item.product} (${item.sku}) @ ${item.location}`,
      payload: { ...item },
      initiatedBy: 'buffer',
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  const inputCls = (key: string) =>
    `w-full glass-card rounded-lg px-3 py-2 text-sm font-mono text-slate-300
     placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40
     focus:ring-1 focus:ring-indigo-500/20 transition-all
     ${errors[key] ? 'border-red-500/40 ring-1 ring-red-500/20' : 'border-transparent'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass w-[480px] max-h-[85vh] rounded-2xl flex flex-col shadow-glow-md animate-fade-up">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Plus size={14} className="text-orange-400" />
          </div>
          <span className="text-sm font-semibold text-slate-200 font-display">Add Inventory Item</span>
          <button onClick={onClose} className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(({ label, key, type, options }) => (
              <div key={key} className={key === 'product' || key === 'location' ? 'col-span-2' : ''}>
                <label className="section-label block mb-1">{label}</label>
                {type === 'select' ? (
                  <select
                    value={form[key] as string}
                    onChange={e => set(key, e.target.value)}
                    className={inputCls(key) + ' appearance-none'}
                    style={{ background: 'rgba(11,16,35,0.8)' }}
                  >
                    {options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={form[key] as string | number}
                    onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={label}
                    className={inputCls(key)}
                    style={{ background: 'rgba(11,16,35,0.8)' }}
                  />
                )}
                {errors[key] && <p className="text-[10px] text-red-400 font-mono mt-0.5">{errors[key]}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-white/[0.05]">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/[0.08] text-slate-400 text-sm hover:bg-white/[0.04] transition-all">
            Cancel
          </button>
          <button onClick={handleAdd}
            className="flex-1 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2">
            <Check size={14} /> Add to Buffer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Adjust Stock Inline ────────────────────────────────────────────────────
function AdjustStock({ item }: { item: InventoryItem }) {
  const update = useSupplyChainStore(s => s.updateInventoryItem);
  const addLedger = useSupplyChainStore(s => s.addLedgerEntry);
  const [delta, setDelta] = useState(0);

  const apply = () => {
    if (delta === 0) return;
    const next = Math.max(0, Math.min(item.maxCapacity, item.currentStock + delta));
    update(item.id, { currentStock: next, trend: delta > 0 ? 'up' : 'down' });
    addLedger({
      type: 'INVENTORY_UPDATED',
      summary: `Stock adjusted: ${item.product} ${delta > 0 ? '+' : ''}${delta} ${item.unit}`,
      payload: { itemId: item.id, delta, newStock: next },
      initiatedBy: 'buffer',
      timestamp: new Date().toISOString(),
    });
    setDelta(0);
  };

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <button onClick={() => setDelta(d => d - 10)} className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors">
        <Minus size={10} />
      </button>
      <span className={`text-xs font-mono w-10 text-center ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-600'}`}>
        {delta > 0 ? '+' : ''}{delta}
      </span>
      <button onClick={() => setDelta(d => d + 10)} className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:text-emerald-400 flex items-center justify-center transition-colors">
        <Plus size={10} />
      </button>
      {delta !== 0 && (
        <button onClick={apply} className="ml-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono hover:bg-indigo-500/20 transition-all">
          Apply
        </button>
      )}
    </div>
  );
}

// ── Main Buffer Panel ─────────────────────────────────────────────────────
export default function BufferPanel() {
  const inventory          = useSupplyChainStore(s => s.inventory);
  const removeInventoryItem = useSupplyChainStore(s => s.removeInventoryItem);
  const updateInventoryItem = useSupplyChainStore(s => s.updateInventoryItem);
  const addLedgerEntry     = useSupplyChainStore(s => s.addLedgerEntry);

  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected]   = useState<string | null>(null);
  const [filter, setFilter]       = useState<'all' | 'CRITICAL' | 'LOW'>('all');
  const [search, setSearch]       = useState('');
  const [tick, setTick]           = useState(0);

  // Simulate live consumption every 8s
  useEffect(() => {
    const t = setInterval(() => {
      inventory.forEach(item => {
        if (item.consumptionRate > 0) {
          const consumed = Math.max(0, Math.floor(Math.random() * (item.consumptionRate * 0.1)));
          if (consumed > 0) {
            updateInventoryItem(item.id, {
              currentStock: Math.max(0, item.currentStock - consumed),
              trend: 'down',
            });
          }
        }
      });
      setTick(n => n + 1);
    }, 8000);
    return () => clearInterval(t);
  }, [inventory, updateInventoryItem]);

  const handleDelete = (id: string) => {
    const item = inventory.find(i => i.id === id);
    removeInventoryItem(id);
    if (item) addLedgerEntry({ type: 'INVENTORY_UPDATED', summary: `Inventory removed: ${item.product}`, payload: { itemId: id }, initiatedBy: 'buffer', timestamp: new Date().toISOString() });
    if (selected === id) setSelected(null);
  };

  const filtered = inventory.filter(item => {
    const level = getStockLevel(item);
    const matchFilter = filter === 'all' || level === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || item.product.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const criticalCount = inventory.filter(i => getStockLevel(i) === 'CRITICAL').length;
  const lowCount      = inventory.filter(i => getStockLevel(i) === 'LOW').length;
  const totalValue    = inventory.reduce((s, i) => s + i.currentStock * 12.4, 0);
  const selectedItem  = inventory.find(i => i.id === selected);

  return (
    <div className="flex flex-col h-full text-slate-300">
      {showModal && <AddItemModal onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/[0.04] flex items-center gap-3" style={{ background: 'rgba(249,115,22,0.03)' }}>
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Archive size={15} className="text-orange-400" />
          </div>
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#04060f] flex items-center justify-center text-[8px] font-bold text-white ring-pulse">
              {criticalCount}
            </span>
          )}
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.15em] text-orange-400 font-display uppercase">BUFFER</div>
          <div className="section-label">Inventory Health · {inventory.length} items</div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-card border border-orange-500/20 text-orange-400 text-[11px] font-mono hover:border-orange-500/40 hover:bg-orange-500/5 transition-all">
          <Plus size={11} /> Add Item
        </button>
      </div>

      {/* KPI strip */}
      <div className="shrink-0 grid grid-cols-3 gap-px border-b border-white/[0.04]" style={{ background: 'rgba(0,0,0,0.2)' }}>
        {[
          { label: 'Critical', value: criticalCount, color: 'text-red-400', icon: AlertTriangle },
          { label: 'Low Stock', value: lowCount,      color: 'text-amber-400', icon: TrendingDown },
          { label: 'Est. Value', value: `$${(totalValue / 1e6).toFixed(1)}M`, color: 'text-emerald-400', icon: BarChart2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="px-3 py-2.5 flex flex-col gap-0.5" style={{ background: 'rgba(11,16,35,0.4)' }}>
            <div className="flex items-center gap-1.5">
              <Icon size={10} className={color} />
              <span className="section-label">{label}</span>
            </div>
            <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="shrink-0 px-3 py-2 border-b border-white/[0.04] flex flex-col gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search product, SKU, location..."
          className="w-full glass-card rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-all"
          style={{ background: 'rgba(11,16,35,0.7)' }}
        />
        <div className="flex gap-1">
          {(['all', 'CRITICAL', 'LOW'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                  : 'text-slate-600 hover:text-slate-400'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List + Detail split */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Item list */}
        <div className={`overflow-y-auto border-r border-white/[0.04] ${selectedItem ? 'w-1/2' : 'w-full'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-600 text-xs font-mono">
              <Archive size={22} className="opacity-20" />
              {search ? 'No items match search' : 'No items in buffer'}
            </div>
          ) : filtered.map(item => {
            const level = getStockLevel(item);
            const cfg   = LEVEL_CFG[level];
            const days  = daysToReorder(item);
            const isSelected = selected === item.id;
            return (
              <button key={item.id} onClick={() => setSelected(isSelected ? null : item.id)}
                className={`w-full text-left px-3 py-3 border-b border-white/[0.03] transition-all duration-150 ${
                  isSelected ? 'glass-highlight border-l-2 border-l-orange-500/40' : 'hover:bg-white/[0.02]'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-slate-200 truncate">{item.product}</div>
                    <div className="text-[10px] font-mono text-slate-600 truncate">{item.sku} · {item.location}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cfg.chip}>{cfg.label}</span>
                    <div className="flex items-center gap-1 section-label">
                      {item.trend === 'up'   ? <TrendingUp  size={8} className="text-emerald-400" />
                       : item.trend === 'down' ? <TrendingDown size={8} className="text-red-400" />
                       : null}
                      {item.consumptionRate}/day
                    </div>
                  </div>
                </div>
                <StockBar item={item} />
                <div className="flex justify-between mt-1 section-label">
                  <span>{item.currentStock.toLocaleString()} / {item.maxCapacity.toLocaleString()} {item.unit}</span>
                  <span className={days <= 3 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : ''}>
                    ~{days}d to reorder
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail pane */}
        {selectedItem && (
          <div className="w-1/2 overflow-y-auto p-3 flex flex-col gap-3 animate-fade-up">
            <div>
              <div className="section-label mb-1 uppercase tracking-wider">Item Detail</div>
              <div className="text-sm font-semibold text-slate-200 leading-tight">{selectedItem.product}</div>
              <div className="section-label mt-0.5">{selectedItem.category}</div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ['SKU',          selectedItem.sku],
                ['Location',     selectedItem.location],
                ['Unit',         selectedItem.unit],
                ['Lead Time',    `${selectedItem.leadTimeDays}d`],
                ['Safety Stock', `${selectedItem.safetyStock.toLocaleString()}`],
                ['Reorder Pt.',  `${selectedItem.reorderPoint.toLocaleString()}`],
                ['Max Cap.',     `${selectedItem.maxCapacity.toLocaleString()}`],
                ['Consump.',     `${selectedItem.consumptionRate}/day`],
              ].map(([k, v]) => (
                <div key={k} className="glass-card rounded-lg px-2 py-1.5">
                  <div className="section-label">{k}</div>
                  <div className="text-[11px] font-mono text-slate-300 truncate">{v}</div>
                </div>
              ))}
            </div>

            {/* Current stock highlight */}
            <div className="glass-card rounded-xl px-3 py-2.5">
              <div className="section-label mb-1">Current Stock</div>
              <div className="text-xl font-bold font-mono text-orange-400">
                {selectedItem.currentStock.toLocaleString()}
                <span className="text-sm text-slate-600 ml-1">{selectedItem.unit}</span>
              </div>
              <StockBar item={selectedItem} />
              <div className="flex justify-between mt-1.5 section-label">
                <span>{Math.round((selectedItem.currentStock / selectedItem.maxCapacity) * 100)}% capacity</span>
                <span className={daysToReorder(selectedItem) <= 3 ? 'text-red-400' : 'text-slate-600'}>
                  Reorder in ~{daysToReorder(selectedItem)}d
                </span>
              </div>
            </div>

            {/* Adjust stock inline */}
            <div className="glass-card rounded-xl px-3 py-2.5">
              <div className="section-label mb-1.5">Adjust Stock</div>
              <AdjustStock item={selectedItem} />
            </div>

            {/* Delete */}
            <button onClick={() => handleDelete(selectedItem.id)}
              className="w-full py-2 rounded-xl border border-red-500/20 text-red-400 text-[11px] font-mono hover:bg-red-500/5 transition-all flex items-center justify-center gap-1.5">
              <Trash2 size={11} /> Remove Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
