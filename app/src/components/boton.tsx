/**
 * Botón de texto en píldora (maqueta: `.btn.gold` y `.btn.ghost`).
 * - `luz`: dorado, la acción principal de la pantalla (una sola por pantalla).
 * - `fantasma`: vidrio con borde, acciones secundarias sobre el cielo.
 * - `contorno`: sin fondo, borde de línea y texto en acento; para acciones secundarias dentro de
 *   una tarjeta de vidrio (ahí el fantasma se confunde con la tarjeta).
 *
 * Objetivo táctil ≥ 44 pt; el texto puede ocupar varias líneas con letra grande.
 * Sin animación al presionar más allá de bajar la opacidad (calma).
 */
import { Pressable, StyleSheet } from 'react-native';

import { Texto } from '@/components/texto';
import { conAlfa, espaciado, medidas, radios, useTema } from '@/theme';

/** Halo bajo el botón dorado (maqueta: glow al 40 %). */
const ALFA_HALO = 0.4;

export function Boton({
  texto,
  onPress,
  variante = 'fantasma',
  etiquetaAccesible,
  pista,
}: {
  texto: string;
  onPress: () => void;
  variante?: 'luz' | 'fantasma' | 'contorno';
  /** Si el lector debe leer algo más completo que el texto visible. */
  etiquetaAccesible?: string;
  /** Qué pasa al tocar (accessibilityHint). */
  pista?: string;
}) {
  const { colores, superficies, paleta } = useTema();
  const luz = variante === 'luz';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? texto}
      accessibilityHint={pista}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        luz
          ? {
              backgroundColor: superficies.botonLuz,
              experimental_backgroundImage: superficies.botonLuzDegradado,
              boxShadow: [
                { offsetX: 0, offsetY: 8, blurRadius: 20, color: conAlfa(paleta.glow, ALFA_HALO) },
              ],
            }
          : variante === 'contorno'
            ? { borderColor: colores.linea, borderWidth: 1 }
            : {
                backgroundColor: superficies.vidrio,
                borderColor: superficies.vidrioBorde,
                borderWidth: 1,
              },
        pressed && styles.presionado,
      ]}>
      <Texto
        rol="boton"
        style={[
          styles.texto,
          {
            color: luz
              ? colores.sobreLuz
              : variante === 'contorno'
                ? colores.acentoTexto
                : colores.texto,
          },
        ]}>
        {texto}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: medidas.toqueMinimo + espaciado.xs,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.xl,
    borderRadius: radios.pildora,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.75 },
  texto: { textAlign: 'center' },
});
