/**
 * Encabezado de pantalla: título display (rol de encabezado para el lector) y una acción a la derecha.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { espaciado } from '@/theme';

export function Encabezado({ titulo, accion }: { titulo: string; accion?: ReactNode }) {
  return (
    <View style={styles.encabezado}>
      <Texto rol="displayGrande" accessibilityRole="header" style={styles.titulo}>
        {titulo}
      </Texto>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  titulo: { flexShrink: 1 },
});
