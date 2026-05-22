import 'package:embedded_flutter_apps/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('embedded Flutter surface starts mounted', (tester) async {
    await tester.pumpWidget(const EmbeddedFlutterApp());
    await tester.pump();

    expect(find.text('REAL FLUTTER WEB'), findsOneWidget);
    expect(find.text('Flutter app is mounted'), findsOneWidget);
  });
}
