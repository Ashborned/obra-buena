/**
 * Chip de vidrio (`.chip` en la maqueta): etiqueta corta en mayúsculas, con un punto de color opcional
 * (color litúrgico). No es tocable.
 */
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { conAlfa, coloresVitral, espaciado, radios, useTema } from '@/theme';

/** La maqueta usa 0.08em en los chips (las etiquetas normales, 0.14em). */
const ESPACIADO_CHIP = 0.84;
const PUNTO = 9;

export function Chip({
  texto,
  punto,
  etiquetaAccesible,
}: {
  texto: string;
  /** Color del punto (p. ej. el litúrgico). */
  punto?: string;
  etiquetaAccesible?: string;
}) {
  const { superficies } = useTema();
  return (
    <View
      accessible
      accessibilityLabel={etiquetaAccesible ?? texto}
      style={[
        styles.chip,
        {
          backgroundColor: superficies.vidrio,
          borderColor: superficies.vidrioBorde,
          boxShadow: `0 10px 28px ${superficies.sombra}`,
        },
      ]}>
      {punto ? (
        <View
          style={[
            styles.punto,
            { backgroundColor: punto, borderColor: conAlfa(coloresVitral.sombraCelda, 0.25) },
          ]}
        />
      ) : null}
      <Texto rol="etiqueta" style={styles.texto}>
        {texto}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm - 2,
    paddingVertical: espaciado.sm - 2,
    paddingHorizontal: espaciado.md - 1,
    borderRadius: radios.pildora,
    borderWidth: 1,
    flexShrink: 1,
  },
  punto: {
    width: PUNTO,
    height: PUNTO,
    borderRadius: PUNTO / 2,
    borderWidth: 1,
  },
  texto: { letterSpacing: ESPACIADO_CHIP, flexShrink: 1 },
});
