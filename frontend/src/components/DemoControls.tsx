import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface DemoControlsProps {
  onTriggerEvent?: () => void;
}

export const DemoControls = ({ onTriggerEvent }: DemoControlsProps) => {
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
        if (onTriggerEvent) onTriggerEvent();
    }, 1500);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-red-900/50 rounded-xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden group hover:border-red-500/50 transition-colors duration-500">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-red-500 w-8 h-8 animate-pulse" />
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
            ? 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white shadow-red-900/50' 
            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
        }`}
      >
        <AlertTriangle className={`w-5 h-5 ${demoState === 'injecting' ? 'animate-spin' : ''}`} />
        {demoState === 'idle' ? 'Inject Red Sea Closure' : 
         demoState === 'injecting' ? 'Analyzing Signal...' : 'Rerouting Complete'}
      </button>
    </div>
  );
};
