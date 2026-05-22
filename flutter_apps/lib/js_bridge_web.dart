import 'dart:convert';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'js_bridge_stub.dart';

void registerReactBridge(FlutterCommandHandler handler) {
  final callback = ((JSString action, JSString payloadJson) {
    handler(action.toDart, payloadJson.toDart);
  }).toJS;

  globalContext['reactToFlutterBridge'] = callback;
  globalContext['embeddedFlutterBridgeReady'] = true.toJS;
}

void emitToReact(String event, Map<String, Object?> payload) {
  final bridge = globalContext['flutterToReactBridge'];
  if (bridge == null) {
    return;
  }

  (bridge as JSFunction).callAsFunction(
    globalContext,
    event.toJS,
    jsonEncode(payload).toJS,
  );
}

void clearReactBridge() {
  globalContext['reactToFlutterBridge'] = null;
  globalContext['embeddedFlutterBridgeReady'] = false.toJS;
}
