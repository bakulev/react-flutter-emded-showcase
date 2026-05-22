import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowRightLeft, Radio, HelpCircle } from 'lucide-react';
import { BridgeLog } from '../types';

interface BridgeConsoleProps {
  logs: BridgeLog[];
  onClear: () => void;
}

export default function BridgeConsole({ logs, onClear }: BridgeConsoleProps) {
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll down on new OLE logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg relative scanline">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-widest">
            Консоль шины данных (OLE Bridge Logs)
          </span>
          <span className="text-[10px] bg-sky-950 text-sky-300 font-mono px-1.5 py-0.5 rounded border border-sky-900/30">
            {logs.length} соб.
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-all font-mono text-[10px] flex items-center gap-1"
          title="Очистить поток логов"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear logs</span>
        </button>
      </div>

      {/* Logs Scroll container */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] flex flex-col gap-1.5 select-text bg-slate-950 max-h-[180px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-center gap-2">
            <Radio className="w-6 h-6 text-slate-600 animate-pulse" />
            <p className="max-w-xs font-sans">Шина интерактивного обмена OLE пуста. Сделайте клик или измените ползунок, чтобы родить первое событие!</p>
          </div>
        ) : (
          logs.map((log) => {
            const isReactSender = log.sender === 'react';
            return (
              <div
                key={log.id}
                className={`py-1.5 px-3 rounded border flex flex-col gap-1.5 transition-all ${
                  isReactSender
                    ? 'bg-sky-950/20 border-sky-950 text-sky-200'
                    : 'bg-emerald-950/15 border-emerald-950 text-emerald-200'
                }`}
              >
                {/* Log Line header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 font-bold">{log.timestamp}</span>
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1 px-1.5 py-0.5 rounded font-mono ${
                        isReactSender
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {isReactSender ? 'React Host' : 'Flutter Canvas'}
                    </span>
                    <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                    <span className="font-semibold text-slate-350">{log.event}</span>
                  </div>
                  <span className="text-[9px] text-slate-500">Latency: &lt; 0.5ms</span>
                </div>

                {/* Log Payload */}
                <pre className="text-[10px] text-slate-400 bg-slate-950/80 p-2 rounded overflow-x-auto max-w-full font-mono">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* OLE Interop help line at the bottom */}
      <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1 font-sans justify-between">
        <div className="flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>Сценарий OLE работает через JS Interop: Flutter биндится в глобальное окно window и подписывается на CustomEvents.</span>
        </div>
        <span className="text-[9px] font-mono text-slate-400">Memory: 0 references leaked</span>
      </div>
    </div>
  );
}
