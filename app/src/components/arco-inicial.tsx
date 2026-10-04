/**
 * Ventana en arco pequeña con la inicial del santo (`.arch` en la maqueta): emplomado oscuro, luz
 * cálida que se funde en el `glow` de la paleta y la inicial en `primaryDeep`.
 *
 * Es decorativa (el nombre del santo va al lado), así que el lector la salta. La inicial no escala
 * con la letra del sistema porque la ventana tiene medida fija y la letra solo la adorna.
 */
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import {
  coloresVitral,
  conAlfa,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  useTema,
} from '@/theme';

const ANCHO = 52;
const ALTO = 66;
const BORDE = 3;
const RADIO_INFERIOR = 8;
const TAMANO_INICIAL = 26;
/** La maqueta baja la letra 3 px para centrarla en el arco. */
const BAJADA_INICIAL = 3;
const ALFA_RESPLANDOR = 0.45;

export function ArcoInicial({ inicial }: { inicial: string }) {
  const { paleta } = useTema();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.arco,
        {
          borderColor: coloresVitral.emplomado,
          backgroundColor: paleta.glow,
          experimental_backgroundImage: `radial-gradient(110% 70% at 50% 30%, ${coloresVitral.luzVentana}, ${paleta.glow} 75%)`,
          boxShadow: `0 0 16px ${conAlfa(paleta.glow, ALFA_RESPLANDOR)}`,
        },
      ]}>
      <Texto allowFontScaling={false} style={[styles.inicial, { color: paleta.primaryDeep }]}>
        {inicial}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  arco: {
    width: ANCHO,
    height: ALTO,
    borderWidth: BORDE,
    // Medio punto arriba (la mitad del ancho; 999 haría que CSS/RN escalaran también los de abajo).
    borderTopLeftRadius: ANCHO / 2,
    borderTopRightRadius: ANCHO / 2,
    borderBottomLeftRadius: RADIO_INFERIOR,
    borderBottomRightRadius: RADIO_INFERIOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: {
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_INICIAL,
    lineHeight: interlineado(TAMANO_INICIAL, FACTOR_INTERLINEADO.display),
    transform: [{ translateY: BAJADA_INICIAL }],
  },
});
