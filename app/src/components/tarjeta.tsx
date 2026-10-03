/**
 * Tarjeta de vidrio (`.card` en la maqueta): fondo translúcido, borde claro, radio 24 y sombra.
 * Si recibe `onPress` es un botón (objetivo táctil ≥ 44 pt por su relleno); si no, una vista.
 * Pendiente: desenfoque detrás (BlurView), igual que la barra de pestañas.
 */
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { medidas, radios, useTema } from '@/theme';

export function Tarjeta({
  children,
  onPress,
  etiquetaAccesible,
  pista,
  estadoAccesible,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  etiquetaAccesible?: string;
  pista?: string;
  estadoAccesible?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
}) {
  const { superficies } = useTema();
  const base = [
    styles.tarjeta,
    {
      backgroundColor: superficies.vidrio,
      borderColor: superficies.vidrioBorde,
      boxShadow: `0 10px 28px ${superficies.sombra}`,
    },
  ];

  if (!onPress) return <View style={[base, style]}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible}
      accessibilityHint={pista}
      accessibilityState={estadoAccesible}
      onPress={onPress}
      style={({ pressed }) => [base, style, pressed && styles.presionada]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    borderCurve: 'continuous',
    minHeight: medidas.toqueMinimo,
  },
  presionada: { opacity: 0.85 },
});
