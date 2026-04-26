import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useSupplyChainStore } from '../store/supplyChainStore';
import { AlertTriangle } from 'lucide-react';

export default function AlertFeed() {
  const { disruptions } = useSupplyChainStore();

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const alert = disruptions[index];
    return (
      <div style={style} className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-danger" />
          <span className="font-semibold text-sm text-text-primary truncate">{alert.title}</span>
        </div>
        <p className="text-xs text-text-muted line-clamp-2">{alert.summary}</p>
        <div className="text-[10px] text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleString()}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface/50 border-r border-gray-800">
      <div className="p-3 bg-surface border-b border-gray-800 font-bold flex justify-between items-center text-text-primary shrink-0">
        <span>Active Alerts</span>
        <span className="bg-danger/20 text-danger px-2 py-0.5 rounded-full text-xs">{disruptions.length}</span>
      </div>
      <div className="flex-1 w-full h-full">
        {disruptions.length === 0 ? (
          <div className="p-4 text-sm text-text-muted text-center">No active disruptions</div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={disruptions.length}
                itemSize={100}
                width={width}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        )}
      </div>
    </div>
  );
}
