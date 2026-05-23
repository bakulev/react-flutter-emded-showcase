import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, Radio, RefreshCw } from 'lucide-react';
import { BridgeLog } from '../types';
import {
  DEFAULT_FLUTTER_INSTANCE_ID,
  createBridgeEnvelope,
  ensureFlutterBridgeInstance,
  getFlutterBridgeInstance,
  parseBridgeEnvelope,
} from '../bridgeProtocol';

interface FlutterHostProps {
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

type EngineStatus = 'idle' | 'loading' | 'running' | 'failed';

declare global {
  interface Window {
    runEmbeddedFlutter?: (options: {
      hostElement: HTMLElement;
      instanceId?: string;
      assetBase?: string;
      renderer?: 'canvaskit' | 'skwasm';
    }) => Promise<unknown>;
    __embeddedFlutterBootstrapPromise?: Promise<void>;
  }
}

const FLUTTER_ASSET_BASE = '/flutter_embed/';
const FLUTTER_INSTANCE_ID = DEFAULT_FLUTTER_INSTANCE_ID;
const HOST_STATE_KEYS = [
  'temperature',
  'brightness',
  'fanSpeed',
  'securityLocked',
  'appTheme',
  'ticker',
  'chartType',
  'waveAmplitude',
  'particleCount',
  'frequency',
];

function loadFlutterBootstrap(): Promise<void> {
  if (window.runEmbeddedFlutter) {
    return Promise.resolve();
  }

  if (window.__embeddedFlutterBootstrapPromise) {
    return window.__embeddedFlutterBootstrapPromise;
  }

  window.__embeddedFlutterBootstrapPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-embedded-flutter-bootstrap="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Flutter bootstrap failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `${FLUTTER_ASSET_BASE}flutter_bootstrap.js`;
    script.async = true;
    script.dataset.embeddedFlutterBootstrap = 'true';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Unable to load ${script.src}`)), { once: true });
    document.head.appendChild(script);
  });

  return window.__embeddedFlutterBootstrapPromise;
}

function extractStatePatch(payload: Record<string, any>): Record<string, any> {
  return HOST_STATE_KEYS.reduce<Record<string, any>>((patch, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      patch[key] = payload[key];
    }
    return patch;
  }, {});
}

export default function FlutterHost({
  demoType,
  reactState,
  onFlutterStateChange,
  onDispatchLog
}: FlutterHostProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const latestPayloadRef = useRef({ demoType, reactState });
  const callbacksRef = useRef({ onFlutterStateChange, onDispatchLog });
  const lastSyncedDemoRef = useRef<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastBridgeAt, setLastBridgeAt] = useState<string>('pending');

  latestPayloadRef.current = { demoType, reactState };
  callbacksRef.current = { onFlutterStateChange, onDispatchLog };

  const sendToFlutter = useCallback((type: string, payload: Record<string, any> = {}, log = false) => {
    const instance = getFlutterBridgeInstance(FLUTTER_INSTANCE_ID);
    if (typeof instance?.reactToFlutter !== 'function') {
      return false;
    }

    const envelope = createBridgeEnvelope(FLUTTER_INSTANCE_ID, type, payload);
    instance.lastCommandAt = envelope.createdAt;
    instance.reactToFlutter(JSON.stringify(envelope));
    setLastBridgeAt(new Date(envelope.createdAt).toLocaleTimeString());

    if (log) {
      callbacksRef.current.onDispatchLog({
        sender: 'react',
        event: `bridge:${type}`,
        payload: {
          ...payload,
          _bridge: {
            version: envelope.version,
            requestId: envelope.requestId,
            instanceId: envelope.instanceId,
          },
        },
      });
    }

    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bridgeInstance = ensureFlutterBridgeInstance(FLUTTER_INSTANCE_ID);

    const handleFlutterEnvelope = (envelopeJson: string) => {
      const envelope = parseBridgeEnvelope(envelopeJson);
      if (!envelope) {
        callbacksRef.current.onDispatchLog({
          sender: 'flutter',
          event: 'protocol_error',
          payload: { message: 'Invalid bridge envelope received from Flutter.' },
        });
        return;
      }

      const payload = envelope.payload;
      const instance = getFlutterBridgeInstance(envelope.instanceId);

      if (instance) {
        instance.lastEventAt = envelope.createdAt;
        if (envelope.type === 'engine_initialized') {
          instance.status = 'running';
        }
      }

      callbacksRef.current.onDispatchLog({
        sender: 'flutter',
        event: envelope.type,
        payload: {
          ...payload,
          _bridge: {
            version: envelope.version,
            requestId: envelope.requestId,
            instanceId: envelope.instanceId,
          },
        },
      });

      const patch = extractStatePatch(payload);
      if (Object.keys(patch).length > 0) {
        callbacksRef.current.onFlutterStateChange(patch);
      }
    };

    bridgeInstance.status = 'booting';
    bridgeInstance.hostElementId = 'flutter_host_webassembly_element';
    bridgeInstance.assetBase = FLUTTER_ASSET_BASE;
    bridgeInstance.renderer = 'canvaskit';
    bridgeInstance.receiveFromFlutter = handleFlutterEnvelope;
    bridgeInstance.sendToFlutter = (type, payload = {}) => sendToFlutter(type, payload);
    bridgeInstance.dispose = () => {
      bridgeInstance.status = 'disposed';
      delete bridgeInstance.sendToFlutter;
      delete bridgeInstance.receiveFromFlutter;
      if (window.__reactFlutterEmbeds?.activeInstanceId === FLUTTER_INSTANCE_ID) {
        delete window.__reactFlutterEmbeds.activeInstanceId;
      }
    };

    const startFlutter = async () => {
      const hostElement = hostRef.current;
      if (!hostElement) {
        return;
      }

      try {
        setEngineStatus('loading');
        setLoadError(null);
        await loadFlutterBootstrap();

        if (!window.runEmbeddedFlutter) {
          throw new Error('runEmbeddedFlutter was not registered by flutter_bootstrap.js.');
        }

        await window.runEmbeddedFlutter({
          hostElement,
          instanceId: FLUTTER_INSTANCE_ID,
          assetBase: FLUTTER_ASSET_BASE,
          renderer: 'canvaskit',
        });

        if (cancelled) {
          return;
        }

        bridgeInstance.status = 'running';
        setEngineStatus('running');
        callbacksRef.current.onDispatchLog({
          sender: 'flutter',
          event: 'host_engine_attached',
          payload: {
            runtime: 'Flutter Web',
            renderer: 'CanvasKit',
            hostElement: bridgeInstance.hostElementId,
            instanceId: FLUTTER_INSTANCE_ID,
          },
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setEngineStatus('failed');
        const message = error instanceof Error ? error.message : String(error);
        bridgeInstance.status = 'failed';
        bridgeInstance.error = message;
        setLoadError(message);
      }
    };

    startFlutter();

    return () => {
      cancelled = true;
      bridgeInstance.dispose?.();
    };
  }, [sendToFlutter]);

  useEffect(() => {
    if (engineStatus !== 'running') {
      return;
    }

    if (demoType === 'playground' && lastSyncedDemoRef.current === 'playground') {
      return;
    }

    const payload = latestPayloadRef.current;
    lastSyncedDemoRef.current = demoType;
    sendToFlutter('sync_state', {
      demoType: payload.demoType,
      state: payload.reactState,
    });
  }, [engineStatus, demoType, reactState, sendToFlutter]);

  const handleReboot = () => {
    sendToFlutter('reboot', { source: 'host_frame' }, true);
    sendToFlutter('sync_state', { demoType, state: reactState });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative" id="flutter_window_frame">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 text-xs font-mono select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 block"></span>
          </div>
          <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 font-semibold uppercase tracking-wider border border-emerald-500/20 shrink-0">REAL FLUTTER</span>
          <span className="text-slate-500 shrink-0">|</span>
          <span className="text-slate-300 truncate">/flutter_embed/main.dart.js</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleReboot}
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 text-sky-400 border border-sky-400/20 transition-colors"
            title="Перезапустить состояние Dart-приложения"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reboot Dart</span>
          </button>
          <div className="flex items-center gap-1.5">
            {engineStatus === 'running' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : engineStatus === 'failed' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            )}
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">
              {engineStatus === 'running' ? 'CanvasKit attached' : engineStatus === 'failed' ? 'Load failed' : 'Loading Flutter'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-slate-950">
        <div
          ref={hostRef}
          id="flutter_host_webassembly_element"
          className="absolute inset-0 overflow-hidden"
        />

        {engineStatus !== 'running' && (
          <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            {engineStatus === 'failed' ? (
              <AlertTriangle className="w-10 h-10 text-rose-400 mb-4" />
            ) : (
              <Cpu className="w-12 h-12 text-sky-400 mb-4 animate-pulse" />
            )}
            <span className="text-slate-200 font-semibold text-sm">
              {engineStatus === 'failed' ? 'Не удалось загрузить Flutter Web bundle' : 'Загрузка настоящего Flutter Web приложения...'}
            </span>
            <span className="text-slate-500 font-mono text-[10px] mt-2 max-w-md">
              {loadError ?? 'Ожидаем flutter_bootstrap.js, main.dart.js и CanvasKit assets из /public/flutter_embed'}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-900/80 flex items-center justify-between text-[9px] text-slate-400 font-mono bg-slate-950 select-none">
        <span className="flex items-center gap-1.5 text-slate-500">
          <Radio className="w-3 h-3 text-sky-400" />
          Bridge: __reactFlutterEmbeds[{FLUTTER_INSTANCE_ID}]
        </span>
        <span>Last sync: {lastBridgeAt}</span>
      </div>
    </div>
  );
}
