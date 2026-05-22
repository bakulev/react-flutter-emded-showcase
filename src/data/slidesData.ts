import { SlideData } from '../types';

export const slides: SlideData[] = [
  {
    id: 1,
    title: "Внедрение Flutter приложений в React",
    subtitle: "Эволюция бесшовного встраивания интерфейсов (OLE 2.0 в Web)",
    category: "intro",
    contentMarkdown: `### Концепция OLE (Object Linking and Embedding) в Web

В эпоху десктопных ОС технология **OLE** от Microsoft позволяла внедрять полноценные интерактивные документы (например, таблицу Excel или чертеж Visio) прямо внутрь документов Word. Внутренние приложения запускали свои полноценные GUI-интерфейсы внутри родительских окон и обменивались данными на лету.

Сегодня во фронтенд-разработке возникает аналогичная задача: **внедрить автономные, высокоинтенсивные Flutter-микрофронтенды внутрь систем на React**.

#### Почему Flutter в Web идеален для OLE-интеграции?
1. **Пиксельная точность:** Flutter рендерит интерфейс через CanvasKit/Skia и WebAssembly-ресурсы движка, обеспечивая одинаковую графику и плавные 60/120 FPS.
2. **Изолированное состояние:** Приложение Flutter работает совершенно автономно, имея собственную систему управления стейтом и графический конвейер.
3. **Бесшовная интеграция:** React-приложение выступает хост-платформой, управляющей размерами, жизненным циклом и передачей параметров внутрь Flutter-холста.
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
    subtitle: "Тонкая настройка _flutter.loader для бесконфликтного рендеринга",
    category: "tech",
    contentMarkdown: `### Как происходит инициализация холста

Для контроля над встраиванием не используются тяжелые и небезопасные \`<iframe>\`. Вместо этого мы используем нативный API инициализации Flutter Web — **Flutter Loader API**.

Это позволяет подгружать ресурсы Flutter-приложения асинхронно, предотвращая фликеры экрана и коллизии с основным React-DOM. 

#### Шаги жизненного цикла инициализации:
1. Загрузка файла \`flutter.js\`.
2. Конфигурация локатора точек входа родительского элемента.
3. Выбор оптимального движка рендеринга (\`canvaskit\` для JS-сборки или \`skwasm\` для WASM-сборки).
4. Ограничение области видимости мышиных и клавиатурных событий только внутри назначенного родительского \`<div>\`.
`,
    codeSnippet: `// Безопасное встраивание реального Flutter Web bundle в React-компонент
import React, { useEffect, useRef } from 'react';

export function FlutterHost() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.runEmbeddedFlutter({
      hostElement: containerRef.current!,
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
    subtitle: "Пересылка UI событий, стейта и триггеров через JS-Interop bindings",
    category: "bridge",
    contentMarkdown: `### Интерактивная демонстрация #1: Smart Home Console

В OLE крайне важен **активный обмен стейтом**. Чтобы доказать работоспособность этого механизма, мы развернули живой интерактивный пульт управления «Умного дома». 

#### Сценарий синхронизации OLE 2.0:
1. Слева — элементы управления React (ползунки температуры, переключатели режимов, кнопки быстрого вызова сценариев).
2. Справа — живое приложение Flutter, рендерирующее детальный 3D/Canvas виджет вентиляции, света и потребления энергии.
3. Изменение состояния в React мгновенно изменяет отрисовку внутри Flutter.
4. Клики на интерактивные элементы в Flutter (например, тапы по лампочке или кондиционеру) шлют события обратно в консоль React, перебивая локальное состояние!
`,
    codeSnippet: `// 1. DART (Flutter) сторона: Экспонируем JS bridge
import 'dart:convert';
import 'dart:js' as js;

void registerBridge(void Function(Map<String, dynamic>) applyState) {
  js.context['reactToFlutterBridge'] = (String action, String payloadJson) {
    final payload = jsonDecode(payloadJson) as Map<String, dynamic>;
    if (action == 'sync_state') {
      applyState(payload['state'] as Map<String, dynamic>);
    }
  };
}

// 2. REACT сторона: синхронизация состояния хоста
window.reactToFlutterBridge?.('sync_state', JSON.stringify({
  demoType: 'smarthome',
  state: { temperature: 24, brightness: 70 }
}));`,
    codeLanguage: "typescript",
    demoType: "smarthome"
  },
  {
    id: 4,
    title: "Отрисовка событий высокой частоты (High-Freq Events)",
    subtitle: "Финансовый трейдинг в реальном времени без просадки FPS",
    category: "embed",
    contentMarkdown: `### Интерактивная демонстрация #2: Financial Flutter Chart

Высокочастотные события (котировки акций, графики свечей, обновление стакана) перегружают стандартный React DOM из-за каскадных ререндеров. 

Связка React + Flutter решает это: React работает как легкий фрейм-контейнер и панель настроек активов, а Flutter — как выделенный WebGL-движок, перерисовывающий миллион транзакций со скоростью монитора.

#### В этой демонстрации:
* **React** посылает новые заказы и управляет фильтром («Apple», «Tesla», «Ethereum»).
* **Flutter** принимает поток сырых тиков каждую миллисекунду, мгновенно отрисовывает свечные паттерны и сообщает React о пересечениях скользящих средних.
* В консоль шины выводятся реальные события из Dart isolate: тики рынка, клики по свечам и торговые команды.
`,
    codeSnippet: `// Пример отправки быстрых тиков из React в Flutter без ре-рендера React:
const sendTickToRunner = (symbol, price) => {
  if (window.flutterTickReceiver) {
    window.flutterTickReceiver(JSON.stringify({ 
      t: Date.now(), 
      s: symbol, 
      p: price 
    }));
  }
};`,
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
    title: "Интерактивная песочница OLE Bridge",
    subtitle: "Напишите JS-скрипт и проверьте скорость обмена сообщениями",
    category: "bridge",
    contentMarkdown: `### Тестирование пропускной способности моста

Для глубокого понимания мы создали интерактивный пульт. Здесь вы можете написать собственный обработчик отправки сообщений, послать сигнал во Flutter-оболочку и увидеть, с какой задержкой и в каком формате сообщение будет обработано.

#### Выполните эксперимент:
1. Выберите тип события (нажатие кнопки, изменение конфигурации, отправка секретного токена).
2. Нажмите **«Выполнить отправку (Dispatch Event)»**.
3. Изучите лог моста внизу. Вы увидите микросекундную скорость доставки (\`< 1ms\`), так как обмен идет в рамках одного JS- контекста памяти браузера без сериализации по сети!
`,
    codeSnippet: `// Реальный боевой мост для отправки кастомных сообщений
function dispatchToFlutter(eventName, data) {
  const event = new CustomEvent('js-to-flutter', {
    detail: { event: eventName, payload: data }
  });
  window.dispatchEvent(event);
  logBridgeActivity('React', eventName, data);
}`,
    codeLanguage: "javascript",
    demoType: "playground"
  },
  {
    id: 7,
    title: "Итоги и лучшие практики интеграции",
    subtitle: "Чек-лист для внедрения архитектуры в крупных Enterprise-системах",
    category: "summary",
    contentMarkdown: `### Когда стоит внедрять React + Flutter OLE-архитектуру?

Эта синергия идеальна для средних и крупных корпоративных порталов, где основной дашборд и пользовательский путь написаны на **React (Vue/Svelte)**, но имеются специализированные тяжелые сервисы:
* Сложные ГИС-карты или интерактивные схемы размещения оборудования.
* Многофункциональные CAD/CAM превью-конвейеры.
* Кроссплатформенные виджеты, которые уже написаны на Flutter для Android/iOS, и их нужно переиспользовать в Web без переписывания на React!

#### Чек-лист оптимизации:
1. **Размер бандла:** Для уменьшения времени первой загрузки используйте метод загрузки Flutter по требованию (ленивая инициализация при заходе на нужный слайд/страницу).
2. **Используйте WASM:** Сборка под Flutter WASM повышает скорость численной физики и криптографии на порядок.
3. **Общий контекст событий:** Всегда стройте обмен данными по шине событий с обратной связью (Acknowledge) для гарантии доставки состояний.
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
