/**
 * Configuración → Apariencia: paleta, hora de oración, animaciones y "Mover la luz al inclinar el
 * teléfono". Todo se aplica al instante y queda guardado en el teléfono (la hora y la paleta en el
 * tema, las animaciones y la inclinación en `animaciones.tsx`).
 *
 * La inclinación usa la gravedad que lee Reanimated: no pide permisos. Con movimiento reducido (del
 * sistema o "Reducidas") el interruptor queda deshabilitado, apagado y con la explicación.
 */
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { BloqueConfig, SeccionConfig } from '@/components/config/seccion';
import { OpcionRadio } from '@/components/opcion-radio';
import { SelectorPaleta } from '@/components/selector-paleta';
import { Texto } from '@/components/texto';
import { useTranslation, type ClaveTexto } from '@/i18n';
import { usePreferenciaAnimaciones, useReducirMovimiento } from '@/lib/animaciones';
import type { PreferenciaHora } from '@/lib/hora-oracion';
import type { PreferenciaAnimaciones } from '@/lib/preferencias';
import { espaciado, medidas, radios, useTema } from '@/theme';

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
        <InterruptorInclinacion />
      </BloqueConfig>
    </SeccionConfig>
  );
}

/**
 * "Mover la luz al inclinar el teléfono". Toda la fila es el interruptor para el lector y para el dedo
 * (como los avisos de novena); el `Switch` nativo es solo el dibujo.
 */
function InterruptorInclinacion() {
  const { t } = useTranslation();
  const { colores, superficies } = useTema();
  const { inclinacion, setInclinacion } = usePreferenciaAnimaciones();
  const reducir = useReducirMovimiento();
  const encendida = inclinacion && !reducir;
  const detalle = reducir ? t('configuracion.inclinacionReducidas') : t('configuracion.inclinacionDetalle');

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={t('configuracion.inclinacion')}
      accessibilityHint={detalle}
      accessibilityState={{ checked: encendida, disabled: reducir }}
      disabled={reducir}
      onPress={() => setInclinacion(!inclinacion)}
      style={({ pressed }) => [
        styles.fila,
        { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
        pressed && styles.presionada,
      ]}>
      <View style={styles.crece}>
        <Texto rol="titulo">{t('configuracion.inclinacion')}</Texto>
        <Texto rol="interfazSecundaria" tono="suave">
          {detalle}
        </Texto>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch
          value={encendida}
          disabled={reducir}
          onValueChange={setInclinacion}
          trackColor={{ false: colores.textoSuave, true: colores.acento }}
          ios_backgroundColor={colores.textoSuave}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espaciado.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    minHeight: medidas.toqueMinimo + espaciado.md,
    marginTop: espaciado.xs,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.tarjeta,
    // Mismo grosor que las opciones de radio, para que las filas alineen.
    borderWidth: 2,
    borderCurve: 'continuous',
  },
  crece: { flex: 1, gap: espaciado.xxs },
  // Deshabilitada no se atenúa: el texto debe seguir en AA; lo dicen el Switch nativo y la explicación.
  presionada: { opacity: 0.7 },
});
