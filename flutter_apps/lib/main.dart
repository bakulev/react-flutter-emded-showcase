import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'js_bridge.dart';

void main() {
  runApp(const EmbeddedFlutterApp());
}

const _initialPrices = <String, double>{
  'AAPL': 184.22,
  'TSLA': 174.50,
  'BTC': 68245.10,
  'ETH': 3480.95,
};

class EmbeddedFlutterApp extends StatelessWidget {
  const EmbeddedFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Embedded Flutter Apps',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF38BDF8),
          brightness: Brightness.dark,
        ),
        fontFamily: 'Roboto',
        useMaterial3: true,
      ),
      home: const EmbeddedFlutterSurface(),
    );
  }
}

class EmbeddedFlutterSurface extends StatefulWidget {
  const EmbeddedFlutterSurface({super.key});

  @override
  State<EmbeddedFlutterSurface> createState() => _EmbeddedFlutterSurfaceState();
}

class _EmbeddedFlutterSurfaceState extends State<EmbeddedFlutterSurface>
    with SingleTickerProviderStateMixin {
  final _random = math.Random();
  late final AnimationController _animationController;
  Timer? _marketTimer;

  String _demoType = 'none';
  int _temperature = 21;
  int _brightness = 65;
  int _fanSpeed = 1;
  bool _securityLocked = false;
  String _appTheme = 'dark';
  String _ticker = 'AAPL';
  String _chartType = 'candle';
  int _waveAmplitude = 35;
  int _particleCount = 80;
  String _frequency = 'mid';

  double _tickerPrice = _initialPrices['AAPL']!;
  int _marketTick = 0;
  List<Candle> _candles = const [
    Candle(40, 65, 30, 55),
    Candle(55, 80, 45, 75),
    Candle(75, 78, 60, 62),
    Candle(62, 70, 50, 55),
    Candle(55, 90, 52, 85),
    Candle(85, 95, 80, 92),
    Candle(92, 94, 65, 70),
    Candle(70, 85, 68, 80),
    Candle(80, 84, 60, 62),
    Candle(62, 95, 58, 90),
  ];
  late List<Particle> _particles;

  Color get _accentColor {
    return switch (_appTheme) {
      'light' => const Color(0xFF0EA5E9),
      'neon' => const Color(0xFFEC4899),
      _ => const Color(0xFF38BDF8),
    };
  }

  @override
  void initState() {
    super.initState();
    _particles = _spawnParticles(_particleCount);
    _animationController =
        AnimationController(vsync: this, duration: const Duration(seconds: 2))
          ..addListener(_onFrame)
          ..repeat();
    _marketTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => _onMarketTimer(),
    );
    registerReactBridge(_handleReactCommand);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _emit('engine_initialized', {
        'renderer': 'CanvasKit',
        'runtime': 'Flutter Web 3.44 / Dart 3.12',
        'bridge': 'window.reactToFlutterBridge',
      });
    });
  }

  @override
  void dispose() {
    _marketTimer?.cancel();
    _animationController.dispose();
    clearReactBridge();
    super.dispose();
  }

  void _handleReactCommand(String action, String payloadJson) {
    final payload = _decodePayload(payloadJson);

    if (!mounted) {
      return;
    }

    setState(() {
      switch (action) {
        case 'sync_state':
          _demoType = _stringValue(payload['demoType'], _demoType);
          final state = payload['state'];
          if (state is Map) {
            _applyHostState(Map<String, Object?>.from(state));
          } else {
            _applyHostState(payload);
          }
        case 'select_demo':
          _demoType = _stringValue(payload['demoType'], _demoType);
        case 'adjust_thermostat':
          _temperature = _intValue(payload['celsius'], _temperature);
        case 'boost_particles':
          _particleCount = _intValue(
            payload['count'],
            _particleCount,
          ).clamp(10, 220).toInt();
          _particles = _spawnParticles(_particleCount);
          _demoType = 'painter';
        case 'update_skin_color':
          _appTheme = _stringValue(payload['theme'], _appTheme);
        case 'set_chart_ticker':
          _setTicker(_stringValue(payload['ticker'], _ticker));
          _demoType = 'financial';
        case 'reboot':
          _resetAllState();
        default:
          _applyHostState(payload);
      }
    });

    _emit('bridge_command_applied', {
      'action': action,
      'demoType': _demoType,
      'stateChecksum': _stateChecksum,
    });
  }

  Map<String, Object?> _decodePayload(String payloadJson) {
    try {
      final decoded = jsonDecode(payloadJson);
      if (decoded is Map) {
        return Map<String, Object?>.from(decoded);
      }
      return {'value': decoded};
    } catch (_) {
      return {'raw': payloadJson};
    }
  }

  void _applyHostState(Map<String, Object?> state) {
    _temperature = _intValue(
      state['temperature'],
      _temperature,
    ).clamp(16, 30).toInt();
    _brightness = _intValue(
      state['brightness'],
      _brightness,
    ).clamp(0, 100).toInt();
    _fanSpeed = _intValue(state['fanSpeed'], _fanSpeed).clamp(0, 3).toInt();
    _securityLocked = _boolValue(state['securityLocked'], _securityLocked);
    _appTheme = _stringValue(state['appTheme'], _appTheme);
    _chartType = _stringValue(state['chartType'], _chartType);
    _waveAmplitude = _intValue(
      state['waveAmplitude'],
      _waveAmplitude,
    ).clamp(5, 80).toInt();
    final nextParticleCount = _intValue(
      state['particleCount'],
      _particleCount,
    ).clamp(10, 220).toInt();
    if (nextParticleCount != _particleCount) {
      _particleCount = nextParticleCount;
      _particles = _spawnParticles(_particleCount);
    }
    _frequency = _stringValue(state['frequency'], _frequency);
    _setTicker(_stringValue(state['ticker'], _ticker));
  }

  void _resetAllState() {
    _temperature = 21;
    _brightness = 65;
    _fanSpeed = 1;
    _securityLocked = false;
    _appTheme = 'dark';
    _setTicker('AAPL');
    _chartType = 'candle';
    _waveAmplitude = 35;
    _particleCount = 80;
    _frequency = 'mid';
    _particles = _spawnParticles(_particleCount);
  }

  void _setTicker(String ticker) {
    if (!_initialPrices.containsKey(ticker)) {
      return;
    }
    if (_ticker == ticker) {
      return;
    }
    _ticker = ticker;
    _tickerPrice = _initialPrices[ticker]!;
    _candles = _randomCandles();
  }

  int _intValue(Object? value, int fallback) {
    if (value is num) {
      return value.round();
    }
    return int.tryParse(value?.toString() ?? '') ?? fallback;
  }

  bool _boolValue(Object? value, bool fallback) {
    if (value is bool) {
      return value;
    }
    if (value is String) {
      return value.toLowerCase() == 'true';
    }
    return fallback;
  }

  String _stringValue(Object? value, String fallback) {
    final text = value?.toString();
    return text == null || text.isEmpty ? fallback : text;
  }

  String get _stateChecksum {
    return '${_demoType}_${_temperature}_${_brightness}_${_fanSpeed}_${_ticker}_$_particleCount';
  }

  void _emit(String event, Map<String, Object?> payload) {
    emitToReact(event, payload);
  }

  void _emitStatePatch(String widgetName, Map<String, Object?> patch) {
    setState(() => _applyHostState(patch));
    _emit('widget_state_changed', {'widget': widgetName, ...patch});
  }

  void _onFrame() {
    if (_demoType != 'painter' || !mounted) {
      return;
    }

    final amplitude = _waveAmplitude / 80;
    for (final particle in _particles) {
      particle.x += particle.vx;
      particle.y +=
          particle.vy +
          math.sin(
                (particle.x * 0.03) + _animationController.value * math.pi * 2,
              ) *
              amplitude;
      if (particle.x < 0 || particle.x > 1) {
        particle.vx *= -1;
      }
      if (particle.y < 0 || particle.y > 1) {
        particle.vy *= -1;
      }
      particle.x = particle.x.clamp(0, 1).toDouble();
      particle.y = particle.y.clamp(0, 1).toDouble();
    }
    setState(() {});
  }

  void _onMarketTimer() {
    if (_demoType != 'financial' || !mounted) {
      return;
    }

    _marketTick += 1;
    final threshold = switch (_frequency) {
      'high' => 1,
      'low' => 10,
      _ => 4,
    };

    if (_marketTick % threshold != 0) {
      return;
    }

    setState(_advanceMarket);
    _emit('live_ticker_tick', {
      'ticker': _ticker,
      'price': _tickerPrice.toStringAsFixed(2),
      'frequency': _frequency,
    });
  }

  void _advanceMarket() {
    final drift = (_random.nextDouble() - 0.49) * 0.002;
    _tickerPrice = double.parse(
      (_tickerPrice * (1 + drift)).toStringAsFixed(2),
    );

    final candles = [..._candles];
    final last = candles.last;
    final close = (last.close + (_random.nextDouble() - 0.5) * 8)
        .clamp(15, 95)
        .toDouble();
    candles[candles.length - 1] = Candle(
      last.open,
      math.max(math.max(last.high, close), last.open),
      math.min(math.min(last.low, close), last.open),
      close,
    );

    if (_random.nextDouble() > 0.82) {
      final open = close;
      final nextClose = (open + (_random.nextDouble() - 0.5) * 12)
          .clamp(15, 95)
          .toDouble();
      candles
        ..removeAt(0)
        ..add(
          Candle(
            open,
            math.max(open, nextClose) + _random.nextDouble() * 6,
            math.min(open, nextClose) - _random.nextDouble() * 6,
            nextClose,
          ),
        );
    }

    _candles = candles;
  }

  List<Candle> _randomCandles() {
    return List.generate(10, (index) {
      final open = 35 + _random.nextDouble() * 45;
      final close = (open + (_random.nextDouble() - 0.5) * 32)
          .clamp(15, 95)
          .toDouble();
      return Candle(
        open,
        math.max(open, close) + _random.nextDouble() * 12,
        math.min(open, close) - _random.nextDouble() * 10,
        close,
      );
    });
  }

  List<Particle> _spawnParticles(int count) {
    return List.generate(count, (index) {
      final hue = index / math.max(count, 1);
      final color = HSVColor.fromAHSV(
        0.86,
        185 + hue * 145,
        0.65,
        0.95,
      ).toColor();
      return Particle(
        x: _random.nextDouble(),
        y: 0.2 + _random.nextDouble() * 0.6,
        vx: (_random.nextDouble() - 0.5) * 0.006,
        vy: (_random.nextDouble() - 0.5) * 0.006,
        radius: 2 + _random.nextDouble() * 4,
        color: color,
      );
    });
  }

  void _addParticleBurst(Offset localPosition, Size size) {
    final origin = Offset(
      (localPosition.dx / size.width).clamp(0, 1).toDouble(),
      (localPosition.dy / size.height).clamp(0, 1).toDouble(),
    );
    final additions = List.generate(16, (index) {
      final angle = (math.pi * 2 / 16) * index;
      return Particle(
        x: origin.dx,
        y: origin.dy,
        vx: math.cos(angle) * (0.004 + _random.nextDouble() * 0.007),
        vy: math.sin(angle) * (0.004 + _random.nextDouble() * 0.007),
        radius: 2.5 + _random.nextDouble() * 5,
        color: index.isEven ? _accentColor : const Color(0xFF34D399),
      );
    });
    setState(() {
      _particles = [
        ..._particles.skip(math.min(additions.length, _particles.length)),
        ...additions,
      ];
      _particleCount = _particles.length;
    });
    _emit('canvas_interaction_tap', {
      'x': localPosition.dx.toStringAsFixed(1),
      'y': localPosition.dy.toStringAsFixed(1),
      'particleCount': _particleCount,
    });
  }

  @override
  Widget build(BuildContext context) {
    final background = _appTheme == 'light'
        ? const Color(0xFFF8FAFC)
        : const Color(0xFF020617);
    final foreground = _appTheme == 'light'
        ? const Color(0xFF0F172A)
        : const Color(0xFFE2E8F0);

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: Container(
          color: background,
          child: Column(
            children: [
              _TopStatusStrip(
                demoType: _demoType,
                accentColor: _accentColor,
                foreground: foreground,
              ),
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 240),
                  child: Padding(
                    key: ValueKey(_demoType),
                    padding: const EdgeInsets.all(14),
                    child: _buildDemoView(foreground),
                  ),
                ),
              ),
              _FooterStrip(
                accentColor: _accentColor,
                foreground: foreground,
                stateChecksum: _stateChecksum,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDemoView(Color foreground) {
    return switch (_demoType) {
      'smarthome' => _SmartHomeView(
        temperature: _temperature,
        brightness: _brightness,
        fanSpeed: _fanSpeed,
        securityLocked: _securityLocked,
        accentColor: _accentColor,
        foreground: foreground,
        onFanSpeedChanged: (speed) =>
            _emitStatePatch('ACFanController', {'fanSpeed': speed}),
        onBrightnessChanged: (value) =>
            _emitStatePatch('LightIntensityController', {'brightness': value}),
        onLockChanged: () => _emitStatePatch('SecurityLockToggle', {
          'securityLocked': !_securityLocked,
        }),
      ),
      'financial' => _FinancialView(
        ticker: _ticker,
        tickerPrice: _tickerPrice,
        candles: _candles,
        chartType: _chartType,
        frequency: _frequency,
        accentColor: _accentColor,
        foreground: foreground,
        onOrder: (side) => _emit('order_intent', {
          'side': side,
          'ticker': _ticker,
          'price': _tickerPrice.toStringAsFixed(2),
        }),
        onCandleTap: (index) => _emit('chart_candle_selected', {
          'ticker': _ticker,
          'index': index,
          'close': _candles[index].close.toStringAsFixed(2),
        }),
      ),
      'painter' => _PainterView(
        animation: _animationController,
        particles: _particles,
        waveAmplitude: _waveAmplitude,
        particleCount: _particleCount,
        accentColor: _accentColor,
        foreground: foreground,
        onTap: _addParticleBurst,
      ),
      'playground' => _BridgePlaygroundView(
        accentColor: _accentColor,
        foreground: foreground,
        demoType: _demoType,
        stateChecksum: _stateChecksum,
      ),
      _ => _IdleView(accentColor: _accentColor, foreground: foreground),
    };
  }
}

class _TopStatusStrip extends StatelessWidget {
  const _TopStatusStrip({
    required this.demoType,
    required this.accentColor,
    required this.foreground,
  });

  final String demoType;
  final Color accentColor;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
              color: const Color(0xFF10B981),
              borderRadius: BorderRadius.circular(9),
              boxShadow: const [
                BoxShadow(color: Color(0x8010B981), blurRadius: 9),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            'REAL FLUTTER WEB',
            style: TextStyle(
              color: accentColor,
              fontWeight: FontWeight.w800,
              fontSize: 11,
              letterSpacing: 0,
            ),
          ),
          const SizedBox(width: 10),
          Flexible(
            child: Text(
              'CanvasKit hostElement embed | active: $demoType',
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: foreground.withValues(alpha: 0.72),
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FooterStrip extends StatelessWidget {
  const _FooterStrip({
    required this.accentColor,
    required this.foreground,
    required this.stateChecksum,
  });

  final Color accentColor;
  final Color foreground;
  final String stateChecksum;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: const BoxDecoration(
        color: Color(0xFF020617),
        border: Border(top: BorderSide(color: Color(0xFF0F172A))),
      ),
      child: Row(
        children: [
          Icon(Icons.memory_rounded, color: accentColor, size: 14),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Dart isolate state: $stateChecksum',
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: foreground.withValues(alpha: 0.62),
                fontSize: 10,
              ),
            ),
          ),
          Text(
            '60 FPS',
            style: TextStyle(
              color: accentColor,
              fontWeight: FontWeight.w700,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

class _IdleView extends StatelessWidget {
  const _IdleView({required this.accentColor, required this.foreground});

  final Color accentColor;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.flutter_dash_rounded, color: accentColor, size: 56),
          const SizedBox(height: 16),
          Text(
            'Flutter app is mounted',
            style: TextStyle(
              color: foreground,
              fontWeight: FontWeight.w800,
              fontSize: 20,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: 340,
            child: Text(
              'React controls will activate a real Dart widget tree in this host element.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: foreground.withValues(alpha: 0.64),
                fontSize: 13,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SmartHomeView extends StatelessWidget {
  const _SmartHomeView({
    required this.temperature,
    required this.brightness,
    required this.fanSpeed,
    required this.securityLocked,
    required this.accentColor,
    required this.foreground,
    required this.onFanSpeedChanged,
    required this.onBrightnessChanged,
    required this.onLockChanged,
  });

  final int temperature;
  final int brightness;
  final int fanSpeed;
  final bool securityLocked;
  final Color accentColor;
  final Color foreground;
  final ValueChanged<int> onFanSpeedChanged;
  final ValueChanged<int> onBrightnessChanged;
  final VoidCallback onLockChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: _panelDecoration(),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 148,
                      height: 148,
                      child: CircularProgressIndicator(
                        value: (temperature - 16) / 14,
                        strokeWidth: 12,
                        color: accentColor,
                        backgroundColor: const Color(0xFF1E293B),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$temperature°C',
                          style: TextStyle(
                            color: foreground,
                            fontWeight: FontWeight.w900,
                            fontSize: 34,
                          ),
                        ),
                        Text(
                          'climate sync',
                          style: TextStyle(
                            color: foreground.withValues(alpha: 0.55),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  'Влажность 48% | HVAC контур активен',
                  style: TextStyle(
                    color: foreground.withValues(alpha: 0.66),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _ControlPanel(
                title: 'Вентиляция',
                icon: Icons.air_rounded,
                accentColor: accentColor,
                foreground: foreground,
                child: Row(
                  children: List.generate(4, (speed) {
                    final active = fanSpeed == speed;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: FilledButton(
                          onPressed: () => onFanSpeedChanged(speed),
                          style: FilledButton.styleFrom(
                            backgroundColor: active
                                ? accentColor
                                : const Color(0xFF1E293B),
                            foregroundColor: active
                                ? const Color(0xFF020617)
                                : foreground.withValues(alpha: 0.7),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                          child: Text('$speed'),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _ControlPanel(
                title: 'Замок',
                icon: securityLocked
                    ? Icons.lock_rounded
                    : Icons.lock_open_rounded,
                accentColor: securityLocked
                    ? const Color(0xFF34D399)
                    : const Color(0xFFFB7185),
                foreground: foreground,
                child: FilledButton.icon(
                  onPressed: onLockChanged,
                  icon: Icon(
                    securityLocked
                        ? Icons.lock_open_rounded
                        : Icons.lock_rounded,
                    size: 16,
                  ),
                  label: Text(securityLocked ? 'Unlock' : 'Lock'),
                  style: FilledButton.styleFrom(
                    backgroundColor: securityLocked
                        ? const Color(0xFF064E3B)
                        : const Color(0xFF881337),
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _ControlPanel(
          title: 'Напольная лампа',
          icon: Icons.lightbulb_rounded,
          accentColor: const Color(0xFFFBBF24),
          foreground: foreground,
          child: Row(
            children: [
              Expanded(
                child: Slider(
                  value: brightness.toDouble(),
                  min: 0,
                  max: 100,
                  activeColor: const Color(0xFFFBBF24),
                  onChanged: (value) => onBrightnessChanged(value.round()),
                ),
              ),
              SizedBox(
                width: 44,
                child: Text(
                  '$brightness%',
                  textAlign: TextAlign.end,
                  style: TextStyle(
                    color: foreground,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FinancialView extends StatelessWidget {
  const _FinancialView({
    required this.ticker,
    required this.tickerPrice,
    required this.candles,
    required this.chartType,
    required this.frequency,
    required this.accentColor,
    required this.foreground,
    required this.onOrder,
    required this.onCandleTap,
  });

  final String ticker;
  final double tickerPrice;
  final List<Candle> candles;
  final String chartType;
  final String frequency;
  final Color accentColor;
  final Color foreground;
  final ValueChanged<String> onOrder;
  final ValueChanged<int> onCandleTap;

  @override
  Widget build(BuildContext context) {
    final base = _initialPrices[ticker] ?? tickerPrice;
    final change = ((tickerPrice - base) / base * 100) + 1.65;
    final positive = change >= 0;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: _panelDecoration(),
          child: Row(
            children: [
              Icon(Icons.trending_up_rounded, color: accentColor, size: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$ticker / USD',
                      style: TextStyle(
                        color: foreground,
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                      ),
                    ),
                    Text(
                      'frequency: $frequency | renderer: CustomPainter',
                      style: TextStyle(
                        color: foreground.withValues(alpha: 0.56),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${tickerPrice.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: foreground,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                    ),
                  ),
                  Text(
                    '${positive ? '+' : ''}${change.toStringAsFixed(2)}%',
                    style: TextStyle(
                      color: positive
                          ? const Color(0xFF34D399)
                          : const Color(0xFFFB7185),
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: GestureDetector(
            onTapUp: (details) {
              final box = context.findRenderObject() as RenderBox?;
              if (box == null || candles.isEmpty) {
                return;
              }
              final width = box.size.width;
              final index =
                  ((details.localPosition.dx / width) * candles.length)
                      .floor()
                      .clamp(0, candles.length - 1)
                      .toInt();
              onCandleTap(index);
            },
            child: Container(
              width: double.infinity,
              decoration: _panelDecoration(),
              padding: const EdgeInsets.all(12),
              child: CustomPaint(
                painter: FinancialChartPainter(
                  candles: candles,
                  chartType: chartType,
                  accentColor: accentColor,
                ),
                child: const SizedBox.expand(),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () => onOrder('buy'),
                icon: const Icon(Icons.add_chart_rounded),
                label: const Text('Buy'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: const Color(0xFF020617),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton.icon(
                onPressed: () => onOrder('sell'),
                icon: const Icon(Icons.show_chart_rounded),
                label: const Text('Sell'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF7F1D1D),
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _PainterView extends StatelessWidget {
  const _PainterView({
    required this.animation,
    required this.particles,
    required this.waveAmplitude,
    required this.particleCount,
    required this.accentColor,
    required this.foreground,
    required this.onTap,
  });

  final Animation<double> animation;
  final List<Particle> particles;
  final int waveAmplitude;
  final int particleCount;
  final Color accentColor;
  final Color foreground;
  final void Function(Offset localPosition, Size size) onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: _panelDecoration(),
          child: Row(
            children: [
              Icon(Icons.auto_awesome_rounded, color: accentColor),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'CustomPainter physics | amplitude ${waveAmplitude}px | particles $particleCount',
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: foreground,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final size = Size(constraints.maxWidth, constraints.maxHeight);
              return GestureDetector(
                onTapDown: (details) => onTap(details.localPosition, size),
                child: Container(
                  decoration: _panelDecoration(),
                  child: CustomPaint(
                    painter: ParticleFieldPainter(
                      particles: particles,
                      waveAmplitude: waveAmplitude,
                      animationValue: animation.value,
                      accentColor: accentColor,
                    ),
                    child: const SizedBox.expand(),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _BridgePlaygroundView extends StatelessWidget {
  const _BridgePlaygroundView({
    required this.accentColor,
    required this.foreground,
    required this.demoType,
    required this.stateChecksum,
  });

  final Color accentColor;
  final Color foreground;
  final String demoType;
  final String stateChecksum;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: _panelDecoration(),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.hub_rounded, color: accentColor, size: 48),
          const SizedBox(height: 14),
          Text(
            'Interop bridge is live',
            style: TextStyle(
              color: foreground,
              fontWeight: FontWeight.w900,
              fontSize: 21,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Commands from the React playground are handled inside this Dart isolate.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: foreground.withValues(alpha: 0.64),
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 18),
          _MetricLine(
            label: 'window.reactToFlutterBridge',
            value: 'registered',
            color: const Color(0xFF34D399),
            foreground: foreground,
          ),
          _MetricLine(
            label: 'active demo',
            value: demoType,
            color: accentColor,
            foreground: foreground,
          ),
          _MetricLine(
            label: 'state checksum',
            value: stateChecksum,
            color: const Color(0xFFFBBF24),
            foreground: foreground,
          ),
        ],
      ),
    );
  }
}

class _ControlPanel extends StatelessWidget {
  const _ControlPanel({
    required this.title,
    required this.icon,
    required this.accentColor,
    required this.foreground,
    required this.child,
  });

  final String title;
  final IconData icon;
  final Color accentColor;
  final Color foreground;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(icon, color: accentColor, size: 18),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  title,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: foreground,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _MetricLine extends StatelessWidget {
  const _MetricLine({
    required this.label,
    required this.value,
    required this.color,
    required this.foreground,
  });

  final String label;
  final String value;
  final Color color;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                color: foreground.withValues(alpha: 0.54),
                fontSize: 11,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w800,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

BoxDecoration _panelDecoration() {
  return BoxDecoration(
    color: const Color(0xFF0F172A),
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: const Color(0xFF1E293B)),
    boxShadow: const [
      BoxShadow(color: Color(0x66000000), blurRadius: 16, offset: Offset(0, 8)),
    ],
  );
}

class Candle {
  const Candle(this.open, this.high, this.low, this.close);

  final double open;
  final double high;
  final double low;
  final double close;
}

class Particle {
  Particle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.radius,
    required this.color,
  });

  double x;
  double y;
  double vx;
  double vy;
  double radius;
  Color color;
}

class FinancialChartPainter extends CustomPainter {
  FinancialChartPainter({
    required this.candles,
    required this.chartType,
    required this.accentColor,
  });

  final List<Candle> candles;
  final String chartType;
  final Color accentColor;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = const Color(0xFF334155).withValues(alpha: 0.35)
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    if (chartType == 'line') {
      _paintLine(canvas, size);
      return;
    }

    final slot = size.width / math.max(candles.length, 1);
    for (var i = 0; i < candles.length; i++) {
      final candle = candles[i];
      final x = slot * i + slot / 2;
      final up = candle.close >= candle.open;
      final color = up ? const Color(0xFF34D399) : const Color(0xFFFB7185);
      final paint = Paint()
        ..color = color
        ..strokeWidth = 2;
      final highY = size.height * (1 - candle.high / 100);
      final lowY = size.height * (1 - candle.low / 100);
      final openY = size.height * (1 - candle.open / 100);
      final closeY = size.height * (1 - candle.close / 100);
      canvas.drawLine(Offset(x, highY), Offset(x, lowY), paint);
      final rect = Rect.fromLTRB(
        x - slot * 0.22,
        math.min(openY, closeY),
        x + slot * 0.22,
        math.max(openY, closeY) + 1,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect, const Radius.circular(2)),
        paint,
      );
    }
  }

  void _paintLine(Canvas canvas, Size size) {
    if (candles.isEmpty) {
      return;
    }
    final path = Path();
    for (var i = 0; i < candles.length; i++) {
      final x = i * size.width / math.max(candles.length - 1, 1);
      final y = size.height * (1 - candles[i].close / 100);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    final stroke = Paint()
      ..color = accentColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    final fill = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          accentColor.withValues(alpha: 0.32),
          accentColor.withValues(alpha: 0),
        ],
      ).createShader(Offset.zero & size);
    canvas.drawPath(fillPath, fill);
    canvas.drawPath(path, stroke);
  }

  @override
  bool shouldRepaint(covariant FinancialChartPainter oldDelegate) {
    return oldDelegate.candles != candles ||
        oldDelegate.chartType != chartType ||
        oldDelegate.accentColor != accentColor;
  }
}

class ParticleFieldPainter extends CustomPainter {
  ParticleFieldPainter({
    required this.particles,
    required this.waveAmplitude,
    required this.animationValue,
    required this.accentColor,
  });

  final List<Particle> particles;
  final int waveAmplitude;
  final double animationValue;
  final Color accentColor;

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()
      ..shader = RadialGradient(
        center: Alignment.topRight,
        radius: 1.1,
        colors: [accentColor.withValues(alpha: 0.22), const Color(0xFF020617)],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, bgPaint);

    final wavePaint = Paint()
      ..color = accentColor.withValues(alpha: 0.45)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    final path = Path();
    for (var x = 0.0; x <= size.width; x += 4) {
      final y =
          size.height / 2 +
          math.sin(x * 0.025 + animationValue * math.pi * 2) * waveAmplitude;
      if (x == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, wavePaint);

    for (final particle in particles) {
      final center = Offset(particle.x * size.width, particle.y * size.height);
      final paint = Paint()
        ..color = particle.color
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);
      canvas.drawCircle(center, particle.radius, paint);
    }
  }

  @override
  bool shouldRepaint(covariant ParticleFieldPainter oldDelegate) {
    return true;
  }
}
