// NotaScan. — tema para las apps móviles (Flutter): Estudiante y Acudiente.
// Generado desde tokens/tokens.json. No edites los valores a mano: cambia los tokens.
import 'package:flutter/material.dart';

class NsColors {
  NsColors._();
  static const navy = Color(0xFF1B2A4A);
  static const navySoft = Color(0xFF33425F);
  static const gold = Color(0xFFB8924B);
  static const goldInk = Color(0xFF7A5F2C);
  static const goldSoft = Color(0xFFF3E8D2);
  static const ivory = Color(0xFFF7F3EC);
  static const ivoryDeep = Color(0xFFEFE8DC);
  static const paper = Color(0xFFFFFDF8);
  static const charcoal = Color(0xFF2B2B2B);
  static const muted = Color(0xFF5B5A56);
  static const hairline = Color(0x291B2A4A);
  static const sage = Color(0xFF6B8F71);
  static const sageInk = Color(0xFF3F6346);
  static const sageSoft = Color(0xFFE1EADF);
  static const burgundy = Color(0xFF7A2E2E);
  static const burgundySoft = Color(0xFFF3E1DD);
  static const glass = Color(0xA3FFFDF8);
  static const glassEdge = Color(0xB8FFFFFF);
  static const scrim = Color(0x471B2A4A);
}

class NsSpace {
  NsSpace._();
  static const s1 = 4.0; // space-1
  static const s2 = 8.0; // space-2
  static const s3 = 12.0; // space-3
  static const s4 = 16.0; // space-4
  static const s5 = 24.0; // space-5
  static const s6 = 32.0; // space-6
  static const s7 = 48.0; // space-7
  static const s8 = 72.0; // space-8
}

class NsRadius {
  NsRadius._();
  static const sm = Radius.circular(6);
  static const md = Radius.circular(10);
  static const lg = Radius.circular(16);
  static const sheet = Radius.circular(28);
  static const full = Radius.circular(999);
}

/// Sombra sólida neo-brutalista (sin desenfoque).
List<BoxShadow> nsShadow([double offset = 4, Color color = NsColors.navy]) =>
    [BoxShadow(color: color, offset: Offset(offset, offset), blurRadius: 0)];

/// Borde estructural de 2px en navy.
const nsBorder = BorderSide(color: NsColors.navy, width: 2);

class NsMotion {
  NsMotion._();
  static const fast = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 220);
  static const slow = Duration(milliseconds: 600); // count-up de la nota y XP
  static const easeOut = Cubic(0.2, 0.8, 0.2, 1);
  static const stamp = Cubic(0.34, 1.56, 0.64, 1); // sello y celebración de logros
}

/// Fraunces para títulos, notas y cifras; Inter para la interfaz.
/// Agrega las fuentes con google_fonts o como assets en pubspec.yaml.
ThemeData notaScanTheme() {
  const display = 'Fraunces';
  const ui = 'Inter';
  final base = ThemeData(useMaterial3: true, fontFamily: ui);
  return base.copyWith(
    scaffoldBackgroundColor: NsColors.ivory,
    colorScheme: const ColorScheme.light(
      primary: NsColors.navy,
      onPrimary: NsColors.ivory,
      secondary: NsColors.gold,
      onSecondary: NsColors.navy,
      tertiary: NsColors.sage,
      error: NsColors.burgundy,
      surface: NsColors.paper,
      onSurface: NsColors.navy,
    ),
    textTheme: base.textTheme.copyWith(
      displayLarge: const TextStyle(fontFamily: display, fontWeight: FontWeight.w800, fontSize: 56, height: 1.0, color: NsColors.navy),
      headlineMedium: const TextStyle(fontFamily: display, fontWeight: FontWeight.w800, fontSize: 30, height: 1.05, color: NsColors.navy),
      titleLarge: const TextStyle(fontFamily: display, fontWeight: FontWeight.w800, fontSize: 19, color: NsColors.navy),
      bodyLarge: const TextStyle(fontFamily: ui, fontSize: 15, height: 1.6, color: NsColors.charcoal),
      labelLarge: const TextStyle(fontFamily: ui, fontWeight: FontWeight.w700, fontSize: 14, color: NsColors.navy),
      bodySmall: const TextStyle(fontFamily: ui, fontWeight: FontWeight.w500, fontSize: 12, color: NsColors.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: NsColors.gold,
        foregroundColor: NsColors.navy,
        minimumSize: const Size(48, 52),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(NsRadius.full), side: nsBorder),
        textStyle: const TextStyle(fontFamily: ui, fontWeight: FontWeight.w800, fontSize: 15),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: NsColors.paper,
      border: OutlineInputBorder(borderRadius: BorderRadius.all(NsRadius.full), borderSide: nsBorder),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.all(NsRadius.full), borderSide: BorderSide(color: NsColors.gold, width: 2)),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: NsColors.paper,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: NsRadius.sheet), side: nsBorder),
    ),
    navigationBarTheme: const NavigationBarThemeData(
      backgroundColor: NsColors.paper,
      indicatorColor: NsColors.navy,
      height: 72,
    ),
  );
}
