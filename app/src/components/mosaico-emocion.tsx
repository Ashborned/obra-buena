/**
 * Mosaico de emoción (`.tile` en la maqueta): degradado del tono de la emoción, brillo circular
 * arriba a la derecha, nombre en Cormorant y "con <santo compañero de hoy>".
 *
 * - Sin alto fijo: el mínimo es el de la maqueta (96) y crece con la letra grande.
 * - Calma: sin elevación ni rebote al tocar, solo baja la opacidad.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';
import {
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  OPACIDAD_BRILLO_MOSAICO,
  radios,
  useTema,
  type IdTonoEmocion,
} from '@/theme';

/** Medidas de la maqueta (`.tile`, `.tile::before`, `.tile b`, `.tile small`). */
const ALTO_MINIMO = 96;
const BRILLO = 110;
const BRILLO_DERECHA = -34;
const BRILLO_ARRIBA = -40;
const TAMANO_NOMBRE = 23;
const TAMANO_SANTO = 11.5;

export function MosaicoEmocion({
  id,
  nombre,
  santo,
  onPress,
}: {
  id: IdTonoEmocion;
  nombre: string;
  /** Santo compañero de la entrada de hoy; null si la emoción aún no tiene entradas. */
  santo: string | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { emociones, superficies } = useTema();
  const tono = emociones[id];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={santo ? t('emociones.mosaicoAccesible', { emocion: nombre, santo }) : nombre}
      accessibilityHint={t('emociones.mosaicoPista')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.mosaico,
        {
          backgroundColor: tono.hondo,
          experimental_backgroundImage: tono.degradadoMosaico,
          borderColor: superficies.vidrioBorde,
        },
        pressed && styles.presionado,
      ]}>
      <View
        pointerEvents="none"
        style={[styles.brillo, { experimental_backgroundImage: tono.degradadoBrillo }]}
      />
      <Texto style={[styles.nombre, { color: tono.texto }]}>{nombre}</Texto>
      {santo ? (
        <Texto style={[styles.santo, { color: tono.textoSuave }]}>
          {t('emociones.con', { santo })}
        </Texto>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mosaico: {
    flex: 1,
    minHeight: ALTO_MINIMO,
    borderRadius: radios.tarjeta,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: espaciado.md + 2,
    paddingHorizontal: espaciado.lg - 1,
    justifyContent: 'flex-end',
    gap: espaciado.xxs,
  },
  presionado: { opacity: 0.85 },
  brillo: {
    position: 'absolute',
    width: BRILLO,
    height: BRILLO,
    right: BRILLO_DERECHA,
    top: BRILLO_ARRIBA,
    borderRadius: BRILLO / 2,
    opacity: OPACIDAD_BRILLO_MOSAICO,
  },
  nombre: {
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_NOMBRE,
    lineHeight: interlineado(TAMANO_NOMBRE, FACTOR_INTERLINEADO.display),
  },
  santo: {
    fontFamily: familias.interfaz,
    fontSize: TAMANO_SANTO,
    lineHeight: interlineado(TAMANO_SANTO, FACTOR_INTERLINEADO.interfazChica),
  },
});
