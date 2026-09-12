# vela_tokens

Vela's design tokens for Flutter. **Generated** — do not edit `lib/vela_tokens.dart` or `pubspec.yaml`.
Edit `../tokens/vela.tokens.json` and run `npm run tokens`; the same file generates the CSS and the
Figma library, so one token edit lands in all three.

| Symbol | What it is |
|---|---|
| `VelaPrimitives` | The raw palette. Alias only — never bind in a widget. |
| `VelaColors` | Every semantic colour as a field; a `ThemeExtension` with `light` and `dark` instances. |
| `VelaSizing` | Spacing, icon, control-height, radius and focus scales in logical pixels, plus motion. |
| `VelaTypography` | Font families, weights, sizes, and the ramp composed as `TextStyle`s. |
| `velaThemeData(Brightness)` | A `ThemeData` seeded from the semantics, with `VelaColors` installed as an extension. |

The styles name Open Sans (300/400/600); bundle it as an asset or load it with `google_fonts` —
Flutter falls back to the platform font silently otherwise. `flutter test` runs the package's own
checks; CI runs `flutter analyze` and `flutter test` on every push.

Use it as a path dependency (`vela_tokens: { path: ../vela/flutter }`) or vendor the one file.
Widgets are not generated: build them against `../guidelines/`, which is implementation-independent.
