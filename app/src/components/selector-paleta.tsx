/**
 * Selector de paleta (Configuración): Rosa mística y Vitral como un grupo de opciones de radio.
 * Cada opción muestra tres luces de su paleta (primary, glow, glowSoft) y su nombre.
 *
 * El cambio se aplica al instante en toda la app; el cielo entra con su fundido de 0.6 s
 * (fondo.tsx), que también vale con "Reducir movimiento". La elección queda guardada en el teléfono.
 */
import { StyleSheet, View } from 'react-native';

import { OpcionRadio } from '@/components/opcion-radio';
import { Texto } from '@/components/texto';
import { useTranslation, type ClaveTexto } from '@/i18n';
import { espaciado, paletas, PALETAS_IDS, radios, useTema, type PaletaId } from '@/theme';

const NOMBRES: Record<PaletaId, ClaveTexto> = {
  rosaMistica: 'configuracion.paletas.rosaMistica',
  vitral: 'configuracion.paletas.vitral',
};

/** Diámetro de cada luz de la muestra y cuánto se superponen. */
const LUZ = 28;
const SUPERPOSICION = 9;

function Muestra({ id }: { id: PaletaId }) {
  const { superficies } = useTema();
  const p = paletas[id];
  return (
    <View style={styles.muestra}>
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
  const { paletaId, setPaleta } = useTema();
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
          return (
            <OpcionRadio
              key={id}
              etiqueta={t(NOMBRES[id])}
              seleccionada={seleccionada}
              inicio={<Muestra id={id} />}
              onPress={() => {
                if (!seleccionada) setPaleta(id);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: espaciado.sm },
  grupo: { gap: espaciado.sm },
  muestra: { flexDirection: 'row' },
  luz: {
    width: LUZ,
    height: LUZ,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
});
