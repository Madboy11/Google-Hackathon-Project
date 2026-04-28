// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function AgentPanel() {
  const agentMessages = useSupplyChainStore(state => state.agentMessages);
  const addAgentMessage = useSupplyChainStore(state => state.addAgentMessage);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages / content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agentMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const query = input;
    setInput('');
    setIsTyping(true);

    // Add user message
    addAgentMessage({
      id: `user-${Date.now()}`,
      content: query,
      role: 'user',
      timestamp: new Date().toISOString(),
    });

    // Add placeholder agent message
    const agentMsgId = `agent-${Date.now()}`;
    addAgentMessage({
      id: agentMsgId,
      content: '',
      role: 'agent',
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ''}/orch/agent/stream?query=${encodeURIComponent(query)}`
      );
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

      // If nothing came through, show a friendly error
      if (!accumulated) {
        useSupplyChainStore.setState(state => ({
          agentMessages: state.agentMessages.map(m =>
            m.id === agentMsgId
              ? { ...m, content: 'NEXUS received no data from the reasoning core. Check backend logs.' }
              : m
          ),
        }));
      }
    } catch (err) {
      useSupplyChainStore.setState(state => ({
        agentMessages: state.agentMessages.map(m =>
          m.id === agentMsgId
            ? { ...m, content: `Connection to NEXUS failed: ${err}` }
            : m
        ),
      }));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-gray-800 w-[380px]">
      {/* Header */}
      <div className="h-14 shrink-0 border-b border-gray-800 flex items-center px-4 gap-2">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <span className="font-bold text-accent tracking-wider font-grotesk text-sm">NEXUS CORE</span>
        <span className="ml-auto text-xs text-text-muted">Gemini 2.5 Flash</span>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 flex flex-col"
      >
        {agentMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <Bot size={32} className="text-accent/50" />
            <p className="text-text-muted text-sm">
              NEXUS is ready. Ask about risk in any global shipping corridor.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {['Red Sea risk?', 'Port congestion in Singapore?', 'Weather hazards near Suez?'].map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-text-muted hover:border-accent hover:text-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          agentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 flex gap-3 border-b border-gray-800/50 ${
                msg.role === 'agent' ? 'bg-surface/50' : 'bg-background'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'agent'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {msg.role === 'agent' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                {msg.content ? (
                  <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed font-inter">
                    {msg.content}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-text-muted text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Reasoning...</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input bar */}
      <div className="p-4 shrink-0 bg-surface border-t border-gray-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Query NEXUS..."
            className="w-full bg-background border border-gray-700 rounded-lg pl-4 pr-12 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent disabled:text-gray-600 hover:bg-accent/10 rounded-md transition-colors"
          >
            {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
