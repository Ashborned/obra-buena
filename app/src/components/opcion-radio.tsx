/**
 * Opción de un grupo de radio sobre vidrio (paleta, idioma, país). Va dentro de un contenedor con
 * `accessibilityRole="radiogroup"`. Objetivo táctil ≥ 44 pt; crece con la letra grande.
 *
 * Sin animación: el cambio de selección es inmediato (calma, guía de movimiento nivel 3).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { espaciado, medidas, radios, useTema } from '@/theme';

/** Indicador de radio: anillo exterior y punto interior. */
const RADIO_ANILLO = 24;
const RADIO_PUNTO = 12;
const BORDE_SELECCION = 2;

export function OpcionRadio({
  etiqueta,
  detalle,
  seleccionada,
  onPress,
  inicio,
  etiquetaAccesible,
}: {
  etiqueta: string;
  /** Línea secundaria opcional. */
  detalle?: string;
  seleccionada: boolean;
  onPress: () => void;
  /** Elemento decorativo a la izquierda (muestra de paleta…), oculto al lector. */
  inicio?: ReactNode;
  /** Si el lector debe leer algo distinto de etiqueta + detalle. */
  etiquetaAccesible?: string;
}) {
  const { colores, superficies } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: seleccionada }}
      accessibilityLabel={etiquetaAccesible ?? (detalle ? `${etiqueta}. ${detalle}` : etiqueta)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opcion,
        {
          backgroundColor: superficies.vidrio,
          borderColor: seleccionada ? colores.acento : superficies.vidrioBorde,
        },
        pressed && styles.presionada,
      ]}>
      {inicio ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {inicio}
        </View>
      ) : null}
      <View style={styles.textos}>
        <Texto rol="titulo">{etiqueta}</Texto>
        {detalle ? (
          <Texto rol="interfazSecundaria" tono="suave">
            {detalle}
          </Texto>
        ) : null}
      </View>
      <View style={[styles.anillo, { borderColor: seleccionada ? colores.acento : colores.textoSuave }]}>
        {seleccionada && <View style={[styles.punto, { backgroundColor: colores.acento }]} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: medidas.toqueMinimo + espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.tarjeta,
    borderWidth: BORDE_SELECCION,
    borderCurve: 'continuous',
  },
  presionada: { opacity: 0.7 },
  textos: { flex: 1, gap: espaciado.xxs },
  anillo: {
    width: RADIO_ANILLO,
    height: RADIO_ANILLO,
    borderRadius: radios.pildora,
    borderWidth: BORDE_SELECCION,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: {
    width: RADIO_PUNTO,
    height: RADIO_PUNTO,
    borderRadius: radios.pildora,
  },
});
