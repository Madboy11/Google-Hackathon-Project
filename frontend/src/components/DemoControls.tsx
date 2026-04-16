import { useState } from 'react';
import axios from 'axios';

const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

interface DemoControlsProps {
  onTriggerEvent?: () => void;
}

type DemoPhase = 'idle' | 'injecting' | 'rerouting' | 'resolved';

export const DemoControls = ({ onTriggerEvent }: DemoControlsProps) => {
  const [phase, setPhase] = useState<DemoPhase>('idle');

  const injectRedSeaClosure = async () => {
    setPhase('injecting');
    try {
      await axios.post(`${BASE}/risk-score`, {
        node_id: 'RED_SEA_CORRIDOR',
        time_horizon: '72h',
      });
    } catch {
      console.warn('[DEMO] Backend unreachable — mock mode');
    }

    setTimeout(() => {
      setPhase('rerouting');
      if (onTriggerEvent) onTriggerEvent();
      setTimeout(() => setPhase('resolved'), 2000);
    }, 1500);
  };

  const reset = () => setPhase('idle');

  const phaseLabel: Record<DemoPhase, string> = {
    idle: 'INJECT RED SEA CLOSURE',
    injecting: 'ORACLE ANALYZING . . .',
    rerouting: 'NAVIGATOR REROUTING . . .',
    resolved: 'SCENARIO RESOLVED',
  };

  return (
    <div className="nexus-panel p-5">
      <div className="nexus-label mb-3">SCENARIO INJECTION</div>
      <p className="text-[11px] font-inter text-nexus-text-secondary mb-4 leading-relaxed">
        Simulate a geopolitical disruption in the Red Sea corridor.
        ORACLE scores risk → NAVIGATOR reroutes → BUFFER adjusts stock.
      </p>

      <button
        id="demo-inject-btn"
        onClick={phase === 'resolved' ? reset : injectRedSeaClosure}
        disabled={phase === 'injecting' || phase === 'rerouting'}
        className={`w-full font-grotesk text-[11px] tracking-[0.15em] font-semibold py-3 px-4 border transition-all duration-300 ${
          phase === 'idle'
            ? 'bg-nexus-bg text-nexus-accent border-nexus-border-active hover:bg-nexus-elevated hover:border-nexus-muted'
            : phase === 'resolved'
            ? 'bg-nexus-bg text-nexus-muted border-nexus-border cursor-pointer hover:text-nexus-accent'
            : 'bg-nexus-bg text-nexus-subtle border-nexus-border cursor-wait'
        }`}
      >
        {phase === 'resolved' ? '↻ RESET SCENARIO' : phaseLabel[phase]}
      </button>

      {/* Phase Progress Bar */}
      <div className="mt-4 flex gap-px">
        {(['injecting', 'rerouting', 'resolved'] as DemoPhase[]).map((step) => (
          <div
            key={step}
            className={`h-[2px] flex-1 transition-all duration-700 ${
              phase === step || 
              (phase === 'rerouting' && step === 'injecting') ||
              (phase === 'resolved' && (step === 'injecting' || step === 'rerouting'))
                ? 'bg-white'
                : 'bg-nexus-border'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[8px] font-grotesk tracking-[0.2em] text-nexus-muted">
        <span>ORACLE</span>
        <span>NAVIGATOR</span>
        <span>BUFFER</span>
      </div>
    </div>
  );
};
