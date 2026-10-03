/**
 * Íconos provisionales (SF Symbols en iOS, Material Symbols en Android y web vía expo-symbols).
 * Se reemplazarán por los íconos propios dibujados (docs/decisiones.md: "Íconos propios dibujados").
 *
 * En Android expo-symbols dibuja el ícono como un carácter de texto dentro de una caja fija del
 * tamaño pedido; con letra grande el carácter crecería y quedaría recortado. Se le pide un tamaño
 * de letra que, ya escalado por el sistema, mida exactamente la caja.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform, useWindowDimensions, type ColorValue } from 'react-native';

import { spParaDp } from '@/theme/escala-letra';

/** Android 14+ escala la letra de forma no lineal (ver escala-letra.ts). */
const escalaNoLineal =
  Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 34;

const nombres = {
  hoy: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  emociones: { ios: 'heart', android: 'favorite', web: 'favorite' },
  novenas: { ios: 'flame', android: 'local_fire_department', web: 'local_fire_department' },
  aprender: { ios: 'medal', android: 'military_tech', web: 'military_tech' },
  configuracion: { ios: 'gearshape', android: 'settings', web: 'settings' },
  cerrar: { ios: 'xmark', android: 'close', web: 'close' },
} as const satisfies Record<string, SymbolViewProps['name']>;

export type NombreIcono = keyof typeof nombres;

export function Icono({
  nombre,
  color,
  tamano = 23,
}: {
  nombre: NombreIcono;
  color: ColorValue;
  tamano?: number;
}) {
  const { fontScale } = useWindowDimensions();
  const tamanoLetra = Platform.OS === 'android' ? spParaDp(tamano, fontScale, escalaNoLineal) : tamano;

  return (
    <SymbolView
      name={nombres[nombre]}
      tintColor={color}
      size={tamanoLetra}
      style={{ width: tamano, height: tamano, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
