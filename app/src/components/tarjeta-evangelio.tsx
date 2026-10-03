/**
 * Tarjeta del evangelio del día (`.gospel` en la maqueta): cita en itálica que muestra tres líneas y
 * se expande al tocar. Calma: el texto no se anima.
 *
 * Mientras no exista la fuente del evangelio (decisiones, pendiente 4) se muestra el ejemplo en
 * desarrollo con la etiqueta "Ejemplo"; en producción `contenido.evangelio_ejemplo` no existe y la
 * pantalla no dibuja esta tarjeta.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';
import {
  conAlfa,
  espaciado,
  familias,
  interlineado,
  radios,
  useTema,
} from '@/theme';

const TAMANO_CITA = 20;
const LINEAS_RESUMEN = 3;
const COMILLA = 120;

export function TarjetaEvangelio({
  referencia,
  texto,
  ejemplo,
}: {
  referencia: string;
  texto: string;
  /** Muestra la etiqueta "Ejemplo" (contenido sin fuente, solo en desarrollo). */
  ejemplo: boolean;
}) {
  const { t } = useTranslation();
  const { paleta, colores } = useTema();
  const [abierta, setAbierta] = useState(false);
  const titulo = `${t('hoy.evangelio')} · ${referencia}`;

  return (
    <Tarjeta
      onPress={() => setAbierta((a) => !a)}
      etiquetaAccesible={[titulo, ejemplo ? t('hoy.ejemplo') : null, texto].filter(Boolean).join('. ')}
      pista={abierta ? t('hoy.evangelioOcultar') : t('hoy.evangelioMostrar')}
      estadoAccesible={{ expanded: abierta }}
      style={styles.tarjeta}>
      {/* El recorte vive en la capa del adorno: la tarjeta no recorta su texto. */}
      <View pointerEvents="none" style={styles.capaAdorno}>
        <Texto
          aria-hidden
          allowFontScaling={false}
          style={[styles.comilla, { color: paleta.glow }]}>
          “
        </Texto>
      </View>
      <View style={styles.cabecera}>
        <Texto rol="etiqueta" tono="acento" style={styles.titulo}>
          {titulo}
        </Texto>
        {ejemplo && (
          <View style={[styles.ejemplo, { borderColor: colores.linea, backgroundColor: conAlfa(paleta.glow, 0.18) }]}>
            <Texto rol="etiqueta">{t('hoy.ejemplo')}</Texto>
          </View>
        )}
      </View>
      <Texto
        rol="displayItalica"
        numberOfLines={abierta ? undefined : LINEAS_RESUMEN}
        style={styles.cita}>
        {texto}
      </Texto>
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    paddingTop: espaciado.lg + 2,
    paddingBottom: espaciado.lg,
    paddingLeft: espaciado.xl,
    paddingRight: espaciado.lg + 2,
    gap: espaciado.sm,
  },
  capaAdorno: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: radios.tarjeta,
  },
  comilla: {
    position: 'absolute',
    right: 10,
    top: -24,
    fontFamily: familias.displaySemi,
    fontSize: COMILLA,
    lineHeight: COMILLA * 1.3,
    opacity: 0.55,
  },
  cabecera: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingRight: espaciado.xxxl,
  },
  titulo: { flexShrink: 1 },
  ejemplo: {
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xxs,
  },
  cita: {
    fontSize: TAMANO_CITA,
    // Maqueta: 1.32 (Cormorant necesita al menos 1.3, ver tipografia.ts).
    lineHeight: interlineado(TAMANO_CITA, 1.32),
  },
});
