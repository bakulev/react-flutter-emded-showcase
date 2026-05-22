<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# React + Real Flutter Web Embed Showcase

This demo embeds a real Flutter Web application inside a React/Vite presentation. The Flutter bundle is built from [flutter_apps](flutter_apps) and served by Vite from [public/flutter_embed](public/flutter_embed).

View your app in AI Studio: https://ai.studio/apps/a852c326-2fce-48fd-9f1e-33f35e40267c

## Run Locally

**Prerequisites:** Node.js and Flutter. For this workspace, Flutter stable was downloaded locally into `.flutter-sdk`.


1. Install dependencies:
   `npm install`
2. Build the Flutter Web bundle:
   `npm run build:flutter`
3. Run the React host:
   `npm run dev`

The React host calls `window.reactToFlutterBridge(action, payloadJson)` and the Dart app replies through `window.flutterToReactBridge(event, payloadJson)`, so the interaction shown in the console is produced by a real Dart isolate and Flutter widget tree.

For a production build, run:
`npm run build`
