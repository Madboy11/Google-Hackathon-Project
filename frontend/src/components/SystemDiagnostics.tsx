import { useEffect, useState } from 'react';
import { getSystemDiagnostics } from '../api/nexusApi';

interface Diagnostics {
  health: string;
  disruptions: string;
  latency: string;
  oracle_status: string;
  navigator_status: string;
  buffer_status: string;
  ledger_status: string;
  fortress_status: string;
}

export const SystemDiagnostics = () => {
  const [diag, setDiag] = useState<Diagnostics | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const data = await getSystemDiagnostics();
      setDiag(data);
    };
    fetch();
    const interval = setInterval(fetch, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (!diag) {
    return (
      <div className="nexus-panel p-5">
        <div className="nexus-label">SYSTEM DIAGNOSTICS</div>
        <div className="mt-3 text-[11px] text-nexus-muted font-grotesk animate-pulse">CONNECTING . . .</div>
      </div>
    );
  }

  const metrics = [
    { label: 'HEALTH', value: diag.health },
    { label: 'DISRUPTIONS', value: diag.disruptions },
    { label: 'LATENCY', value: diag.latency },
  ];

  const modules = [
    { label: 'ORACLE', status: diag.oracle_status },
    { label: 'NAVIGATOR', status: diag.navigator_status },
    { label: 'BUFFER', status: diag.buffer_status },
    { label: 'LEDGER', status: diag.ledger_status },
    { label: 'FORTRESS', status: diag.fortress_status },
  ];

  return (
    <div className="nexus-panel p-5">
      <div className="nexus-label mb-4">SYSTEM DIAGNOSTICS</div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-px bg-nexus-border mb-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-nexus-bg p-3 text-center">
            <div className="text-[9px] font-grotesk tracking-[0.2em] text-nexus-muted mb-1">{m.label}</div>
            <div className="text-lg font-grotesk font-bold text-nexus-accent tabular-nums">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Module Status */}
      <div className="space-y-0">
        {modules.map((m) => (
          <div key={m.label} className="flex items-center justify-between py-1.5 border-b border-nexus-border last:border-0">
            <span className="text-[10px] font-grotesk tracking-[0.15em] text-nexus-muted">{m.label}</span>
            <span className={`text-[10px] font-grotesk tracking-[0.1em] font-semibold ${
              m.status === 'ONLINE' || m.status === 'SYNCED' || m.status === 'SECURE'
                ? 'text-nexus-accent'
                : 'text-nexus-subtle'
            }`}>
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
