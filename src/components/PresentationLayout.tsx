import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Cpu, 
  Radio, 
  Layers, 
  CheckCircle, 
  RefreshCw, 
  Sliders, 
  Terminal,
  FileCode2,
  Tv,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { slides, categories } from '../data/slidesData';
import FlutterHost from './FlutterHost';
import BridgeConsole from './BridgeConsole';
import Playground from './Playground';
import { BridgeLog } from '../types';
import { dispatchToEmbeddedFlutter } from '../bridgeProtocol';

function renderInlineMarkdown(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={`${keyPrefix}-strong-${tokenIndex}`} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      parts.push(
        <code key={`${keyPrefix}-code-${tokenIndex}`} className="rounded bg-slate-900 px-1 py-0.5 font-mono text-[0.9em] text-sky-300">
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
    tokenIndex += 1;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderSlideMarkdown(markdown: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = markdown.trim().split('\n');
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listType: 'ol' | 'ul' | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(' ');
    const key = `p-${nodes.length}`;
    nodes.push(
      <p key={key} className="text-slate-300 antialiased leading-relaxed">
        {renderInlineMarkdown(text, key)}
      </p>
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const key = `list-${nodes.length}`;
    const ListTag = listType;
    nodes.push(
      <ListTag key={key} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-5 flex flex-col gap-1.5 text-slate-300 text-[13.5px] leading-relaxed`}>
        {listItems.map((item, itemIndex) => (
          <li key={`${key}-${itemIndex}`}>{renderInlineMarkdown(item, `${key}-${itemIndex}`)}</li>
        ))}
      </ListTag>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(/^(#{3,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const depth = headingMatch[1].length;
      const text = headingMatch[2];
      const key = `heading-${lineIndex}`;
      nodes.push(
        <h3 key={key} className={`${depth === 3 ? 'text-lg' : 'text-base'} font-bold text-slate-100 font-display tracking-tight mt-2 border-b border-slate-900 pb-1.5`}>
          {renderInlineMarkdown(text, key)}
        </h3>
      );
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (orderedMatch || unorderedMatch) {
      flushParagraph();
      const nextType = orderedMatch ? 'ol' : 'ul';
      if (listType && listType !== nextType) {
        flushList();
      }
      listType = nextType;
      listItems.push((orderedMatch ?? unorderedMatch)![1]);
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return nodes;
}

export default function PresentationLayout() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [logs, setLogs] = useState<BridgeLog[]>([]);
  
  // Bidirectional state variables coordinated between React Host and Flutter Client
  const [reactState, setReactState] = useState({
    temperature: 21,
    brightness: 65,
    fanSpeed: 1,
    securityLocked: false,
    appTheme: 'dark' as 'light' | 'dark' | 'neon',
    ticker: 'AAPL' as 'AAPL' | 'TSLA' | 'BTC' | 'ETH',
    chartType: 'candle' as 'candle' | 'line',
    waveAmplitude: 35,
    particleCount: 80,
    frequency: 'mid' as 'low' | 'mid' | 'high'
  });

  const currentSlide = slides[currentSlideIndex];

  const dispatchBridgeLog = (sender: 'react' | 'flutter', event: string, payload: Record<string, any>) => {
    const newLog: BridgeLog = {
      id: Math.random().toString(36).substring(2, 9),
      sender,
      event,
      payload,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      dispatchBridgeLog('react', 'slide_navigate_next', { targetSlideIndex: currentSlideIndex + 1 });
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
      dispatchBridgeLog('react', 'slide_navigate_prev', { targetSlideIndex: currentSlideIndex - 1 });
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Triggers dispatch from React controls down into Flutter
  const updateReactControlAndNotify = (key: string, value: any) => {
    const nextState = { ...reactState, [key]: value };
    setReactState(nextState);
    const delivered = dispatchToEmbeddedFlutter('sync_state', { demoType: currentSlide.demoType, state: nextState });
    dispatchBridgeLog('react', `command_to_flutter:${key}`, { value, delivered });
  };

  // When Flutter app modifies internal state via clicking widgets
  const handleFlutterStateChange = (updatedState: Record<string, any>) => {
    setReactState(prev => ({ ...prev, ...updatedState }));
  };

  const currentCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'intro': return <Sparkles className="w-4 h-4 text-sky-400" />;
      case 'tech': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'bridge': return <Radio className="w-4 h-4 text-teal-400" />;
      case 'embed': return <Layers className="w-4 h-4 text-amber-400" />;
      case 'summary': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* Header Panel */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/15">
            <Layers className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold tracking-wider text-slate-100 uppercase">React-Flutter Embedded Runtime Showcase</h1>
            <p className="text-[10px] text-slate-400 font-mono">HOST-ELEMENT EMBEDDING • VERSIONED JSON BRIDGE</p>
          </div>
        </div>

        {/* Top bar metrics */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/60 px-3.5 py-1.5 rounded-lg text-[10px] font-mono">
            <span className="text-slate-500">Bridge Target Node:</span>
            <span className="text-sky-400 font-bold">host_container_div</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800/60 px-3.5 py-1.5 rounded-lg text-[10px] font-mono">
            <span className="text-slate-500">Flutter Runtime:</span>
            <span className="text-emerald-400 font-bold">Real Web Bundle</span>
          </div>
          <button 
            onClick={() => {
              const resetState = {
                temperature: 21,
                brightness: 65,
                fanSpeed: 1,
                securityLocked: false,
                appTheme: 'dark',
                ticker: 'AAPL',
                chartType: 'candle',
                waveAmplitude: 35,
                particleCount: 80,
                frequency: 'mid'
              } as const;
              setReactState(resetState);
              const rebootDelivered = dispatchToEmbeddedFlutter('reboot', { source: 'top_bar' });
              const syncDelivered = dispatchToEmbeddedFlutter('sync_state', { demoType: currentSlide.demoType, state: resetState });
              dispatchBridgeLog('react', 'bridge_connection_rebooted', { rebootDelivered, syncDelivered });
            }}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white px-3 py-1.5 rounded-lg font-mono text-xs text-slate-300 transition-all border border-slate-700"
            title="Перезагрузить все виджеты Flutter во фреймах"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reboot Flutter</span>
          </button>
        </div>
      </header>

      {/* Main Area: Split Screen */}
      <div className="flex-1 flex flex-col xl:flex-row min-h-0">
        
        {/* Left Side: Descriptive Slides and Controls */}
        <div className="w-full xl:w-[48%] bg-slate-950 border-r border-slate-900 border-b xl:border-b-0 p-6 xl:p-8 flex flex-col justify-between overflow-y-auto max-h-[85vh] xl:max-h-[calc(100vh-70px)]">
          <div className="flex flex-col gap-6">
            
            {/* Category Breadcrumb */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono uppercase bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                {currentCategoryIcon(currentSlide.category)}
                <span>ЧАСТЬ {currentSlideIndex + 1} ИЗ {slides.length}: {categories.find(c => c.id === currentSlide.category)?.label}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 font-semibold tracking-wide">
                SLIDE_{currentSlide.id.toString().padStart(2, '0')}
              </span>
            </div>

            {/* Slide Titles */}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-white">
                {currentSlide.title}
              </h2>
              <p className="text-xs md:text-sm text-sky-400 font-mono tracking-wide font-medium">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* Markdown Styled Description */}
            <div className="text-slate-300 text-sm leading-relaxed flex flex-col gap-4 font-sans select-text hover:text-slate-200">
              {renderSlideMarkdown(currentSlide.contentMarkdown)}
            </div>

            {/* React Real-time Interface Side Controller Widget (Activates for demo slides only!) */}
            {currentSlide.demoType !== 'none' && currentSlide.demoType !== 'playground' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 mt-4 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                    <span>Управление хостом React (Instance Bridge)</span>
                  </span>
                  <span className="text-[9px] bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-900/30">Active Link</span>
                </div>

                {/* Sub controls depending on active embedded demo */}
                {currentSlide.demoType === 'smarthome' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Temperature slider on React Side */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Термостат</span>
                        <span className="font-mono text-sky-400 font-bold">{reactState.temperature}°C</span>
                      </div>
                      <input 
                        type="range"
                        min="16"
                        max="30"
                        value={reactState.temperature}
                        onChange={(e) => updateReactControlAndNotify('temperature', Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                      <span className="text-[9px] text-slate-500 font-mono">Передает событие: 'update_temp'</span>
                    </div>

                    {/* Lamp brightness slider on React Side */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Яркость лампы</span>
                        <span className="font-mono text-sky-400 font-bold">{reactState.brightness}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={reactState.brightness}
                        onChange={(e) => updateReactControlAndNotify('brightness', Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                      <span className="text-[9px] text-slate-500 font-mono">Передает событие: 'update_lamp'</span>
                    </div>

                    {/* AC Fan step controls inside React Panel */}
                    <div className="flex flex-col gap-1.5 justify-between">
                      <span className="text-xs text-slate-300">Вентилятор:</span>
                      <div className="flex gap-2">
                        {[0, 1, 2, 3].map(speed => (
                          <button
                            key={speed}
                            onClick={() => updateReactControlAndNotify('fanSpeed', speed)}
                            className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                              reactState.fanSpeed === speed 
                                ? 'bg-sky-400 text-slate-950 scale-105 font-extrabold shadow-md' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {speed}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Door physical gate logic inside React Panel */}
                    <div className="flex flex-col gap-1.5 justify-between">
                      <span className="text-xs text-slate-300">Защитный замок ворот:</span>
                      <button
                        onClick={() => updateReactControlAndNotify('securityLocked', !reactState.securityLocked)}
                        className={`w-full py-1 px-3 text-xs tracking-wide font-bold uppercase rounded-lg transition-all text-center border ${
                          reactState.securityLocked 
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                            : 'bg-emerald-500 text-slate-950 border-emerald-500 hover:bg-emerald-400'
                        }`}
                      >
                        {reactState.securityLocked ? 'АКТИВЕН / LOCKED' : 'СНЯТ / UNLOCKED'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub controls depending on active Trading demo */}
                {currentSlide.demoType === 'financial' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Ticker selector */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-300">Активный Финансовый Тикер:</span>
                      <div className="grid grid-cols-4 gap-1">
                        {['AAPL', 'TSLA', 'BTC', 'ETH'].map(t => (
                          <button
                            key={t}
                            onClick={() => updateReactControlAndNotify('ticker', t)}
                            className={`py-1 rounded text-[10px] font-bold font-mono transition-all ${
                              reactState.ticker === t 
                                ? 'bg-sky-500 text-slate-950 font-extrabold shadow' 
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chart style selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-300">Стиль отрисовки WebGL:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateReactControlAndNotify('chartType', 'candle')}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                            reactState.chartType === 'candle' ? 'bg-sky-400 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Свечной узел
                        </button>
                        <button
                          onClick={() => updateReactControlAndNotify('chartType', 'line')}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                            reactState.chartType === 'line' ? 'bg-sky-400 text-slate-950 font-extrabold font-bold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Вектор кривой
                        </button>
                      </div>
                    </div>

                    {/* High frequency event speed trigger slider */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Частота тиков события котировки:</span>
                        <span className="font-mono text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                          {reactState.frequency === 'high' ? 'High Speed (~500ms)' : reactState.frequency === 'mid' ? 'Medium (~2s)' : 'Slow (~5s)'}
                        </span>
                      </div>
                      <div className="flex bg-slate-950/60 p-1 rounded-lg border border-slate-800">
                        {['low', 'mid', 'high'].map(freq => (
                          <button
                            key={freq}
                            onClick={() => updateReactControlAndNotify('frequency', freq)}
                            className={`flex-1 py-1 text-[10px] font-bold font-mono capitalize rounded-md transition-all ${
                              reactState.frequency === freq 
                                ? 'bg-sky-500 text-slate-950 font-extrabold' 
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                            }`}
                          >
                            {freq === 'high' ? 'High' : freq === 'mid' ? 'Mid' : 'Low'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub controls depending on creative canvas painter */}
                {currentSlide.demoType === 'painter' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Amplitude slider */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Амплитуда колебания</span>
                        <span className="font-mono text-sky-400 font-semibold">{reactState.waveAmplitude}px</span>
                      </div>
                      <input 
                        type="range"
                        min="5"
                        max="80"
                        value={reactState.waveAmplitude}
                        onChange={(e) => updateReactControlAndNotify('waveAmplitude', Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    {/* Particle density controls */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-300">Количество частиц</span>
                        <span className="font-mono text-sky-400 font-semibold">{reactState.particleCount} шт.</span>
                      </div>
                      <input 
                        type="range"
                        min="10"
                        max="180"
                        value={reactState.particleCount}
                        onChange={(e) => updateReactControlAndNotify('particleCount', Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Static code preview block for presentation context */}
            {currentSlide.demoType === 'none' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-4 flex flex-col">
                <div className="bg-slate-950/80 border-b border-slate-800 py-2 px-4 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Спецификация интеграционного интерфейса</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">{currentSlide.codeLanguage}</span>
                </div>
                <div className="p-3 bg-slate-950 font-mono text-[10.5px] text-sky-300 leading-normal max-h-40 overflow-y-auto select-text select-none">
                  <pre className="pr-4">{currentSlide.codeSnippet}</pre>
                </div>
              </div>
            )}

          </div>

          {/* Nav buttons for slide state */}
          <div className="mt-8 pt-6 border-t border-slate-900 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className={`flex items-center gap-1 px-4 py-2 border rounded-xl font-medium text-xs transition-all outline-none ${
                currentSlideIndex === 0 
                  ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                  : 'border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Предыдущий</span>
            </button>

            {/* Dynamic dot indicators */}
            <div className="flex gap-2.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => {
                    setCurrentSlideIndex(i);
                    dispatchBridgeLog('react', 'slide_bullet_click', { targetSlideIndex: i });
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all outline-none ${
                    currentSlideIndex === i 
                      ? 'bg-sky-400 scale-125 shadow-[0_0_6px_rgba(56,189,248,0.4)]' 
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  title={`Перейти к слайду ${i + 1}`}
                ></button>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              className={`flex items-center gap-1 px-4 py-2 rounded-xl font-bold text-xs transition-all outline-none ${
                currentSlideIndex === slides.length - 1 
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-40' 
                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-md shadow-sky-500/10'
              }`}
            >
              <span>Следующий</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Side: High-fidelity simulator panel & telemetry console logs */}
        <div className="w-full xl:w-[52%] bg-slate-950 p-6 xl:p-8 flex flex-col gap-6 overflow-y-auto max-h-[85vh] xl:max-h-[calc(100vh-70px)] min-h-0">
          
          <div className="flex-1 flex flex-col min-h-0 gap-6">
            
            <div className="flex-1 flex flex-col min-h-[350px]">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-sky-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Активное окно внедрения (Real Flutter Web Embed)
                  </span>
                </div>
                {currentSlide.demoType === 'none' && (
                  <span className="text-[10px] text-slate-500 italic font-mono">Flutter уже смонтирован и ждет команд React</span>
                )}
              </div>

              <div className="flex-1 min-h-0 relative">
                <FlutterHost
                  demoType={currentSlide.demoType}
                  reactState={reactState}
                  onFlutterStateChange={handleFlutterStateChange}
                  onDispatchLog={(log) => dispatchBridgeLog(log.sender, log.event, log.payload)}
                />
              </div>
            </div>

            {currentSlide.demoType === 'playground' && (
              <div className="flex flex-col min-h-[420px]">
                <div className="mb-2 flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Интерактивная консоль песочницы разработчика
                  </span>
                </div>

                <div className="flex-1 min-h-0 relative">
                  <Playground
                    onDispatchCustomEvent={(name, payload) => {
                      const delivered = dispatchToEmbeddedFlutter(name, payload);
                      dispatchBridgeLog('react', name, { ...payload, delivered });
                    }}
                    onClearLogs={handleClearLogs}
                    reactState={reactState}
                    setReactState={setReactState}
                  />
                </div>
              </div>
            )}

            {/* Event Console Logs at the lower end represents true system monitoring */}
            <div className="h-64 flex flex-col">
              <BridgeConsole logs={logs} onClear={handleClearLogs} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
