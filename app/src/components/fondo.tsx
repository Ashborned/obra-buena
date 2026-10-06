/**
 * Cielo de la hora de oración detrás de cada pantalla: fondo sólido, dos manchas de luz y estrellas en
 * Completas.
 *
 * Grano de película (opacidad 0.16, docs/sistema-diseno.md → Superficies): pendiente. Probado como
 * lienzo Skia a pantalla completa con mezcla overlay, bajaba Hoy de ~17 a ~9 cuadros por segundo en
 * el emulador (cada cuadro recompone la pantalla entera); se retoma con una textura más barata.
 *
 * Al cruzar de Laudes a Vísperas o Completas (o al cambiar paleta) el cielo nuevo entra con un
 * fundido de 0.6 s (guía de movimiento, nivel 2). Es solo un fundido, así que vale también con
 * "Reducir movimiento".
 *
 * Estrellas: quietas por defecto. Con `titilar` (Hoy, mientras está a la vista) titilan muy suave en
 * tres grupos desfasados; con "Reducir movimiento" nunca titilan. Las pantallas de oración no lo piden.
 */
import { Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useReducirMovimiento } from '@/lib/animaciones';
import { generadorAleatorio, hashTexto } from '@/lib/vitral';
import { coloresCielo, degradadosCielo, useTema } from '@/theme';
import { curvas, fundido, movimiento, tiempo } from '@/theme/movimiento';

/** Estrellas por grupo (tres grupos, como capas que titilan a destiempo). */
const ESTRELLAS_POR_GRUPO = 12;
/** Opacidad mínima al titilar (sutil: nunca se apagan). */
const TITILEO_MINIMO = 0.45;

type Estrella = { x: number; y: number; r: number };

function grupoDeEstrellas(indice: number): Estrella[] {
  const r = generadorAleatorio(hashTexto(`estrellas-${indice}`));
  return Array.from({ length: ESTRELLAS_POR_GRUPO }, () => ({
    x: r(),
    y: r() * 0.95,
    r: 0.5 + r() * 0.7,
  }));
}

const GRUPOS = [0, 1, 2].map(grupoDeEstrellas);

function GrupoEstrellas({
  estrellas,
  brillo,
  ancho,
  alto,
}: {
  estrellas: Estrella[];
  brillo: SharedValue<number>;
  ancho: number;
  alto: number;
}) {
  const opacidad = useDerivedValue(() => TITILEO_MINIMO + (1 - TITILEO_MINIMO) * brillo.value);
  return (
    <Group opacity={opacidad}>
      {estrellas.map((e, i) => (
        <Circle key={i} cx={e.x * ancho} cy={e.y * alto} r={e.r} color={coloresCielo.estrella} />
      ))}
    </Group>
  );
}

function Estrellas({ titilar }: { titilar: boolean }) {
  const { width, height } = useWindowDimensions();
  const reducir = useReducirMovimiento();
  const b0 = useSharedValue(1);
  const b1 = useSharedValue(0.6);
  const b2 = useSharedValue(0.3);
  const brillos = useMemo(() => [b0, b1, b2], [b0, b1, b2]);

  useEffect(() => {
    if (!titilar || reducir) {
      brillos.forEach((b) => cancelAnimation(b));
      return;
    }
    brillos.forEach((b, i) => {
      b.value = withRepeat(
        withTiming(b.value > 0.5 ? 0 : 1, tiempo(movimiento.estrellas[i], curvas.vaiven)),
        -1,
        true,
      );
    });
    return () => brillos.forEach((b) => cancelAnimation(b));
  }, [titilar, reducir, brillos]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {GRUPOS.map((estrellas, i) => (
        <GrupoEstrellas key={i} estrellas={estrellas} brillo={brillos[i]} ancho={width} alto={height} />
      ))}
    </Canvas>
  );
}


export function Fondo({ children, titilar = false }: { children: ReactNode; titilar?: boolean }) {
  const { cielo, paletaId, hora } = useTema();

  return (
    <View style={[styles.relleno, { backgroundColor: cielo.fondo }]}>
      <Animated.View
        key={`${paletaId}-${hora}`}
        entering={fundido.entrada(movimiento.cambioCielo)}
        exiting={fundido.salida(movimiento.cambioCielo)}
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: cielo.fondo, experimental_backgroundImage: degradadosCielo(cielo) },
        ]}>
        {cielo.estrellas && <Estrellas titilar={titilar} />}
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  relleno: { flex: 1 },
});
