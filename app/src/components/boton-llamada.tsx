/**
 * Botón "¿Cómo te sientes hoy?" (`.cta` en la maqueta): degradado primary → primaryDeep, texto
 * blanco y flecha en un círculo de luz. Un brillo lo cruza cada 5.5 s (nivel 2) mientras `activo`;
 * con "Reducir movimiento" no hay brillo.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Icono } from '@/components/icono';
import { Texto } from '@/components/texto';
import { useReducirMovimiento } from '@/lib/animaciones';
import {
  coloresLlamada,
  conAlfa,
  espaciado,
  familias,
  FACTOR_INTERLINEADO,
  interlineado,
  radios,
  useTema,
} from '@/theme';
import { curvas, movimiento, tiempo } from '@/theme/movimiento';

const TAMANO_TEXTO = 17;
const FLECHA = 34;
const ICONO_FLECHA = 18;

export function BotonLlamada({
  texto,
  pista,
  onPress,
  activo,
}: {
  texto: string;
  pista?: string;
  onPress: () => void;
  /** El brillo solo corre mientras la pantalla está a la vista. */
  activo: boolean;
}) {
  const { paleta } = useTema();
  const reducir = useReducirMovimiento();
  const [ancho, setAncho] = useState(0);
  const ciclo = useSharedValue(0);

  useEffect(() => {
    if (!activo || reducir) {
      cancelAnimation(ciclo);
      ciclo.value = 0;
      return;
    }
    ciclo.value = 0;
    ciclo.value = withRepeat(withTiming(1, tiempo(movimiento.brilloLlamada, curvas.lineal)), -1, false);
    return () => cancelAnimation(ciclo);
  }, [activo, reducir, ciclo]);

  // Maqueta: quieto hasta el 60 %, cruza hasta el 85 %, quieto al otro lado.
  const estiloBrillo = useAnimatedStyle(() => {
    const t = interpolate(ciclo.value, [0, 0.6, 0.85, 1], [0, 0, 1, 1]);
    const suave = t * t * (3 - 2 * t);
    return { transform: [{ translateX: (-1.2 + 2.4 * suave) * ancho }] };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityHint={pista}
      onPress={onPress}
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      style={({ pressed }) => [
        styles.boton,
        {
          backgroundColor: paleta.primary,
          experimental_backgroundImage: `linear-gradient(135deg, ${paleta.primary}, ${paleta.primaryDeep})`,
          boxShadow: `0 14px 30px -10px ${conAlfa(paleta.primary, 0.7)}`,
        },
        pressed && styles.presionado,
      ]}>
      {!reducir && ancho > 0 && (
        // El recorte vive en la capa del brillo: el botón no recorta su texto con letra grande.
        <View pointerEvents="none" style={styles.capaBrillo}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                experimental_backgroundImage: `linear-gradient(110deg, ${coloresLlamada.brilloFin} 35%, ${coloresLlamada.brillo} 50%, ${coloresLlamada.brilloFin} 65%)`,
              },
              estiloBrillo,
            ]}
          />
        </View>
      )}
      <Texto style={[styles.texto, { color: coloresLlamada.texto }]}>{texto}</Texto>
      <View style={[styles.flecha, { backgroundColor: paleta.glow }]}>
        <Icono nombre="flecha" color={paleta.onGlow} tamano={ICONO_FLECHA} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: radios.tarjeta,
    borderCurve: 'continuous',
    paddingVertical: espaciado.lg + 1,
    paddingLeft: espaciado.xl,
    paddingRight: espaciado.lg + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  capaBrillo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    borderRadius: radios.tarjeta,
  },
  presionado: { opacity: 0.85 },
  texto: {
    flexShrink: 1,
    fontFamily: familias.interfazSemi,
    fontSize: TAMANO_TEXTO,
    lineHeight: interlineado(TAMANO_TEXTO, FACTOR_INTERLINEADO.interfazChica),
  },
  flecha: {
    width: FLECHA,
    height: FLECHA,
    borderRadius: FLECHA / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
