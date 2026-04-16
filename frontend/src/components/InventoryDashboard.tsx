import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const InventoryDashboard = ({ stockData = [], demandData = [] }: { stockData: any[], demandData: any[] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">
      <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <h3 className="text-xl font-bold mb-6 text-slate-100 font-mono">STOCK INTELLIGENCE</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="sku_id" stroke="#64748b" tick={{fontSize: 12}} />
              <YAxis stroke="#64748b" tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
              <Line type="monotone" name="Safety Stock" dataKey="safety_stock" stroke="#22d3ee" strokeWidth={3} dot={{r: 4, fill: '#22d3ee'}} activeDot={{r: 6}} />
              <Line type="monotone" name="Current Stock" dataKey="current_stock" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6'}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
        <h3 className="text-xl font-bold mb-6 text-slate-100 font-mono">DEMAND VARIANCE</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="node" stroke="#64748b" tick={{fontSize: 12}} />
              <YAxis stroke="#64748b" tick={{fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px' }} cursor={{fill: '#1e293b'}} />
              <Bar name="Variance" dataKey="demand_variance" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
