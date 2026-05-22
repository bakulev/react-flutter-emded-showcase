import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Terminal, 
  Settings, 
  Activity, 
  Compass, 
  Sparkles, 
  Lightbulb, 
  Wind, 
  Lock, 
  TrendingUp, 
  Play, 
  Zap, 
  Smartphone, 
  RefreshCw,
  Sliders,
  DollarSign,
  Maximize2
} from 'lucide-react';
import { BridgeLog, InspectorNode } from '../types';

interface FlutterEmulatorProps {
  demoType: 'smarthome' | 'financial' | 'painter' | 'playground' | 'none';
  reactState: {
    temperature: number;
    brightness: number;
    fanSpeed: number;
    securityLocked: boolean;
    appTheme: 'light' | 'dark' | 'neon';
    ticker: 'AAPL' | 'TSLA' | 'BTC' | 'ETH';
    chartType: 'candle' | 'line';
    waveAmplitude: number;
    particleCount: number;
    frequency: 'low' | 'mid' | 'high';
  };
  onFlutterStateChange: (updatedState: Record<string, any>) => void;
  onDispatchLog: (log: Omit<BridgeLog, 'id' | 'timestamp'>) => void;
}

export default function FlutterEmulator({
  demoType,
  reactState,
  onFlutterStateChange,
  onDispatchLog
}: FlutterEmulatorProps) {
  const [booting, setBooting] = useState<boolean>(true);
  const [bootProgress, setBootProgress] = useState<number>(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);
  const [selectedInspectorNode, setSelectedInspectorNode] = useState<string | null>(null);
  
  // Local high-fidelity physics simulator state for variants
  const [particles, setParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time market simulation variables
  const initialPrices = {
    BTC: 68245.10,
    ETH: 3480.95,
    AAPL: 184.22,
    TSLA: 174.50
  };

  const [tickerPrice, setTickerPrice] = useState<number>(3480.95);
  const [candles, setCandles] = useState<Array<{ o: number; h: number; l: number; c: number }>>([
    { o: 40, h: 65, l: 30, c: 55 },
    { o: 55, h: 80, l: 45, c: 75 },
    { o: 75, h: 78, l: 60, c: 62 },
    { o: 62, h: 70, l: 50, c: 55 },
    { o: 55, h: 90, l: 52, c: 85 },
    { o: 85, h: 95, l: 80, c: 92 },
    { o: 92, h: 94, l: 65, c: 70 },
    { o: 70, h: 85, l: 68, c: 80 },
    { o: 80, h: 84, l: 60, c: 62 },
    { o: 62, h: 95, l: 58, c: 90 }
  ]);

  // Adjust tickerPrice base when selected ticker updates
  useEffect(() => {
    const base = initialPrices[reactState.ticker] || 3480.95;
    setTickerPrice(base);
    // Randomize some candles to fit the ticker's character
    setCandles([
      { o: 30 + Math.random() * 20, h: 60 + Math.random() * 15, l: 20 + Math.random() * 10, c: 45 + Math.random() * 20 },
      { o: 45 + Math.random() * 10, h: 70 + Math.random() * 20, l: 35 + Math.random() * 10, c: 65 + Math.random() * 15 },
      { o: 65 + Math.random() * 10, h: 80 + Math.random() * 10, l: 50 + Math.random() * 15, c: 55 + Math.random() * 10 },
      { o: 55 + Math.random() * 15, h: 75 + Math.random() * 15, l: 45 + Math.random() * 10, c: 50 + Math.random() * 15 },
      { o: 50 + Math.random() * 10, h: 85 + Math.random() * 10, l: 40 + Math.random() * 15, c: 75 + Math.random() * 15 },
      { o: 75 + Math.random() * 15, h: 95 + Math.random() * 5,  l: 60 + Math.random() * 15, c: 85 + Math.random() * 10 },
      { o: 85 + Math.random() * 10, h: 92 + Math.random() * 5,  l: 55 + Math.random() * 15, c: 60 + Math.random() * 15 },
      { o: 60 + Math.random() * 15, h: 85 + Math.random() * 10, l: 55 + Math.random() * 10, c: 75 + Math.random() * 10 },
      { o: 75 + Math.random() * 10, h: 80 + Math.random() * 15, l: 45 + Math.random() * 15, c: 50 + Math.random() * 15 },
      { o: 50 + Math.random() * 15, h: 95 + Math.random() * 5,  l: 45 + Math.random() * 10, c: 80 + Math.random() * 15 }
    ]);
  }, [reactState.ticker]);

  // Handle active real-time ticker tick simulation in the graph representation
  useEffect(() => {
    if (demoType !== 'financial' || booting) return;

    let delay = 1500;
    if (reactState.frequency === 'high') delay = 400;
    if (reactState.frequency === 'low') delay = 4000;

    const interval = setInterval(() => {
      // Small random drift on price
      const base = initialPrices[reactState.ticker] || 3480.95;
      const pctDrift = (Math.random() - 0.49) * 0.002; // max 0.2% change per tick
      
      setTickerPrice(prev => {
        const next = prev * (1 + pctDrift);
        return Number(next.toFixed(2));
      });

      // Evolve last candle and occasionally shift
      setCandles(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const last = { ...copy[lastIdx] };

        // Morph closing price slightly
        last.c = Math.max(15, Math.min(95, last.c + (Math.random() - 0.5) * 8));
        last.h = Math.max(last.h, last.c, last.o);
        last.l = Math.min(last.l, last.c, last.o);
        copy[lastIdx] = last;

        // 15% chance to complete a candle bar and shift the timeline left
        if (Math.random() > 0.85) {
          copy.shift();
          const nextOpen = last.c;
          const nextClose = Math.max(15, Math.min(95, nextOpen + (Math.random() - 0.5) * 12));
          copy.push({
            o: nextOpen,
            c: nextClose,
            h: Math.max(nextOpen, nextClose) + Math.random() * 6,
            l: Math.min(nextOpen, nextClose) - Math.random() * 6
          });
        }
        return copy;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [demoType, booting, reactState.frequency, reactState.ticker]);

  // Restart boot sequence when demoType changes
  useEffect(() => {
    let isMounted = true;
    setBooting(true);
    setBootProgress(0);
    setBootLogs([
      '[FlutterLoader] Initializing WebAssembly context...',
      '[FlutterLoader] Detecting GPU hardware support: WebGL 2.0 active',
    ]);

    const steps = [
      { prg: 25, log: '[FlutterLoader] Downloading asset bundle: main.dart.js (1.42 MB) [25%]' },
      { prg: 50, log: '[FlutterLoader] Downloading WebAssembly CanvasKit: canvaskit.wasm (2.8 MB) [50%]' },
      { prg: 75, log: '[FlutterLoader] Compiling WASM bytecodes & binding CPU-to-GPU bridges [75%]' },
      { prg: 90, log: '[CanvasKit] Spawning Skia/Impeller direct canvas layer [90%]' },
      { prg: 100, log: '[Flutter] void main() invoked. Building widget tree... [100%]' },
    ];

    let step = 0;
    let timer: NodeJS.Timeout | null = null;

    const runBoot = () => {
      if (!isMounted) return;
      if (step < steps.length) {
        timer = setTimeout(() => {
          if (!isMounted) return;
          const currentStep = steps[step];
          if (currentStep) {
            setBootProgress(currentStep.prg);
            setBootLogs(prev => [...prev, currentStep.log]);
            step++;
            runBoot();
          } else {
            setBooting(false);
          }
        }, 400 + Math.random() * 300);
      } else {
        timer = setTimeout(() => {
          if (!isMounted) return;
          setBooting(false);
          onDispatchLog({
            sender: 'flutter',
            event: 'engine_initialized',
            payload: { renderer: 'CanvasKit v3.0.0 (WASM/WebGL)', status: 'running_60fps' }
          });
        }, 200);
      }
    };

    runBoot();

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [demoType]);

  // Generative fluid/particle code for painter view
  useEffect(() => {
    if (demoType !== 'painter' || booting) return;
    
    // Seed particles
    const list = [];
    const colorPalette = ['#06b6d4', '#0ea5e9', '#3b82f6', '#14b8a6', '#a855f7'];
    for (let i = 0; i < reactState.particleCount; i++) {
      list.push({
        x: Math.random() * 320,
        y: 120 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 2 + Math.random() * 4,
        color: colorPalette[i % colorPalette.length]
      });
    }
    setParticles(list);
  }, [reactState.particleCount, demoType, booting]);

  // Render loop for painter canvas (pure custom painter simulation)
  useEffect(() => {
    if (demoType !== 'painter' || booting || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let tickCount = 0;

    const draw = () => {
      tickCount += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mathematical wave as background layout constraint representation
      ctx.beginPath();
      ctx.strokeStyle = reactState.appTheme === 'neon' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(14, 165, 233, 0.1)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.02 + tickCount) * reactState.waveAmplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Render updated particles
      particles.forEach((p, idx) => {
        // Apply sinusoidal wind force
        const yWave = Math.sin(p.x * 0.01 + tickCount) * (reactState.waveAmplitude * 0.1);
        p.x += p.vx;
        p.y += p.vy + yWave * 0.2;

        // Bounce borders
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        
        ctx.fillStyle = reactState.appTheme === 'neon' ? '#ec4899' : p.color;
        
        // Highlight particle cluster if specific widget is selected
        if (selectedInspectorNode === 'ParticleRenderer') {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        ctx.fill();
      });

      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [particles, reactState.waveAmplitude, reactState.appTheme, selectedInspectorNode, booting, demoType]);

  // Widget tree inspector node configurations for deep interactive debug
  const getWidgetTree = (): InspectorNode[] => {
    switch (demoType) {
      case 'smarthome':
        return [
          {
            id: 'MaterialApp', name: 'MaterialApp', type: 'widget', depth: 0, info: 'themeMode: ThemeMode.dark',
            children: [
              {
                id: 'Scaffold', name: 'Scaffold', type: 'widget', depth: 1, info: 'backgroundColor: Color(0xFF0F172A)',
                children: [
                  {
                    id: 'SafeArea', name: 'SafeArea', type: 'layout', depth: 2,
                    children: [
                      {
                        id: 'InteractiveControlPanel', name: 'InteractiveControlPanel', type: 'widget', depth: 3, info: 'key: ValueKey("panel")',
                        children: [
                          { id: 'RadialClimateGauge', name: 'RadialClimateGauge', type: 'widget', depth: 4, info: `temperature: ${reactState.temperature}°C` },
                          { id: 'DeviceGrid', name: 'DeviceGrid', type: 'layout', depth: 4, info: 'crossAxisCount: 2' },
                          { id: 'ACFanController', name: 'ACFanController', type: 'render', depth: 4, info: `fanSpeedValue: ${reactState.fanSpeed}` },
                          { id: 'SecurityLockToggle', name: 'SecurityLockToggle', type: 'widget', depth: 4, info: `isLocked: ${reactState.securityLocked}` }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ];
      case 'financial':
        return [
          {
            id: 'MaterialApp', name: 'MaterialApp', type: 'widget', depth: 0, info: 'useMaterial3: true',
            children: [
              {
                id: 'Scaffold', name: 'Scaffold', type: 'widget', depth: 1,
                children: [
                  {
                    id: 'Column_Container', name: 'Column', type: 'layout', depth: 2,
                    children: [
                      { id: 'AssetHeader', name: 'AssetHeader', type: 'widget', depth: 3, info: `activeTicker: "${reactState.ticker}"` },
                      { id: 'CandleStickChart', name: 'CandleStickChart', type: 'render', depth: 3, info: `renderMode: "${reactState.chartType}"` },
                      { id: 'TickerStatsRow', name: 'TickerStatsRow', type: 'layout', depth: 3 },
                      { id: 'LogEventStream', name: 'LogEventStream', type: 'widget', depth: 3, info: `freq: "${reactState.frequency}"` }
                    ]
                  }
                ]
              }
            ]
          }
        ];
      case 'painter':
        return [
          {
            id: 'CupertinoApp', name: 'WidgetsApp', type: 'widget', depth: 0,
            children: [
              {
                id: 'CustomPaintContainer', name: 'CustomPaint', type: 'render', depth: 1,
                children: [
                  { id: 'ParticleRenderer', name: 'ParticleRenderer', type: 'render', depth: 2, info: `count: ${reactState.particleCount}` },
                  { id: 'SineWaveFramer', name: 'SineWaveFramer', type: 'layout', depth: 2, info: `val: ${reactState.waveAmplitude}` }
                ]
              }
            ]
          }
        ];
      default:
        return [];
    }
  };

  // Helper dispatcher of interactive state mutation inside "Flutter" emulation
  const handleInteractionInFlutter = (widgetName: string, updatedState: Record<string, any>) => {
    onFlutterStateChange(updatedState);
    onDispatchLog({
      sender: 'flutter',
      event: 'widget_state_changed',
      payload: { widget: widgetName, ...updatedState }
    });
  };

  const initialBasePrice = initialPrices[reactState.ticker] || 3480.95;
  const pricePct = ((tickerPrice - initialBasePrice) / initialBasePrice * 100) + 1.65;

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative" id="flutter_window_frame">
      {/* Emulator Header Status Bar / Chrome bezel */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-mono select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 block"></span>
          </div>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-sky-400 font-semibold uppercase tracking-wider">OLE EMBED</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300">flutter_canvas_instance.wasm</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowDevTools(!showDevTools)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
              showDevTools ? 'bg-sky-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-sky-400 border border-sky-400/20'
            }`}
          >
            <Settings className="w-3 h-3 animate-spin-slow" />
            <span>DevTools {showDevTools ? 'ON' : 'OFF'}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">WebGL 60.0 FPS</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 relative min-h-0">
        {/* Core Screen */}
        <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            {booting ? (
              <motion.div 
                key="boot"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center p-6"
              >
                {/* Simulated Loading Engine Screen */}
                <div className="relative mb-6">
                  {/* Outer Orbit */}
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-sky-500/30 animate-spin-slow"></div>
                  {/* Flutter Logo Spinner */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-sky-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 22 12 12 22 12 15 17 12 12 9" />
                      <polygon points="7 6 13 12 7 18 7 13 10 12 7 11" />
                    </svg>
                  </div>
                </div>

                <div className="w-64 bg-slate-900 rounded-full h-1.5 overflow-hidden mb-4 border border-slate-800">
                  <motion.div 
                    initial={{ width: '0%' }}
                    animate={{ width: `${bootProgress}%` }}
                    transition={{ ease: "easeOut" }}
                    className="h-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                  ></motion.div>
                </div>

                <span className="text-slate-300 font-medium text-sm text-center mb-1">Инициализация движка Flutter CanvasKit...</span>
                <span className="text-slate-500 font-mono text-[10px] mb-8">wasm-compilation v4.81-impeller</span>

                {/* Console loader logs */}
                <div className="w-full max-w-md bg-slate-925 border border-slate-900 rounded p-3 h-28 overflow-y-auto text-[10px] font-mono text-slate-400 flex flex-col gap-1 select-none">
                  {bootLogs.map((log, i) => (
                    <div key={i} className="text-left flex gap-1 items-start leading-4">
                      <span className="text-sky-500 select-none">❯</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Actual Active Embedded Flutter Dashboard Canvas mockup */}
          <div className="flex-1 w-full h-full relative p-4 flex flex-col justify-between overflow-y-auto bg-slate-950 select-none">
            
            {/* Visual border overlay when inspecting via node */}
            <AnimatePresence>
              {selectedInspectorNode && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-1 pointer-events-none border-2 border-dashed border-emerald-500/80 bg-emerald-500/5 rounded-xl z-30 flex items-center justify-center"
                >
                  <div className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-bold font-mono shadow-md uppercase">
                    Инспектирование: {selectedInspectorNode}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DEMO 1: Smart Home View */}
            {demoType === 'smarthome' && !booting && (
              <div className="flex-1 flex flex-col gap-4">
                {/* Top overview gauge */}
                <div className="relative flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-xl border border-slate-800/60 overflow-hidden group">
                  
                  {/* Subtle pulsing concentric layers based on heat/temperature */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                    <div className="w-32 h-32 rounded-full border border-sky-500/20 animate-ping" style={{ animationDuration: '3s' }}></div>
                  </div>

                  {/* Highlights active node debug */}
                  <div className={`p-4 rounded-full border-4 flex flex-col items-center justify-center w-28 h-28 transition-colors ${
                    selectedInspectorNode === 'RadialClimateGauge' 
                      ? 'border-emerald-500 bg-emerald-950/20' 
                      : 'border-sky-400/35 bg-slate-900 shadow-inner'
                  }`}>
                    <span className="text-xs font-semibold text-sky-400 uppercase tracking-widest text-[10px]">Температура</span>
                    <span className="text-3xl font-display font-medium text-slate-100">{reactState.temperature}°C</span>
                    <span className="text-[9px] text-slate-400 font-mono">Set via Bridge</span>
                  </div>
                  
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Wind className="w-3.5 h-3.5 text-sky-400" />
                      <span>Влажность 48%</span>
                    </div>
                  </div>
                </div>

                {/* Sub components inside Flutter Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Appliance grid item 1: Fan */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    selectedInspectorNode === 'ACFanController'
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-300">Вентиляция</span>
                      <Wind className={`w-4 h-4 transition-transform duration-[600ms] ${
                        reactState.fanSpeed > 0 ? 'text-sky-400 animate-spin' : 'text-slate-500'
                      }`} style={{ animationDuration: `${2000 / Math.max(reactState.fanSpeed, 0.5)}ms` }} />
                    </div>
                    {/* Flutter Interactive Controls inside Canvas representation */}
                    <div className="flex gap-1.5 mt-2 justify-center">
                      {[0, 1, 2, 3].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleInteractionInFlutter('ACFanController', { fanSpeed: speed })}
                          className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${
                            reactState.fanSpeed === speed 
                              ? 'bg-sky-400 text-slate-950 scale-105 shadow-md' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {speed}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Appliance grid item 2: Lock */}
                  <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    selectedInspectorNode === 'SecurityLockToggle'
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : 'bg-slate-900/40 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Замок</span>
                      <Lock className={`w-4 h-4 transition-colors ${
                        reactState.securityLocked ? 'text-emerald-400' : 'text-rose-400'
                      }`} />
                    </div>
                    
                    <button
                      onClick={() => handleInteractionInFlutter('SecurityLockToggle', { securityLocked: !reactState.securityLocked })}
                      className={`w-full py-1.5 px-3 whitespace-nowrap text-[10px] tracking-wide font-semibold uppercase rounded-lg transition-all text-center mt-3 ${
                        reactState.securityLocked 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35 hover:bg-rose-500/30' 
                          : 'bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400'
                      }`}
                    >
                      {reactState.securityLocked ? 'Unlock' : 'Lock Safe'}
                    </button>
                  </div>
                </div>

                {/* Light control row inside Flutter */}
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className={`w-4 h-4 transition-colors ${
                      reactState.brightness > 0 ? 'text-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'text-slate-600'
                    }`} />
                    <span className="text-xs text-slate-300">Напольная лампа</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-end max-w-xs">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      value={reactState.brightness}
                      onChange={(e) => handleInteractionInFlutter('LightIntensityController', { brightness: Number(e.target.value) })}
                      className="w-24 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                    <span className="text-[10px] font-mono text-slate-400 w-6 text-right">{reactState.brightness}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* DEMO 2: Real-time Trading Chart */}
            {demoType === 'financial' && !booting && (
              <div className="flex-1 flex flex-col gap-4">
                {/* Chart Header */}
                <div className={`p-3 rounded-xl bg-slate-900/30 border border-slate-800 flex items-center justify-between ${
                  selectedInspectorNode === 'AssetHeader' ? 'border-emerald-500 bg-emerald-950/20' : ''
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-sky-500/10 text-sky-400">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {reactState.ticker === 'BTC' ? 'Bitcoin' : reactState.ticker === 'ETH' ? 'Ethereum' : reactState.ticker === 'AAPL' ? 'Apple Inc.' : 'Tesla Motors'}
                      </h4>
                      <p className="text-[9px] text-slate-400 font-mono tracking-wide">{reactState.ticker}/USD • WebGL Engine</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold font-mono block transition-all duration-300" style={{ color: pricePct >= 0 ? '#10b981' : '#f43f5e' }}>
                      ${tickerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[9px] font-semibold font-mono transition-all duration-300" style={{ color: pricePct >= 0 ? '#10b981' : '#f43f5e' }}>
                      {pricePct >= 0 ? '▲ +' : '▼ '}{pricePct.toFixed(2)}% сегодня
                    </span>
                  </div>
                </div>

                {/* Highly Realistic Candle/Line Charts Rendering inside Flutter simulation */}
                <div className={`flex-1 min-h-[160px] relative rounded-xl border p-3 flex flex-col justify-between overflow-hidden ${
                  selectedInspectorNode === 'CandleStickChart' 
                    ? 'border-emerald-500 bg-emerald-950/20' 
                    : 'bg-slate-900 border-slate-800/80 shadow-inner'
                }`}>
                  
                  {/* Performance overlay badge in top right */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/75 px-1.5 py-0.5 rounded text-[8px] font-mono border border-slate-800 text-sky-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>SKIA GL</span>
                  </div>

                  {reactState.chartType === 'candle' ? (
                    /* CANDLESTICKS PLOT */
                    <div className="flex-1 flex items-end justify-between px-2 py-4 relative">
                      {/* Grid wires */}
                      <div className="absolute inset-x-0 top-1/4 border-t border-slate-800/40 pointer-events-none"></div>
                      <div className="absolute inset-x-0 top-2/4 border-t border-slate-800/40 pointer-events-none"></div>
                      <div className="absolute inset-x-0 top-3/4 border-t border-slate-800/40 pointer-events-none"></div>

                      {/* Dynamic simulated candles */}
                      {candles.map((candle, idx) => {
                        const isUp = candle.c >= candle.o;
                        const top = 100 - candle.h;
                        const height = candle.h - candle.l;
                        const bodyTop = 100 - Math.max(candle.o, candle.c);
                        const bodyHeight = Math.abs(candle.o - candle.c);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full relative cursor-pointer group/candle"
                              onClick={() => handleInteractionInFlutter('CandleStickChart', { activeCandleIndex: idx, price: candle.c })}>
                            {/* Wick wick */}
                            <div className={`absolute w-[1.5px] bg-slate-500/70 transition-all ${isUp ? 'group-hover/candle:bg-emerald-400' : 'group-hover/candle:bg-rose-400'}`} 
                                 style={{ top: `${top}%`, height: `${height}%` }}></div>
                            {/* Body candle */}
                            <div className={`absolute w-[6px] rounded-[1px] transition-all hover:scale-x-125 ${
                              isUp ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.35)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(248,113,113,0.35)]'
                            }`} style={{ top: `${bodyTop}%`, height: `${bodyHeight}%` }}></div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* VECTOR SMOOTH LINE PLOT */
                    <div className="flex-1 relative py-4">
                      {(() => {
                        const pathD = candles.reduce((acc, candle, idx) => {
                          const x = (idx * (100 / (candles.length - 1))).toFixed(1);
                          const y = (100 - candle.c).toFixed(1);
                          return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                        }, "");
                        const fillD = pathD ? `${pathD} L 100 100 L 0 100 Z` : "";
                        const lastY = candles.length > 0 ? (100 - candles[candles.length - 1].c) : 50;
                        return (
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {fillD && <path d={fillD} fill="url(#gradient-chart)" className="transition-all duration-300" />}
                            {pathD && <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="2" className="transition-all duration-300" />}
                            
                            {/* Interactive floating scanner cursor placed dynamically at the last tick close */}
                            <line x1="100" y1="0" x2="100" y2="100" stroke="rgba(14, 165, 233, 0.3)" strokeDasharray="3 3"/>
                            <circle cx="100" cy={lastY} r="3" fill="#ffffff" stroke="#06b6d4" strokeWidth="2" className="animate-ping" />
                          </svg>
                        );
                      })()}
                    </div>
                  )}

                  {/* Horizontal X axis with precise times */}
                  <div className="flex justify-between border-t border-slate-800/60 pt-2 text-[8px] font-mono text-slate-500">
                    <span>17:00</span>
                    <span>17:10</span>
                    <span>17:20</span>
                    <span>17:30</span>
                    <span>17:40</span>
                  </div>
                </div>

                {/* Simulation trigger block inside chart */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button 
                    onClick={() => handleInteractionInFlutter('AssetOrderButton', { event: 'buy_order', volume: 0.1 })}
                    className="py-2 px-3 rounded-lg bg-emerald-500 font-bold text-slate-950 text-center uppercase tracking-wide hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/15"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Быстрый Лонг (Buy)</span>
                  </button>
                  <button 
                    onClick={() => handleInteractionInFlutter('AssetOrderButton', { event: 'sell_order', volume: 0.1 })}
                    className="py-2 px-3 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/35 font-bold text-center uppercase tracking-wide hover:bg-rose-500/30 active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Шорт (Short Sell)</span>
                  </button>
                </div>
              </div>
            )}

            {/* DEMO 3: CustomPainter Canvas Particle Generator */}
            {demoType === 'painter' && !booting && (
              <div className="flex-1 flex flex-col gap-3">
                {/* Descriptive banner */}
                <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">CustomPainter Physics</h4>
                      <p className="text-[9px] text-slate-400">Прямое взаимодействие с графическим контекстом Impeller</p>
                    </div>
                  </div>
                </div>

                {/* Real-time HTML5 Canvas rendering particle vectors inside the emulator */}
                <div className="flex-1 min-h-[180px] relative bg-slate-925 shadow-inner border border-slate-800/80 rounded-xl overflow-hidden cursor-crosshair">
                  <canvas 
                    ref={canvasRef} 
                    width={340} 
                    height={200}
                    className="w-full h-full block"
                    onClick={(e) => {
                      // Click-to-add shockwave trigger
                      if (!canvasRef.current) return;
                      const rect = canvasRef.current.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;

                      onDispatchLog({
                        sender: 'react',
                        event: 'canvas_interaction_drag',
                        payload: { clickCoords: `{x: ${x.toFixed(1)}, y: ${y.toFixed(1)}}` }
                      });

                      // Inject particles near tap
                      const additions = [];
                      for (let i = 0; i < 5; i++) {
                        additions.push({
                          x,
                          y,
                          vx: (Math.random() - 0.5) * 4,
                          vy: (Math.random() - 0.5) * 4,
                          radius: 3 + Math.random() * 5,
                          color: '#f43f5e'
                        });
                      }
                      setParticles(prev => [...prev.slice(5), ...additions]);
                    }}
                  />
                  <div className="absolute bottom-2 left-2 text-[8px] font-mono text-slate-400 pointer-events-none bg-slate-950/70 p-1.5 rounded border border-slate-800 flex flex-col gap-0.5">
                    <span>Связанное состояние с React:</span>
                    <span>Амплитуда колебаний: {reactState.waveAmplitude}px</span>
                    <span>Частиц: {reactState.particleCount} шт.</span>
                  </div>
                  <div className="absolute top-2 right-2 flex text-[9px] bg-sky-500/10 border border-sky-400/20 text-sky-300 px-2 py-0.5 rounded-full pointer-events-none tracking-wide">
                    Кликните для импульса
                  </div>
                </div>
              </div>
            )}

            {/* DEMO 4: Playground Preview Window */}
            {demoType === 'playground' && !booting && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900/30 border border-slate-850 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-400/25 flex items-center justify-center text-sky-400 shadow-md">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Инициализирован канал Interop</h4>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                    Используйте панель управления песочницей слева, чтобы отправить пользовательский пакет данных.
                  </p>
                </div>
                {/* Raw performance metric panel inside playground emulator */}
                <div className="w-full bg-slate-950/60 border border-slate-850 rounded-xl p-3 font-mono text-[9px] text-left text-slate-400 flex flex-col gap-1 select-none">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-900/50">
                    <span className="text-slate-500">Event Stream:</span>
                    <span className="text-sky-400 font-semibold uppercase">READY_TO_DISPATCH</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-900/50">
                    <span className="text-slate-500">Latency Profile:</span>
                    <span className="text-emerald-400">&lt; 0.15 ms</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500">Bridge Target ID:</span>
                    <span className="text-amber-400">flutter_host_webassembly_element</span>
                  </div>
                </div>
              </div>
            )}

            {/* Embedded navigation / Flutter bottom navigation bar */}
            <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span className="text-slate-500">Flutter Engine VM v3.22</span>
              <span>Render Engine: Skia</span>
            </div>
          </div>
        </div>

        {/* Dynamic DevTools / Widget Tree Overlay drawer */}
        <AnimatePresence>
          {showDevTools && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-slate-900 border-l border-slate-800 z-50 flex flex-col font-mono text-xs shadow-3xl text-slate-300 pointer-events-auto"
            >
              <div className="p-3 border-b border-slate-800 bg-slate-925 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="font-bold text-[11px] text-slate-200 uppercase tracking-wider">Flutter DevTools</span>
                </div>
                <button 
                  onClick={() => setShowDevTools(false)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100"
                >
                  ✕
                </button>
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                
                {/* Stats widget */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block mb-1.5">Производительность (WASM)</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-400 block whitespace-nowrap">GPU Frame Time:</span>
                      <span className="text-emerald-450 font-bold">1.2 ms / 16ms</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block whitespace-nowrap">UI Thread Time:</span>
                      <span className="text-emerald-450 font-bold">0.8 ms</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-slate-900 rounded h-1 select-none flex overflow-hidden">
                    <div className="bg-emerald-500 w-[15%]"></div>
                    <div className="bg-indigo-500 w-[10%]"></div>
                  </div>
                </div>

                {/* Widget Tree representation */}
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase block mb-2">Widget Tree Inspector</span>
                  
                  {/* Tree Renderer */}
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1 overflow-x-auto max-h-56">
                    {getWidgetTree().length > 0 ? (
                      renderWidgetTreeNodes(getWidgetTree(), selectedInspectorNode, (nodeId) => {
                        setSelectedInspectorNode(selectedInspectorNode === nodeId ? null : nodeId);
                      })
                    ) : (
                      <span className="text-[10px] text-slate-500 italic p-2 text-center block">Нет активных элементов дерева</span>
                    )}
                  </div>
                </div>

                {/* DevTools Tips */}
                <div className="p-2 border border-sky-950 bg-sky-950/20 text-[10px] rounded text-sky-400 leading-relaxed leading-normal">
                  <span className="font-bold uppercase tracking-wider block mb-1">Справка OLE:</span>
                  Нажмите на узел дерева виджетов, чтобы подсветить соответствующую интерактивную область в контейнере эмулятора.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Recursive renderer helper for widgets list inside DevTools panel
function renderWidgetTreeNodes(
  nodes: InspectorNode[], 
  selectedId: string | null, 
  onSelect: (id: string) => void
): React.ReactNode {
  return nodes.map(node => (
    <div key={node.id} className="flex flex-col">
      <button 
        onClick={() => onSelect(node.id)}
        className={`flex items-center text-left py-1 px-1.5 rounded transition-colors text-[10px] overflow-hidden truncate ${
          selectedId === node.id 
            ? 'bg-emerald-500 text-slate-950 font-semibold' 
            : 'hover:bg-slate-900 text-slate-300'
        }`}
        style={{ paddingLeft: `${node.depth * 8 + 6}px` }}
      >
        <span className="text-[8px] text-slate-500 mr-1 select-none">▶</span>
        <span className={selectedId === node.id ? '' : 'text-sky-400'}>{node.name}</span>
        {node.info && (
          <span className={`ml-1 text-[8px] ${selectedId === node.id ? 'text-slate-800' : 'text-slate-500'}`}>
            ({node.info})
          </span>
        )}
      </button>
      {node.children && node.children.length > 0 && (
        <div className="flex flex-col">
          {renderWidgetTreeNodes(node.children, selectedId, onSelect)}
        </div>
      )}
    </div>
  ));
}
