// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { Send, Loader2, Brain, User, Cpu, Zap, ChevronRight } from 'lucide-react';

const QUICK_PROMPTS = [
  'Red Sea shipping risk right now?',
  'Port congestion in Singapore & Dubai?',
  'Reroute Shanghai → Rotterdam avoiding risk zones',
  'Geopolitical threat index for key corridors',
  'Weather hazards on Pacific lanes?',
];

function renderContent(text: string) {
  // Highlight tool-call markers
  return text.split(/(\[\🔧[^\]]*\]|\[⚠️[^\]]*\]|\[✅[^\]]*\])/g).map((part, i) => {
    if (part.startsWith('[🔧') || part.startsWith('[⚠️') || part.startsWith('[✅')) {
      const isWarning = part.startsWith('[⚠️');
      const isSuccess = part.startsWith('[✅');
      return (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono my-0.5 mr-1 ${
            isWarning
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : isSuccess
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
          }`}
        >
          {part}
        </span>
      );
    }
    // Render markdown bold
    const segments = part.split(/\*\*([^*]+)\*\*/g);
    return segments.map((seg, j) =>
      j % 2 === 1 ? (
        <strong key={j} className="text-white font-semibold">
          {seg}
        </strong>
      ) : (
        <span key={j}>{seg}</span>
      )
    );
  });
}

export default function OraclePanel() {
  const agentMessages = useSupplyChainStore(state => state.agentMessages);
  const addAgentMessage = useSupplyChainStore(state => state.addAgentMessage);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-oss-120b');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agentMessages]);

  // Poll model status
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('http://127.0.0.1:8002/health');
        if (r.ok) {
          const d = await r.json();
          setCurrentModel(d.current_model?.split('/').pop() || 'free-model');
        }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  const submitQuery = async (query: string) => {
    if (!query.trim() || isTyping) return;
    setInput('');
    setIsTyping(true);

    addAgentMessage({ id: `user-${Date.now()}`, content: query, role: 'user', timestamp: new Date().toISOString() });
    const agentMsgId = `agent-${Date.now()}`;
    addAgentMessage({ id: agentMsgId, content: '', role: 'agent', timestamp: new Date().toISOString() });

    try {
      const response = await fetch(`http://127.0.0.1:8002/agent/stream?query=${encodeURIComponent(query)}`);
      if (!response.body) throw new Error('No stream body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              accumulated += parsed.text;
              useSupplyChainStore.setState(state => ({
                agentMessages: state.agentMessages.map(m =>
                  m.id === agentMsgId ? { ...m, content: accumulated } : m
                ),
              }));
            }
          } catch (_) {}
        }
      }

      if (!accumulated) {
        useSupplyChainStore.setState(state => ({
          agentMessages: state.agentMessages.map(m =>
            m.id === agentMsgId ? { ...m, content: 'No response from ORACLE core. Check backend.' } : m
          ),
        }));
      }
    } catch (err) {
      useSupplyChainStore.setState(state => ({
        agentMessages: state.agentMessages.map(m =>
          m.id === agentMsgId ? { ...m, content: `ORACLE offline: ${err}` } : m
        ),
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); submitQuery(input); };

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0A0F1E 0%, #080C18 100%)' }}>
      {/* ── Header ── */}
      <div className="shrink-0 px-4 py-3 border-b border-cyan-500/10 flex items-center gap-3"
        style={{ background: 'rgba(6,182,212,0.03)' }}>
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Brain size={16} className="text-cyan-400" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-[#0A0F1E] animate-pulse" />
        </div>
        <div>
          <div className="text-xs font-bold tracking-[0.15em] text-cyan-400 uppercase">ORACLE</div>
          <div className="text-[10px] text-slate-500 font-mono">{currentModel}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5">
          <Zap size={10} className="text-cyan-400" />
          <span className="text-[10px] text-cyan-400 font-mono">LIVE INTEL</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {agentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
              <Cpu size={28} className="text-cyan-400/40" />
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm font-medium mb-1">ORACLE Intelligence System</p>
              <p className="text-slate-600 text-xs">Powered by live MCP sensor feeds + free LLM</p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => submitQuery(p)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-xs text-slate-400 border border-slate-800 hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all group"
                >
                  <ChevronRight size={12} className="text-slate-600 group-hover:text-cyan-400 shrink-0" />
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {agentMessages.map(msg => (
              <div
                key={msg.id}
                className={`px-4 py-3 border-b border-slate-800/40 ${
                  msg.role === 'agent' ? 'bg-slate-900/30' : ''
                }`}
              >
                <div className="flex gap-2.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'agent'
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'
                      : 'bg-slate-700/50 border border-slate-600/30 text-slate-400'
                  }`}>
                    {msg.role === 'agent' ? <Brain size={12} /> : <User size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-600 mb-1 font-mono uppercase tracking-wider">
                      {msg.role === 'agent' ? 'ORACLE' : 'YOU'} · {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    {msg.content ? (
                      <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                        {renderContent(msg.content)}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-cyan-400 text-xs">
                        <Loader2 size={12} className="animate-spin" />
                        <span className="font-mono">Fetching live intel + reasoning...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 p-3 border-t border-slate-800/60" style={{ background: 'rgba(15,20,35,0.8)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Query ORACLE intelligence..."
            className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2.5 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-40 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="px-3 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-30 transition-all"
          >
            {isTyping ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          </button>
        </form>
      </div>
    </div>
  );
}
