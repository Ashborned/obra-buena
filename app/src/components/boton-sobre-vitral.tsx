/**
 * Botón "Volver" sobre el vitral (`.back.onglass` en la maqueta): píldora oscura translúcida con
 * texto blanco, legible sobre cualquier color de celda. Objetivo táctil ≥ 44 pt.
 */
import { Pressable, StyleSheet } from 'react-native';

import { Icono } from '@/components/icono';
import { Texto } from '@/components/texto';
import { coloresVitral, espaciado, medidas, radios } from '@/theme';

const ICONO = 18;

export function BotonSobreVitral({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      onPress={onPress}
      hitSlop={espaciado.xs}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}>
      <Icono nombre="volver" color={coloresVitral.textoSobreVitral} tamano={ICONO} />
      <Texto rol="boton" style={styles.texto}>
        {texto}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    minHeight: medidas.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xxs,
    paddingLeft: espaciado.sm,
    paddingRight: espaciado.md + 2,
    borderRadius: radios.pildora,
    borderWidth: 1,
    backgroundColor: coloresVitral.botonSobreVitral,
    borderColor: coloresVitral.botonSobreVitralBorde,
  },
  presionado: { opacity: 0.75 },
  texto: { color: coloresVitral.textoSobreVitral },
});
