import { SlideData } from '../types';

export const slides: SlideData[] = [
  {
    id: 1,
    title: "Внедрение Flutter приложений в React",
    subtitle: "Host-element embedding: OLE-like UX без COM/OLE-объектной модели",
    category: "intro",
    contentMarkdown: `### Концепция embedded runtime island

В эпоху десктопных ОС **OLE** позволял внедрять интерактивные документы внутрь родительских приложений. В Web мы не получаем COM-объект, compound document или in-place activation, но можем реализовать похожий пользовательский паттерн: React содержит прямоугольную область, внутри которой живёт другой UI-runtime.

Этот showcase показывает более точную архитектуру: **React host + Flutter Web embedded runtime + versioned JSON bridge**.

#### Почему Flutter Web подходит для такого острова?
1. **Пиксельная точность:** Flutter рендерит интерфейс через CanvasKit/Skia и ресурсы движка, сохраняя контролируемую графическую поверхность.
2. **Изолированное состояние:** Приложение Flutter работает совершенно автономно, имея собственную систему управления стейтом и графический конвейер.
3. **Явная интеграция:** React-приложение выступает хост-платформой, управляющей размерами, навигацией и передачей параметров внутрь Flutter-холста.
`,
    codeSnippet: `// Обычная HTML-структура для внедрения Flutter:
<div id="flutter_app_container" class="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
  <!-- Сюда Flutter Loader внедрит CanvasKit холст -->
</div>`,
    codeLanguage: "html",
    demoType: "none"
  },
  {
    id: 2,
    title: "Архитектура Хоста и Инициализация",
    subtitle: "Тонкая настройка _flutter.loader и instance namespace",
    category: "tech",
    contentMarkdown: `### Как происходит инициализация холста

Для контроля над встраиванием не используются тяжелые и небезопасные \`<iframe>\`. Вместо этого мы используем нативный API инициализации Flutter Web — **Flutter Loader API**.

Это позволяет подгружать ресурсы Flutter-приложения асинхронно, предотвращая фликеры экрана и коллизии с основным React-DOM. 

#### Шаги жизненного цикла инициализации:
1. Загрузка \`flutter_bootstrap.js\` из \`/flutter_embed/\`.
2. Регистрация instance в \`window.__reactFlutterEmbeds.instances\`.
3. Выбор оптимального движка рендеринга (\`canvaskit\` для JS-сборки или \`skwasm\` для WASM-сборки).
4. Передача \`hostElement\` в Flutter loader, чтобы \`<flutter-view>\` создавался внутри назначенного React \`<div>\`.
`,
    codeSnippet: `// Безопасное встраивание реального Flutter Web bundle в React-компонент
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
    subtitle: "Пересылка UI событий, стейта и триггеров через versioned JSON envelopes",
    category: "bridge",
    contentMarkdown: `### Интерактивная демонстрация #1: Smart Home Console

В embedded runtime важно не просто отрисовать чужой UI, а сделать **активный обмен стейтом**. Чтобы доказать работоспособность этого механизма, мы развернули живой интерактивный пульт управления «Умного дома». 

#### Сценарий синхронизации:
1. Слева — элементы управления React (ползунки температуры, переключатели режимов, кнопки быстрого вызова сценариев).
2. Справа — живое приложение Flutter, рендерирующее детальный 3D/Canvas виджет вентиляции, света и потребления энергии.
3. Изменение состояния в React мгновенно изменяет отрисовку внутри Flutter.
4. Клики на интерактивные элементы в Flutter (например, тапы по лампочке или кондиционеру) шлют события обратно в консоль React, перебивая локальное состояние!
`,
    codeSnippet: `// 1. DART (Flutter) сторона: регистрируем bridge в instance namespace
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

// 2. REACT сторона: синхронизация состояния хоста
dispatchToEmbeddedFlutter('sync_state', {
  demoType: 'smarthome',
  state: { temperature: 24, brightness: 70 }
});`,
    codeLanguage: "typescript",
    demoType: "smarthome"
  },
  {
    id: 4,
    title: "Отрисовка частых событий",
    subtitle: "Финансовый виджет с Dart timer и React host controls",
    category: "embed",
    contentMarkdown: `### Интерактивная демонстрация #2: Financial Flutter Chart

Частые события (котировки, графики свечей, обновление состояния) часто неудобно пропускать через React DOM, если сама визуализация живёт в другом графическом runtime. 

Связка React + Flutter решает это прагматично: React работает как фрейм-контейнер и панель настроек активов, а Flutter внутри своего surface обновляет график и отправляет события обратно в host.

#### В этой демонстрации:
* **React** посылает новые заказы и управляет фильтром («Apple», «Tesla», «Ethereum»).
* **Flutter** генерирует демо-тики Dart timer-ом, обновляет свечные паттерны и сообщает React о \`live_ticker_tick\`.
* В консоль шины выводятся реальные события из Dart isolate: тики рынка, клики по свечам и торговые команды.
`,
    codeSnippet: `// Пример команды host -> Flutter financial view:
dispatchToEmbeddedFlutter('set_chart_ticker', {
  ticker: 'ETH',
  source: 'react_controls'
});

// Flutter отвечает событием live_ticker_tick через тот же envelope bridge.`,
    codeLanguage: "javascript",
    demoType: "financial"
  },
  {
    id: 5,
    title: "Генеративная анимация и кастомные кисти",
    subtitle: "CustomPainter Flutter-модули на службе визуального сторителлинга",
    category: "embed",
    contentMarkdown: `### Интерактивная демонстрация #3: Creative Canvas

Сложные геометрические графики и генеративная математика в браузере часто требуют тяжелых WebGL-библиотек вроде Three.js. Во Flutter для этого есть нативный и чистый класс \`CustomPainter\`.

Мы встроили интерактивный холст частиц. Вы можете рисовать и добавлять силы притяжения.

#### Возможности взаимодействия:
* Слайдер волновых колебаний на React-панели напрямую меняет физические уравнения в недрах рендерера Flutter.
* Полноценно работает адаптивность: сожмите или растяните контейнер, Flutter мгновенно перестроит область отрисовки (\`MediaQuery\`), сохраняя фокус отрисованных частиц в правильных геометрических пропорциях!
`,
    codeSnippet: `// Dart: кастомный рендер физики частиц на Canvas
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
    title: "Интерактивная песочница Bridge",
    subtitle: "Отправьте JSON-команду и проверьте формат обработки",
    category: "bridge",
    contentMarkdown: `### Тестирование контракта моста

Для глубокого понимания мы создали интерактивный пульт. Здесь можно послать сигнал во Flutter-оболочку и увидеть, в каком формате сообщение было доставлено и подтверждено.

#### Выполните эксперимент:
1. Выберите тип команды.
2. Нажмите **«Выполнить отправку (Dispatch Event)»**.
3. Изучите лог моста внизу. Сообщения идут как \`{ type, version, requestId, instanceId, payload }\`, поэтому их удобно трассировать и валидировать.
`,
    codeSnippet: `// Реальный мост для отправки кастомных сообщений
function dispatchToFlutter(type, payload) {
  return dispatchToEmbeddedFlutter(type, payload, 'primary-flutter-surface');
}

dispatchToFlutter('boost_particles', { count: 180 });`,
    codeLanguage: "javascript",
    demoType: "playground"
  },
  {
    id: 7,
    title: "Итоги и лучшие практики интеграции",
    subtitle: "Чек-лист для внедрения архитектуры в крупных Enterprise-системах",
    category: "summary",
    contentMarkdown: `### Когда стоит внедрять React + Flutter embedded runtime?

Эта синергия идеальна для средних и крупных корпоративных порталов, где основной дашборд и пользовательский путь написаны на **React (Vue/Svelte)**, но имеются специализированные тяжелые сервисы:
* Сложные ГИС-карты или интерактивные схемы размещения оборудования.
* Многофункциональные CAD/CAM превью-конвейеры.
* Кроссплатформенные виджеты, которые уже написаны на Flutter для Android/iOS, и их нужно переиспользовать в Web без переписывания на React!

#### Чек-лист оптимизации:
1. **Размер бандла:** Для уменьшения времени первой загрузки используйте метод загрузки Flutter по требованию (ленивая инициализация при заходе на нужный слайд/страницу).
2. **Используйте WASM:** Сборка под Flutter WASM повышает скорость численной физики и криптографии на порядок.
3. **Явный контракт событий:** Используйте versioned JSON envelopes, \`requestId\`, instance namespace и события \`ready/error/dispose\`.
4. **Честные метрики:** Не пишите performance claims в UI без измерений. Для production добавьте реальные замеры latency, drops и memory.
`,
    codeSnippet: `// Продакшн-сборка Flutter-микрофронтенда для встраивания:
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
  { id: 'intro', label: 'Введение', icon: 'Sparkles' },
  { id: 'tech', label: 'Инициализация', icon: 'Cpu' },
  { id: 'bridge', label: 'Мост событий', icon: 'Radio' },
  { id: 'embed', label: 'Живые приложения', icon: 'Layers' },
  { id: 'summary', label: 'Резюме', icon: 'CheckCircle' }
];
