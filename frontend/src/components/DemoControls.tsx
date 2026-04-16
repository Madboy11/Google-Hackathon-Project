import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

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
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-stone-400 w-5 h-5" />
        <h2 className="text-sm font-bold font-mono text-stone-200 tracking-wider">DEMO CONTROL</h2>
      </div>
      <p className="text-stone-400 text-xs">
        Manually inject a disruption event to trigger resolution.
      </p>
      
      <button
        onClick={injectRedSeaClosure}
        disabled={demoState !== 'idle'}
        className={`flex items-center justify-center gap-2 text-xs font-mono py-2.5 px-4 rounded transition-all ${
            demoState === 'idle' 
            ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700' 
            : 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-900'
        }`}
      >
        <AlertTriangle className={`w-4 h-4 ${demoState === 'injecting' ? 'animate-spin' : ''}`} />
        {demoState === 'idle' ? 'INJECT RED SEA CLOSURE' : 
         demoState === 'injecting' ? 'ANALYZING...' : 'REROUTED'}
      </button>
    </div>
  );
};
