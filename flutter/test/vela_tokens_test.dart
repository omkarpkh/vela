// Smoke tests for the generated theme. The parity with tokens/vela.tokens.json is
// asserted on the Node side (src/styles/dart.test.ts); these check what only a real
// Flutter SDK can — that the file compiles, the theme installs, and the mappings hold.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vela_tokens/vela_tokens.dart';

void main() {
  test('light and dark are the two themes the CSS ships, resolved to primitives', () {
    expect(VelaColors.light.bgGlobal, VelaPrimitives.white);
    expect(VelaColors.dark.bgGlobal, VelaPrimitives.grey950);
    expect(VelaColors.light, isNot(equals(VelaColors.dark)));
  });

  test('text styles compose size, weight and line-height ratio from the ramp', () {
    expect(VelaTypography.h1.fontSize, VelaTypography.textH1Size);
    expect(VelaTypography.h1.fontWeight, VelaTypography.textH1Weight);
    expect(VelaTypography.h1.height,
        VelaTypography.textH1LineHeight / VelaTypography.textH1Size);
    expect(VelaTypography.meta.letterSpacing, VelaTypography.textMetaTracking);
    expect(VelaTypography.buttonRegular.fontWeight, VelaTypography.fontWeightRegular);
    expect(VelaTypography.h1.fontFamily, VelaTypography.fontFamilyPrimary);
  });

  test('lerp returns the endpoints at t = 0 and t = 1', () {
    expect(VelaColors.light.lerp(VelaColors.dark, 0).bgGlobal, VelaColors.light.bgGlobal);
    expect(VelaColors.light.lerp(VelaColors.dark, 1).bgGlobal, VelaColors.dark.bgGlobal);
  });

  testWidgets('velaThemeData installs VelaColors and seeds the ColorScheme',
      (WidgetTester tester) async {
    late ThemeData theme;
    await tester.pumpWidget(MaterialApp(
      theme: velaThemeData(Brightness.light),
      darkTheme: velaThemeData(Brightness.dark),
      themeMode: ThemeMode.dark,
      home: Builder(builder: (BuildContext context) {
        theme = Theme.of(context);
        return const SizedBox.shrink();
      }),
    ));
    final VelaColors? colors = theme.extension<VelaColors>();
    expect(colors, isNotNull);
    expect(colors!.bgGlobal, VelaColors.dark.bgGlobal);
    expect(theme.colorScheme.brightness, Brightness.dark);
    expect(theme.colorScheme.primary, VelaColors.dark.btnPrimaryBg);
    expect(theme.colorScheme.surface, VelaColors.dark.bgGlobal);
    expect(theme.scaffoldBackgroundColor, VelaColors.dark.bgGlobal);
    // ThemeData merges a supplied textTheme with Material's defaults (colour,
    // inherit, letterSpacing), so whole-style equality never holds — assert that
    // the ramp's values survive the merge instead.
    final TextStyle? h1 = theme.textTheme.headlineLarge;
    expect(h1?.fontFamily, VelaTypography.fontFamilyPrimary);
    expect(h1?.fontSize, VelaTypography.textH1Size);
    expect(h1?.fontWeight, VelaTypography.textH1Weight);
    expect(h1?.height, VelaTypography.textH1LineHeight / VelaTypography.textH1Size);
  });
}
