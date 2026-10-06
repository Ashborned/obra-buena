/**
 * Configuración → Apariencia: paleta, hora de oración y animaciones. Todo se aplica al instante y
 * queda guardado en el teléfono (la hora y la paleta en el tema, las animaciones en `animaciones.tsx`).
 */
import { StyleSheet, View } from 'react-native';

import { BloqueConfig, SeccionConfig } from '@/components/config/seccion';
import { OpcionRadio } from '@/components/opcion-radio';
import { SelectorPaleta } from '@/components/selector-paleta';
import { Texto } from '@/components/texto';
import { useTranslation, type ClaveTexto } from '@/i18n';
import { usePreferenciaAnimaciones } from '@/lib/animaciones';
import type { PreferenciaHora } from '@/lib/hora-oracion';
import type { PreferenciaAnimaciones } from '@/lib/preferencias';
import { espaciado, useTema } from '@/theme';

const HORAS: { id: PreferenciaHora; nombre: ClaveTexto; detalle: ClaveTexto }[] = [
  { id: 'auto', nombre: 'configuracion.horas.auto', detalle: 'configuracion.horasDetalle.auto' },
  { id: 'day', nombre: 'configuracion.horas.day', detalle: 'configuracion.horasDetalle.day' },
  { id: 'dusk', nombre: 'configuracion.horas.dusk', detalle: 'configuracion.horasDetalle.dusk' },
  { id: 'night', nombre: 'configuracion.horas.night', detalle: 'configuracion.horasDetalle.night' },
];

const ANIMACIONES: { id: PreferenciaAnimaciones; nombre: ClaveTexto; detalle: ClaveTexto }[] = [
  {
    id: 'sistema',
    nombre: 'configuracion.animacionesOpciones.sistema',
    detalle: 'configuracion.animacionesDetalle.sistema',
  },
  {
    id: 'reducidas',
    nombre: 'configuracion.animacionesOpciones.reducidas',
    detalle: 'configuracion.animacionesDetalle.reducidas',
  },
];

export function SeccionApariencia({ orden }: { orden?: number }) {
  const { t } = useTranslation();
  const { preferenciaHora, setPreferenciaHora } = useTema();
  const { preferencia, setPreferencia } = usePreferenciaAnimaciones();
  const tituloHora = t('configuracion.horaOracion');
  const tituloAnimaciones = t('configuracion.animaciones');

  return (
    <SeccionConfig titulo={t('configuracion.secciones.apariencia')} orden={orden}>
      <SelectorPaleta />

      <BloqueConfig>
        <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
          {tituloHora}
        </Texto>
        <View accessibilityRole="radiogroup" accessibilityLabel={tituloHora} style={styles.grupo}>
          {HORAS.map((h) => (
            <OpcionRadio
              key={h.id}
              etiqueta={t(h.nombre)}
              detalle={t(h.detalle)}
              seleccionada={preferenciaHora === h.id}
              onPress={() => {
                if (preferenciaHora !== h.id) setPreferenciaHora(h.id);
              }}
            />
          ))}
        </View>
      </BloqueConfig>

      <BloqueConfig>
        <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
          {tituloAnimaciones}
        </Texto>
        <Texto rol="interfazSecundaria" tono="suave">
          {t('configuracion.animacionesExplicacion')}
        </Texto>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={tituloAnimaciones}
          style={styles.grupo}>
          {ANIMACIONES.map((a) => (
            <OpcionRadio
              key={a.id}
              etiqueta={t(a.nombre)}
              detalle={t(a.detalle)}
              seleccionada={preferencia === a.id}
              onPress={() => {
                if (preferencia !== a.id) setPreferencia(a.id);
              }}
            />
          ))}
        </View>
      </BloqueConfig>
    </SeccionConfig>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espaciado.sm },
});
