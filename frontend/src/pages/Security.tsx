import React from 'react';
import { SystemDiagnostics } from '../components/SystemDiagnostics';
import { useNexusContext } from '../context/NexusContext';

export const Security: React.FC = () => {
  const { logs } = useNexusContext();

  return (
    <div className="flex-1 flex bg-nexus-bg h-full overflow-hidden">
        {/* Left Col - Diagnostics */}
        <div className="w-[400px] shrink-0 border-r border-nexus-border flex flex-col h-full bg-nexus-bg">
            <div className="p-5 border-b border-nexus-border shrink-0">
                <h2 className="text-xl font-grotesk tracking-widest text-white">SECURITY ENGINE</h2>
                <p className="text-sm text-nexus-muted mt-1 uppercase">FORTRESS & LEDGER Status</p>
            </div>
            <SystemDiagnostics />
        </div>
        
        {/* Right Col - Logs */}
        <div className="flex-1 flex flex-col h-full">
            <div className="nexus-panel p-5 flex-1 flex flex-col min-h-0">
            <div className="nexus-label mb-3">IMMUTABLE EVENT LEDGER</div>
            <div className="flex-1 overflow-y-auto space-y-0 min-h-0 pr-4">
                {logs.map((log, i) => (
                <div
                    key={`${log.id}-${i}`}
                    className="py-3 border-b border-nexus-border last:border-0 flex flex-col gap-1 items-start"
                >
                    <span className="text-[10px] font-grotesk text-nexus-subtle tabular-nums whitespace-nowrap">
                    {log.ts} | ID: {log.id}
                    </span>
                    <span
                    className={`text-sm font-grotesk leading-relaxed ${
                        log.severity === 'critical'
                        ? 'text-red-400 font-semibold'
                        : log.severity === 'warning'
                        ? 'text-yellow-400'
                        : 'text-nexus-text-secondary'
                    }`}
                    >
                    {'> '} {log.msg}
                    </span>
                </div>
                ))}
            </div>
            </div>
        </div>
    </div>
  );
};
