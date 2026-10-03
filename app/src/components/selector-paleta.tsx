/**
 * Selector de paleta (Configuración): Rosa mística y Vitral como un grupo de opciones de radio.
 * Cada opción muestra tres luces de su paleta (primary, glow, glowSoft) y su nombre.
 *
 * El cambio se aplica al instante en toda la app; el cielo entra con su fundido de 0.6 s
 * (fondo.tsx), que también vale con "Reducir movimiento". La elección queda guardada en el teléfono.
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { useTranslation, type ClaveTexto } from '@/i18n';
import { espaciado, medidas, paletas, PALETAS_IDS, radios, useTema, type PaletaId } from '@/theme';

const NOMBRES: Record<PaletaId, ClaveTexto> = {
  rosaMistica: 'configuracion.paletas.rosaMistica',
  vitral: 'configuracion.paletas.vitral',
};

/** Diámetro de cada luz de la muestra y cuánto se superponen. */
const LUZ = 28;
const SUPERPOSICION = 9;
/** Indicador de radio: anillo exterior y punto interior. */
const RADIO_ANILLO = 24;
const RADIO_PUNTO = 12;
const BORDE_SELECCION = 2;

function Muestra({ id }: { id: PaletaId }) {
  const { superficies } = useTema();
  const p = paletas[id];
  return (
    <View style={styles.muestra} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[p.primary, p.glow, p.glowSoft].map((color, i) => (
        <View
          key={color}
          style={[
            styles.luz,
            { backgroundColor: color, borderColor: superficies.vidrioBorde, zIndex: 3 - i },
            i > 0 && { marginLeft: -SUPERPOSICION },
          ]}
        />
      ))}
    </View>
  );
}

export function SelectorPaleta() {
  const { paletaId, setPaleta, colores, superficies } = useTema();
  const { t } = useTranslation();
  const tituloSeccion = t('configuracion.paleta');

  return (
    <View style={styles.seccion}>
      <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
        {tituloSeccion}
      </Texto>
      <View accessibilityRole="radiogroup" accessibilityLabel={tituloSeccion} style={styles.grupo}>
        {PALETAS_IDS.map((id) => {
          const seleccionada = id === paletaId;
          const nombre = t(NOMBRES[id]);
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: seleccionada }}
              accessibilityLabel={nombre}
              onPress={() => {
                if (!seleccionada) setPaleta(id);
              }}
              style={({ pressed }) => [
                styles.opcion,
                {
                  backgroundColor: superficies.vidrio,
                  borderColor: seleccionada ? colores.acento : superficies.vidrioBorde,
                },
                pressed && styles.presionada,
              ]}>
              <Muestra id={id} />
              <Texto rol="titulo" style={styles.nombre}>
                {nombre}
              </Texto>
              <View
                style={[styles.anillo, { borderColor: seleccionada ? colores.acento : colores.textoSuave }]}>
                {seleccionada && <View style={[styles.punto, { backgroundColor: colores.acento }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: espaciado.sm },
  grupo: { gap: espaciado.sm },
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
  muestra: { flexDirection: 'row' },
  luz: {
    width: LUZ,
    height: LUZ,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
  nombre: { flex: 1 },
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
