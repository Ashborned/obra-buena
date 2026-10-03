/**
 * Texto con rol tipográfico y tono del tema. Respeta la letra grande del sistema
 * (no se desactiva `allowFontScaling`); React Native escala `lineHeight` junto con `fontSize`.
 *
 * Android:
 * - Con fuentes propias, `includeFontPadding` agrega un relleno extra que descentra el texto; se
 *   quita y el espacio para descendentes y acentos lo da el `lineHeight` de cada rol (tipografia.ts).
 * - Desde Android 14 la letra grande escala de forma no lineal y el interlineado crecería menos que
 *   la letra (recortando g, j, p, q, y). Se compensa con `interlineadoCompensado` (escala-letra.ts).
 */
import { Platform, StyleSheet, Text, useWindowDimensions, type TextProps } from 'react-native';

import { tipografia, useTema, type RolTipografico } from '@/theme';
import { interlineadoCompensado } from '@/theme/escala-letra';

export type TonoTexto = 'texto' | 'suave' | 'acento' | 'oro';

export type TextoProps = TextProps & {
  rol?: RolTipografico;
  tono?: TonoTexto;
};

/** Primera versión de Android con escala de letra no lineal (Android 14). */
const API_ESCALA_NO_LINEAL = 34;
const escalaNoLineal =
  Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= API_ESCALA_NO_LINEAL;

export function Texto({ rol = 'interfaz', tono = 'texto', style, ...resto }: TextoProps) {
  const { colores } = useTema();
  const { fontScale } = useWindowDimensions();
  const color = {
    texto: colores.texto,
    suave: colores.textoSuave,
    acento: colores.acentoTexto,
    oro: colores.oro,
  }[tono];

  let compensacion: { lineHeight: number } | undefined;
  if (escalaNoLineal && fontScale > 1 && resto.allowFontScaling !== false) {
    const plano = StyleSheet.flatten([tipografia[rol], style]);
    const { fontSize, lineHeight } = plano;
    if (typeof fontSize === 'number' && typeof lineHeight === 'number') {
      compensacion = {
        lineHeight: interlineadoCompensado(
          fontSize,
          lineHeight,
          fontScale,
          resto.maxFontSizeMultiplier ?? undefined,
        ),
      };
    }
  }

  return (
    <Text style={[styles.base, tipografia[rol], { color }, style, compensacion]} {...resto} />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
