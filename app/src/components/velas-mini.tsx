/**
 * Nueve velas pequeñas de una novena (`.mcandles` en la maqueta), dibujadas con Skia.
 * Encendidas según el progreso guardado; la del día que toca lleva un contorno de acento.
 * Las llamas titilan con tres duraciones distintas para no sincronizarse (nivel 2); con
 * "Reducir movimiento" o sin `titilar` quedan quietas. Decorativas: la tarjeta lleva la etiqueta.
 */
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { View } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { coloresVela, useTema } from '@/theme';
import { movimiento } from '@/theme/movimiento';

const ANCHO = 9;
const ALTO = 20;
const SEPARACION = 7;
const LLAMA_ANCHO = 8;
const LLAMA_ALTO = 12;
const MECHA = 4;
/** Margen para el resplandor de las llamas y el contorno del día actual. */
const MARGEN = 10;
const ARRIBA = LLAMA_ALTO + MECHA + MARGEN;
export const ANCHO_VELAS_MINI = 9 * ANCHO + 8 * SEPARACION + 2 * MARGEN;
const ALTO_LIENZO = ARRIBA + ALTO + 4;

const V = coloresVela;

/** Como la maqueta: cada 3.ª vela 1.6 s, cada 2.ª 2.3 s, las demás 1.9 s. */
function grupoDeLlama(dia: number): 0 | 1 | 2 {
  if (dia % 3 === 0) return 2;
  if (dia % 2 === 0) return 1;
  return 0;
}

function Llama({ x, ritmo }: { x: number; ritmo: SharedValue<number> }) {
  const cx = x + ANCHO / 2;
  const abajo = ARRIBA - 2;
  const arriba = abajo - LLAMA_ALTO;
  const media = LLAMA_ANCHO / 2;
  const forma = `M${cx} ${arriba} C${cx + media * 1.15} ${arriba + LLAMA_ALTO * 0.45} ${cx + media} ${abajo} ${cx} ${abajo} C${cx - media} ${abajo} ${cx - media * 1.15} ${arriba + LLAMA_ALTO * 0.45} ${cx} ${arriba} Z`;
  const transform = useDerivedValue(() => {
    const t = ritmo.value;
    return [{ rotate: ((-2 + 3.5 * t) * Math.PI) / 180 }, { scaleX: 1.03 - 0.07 * t }, { scaleY: 0.95 + 0.09 * t }];
  });
  return (
    <Group transform={transform} origin={vec(cx, abajo)}>
      <Circle cx={cx} cy={abajo - LLAMA_ALTO * 0.35} r={6} color={V.resplandor}>
        <BlurMask blur={5} style="normal" />
      </Circle>
      <Path path={forma}>
        <RadialGradient
          c={vec(cx, arriba + LLAMA_ALTO * 0.72)}
          r={LLAMA_ALTO * 0.6}
          colors={[V.llamaCentro, V.llamaOro, V.llamaNaranja, V.llamaBorde]}
          positions={[0, 0.4, 0.75, 1]}
        />
      </Path>
    </Group>
  );
}

export function VelasMini({
  encendidas,
  diaActual,
  titilar,
}: {
  /** Días (1–9) con vela encendida. */
  encendidas: readonly number[];
  /** Día que toca hoy (contorno), o null. */
  diaActual: number | null;
  titilar: boolean;
}) {
  const { colores } = useTema();
  const reducir = useReducedMotion();
  const r0 = useSharedValue(0);
  const r1 = useSharedValue(0.4);
  const r2 = useSharedValue(0.8);
  const hayLlamas = encendidas.length > 0;

  useEffect(() => {
    const ritmos = [r0, r1, r2];
    if (!titilar || reducir || !hayLlamas) {
      ritmos.forEach((r) => cancelAnimation(r));
      return;
    }
    ritmos.forEach((r, i) => {
      r.value = withRepeat(
        withTiming(r.value > 0.5 ? 0 : 1, { duration: movimiento.llamas[i], easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    });
    return () => ritmos.forEach((r) => cancelAnimation(r));
  }, [titilar, reducir, hayLlamas, r0, r1, r2]);

  const ritmos = [r0, r1, r2];
  const dias = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: ANCHO_VELAS_MINI, height: ALTO_LIENZO, marginLeft: -MARGEN, marginTop: -MARGEN / 2 }}>
      <Canvas style={{ width: ANCHO_VELAS_MINI, height: ALTO_LIENZO }}>
        {dias.map((dia) => {
          const x = MARGEN + (dia - 1) * (ANCHO + SEPARACION);
          const encendida = encendidas.includes(dia);
          return (
            <Group key={dia}>
              {diaActual === dia && (
                <RoundedRect
                  x={x - 3}
                  y={ARRIBA - 3}
                  width={ANCHO + 6}
                  height={ALTO + 6}
                  r={5}
                  style="stroke"
                  strokeWidth={2}
                  color={colores.acento}
                />
              )}
              <Group opacity={encendida ? 1 : 0.5}>
                <RoundedRect x={x} y={ARRIBA} width={ANCHO} height={ALTO} r={2.5}>
                  <LinearGradient
                    start={vec(x, 0)}
                    end={vec(x + ANCHO, 0)}
                    colors={[V.ceraBorde, V.ceraLuz, V.ceraSombra]}
                    positions={[0, 0.45, 1]}
                  />
                </RoundedRect>
                <RoundedRect
                  x={x + ANCHO / 2 - 0.75}
                  y={ARRIBA - MECHA}
                  width={1.5}
                  height={MECHA}
                  r={1}
                  color={V.mecha}
                />
              </Group>
              {encendida && <Llama x={x} ritmo={ritmos[grupoDeLlama(dia)]} />}
            </Group>
          );
        })}
      </Canvas>
    </View>
  );
}
