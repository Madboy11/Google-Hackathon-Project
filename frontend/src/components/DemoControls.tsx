import { useNexusContext } from '../context/NexusContext';

export const DemoControls = () => {
  const { simulationPhase } = useNexusContext();

  const phaseLabel: Record<string, string> = {
    nominal: 'NOMINAL OPERATIONS',
    crisis: 'CRITICAL ANOMALY DETECTED',
    ai_rerouting: 'AI NAVIGATOR REROUTING . . .',
    system_review: 'SYSTEM REVIEW & BUFFER ADJUST',
  };

  const activeStep = ['nominal', 'crisis', 'ai_rerouting', 'system_review'].indexOf(simulationPhase);

  return (
    <div className="nexus-panel p-5">
      <div className="flex justify-between items-center mb-3">
        <div className="nexus-label text-cyan-400">SIMULATION HUD</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse bg-cyan-400"></div>
          <span className="text-[10px] font-grotesk tracking-widest text-cyan-500">AUTONOMOUS</span>
        </div>
      </div>
      
      <p className="text-[11px] font-inter text-nexus-text-secondary mb-4 leading-relaxed">
        The simulation engine continuously generates real-world routing scenarios, injects geopolitical risks, and demonstrates AI-driven orchestration across all modules.
      </p>

      <div
        className={`w-full text-center font-grotesk text-[11px] tracking-[0.15em] font-semibold py-3 px-4 border transition-all duration-300 ${
          simulationPhase === 'nominal'
            ? 'bg-nexus-bg text-emerald-400 border-emerald-500/50'
            : simulationPhase === 'crisis'
            ? 'bg-red-900/20 text-red-400 border-red-500/50'
            : simulationPhase === 'ai_rerouting'
            ? 'bg-amber-900/20 text-amber-400 border-amber-500/50'
            : 'bg-cyan-900/20 text-cyan-400 border-cyan-500/50'
        }`}
      >
        {phaseLabel[simulationPhase] || 'INITIALIZING'}
      </div>

      {/* Phase Progress Bar */}
      <div className="mt-4 flex gap-1">
        {['nominal', 'crisis', 'ai_rerouting', 'system_review'].map((step, idx) => (
          <div
            key={step}
            className={`h-[2px] flex-1 transition-all duration-700 ${
              idx <= activeStep
                ? idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-red-500' : idx === 2 ? 'bg-amber-500' : 'bg-cyan-500'
                : 'bg-nexus-border'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[8px] font-grotesk tracking-[0.2em] text-nexus-muted">
        <span>NOMINAL</span>
        <span>ORACLE</span>
        <span>NAV</span>
        <span>BUFFER</span>
      </div>
    </div>
  );
};

