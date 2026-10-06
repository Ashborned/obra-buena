/**
 * Sección de Configuración: título (encabezado para el lector) y una tarjeta de vidrio con el contenido.
 * Entra con la entrada de calma (nivel 3), escalonada por `orden`; nada más se mueve.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { useReducirMovimiento } from '@/lib/animaciones';
import { espaciado } from '@/theme';
import { entradaCalma } from '@/theme/movimiento';

export function SeccionConfig({
  titulo,
  orden = 0,
  children,
}: {
  titulo: string;
  /** Posición en la pantalla, para escalonar la entrada. */
  orden?: number;
  children: ReactNode;
}) {
  const reducir = useReducirMovimiento();
  return (
    <Animated.View entering={entradaCalma(reducir, orden)} style={styles.seccion}>
      <Texto rol="titulo" accessibilityRole="header">
        {titulo}
      </Texto>
      <Tarjeta style={styles.tarjeta}>{children}</Tarjeta>
    </Animated.View>
  );
}

/** Bloque dentro de una sección (p. ej. "Paleta" y "Hora de oración" en Apariencia). */
export function BloqueConfig({ children }: { children: ReactNode }) {
  return <View style={styles.bloque}>{children}</View>;
}

const styles = StyleSheet.create({
  seccion: { gap: espaciado.sm },
  tarjeta: { padding: espaciado.lg, gap: espaciado.xl },
  bloque: { gap: espaciado.sm },
});
