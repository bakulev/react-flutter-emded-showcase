typedef FlutterCommandHandler =
    void Function(String action, String payloadJson);

void registerReactBridge(FlutterCommandHandler handler) {}

void emitToReact(String event, Map<String, Object?> payload) {}

void clearReactBridge() {}
