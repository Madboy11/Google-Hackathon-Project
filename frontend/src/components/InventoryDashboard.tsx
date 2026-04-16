import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StockItem {
  sku_id: string;
  current_stock: number;
  recommended_stock: number;
  po_info?: { po_triggered: boolean; po_quantity: number };
}

interface DemandItem {
  node: string;
  demand_variance: number;
}

interface InventoryDashboardProps {
  stockData?: StockItem[];
  demandData?: DemandItem[];
}

const tooltipStyle = {
  backgroundColor: '#111111',
  border: '1px solid #222222',
  borderRadius: '0px',
  fontSize: '11px',
  fontFamily: '"Space Grotesk", system-ui',
  color: '#e5e5e5',
};

export const InventoryDashboard = ({ stockData = [], demandData = [] }: InventoryDashboardProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-nexus-border">
      {/* Stock Chart */}
      <div className="nexus-panel p-5">
        <div className="nexus-label mb-4">STOCK LEVELS</div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockData}>
              <CartesianGrid stroke="#1a1a1a" vertical={false} />
              <XAxis
                dataKey="sku_id"
                stroke="#444"
                tick={{ fontSize: 10, fontFamily: '"Space Grotesk"', fill: '#666' }}
                axisLine={{ stroke: '#222' }}
                tickLine={false}
              />
              <YAxis
                stroke="#444"
                tick={{ fontSize: 10, fontFamily: '"Space Grotesk"', fill: '#666' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#333' }} />
              <Line
                type="monotone"
                name="Current"
                dataKey="current_stock"
                stroke="#e5e5e5"
                strokeWidth={2}
                dot={{ r: 3, fill: '#e5e5e5', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#fff' }}
              />
              <Line
                type="monotone"
                name="Recommended"
                dataKey="recommended_stock"
                stroke="#666"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* PO Status Indicators */}
        <div className="mt-3 flex gap-4">
          {stockData.map((s) => (
            <div key={s.sku_id} className="flex items-center gap-2 text-[10px] font-grotesk text-nexus-muted tracking-wider">
              <span className={`w-1.5 h-1.5 inline-block ${s.po_info?.po_triggered ? 'bg-white' : 'bg-nexus-subtle'}`}></span>
              {s.sku_id}: PO {s.po_info?.po_triggered ? 'ACTIVE' : 'IDLE'}
            </div>
          ))}
        </div>
      </div>

      {/* Demand Variance Chart */}
      <div className="nexus-panel p-5">
        <div className="nexus-label mb-4">DEMAND VARIANCE</div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1a1a1a" vertical={false} />
              <XAxis
                dataKey="node"
                stroke="#444"
                tick={{ fontSize: 10, fontFamily: '"Space Grotesk"', fill: '#666' }}
                axisLine={{ stroke: '#222' }}
                tickLine={false}
              />
              <YAxis
                stroke="#444"
                tick={{ fontSize: 10, fontFamily: '"Space Grotesk"', fill: '#666' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#1a1a1a' }} />
              <Bar dataKey="demand_variance" fill="#444" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
