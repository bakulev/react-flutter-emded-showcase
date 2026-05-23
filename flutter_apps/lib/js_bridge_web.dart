import 'dart:convert';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'js_bridge_stub.dart';

const _bridgeProtocolVersion = 1;
const _defaultInstanceId = 'primary-flutter-surface';

String? _registeredInstanceId;

class BridgeEnvelope {
  const BridgeEnvelope({
    required this.type,
    required this.requestId,
    required this.instanceId,
    required this.payload,
    this.createdAt,
  });

  factory BridgeEnvelope.fromHostJson(String source) {
    final decoded = jsonDecode(source);
    if (decoded is Map &&
        decoded['version'] == _bridgeProtocolVersion &&
        decoded['type'] is String &&
        decoded['instanceId'] is String) {
      final payload = decoded['payload'];
      return BridgeEnvelope(
        type: decoded['type'] as String,
        requestId: decoded['requestId']?.toString() ?? _requestId('host'),
        instanceId: decoded['instanceId'] as String,
        payload: payload is Map ? Map<String, Object?>.from(payload) : {'value': payload},
        createdAt: DateTime.tryParse(decoded['createdAt']?.toString() ?? ''),
      );
    }

    throw const FormatException('Invalid bridge envelope.');
  }

  final String type;
  final String requestId;
  final String instanceId;
  final Map<String, Object?> payload;
  final DateTime? createdAt;

  Map<String, Object?> toJson() => {
        'type': type,
        'version': _bridgeProtocolVersion,
        'requestId': requestId,
        'instanceId': instanceId,
        'createdAt': (createdAt ?? DateTime.now().toUtc()).toIso8601String(),
        'payload': payload,
      };

  String encode() => jsonEncode(toJson());
}

void registerReactBridge(FlutterCommandHandler handler) {
  final instance = _currentInstance();
  final instanceId = _registeredInstanceId ?? _defaultInstanceId;

  final instanceCallback = ((JSString envelopeJson) {
    try {
      final envelope = BridgeEnvelope.fromHostJson(envelopeJson.toDart);
      _registeredInstanceId = envelope.instanceId;
      handler(envelope.type, jsonEncode(envelope.payload));
    } catch (_) {
      emitToReact('protocol_error', {
        'message': 'Invalid bridge envelope received from React.',
      });
    }
  }).toJS;

  if (instance != null) {
    instance['reactToFlutter'] = instanceCallback;
    instance['status'] = 'ready'.toJS;
  }

  _registeredInstanceId = instanceId;
}

void emitToReact(String event, Map<String, Object?> payload) {
  final instanceId = _registeredInstanceId ?? _defaultInstanceId;
  final envelope = BridgeEnvelope(
    type: event,
    requestId: _requestId('flutter'),
    instanceId: instanceId,
    payload: payload,
  );
  final envelopeJson = envelope.encode();

  final instance = _currentInstance(instanceId);
  final receiver = instance?['receiveFromFlutter'];
  if (receiver != null) {
    (receiver as JSFunction).callAsFunction(
      instance,
      envelopeJson.toJS,
    );
    return;
  }

  return;
}

void clearReactBridge() {
  final instance = _currentInstance();
  if (instance != null) {
    instance['reactToFlutter'] = null;
    instance['status'] = 'disposed'.toJS;
  }
}

JSObject? _currentInstance([String? preferredInstanceId]) {
  final namespaceValue = globalContext['__reactFlutterEmbeds'];
  if (namespaceValue == null) {
    return null;
  }

  final namespace = namespaceValue as JSObject;
  final instancesValue = namespace['instances'];
  if (instancesValue == null) {
    return null;
  }

  final instanceId =
      preferredInstanceId ?? _registeredInstanceId ?? _stringValue(namespace['activeInstanceId']) ?? _defaultInstanceId;
  _registeredInstanceId = instanceId;

  final instanceValue = (instancesValue as JSObject)[instanceId];
  if (instanceValue == null) {
    return null;
  }

  return instanceValue as JSObject;
}

String? _stringValue(Object? value) {
  if (value == null) {
    return null;
  }

  try {
    return (value as JSString).toDart;
  } catch (_) {
    return value.toString();
  }
}

String _requestId(String source) {
  return '$source-${DateTime.now().microsecondsSinceEpoch}';
}
