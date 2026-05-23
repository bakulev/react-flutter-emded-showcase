export const BRIDGE_PROTOCOL_VERSION = 1 as const;
export const DEFAULT_FLUTTER_INSTANCE_ID = 'primary-flutter-surface';

export type BridgeProtocolVersion = typeof BRIDGE_PROTOCOL_VERSION;
export type FlutterEmbedStatus = 'idle' | 'booting' | 'ready' | 'running' | 'failed' | 'disposed';

export interface BridgeEnvelope<TPayload = Record<string, any>> {
  type: string;
  version: BridgeProtocolVersion;
  requestId: string;
  instanceId: string;
  createdAt: string;
  payload: TPayload;
}

export interface EmbeddedFlutterInstance {
  id: string;
  status: FlutterEmbedStatus;
  hostElementId?: string;
  assetBase?: string;
  renderer?: 'canvaskit' | 'skwasm';
  lastCommandAt?: string;
  lastEventAt?: string;
  error?: string;
  sendToFlutter?: (type: string, payload?: Record<string, any>) => boolean;
  reactToFlutter?: (envelopeJson: string) => void;
  receiveFromFlutter?: (envelopeJson: string) => void;
  dispose?: () => void;
}

export interface EmbeddedFlutterNamespace {
  activeInstanceId?: string;
  protocolVersion: BridgeProtocolVersion;
  instances: Record<string, EmbeddedFlutterInstance>;
}

declare global {
  interface Window {
    __reactFlutterEmbeds?: EmbeddedFlutterNamespace;
  }
}

export function ensureFlutterBridgeNamespace(): EmbeddedFlutterNamespace {
  if (!window.__reactFlutterEmbeds) {
    window.__reactFlutterEmbeds = {
      protocolVersion: BRIDGE_PROTOCOL_VERSION,
      instances: {},
    };
  }

  return window.__reactFlutterEmbeds;
}

export function ensureFlutterBridgeInstance(instanceId = DEFAULT_FLUTTER_INSTANCE_ID): EmbeddedFlutterInstance {
  const namespace = ensureFlutterBridgeNamespace();
  namespace.activeInstanceId = instanceId;

  if (!namespace.instances[instanceId]) {
    namespace.instances[instanceId] = {
      id: instanceId,
      status: 'idle',
    };
  }

  return namespace.instances[instanceId];
}

export function getFlutterBridgeInstance(instanceId = DEFAULT_FLUTTER_INSTANCE_ID): EmbeddedFlutterInstance | null {
  return window.__reactFlutterEmbeds?.instances[instanceId] ?? null;
}

export function createBridgeEnvelope<TPayload extends Record<string, any>>(
  instanceId: string,
  type: string,
  payload: TPayload = {} as TPayload,
): BridgeEnvelope<TPayload> {
  return {
    type,
    version: BRIDGE_PROTOCOL_VERSION,
    requestId: `${instanceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    instanceId,
    createdAt: new Date().toISOString(),
    payload,
  };
}

export function parseBridgeEnvelope(rawJson: string): BridgeEnvelope | null {
  try {
    const parsed = JSON.parse(rawJson);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.type === 'string' &&
      parsed.version === BRIDGE_PROTOCOL_VERSION &&
      typeof parsed.instanceId === 'string' &&
      parsed.payload &&
      typeof parsed.payload === 'object'
    ) {
      return parsed as BridgeEnvelope;
    }
    return null;
  } catch {
    return null;
  }
}

export function dispatchToEmbeddedFlutter(
  type: string,
  payload: Record<string, any> = {},
  instanceId = DEFAULT_FLUTTER_INSTANCE_ID,
): boolean {
  const instance = getFlutterBridgeInstance(instanceId);
  if (typeof instance?.sendToFlutter !== 'function') {
    return false;
  }

  return instance.sendToFlutter(type, payload);
}
