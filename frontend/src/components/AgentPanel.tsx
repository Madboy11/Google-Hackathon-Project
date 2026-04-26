import React, { useState, useEffect, useRef } from 'react';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { Send, Bot, User } from 'lucide-react';
// @ts-ignore
import { FixedSizeList as List } from 'react-window';
// @ts-ignore
import AutoSizer from 'react-virtualized-auto-sizer';

export default function AgentPanel() {
  const agentMessages = useSupplyChainStore(state => state.agentMessages);
  const addAgentMessage = useSupplyChainStore(state => state.addAgentMessage);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<List>(null);

  useEffect(() => {
    if (listRef.current && agentMessages.length > 0) {
      listRef.current.scrollToItem(agentMessages.length - 1, 'end');
    }
  }, [agentMessages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    addAgentMessage({ id: Date.now().toString(), content: input, role: 'user', timestamp: new Date().toISOString() });
    const query = input;
    setInput('');
    setIsTyping(true);
    
    const agentMsgId = (Date.now() + 1).toString();
    addAgentMessage({ id: agentMsgId, content: '', role: 'agent', timestamp: new Date().toISOString() });

    try {
      const response = await fetch(`http://127.0.0.1:8002/agent/stream?query=${encodeURIComponent(query)}`);
      if (!response.body) return;
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (dataStr.trim()) {
              try {
                const data = JSON.parse(dataStr);
                if (data.text) {
                  accumulated += data.text;
                  useSupplyChainStore.setState(state => ({
                    agentMessages: state.agentMessages.map(m => m.id === agentMsgId ? { ...m, content: accumulated } : m)
                  }));
                }
              } catch (e) { }
            }
          }
        }
      }
    } catch (error) {
      useSupplyChainStore.setState(state => ({
        agentMessages: state.agentMessages.map(m => m.id === agentMsgId ? { ...m, content: "Connection to NEXUS failed." } : m)
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = agentMessages[index];
    const isAgent = msg.role === 'agent';
    return (
      <div style={style} className={`p-4 flex gap-3 ${isAgent ? 'bg-surface' : 'bg-background'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAgent ? 'bg-accent/20 text-accent' : 'bg-gray-700 text-gray-300'}`}>
          {isAgent ? <Bot size={18} /> : <User size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary whitespace-pre-wrap font-inter">{msg.content || (isAgent && isTyping && index === agentMessages.length - 1 ? 'Thinking...' : '')}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-gray-800 w-[380px]">
      <div className="h-14 shrink-0 border-b border-gray-800 flex items-center px-4 font-bold text-accent tracking-wider font-grotesk">
        NEXUS CORE
      </div>
      <div className="flex-1 w-full h-full">
        {agentMessages.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">NEXUS is ready. Ask about risk in any region.</div>
        ) : (
          <AutoSizer>
            {({ height, width }: { height: number, width: number }) => (
              <List
                ref={listRef}
                height={height}
                itemCount={agentMessages.length}
                itemSize={150}
                width={width}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
      <div className="p-4 shrink-0 bg-surface border-t border-gray-800">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={isTyping}
            placeholder="Query NEXUS..."
            className="w-full bg-background border border-gray-700 rounded-lg pl-4 pr-12 py-3 text-sm text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent disabled:text-gray-600 hover:bg-accent/10 rounded-md transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
