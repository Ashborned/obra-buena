/**
 * Cielo de la hora de oración detrás de cada pantalla: fondo sólido + dos manchas de luz.
 *
 * Al cruzar de Laudes a Vísperas o Completas (o al cambiar paleta) el cielo nuevo entra con un
 * fundido de 0.6 s (guía de movimiento, nivel 2). Es solo un fundido, así que vale también con
 * "Reducir movimiento".
 *
 * Pendiente: estrellas de Completas y grano de película (Skia).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { degradadosCielo, duraciones, useTema } from '@/theme';

export function Fondo({ children }: { children: ReactNode }) {
  const { cielo, paletaId, hora } = useTema();

  return (
    <View style={[styles.relleno, { backgroundColor: cielo.fondo }]}>
      <Animated.View
        key={`${paletaId}-${hora}`}
        entering={FadeIn.duration(duraciones.cambioCielo)}
        exiting={FadeOut.duration(duraciones.cambioCielo)}
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: cielo.fondo, experimental_backgroundImage: degradadosCielo(cielo) },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  relleno: { flex: 1 },
});
