/**
 * Enlace de texto (`.link` en la maqueta): acento subrayado con un ícono a la derecha.
 * Objetivo táctil ≥ 44 pt aunque el texto sea chico; crece con la letra grande.
 */
import { Pressable, StyleSheet } from 'react-native';

import { Icono, type NombreIcono } from '@/components/icono';
import { Texto } from '@/components/texto';
import { espaciado, FACTOR_INTERLINEADO, familias, interlineado, medidas, useTema } from '@/theme';

const TAMANO = 13.5;
const ICONO = 16;

export function Enlace({
  texto,
  onPress,
  icono = 'flecha',
  etiquetaAccesible,
  pista,
  rol = 'link',
}: {
  texto: string;
  onPress: () => void;
  icono?: NombreIcono;
  etiquetaAccesible?: string;
  pista?: string;
  /** `button` si hace algo en la misma pantalla ("Otra oración"); `link` si navega. */
  rol?: 'link' | 'button';
}) {
  const { colores, paleta } = useTema();
  return (
    <Pressable
      accessibilityRole={rol}
      accessibilityLabel={etiquetaAccesible ?? texto}
      accessibilityHint={pista}
      onPress={onPress}
      style={({ pressed }) => [styles.enlace, pressed && styles.presionado]}>
      <Texto
        style={[
          styles.texto,
          { color: colores.acentoTexto, textDecorationColor: paleta.glow },
        ]}>
        {texto}
      </Texto>
      <Icono nombre={icono} color={colores.acentoTexto} tamano={ICONO} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  enlace: {
    minHeight: medidas.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: espaciado.xs + 2,
    flexShrink: 1,
  },
  presionado: { opacity: 0.7 },
  texto: {
    fontFamily: familias.interfazFuerte,
    fontSize: TAMANO,
    lineHeight: interlineado(TAMANO, FACTOR_INTERLINEADO.interfazChica),
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
});
