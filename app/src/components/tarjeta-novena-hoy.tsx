/**
 * Tarjeta "Tu novena de hoy" (`.nvcard` en la maqueta): nombre, día que toca, cuándo termina y las
 * nueve velas pequeñas encendidas según lo marcado en el teléfono.
 *
 * Día de la fiesta ("Hoy es su fiesta", decisiones 2026-10-03): trato de celebración (luz cálida en
 * la tarjeta) y, si la persona completó los nueve días, las nueve velas encendidas. Sin puntos ni
 * confeti: la oración no se premia.
 *
 * Por ahora abre la pestaña Novenas; el detalle de la novena es otro hito.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { VelasMini } from '@/components/velas-mini';
import type { NovenaHoy } from '@/lib/hoy';
import { fechaCorta } from '@/lib/formato-fecha';
import { velasEncendidas } from '@/lib/progreso';
import { useIdioma, useTranslation } from '@/i18n';
import { conAlfa, espaciado, useTema } from '@/theme';

export function TarjetaNovenaHoy({
  novenaHoy,
  onPress,
  activo,
}: {
  novenaHoy: NovenaHoy;
  onPress: () => void;
  /** Las llamas titilan solo con la pantalla a la vista. */
  activo: boolean;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { paleta, superficies } = useTema();
  const { novena, estado } = novenaHoy;
  const anioFiesta = estado.fiesta.getFullYear();
  const [encendidas, setEncendidas] = useState<number[]>([]);

  // Se relee al volver a Hoy: las velas se encienden en Novenas.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      velasEncendidas(novena.id, anioFiesta)
        .then((dias) => {
          if (vigente) setEncendidas(dias);
        })
        .catch(() => {
          // Sin base de datos: las velas se muestran apagadas, la tarjeta sigue sirviendo.
        });
      return () => {
        vigente = false;
      };
    }, [novena.id, anioFiesta]),
  );

  const nombre = novena[idioma];
  const fiesta = estado.esFiesta;
  const completa = encendidas.length >= 9;
  const velas = fiesta && completa ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : encendidas;
  const etiqueta = fiesta ? t('novenas.esSuFiesta') : t('hoy.novenaDeHoy');
  const detalle = fiesta
    ? fechaCorta(estado.fiesta, idioma)
    : `${t('novenas.diaDe', { n: estado.dia ?? 1 })} · ${t('hoy.termina', { fecha: fechaCorta(estado.fin, idioma) })}`;
  const velasTexto = t('hoy.velasAccesible', { count: velas.length });

  return (
    <Tarjeta
      onPress={onPress}
      etiquetaAccesible={`${etiqueta}. ${nombre}. ${detalle}. ${velasTexto}`}
      pista={t('hoy.abrirNovenasPista')}
      style={[
        styles.tarjeta,
        fiesta && {
          borderColor: conAlfa(paleta.glow, 0.7),
          experimental_backgroundImage: `linear-gradient(135deg, ${conAlfa(paleta.glow, 0.32)}, ${superficies.vidrio} 70%)`,
          boxShadow: `0 10px 30px ${conAlfa(paleta.glow, 0.35)}`,
        },
      ]}>
      <Texto rol="etiqueta" tono="acento">
        {etiqueta}
      </Texto>
      <Texto rol="titulo">{nombre}</Texto>
      <Texto rol="interfazSecundaria" tono="suave" style={styles.detalle}>
        {detalle}
      </Texto>
      <View style={styles.velas}>
        <VelasMini encendidas={velas} diaActual={fiesta ? null : estado.dia} titilar={activo} />
      </View>
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    paddingTop: espaciado.lg - 1,
    paddingBottom: espaciado.md + 2,
    paddingHorizontal: espaciado.lg + 2,
    gap: espaciado.xxs + 1,
  },
  detalle: { fontSize: 12.5, lineHeight: 18, fontVariant: ['tabular-nums'] },
  velas: { marginTop: espaciado.sm },
});
