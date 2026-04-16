import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, Map, ShieldAlert } from 'lucide-react';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const DemoControls = () => {
  const [demoState, setDemoState] = useState<'idle' | 'injecting' | 'rerouting'>('idle');

  const injectRedSeaClosure = async () => {
    setDemoState('injecting');
    try {
        await axios.post(`${BASE}/risk-score`, {
            node_id: 'RED_SEA_CORRIDOR',
            override_score: 0.95,
            event_type: 'geopolitical_closure'
        });
    } catch {
        // Fallback for demo mock
        console.warn("Mocking risk event dispatch");
    }
    
    setTimeout(() => {
        setDemoState('rerouting');
    }, 1500);
  };

  return (
    <div className="bg-slate-900 border border-red-900 rounded-xl p-6 shadow-2xl flex flex-col gap-4 max-w-sm ml-auto">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-red-500 w-8 h-8" />
        <h2 className="text-xl font-bold font-mono text-slate-100">DEMO CONTROL</h2>
      </div>
      <p className="text-slate-400 text-sm">
        Manually inject a Black Swan event to trigger autonomous multi-module resolution.
      </p>
      
      <button
        onClick={injectRedSeaClosure}
        disabled={demoState !== 'idle'}
        className={`flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg shadow-lg transition-all ${
            demoState === 'idle' 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        <AlertTriangle className="w-5 h-5" />
        {demoState === 'idle' ? 'Inject Red Sea Closure' : 
         demoState === 'injecting' ? 'Analyzing Signal...' : 'Rerouting Complete'}
      </button>
    </div>
  );
};
