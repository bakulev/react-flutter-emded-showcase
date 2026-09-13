import { SlideData } from '../types';

export const slides: SlideData[] = [
  {
    id: 1,
    title: "Embedding Flutter apps in React",
    subtitle: "Host-element embedding: an OLE-like experience without the COM/OLE object model",
    category: "intro",
    contentMarkdown: `### An embedded runtime inside a host application

On the desktop, **OLE** allowed interactive documents to be embedded inside parent applications. The web does not provide the same COM object model, compound documents or in-place activation, but it can offer a similar user experience: React contains an area managed by another UI runtime.

This showcase demonstrates **a React host + an embedded Flutter Web runtime + a versioned JSON bridge**.

#### Why use Flutter Web for the embedded application?
1. **Rendering control:** Flutter uses CanvasKit/Skia and its engine assets to draw a controlled graphics surface.
2. **Independent state:** The Flutter application has its own widget tree, state management and rendering pipeline.
3. **Explicit integration:** React manages the host dimensions, navigation and parameters passed into the Flutter surface.
`,
    codeSnippet: `// HTML container for the embedded Flutter application:
<div id="flutter_app_container" class="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
  <!-- Flutter Loader mounts the CanvasKit surface here -->
</div>`,
    codeLanguage: "html",
    demoType: "none"
  },
  {
    id: 2,
    title: "Host architecture and initialization",
    subtitle: "Configuring _flutter.loader and the instance namespace",
    category: "tech",
    contentMarkdown: `### How the rendering surface starts

The **Flutter Loader API** mounts the Flutter application directly inside a React host element.

Flutter resources load asynchronously. React owns the surrounding DOM, while Flutter manages the contents of its assigned surface.

#### Initialization lifecycle
1. Load \`flutter_bootstrap.js\` from \`/flutter_embed/\`.
2. Register the instance in \`window.__reactFlutterEmbeds.instances\`.
3. Configure the renderer: \`canvaskit\` for this JavaScript build, or \`skwasm\` when using a compatible WebAssembly build.
4. Pass \`hostElement\` to the loader so that \`<flutter-view>\` is created inside the designated React \`<div>\`.
`,
    codeSnippet: `// Mount a Flutter Web bundle inside a React component
import React, { useEffect, useRef } from 'react';
import { ensureFlutterBridgeInstance } from './bridgeProtocol';

export function FlutterHost() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureFlutterBridgeInstance('primary-flutter-surface');
    window.runEmbeddedFlutter({
      hostElement: containerRef.current!,
      instanceId: 'primary-flutter-surface',
      assetBase: '/flutter_embed/',
      renderer: 'canvaskit'
    });
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}`,
    codeLanguage: "typescript",
    demoType: "none"
  },
  {
    id: 3,
    title: "Bidirectional Bridge: React ⇄ Flutter",
    subtitle: "UI events, state and commands in versioned JSON envelopes",
    category: "bridge",
    contentMarkdown: `### Interactive demo #1: Smart Home Console

An embedded runtime needs **active state exchange** as well as a visible UI. The smart home console demonstrates this with working controls in both React and Flutter.

#### Try the synchronization
1. The React panel provides temperature and brightness sliders, a fan control and a security lock.
2. The Flutter application renders the corresponding smart home controls and indicators.
3. Changing a React control updates the Flutter application.
4. Interacting with a Flutter control sends an event back to React, updates the host state and adds a message to the bridge logs.
`,
    codeSnippet: `// 1. DART (Flutter): register the bridge in the instance namespace
import 'dart:convert';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

void registerBridge(void Function(Map<String, dynamic>) applyState) {
  final callback = ((JSString envelopeJson) {
    final envelope = jsonDecode(envelopeJson.toDart) as Map<String, dynamic>;
    if (envelope['type'] == 'sync_state') {
      applyState(envelope['payload']['state'] as Map<String, dynamic>);
    }
  }).toJS;
  // instance['reactToFlutter'] = callback;
}

// 2. REACT: synchronize the host state
dispatchToEmbeddedFlutter('sync_state', {
  demoType: 'smarthome',
  state: { temperature: 24, brightness: 70 }
});`,
    codeLanguage: "typescript",
    demoType: "smarthome"
  },
  {
    id: 4,
    title: "Rendering frequent updates",
    subtitle: "A financial widget with a Dart timer and React host controls",
    category: "embed",
    contentMarkdown: `### Interactive demo #2: Financial Flutter Chart

When a chart lives in its own graphics runtime, its frequent visual updates can stay within that runtime.

React provides the host container and controls. Flutter updates the chart inside its surface and sends events back to the host.

#### In this demo
* **React** selects the ticker (Apple, Tesla or Ethereum) and sends simulated trade commands.
* **Flutter** generates demo ticks with a Dart timer, updates the chart and emits \`live_ticker_tick\` events.
* The bridge logs show events from the running Dart application: simulated price ticks, candle selections and demo trade commands. No live market feed or real trading is connected.
`,
    codeSnippet: `// Example command from the host to the Flutter financial view:
dispatchToEmbeddedFlutter('set_chart_ticker', {
  ticker: 'ETH',
  source: 'react_controls'
});

// Flutter responds with live_ticker_tick events through the same envelope bridge.`,
    codeLanguage: "javascript",
    demoType: "financial"
  },
  {
    id: 5,
    title: "Generative animation and custom painting",
    subtitle: "Flutter CustomPainter modules for interactive visuals",
    category: "embed",
    contentMarkdown: `### Interactive demo #3: Creative Canvas

Flutter's \`CustomPainter\` provides a drawing surface for custom geometry and generative animation.

The embedded particle canvas responds to host controls and pointer interaction.

#### Try the interaction
* Adjust the wave amplitude in React to change the particle animation inside Flutter.
* Change the particle count to see the canvas update through the bridge.
* Resize the container: Flutter uses the available layout dimensions to redraw the surface.
`,
    codeSnippet: `// Dart: draw a custom particle animation on Canvas
class ParticlePainter extends CustomPainter {
  final List<Particle> particles;
  final double waveAmplitude;
  ParticlePainter(this.particles, this.waveAmplitude);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.cyan.withOpacity(0.6);
    for (var p in particles) {
      double yOffset = sin(p.x * 0.05) * waveAmplitude;
      canvas.drawCircle(Offset(p.x, p.y + yOffset), p.radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) => true;
}`,
    codeLanguage: "dart",
    demoType: "painter"
  },
  {
    id: 6,
    title: "Interactive bridge playground",
    subtitle: "Send a JSON command and inspect the response",
    category: "bridge",
    contentMarkdown: `### Explore the bridge contract

Use the playground to send a command to the Flutter application and inspect how it is delivered and acknowledged.

#### Try it
1. Choose a prebuilt command or enter a command type and JSON payload.
2. Click **Dispatch Event**.
3. Inspect the bridge logs below. Messages use \`{ type, version, requestId, instanceId, payload }\` envelopes so they can be traced and validated.
`,
    codeSnippet: `// Send custom messages through the bridge
function dispatchToFlutter(type, payload) {
  return dispatchToEmbeddedFlutter(type, payload, 'primary-flutter-surface');
}

dispatchToFlutter('boost_particles', { count: 180 });`,
    codeLanguage: "javascript",
    demoType: "playground"
  },
  {
    id: 7,
    title: "Integration guidance and next steps",
    subtitle: "A checklist for adopting the architecture in enterprise applications",
    category: "summary",
    contentMarkdown: `### When is an embedded React + Flutter runtime useful?

Consider this pattern for portals whose main dashboard and navigation use **React (or Vue/Svelte)** and which need specialized interactive modules:
* GIS maps or equipment layout diagrams.
* CAD/CAM previews.
* Existing Flutter widgets from Android/iOS applications that can also run on the web.

#### Integration checklist
1. **Bundle size:** Load Flutter on demand when the relevant page or module opens to reduce initial loading work.
2. **WebAssembly:** Evaluate a Flutter WASM build where supported, and measure its performance with your actual workload.
3. **Event contract:** Use versioned JSON envelopes, \`requestId\`, an instance namespace and \`ready/error/dispose\` lifecycle events.
4. **Measured performance:** Validate latency, dropped updates and memory usage before making production performance claims.
`,
    codeSnippet: `// Build the embedded Flutter application for production:
cd flutter_apps
../.flutter-sdk/bin/flutter build web --release \
  --pwa-strategy=none \
  --base-href=/flutter_embed/ \
  -o ../public/flutter_embed`,
    codeLanguage: "bash",
    demoType: "none"
  }
];
export const categories = [
  { id: 'intro', label: 'Introduction', icon: 'Sparkles' },
  { id: 'tech', label: 'Initialization', icon: 'Cpu' },
  { id: 'bridge', label: 'Event bridge', icon: 'Radio' },
  { id: 'embed', label: 'Live applications', icon: 'Layers' },
  { id: 'summary', label: 'Summary', icon: 'CheckCircle' }
];
