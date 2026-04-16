import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export const InventoryDashboard = ({ stockData = [], demandData = [] }: { stockData: any[], demandData: any[] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <h3 className="text-sm font-bold mb-4 text-stone-200 font-mono tracking-wider">STOCK INTELLIGENCE</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="sku_id" stroke="#78716c" tick={{fontSize: 10}} />
              <YAxis stroke="#78716c" tick={{fontSize: 10}} />
              <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '4px', fontSize: '12px' }} />
              <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}} />
              <Line type="monotone" name="Safety Stock" dataKey="safety_stock" stroke="#a8a29e" strokeWidth={2} dot={false} activeDot={{r: 4}} />
              <Line type="monotone" name="Current Stock" dataKey="current_stock" stroke="#44403c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-5">
        <h3 className="text-sm font-bold mb-4 text-stone-200 font-mono tracking-wider">DEMAND VARIANCE</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
              <XAxis dataKey="node" stroke="#78716c" tick={{fontSize: 10}} />
              <YAxis stroke="#78716c" tick={{fontSize: 10}} />
              <Tooltip contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '4px', fontSize: '12px' }} cursor={{fill: '#292524'}} />
              <Bar name="Variance" dataKey="demand_variance" fill="#57534e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
