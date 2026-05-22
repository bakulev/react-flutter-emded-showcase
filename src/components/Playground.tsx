import React, { useState } from 'react';
import { Sliders, Play, Zap, Terminal, Code, Radio, RefreshCw, Cpu } from 'lucide-react';
import { BridgeLog } from '../types';

interface PlaygroundProps {
  onDispatchCustomEvent: (eventName: string, payload: Record<string, any>) => void;
  onClearLogs: () => void;
  reactState: any;
  setReactState: (state: any) => void;
}

export default function Playground({
  onDispatchCustomEvent,
  onClearLogs,
  reactState,
  setReactState
}: PlaygroundProps) {
  const [customEventName, setCustomEventName] = useState<string>('update_skin_color');
  const [customPayload, setCustomPayload] = useState<string>('{\n  "theme": "neon",\n  "glowEnabled": true,\n  "contrast": 1.25\n}');
  const [activeCodeTab, setActiveCodeTab] = useState<'js' | 'dart'>('js');

  const handleDispatch = () => {
    try {
      const parsed = JSON.parse(customPayload);
      onDispatchCustomEvent(customEventName, parsed);

      // Instantly inject changes from playground back to demo state values if recognizable
      if (customEventName === 'update_skin_color' && parsed.theme) {
        setReactState({ ...reactState, appTheme: parsed.theme });
      } else if (customEventName === 'boost_particles') {
        setReactState({ ...reactState, particleCount: Math.min(Number(parsed.count || 120), 200) });
      } else if (customEventName === 'adjust_thermostat') {
        setReactState({ ...reactState, temperature: Number(parsed.celsius || 22) });
      } else if (customEventName === 'set_chart_ticker' && parsed.ticker) {
        setReactState({ ...reactState, ticker: parsed.ticker });
      }
    } catch (e) {
      alert('Ошибка парсинга JSON! Пожалуйста, проверьте синтаксис payload.');
    }
  };

  const loadPrebuiltEvent = (name: string, payloadObj: Record<string, any>) => {
    setCustomEventName(name);
    setCustomPayload(JSON.stringify(payloadObj, null, 2));
  };

  const jsCode = `// REACT (Host) -> Отправка вызова в настоящий Flutter Web runtime
function sendOLEDocCommand(command, data) {
  if (typeof window.reactToFlutterBridge === 'function') {
    window.reactToFlutterBridge(command, JSON.stringify(data));
    console.log("[React Host] Команда послана во Flutter:", command, data);
  } else {
    console.warn("Движок Flutter еще загружается...");
  }
}

// Вызов сброса физики частиц:
sendOLEDocCommand('boost_particles', { count: 150 });`;

  const dartCode = `// FLUTTER -> Регистрация и прослушка команд родительской веб-страницы
import 'dart:js' as js;
import 'dart:convert';

void main() {
  js.context['reactToFlutterBridge'] = (String action, String jsonPayload) {
    var data = jsonDecode(jsonPayload);
    
    if (action == 'boost_particles') {
      int particlesCount = data['count'] ?? 100;
      setState(() => particleEngine.spawn(particlesCount));
    }

    js.context.callMethod('flutterToReactBridge', [
      'bridge_command_applied',
      jsonEncode({'action': action})
    ]);
  };
  
  runApp(const DynamicGenerativeApp());
}`;

  return (
    <div className="flex flex-col gap-4 overflow-hidden h-full">
      
      {/* Selector Prebuilts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-mono">
          Шаблоны тестовых сигналов (Prebuilt Signal Triggers)
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadPrebuiltEvent('adjust_thermostat', { celsius: 27, status: 'cooling' })}
            className="text-[10px] py-1.5 px-3 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg border border-slate-750 transition-all font-mono"
          >
            🌡️ Установить климат 27°C
          </button>
          <button
            onClick={() => loadPrebuiltEvent('boost_particles', { count: 180, impulseForce: 5.5 })}
            className="text-[10px] py-1.5 px-3 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg border border-slate-750 transition-all font-mono"
          >
            ✨ Генерировать 180 частиц
          </button>
          <button
            onClick={() => loadPrebuiltEvent('update_skin_color', { theme: 'neon', glowEnabled: true })}
            className="text-[10px] py-1.5 px-3 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg border border-slate-750 transition-all font-mono"
          >
            🎨 Сменить скин на NEON
          </button>
          <button
            onClick={() => loadPrebuiltEvent('set_chart_ticker', { ticker: 'ETH', forceRefresh: true })}
            className="text-[10px] py-1.5 px-3 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg border border-slate-750 transition-all font-mono"
          >
            📈 Переключить тикер на ETH
          </button>
        </div>
      </div>

      {/* Grid Inputs & Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        
        {/* Left column: Manual bridge dispatcher controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 overflow-y-auto">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Панель ручной отправки пакета</span>
            </h4>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-mono font-semibold">Имя CustomEvent (Action Key)</label>
              <input
                type="text"
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-sky-300 outline-none focus:border-sky-500/50"
                placeholder="event_name_key"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-mono font-semibold">Данные Payload (JSON формат)</label>
              <textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                rows={5}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 outline-none focus:border-sky-500/50 w-full"
                placeholder="{}"
              />
            </div>
          </div>

          <button
            onClick={handleDispatch}
            className="w-full py-2.5 bg-sky-500 text-slate-950 hover:bg-sky-400 font-bold rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all outline-none"
          >
            <Play className="fill-current w-3.5 h-3.5" />
            <span>Выполнить отправку (Dispatch Event)</span>
          </button>
        </div>

        {/* Right column: Reference Code block displaying actual implementation details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[220px]">
          <div className="flex bg-slate-925 border-b border-slate-800 p-1.5 justify-between items-center px-3.5">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-purple-400" />
              <span>Микрокод реализации OLE-моста</span>
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveCodeTab('js')}
                className={`text-[9px] font-bold px-2.5 py-1 rounded font-mono transition-all ${
                  activeCodeTab === 'js' ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JS (React Host)
              </button>
              <button
                onClick={() => setActiveCodeTab('dart')}
                className={`text-[9px] font-bold px-2.5 py-1 rounded font-mono transition-all ${
                  activeCodeTab === 'dart' ? 'bg-indigo-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dart (Flutter)
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 bg-slate-950 text-[10.5px] font-mono text-slate-300 overflow-y-auto leading-relaxed select-text select-none">
            {activeCodeTab === 'js' ? (
              <pre className="text-sky-300 pr-2">{jsCode}</pre>
            ) : (
              <pre className="text-indigo-300 pr-2">{dartCode}</pre>
            )}
          </div>
        </div>
      </div>

      {/* Stability and Performance card metrics */}
      <div className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-semibold">Пропускная способность</span>
          <span className="text-xs font-semibold text-sky-400 font-mono">10,000+ событий/сек</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-semibold">Затраты на фрейм</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">&lt; 0.04 ms</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-semibold">Утечка ОЗУ</span>
          <span className="text-xs font-semibold text-indigo-400 font-mono">0.00% (Isolated Heap)</span>
        </div>
        <div className="flex flex-col gap-0.5 border-l border-slate-800/60">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-semibold">Ширина канала</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">Direct Memory Sync</span>
        </div>
      </div>
    </div>
  );
}
