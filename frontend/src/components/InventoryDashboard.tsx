import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const InventoryDashboard = ({ stockData = [], demandData = [] }: { stockData: any[], demandData: any[] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-slate-200">Safety vs Current Stock</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="sku_id" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
            <Legend />
            <Line type="monotone" dataKey="safety_stock" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="current_stock" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-slate-200">Demand Variance per Node</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={demandData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="node" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
            <Legend />
            <Bar dataKey="demand_variance" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
