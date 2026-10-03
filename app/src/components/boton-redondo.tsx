/**
 * Botón redondo de vidrio con un ícono (engranaje, cerrar…). Objetivo táctil de 44 pt.
 */
import { Pressable, StyleSheet } from 'react-native';

import { Icono, type NombreIcono } from '@/components/icono';
import { espaciado, medidas, radios, useTema } from '@/theme';

export function BotonRedondo({
  icono,
  etiqueta,
  onPress,
}: {
  icono: NombreIcono;
  /** Texto para el lector de pantalla (sale de i18n). */
  etiqueta: string;
  onPress: () => void;
}) {
  const { colores, superficies } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      hitSlop={espaciado.xs}
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
        pressed && styles.presionado,
      ]}>
      <Icono nombre={icono} color={colores.texto} tamano={medidas.iconoBoton} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: medidas.toqueMinimo,
    height: medidas.toqueMinimo,
    borderRadius: radios.pildora,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.7 },
});
