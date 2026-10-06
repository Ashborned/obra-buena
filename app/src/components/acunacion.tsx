/**
 * Recompensas de Aprender (nivel 1 de docs/guia-movimiento.md), como `.reveal` en la maqueta.
 *
 * - `MedallaAcunada`: la medalla se acuña (≈1.1 s): gira en 3D desde lejos (perspectiva + rotateY +
 *   escala con un leve sobrepaso), detrás giran rayos en el glow de la paleta y saltan partículas
 *   doradas (Skia). Los rayos giran un tramo y se detienen (nada infinito); todo se corta al perder el
 *   foco.
 * - `ColeccionCompleta`: las medallas de la colección se ordenan en arco y aparece la medalla de la
 *   colección (≈2 s).
 *
 * Con "Reducir movimiento": solo fundidos (sin giro, sin rayos girando y sin partículas).
 */
import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Medalla, PROPORCION_MEDALLA } from '@/components/medalla';
import type { Lectura } from '@/contenido/tipos';
import { coloresMedalla, conAlfa, rayosMedalla, useTema } from '@/theme';
import { movimiento } from '@/theme/movimiento';

/** Curva de la acuñación (maqueta: cubic-bezier(.2, 1.3, .3, 1), con sobrepaso). */
const CURVA_ACUNAR = Easing.bezier(0.2, 1.3, 0.3, 1);
/** Vueltas de la medalla al acuñar (maqueta: rotateY 540°). */
const GIRO_INICIAL = 540;
/** Escala inicial ("desde lejos"). */
const ESCALA_INICIAL = 0.2;
/** Perspectiva del giro 3D. */
const PERSPECTIVA = 800;
/** Tramo que giran los rayos antes de detenerse (radianes). */
const GIRO_RAYOS = Math.PI / 2;
/** Los rayos aparecen un poco después que la medalla (maqueta: 0.4 s). */
const RETRASO_RAYOS = 400;
/** Las partículas saltan cuando la medalla llega. */
const RETRASO_PARTICULAS = 350;
const PARTICULAS = 26;
/** El lienzo de los rayos es este factor del ancho de la medalla (maqueta: 250 / 190). */
const FACTOR_LIENZO = 1.32;

// Medalla acuñada ------------------------------------------------------------------------------

export function MedallaAcunada({
  children,
  tamano,
  reducir,
  activo,
}: {
  /** La medalla (se dibuja delante de los rayos). */
  children: ReactNode;
  tamano: number;
  reducir: boolean;
  /** Pantalla a la vista: al perder el foco, rayos y partículas se detienen. */
  activo: boolean;
}) {
  const { paleta } = useTema();
  const lado = tamano * FACTOR_LIENZO;
  const acunar = useSharedValue(0);
  const rayos = useSharedValue(0);
  const giro = useSharedValue(0);
  const chispas = useSharedValue(0);

  useEffect(() => {
    if (reducir) {
      acunar.set(withTiming(1, { duration: movimiento.fundido }));
      rayos.set(withTiming(1, { duration: movimiento.fundido }));
      return;
    }
    acunar.set(
      withTiming(1, {
        duration: movimiento.acunarMedalla,
        easing: CURVA_ACUNAR,
      }),
    );
    rayos.set(withDelay(RETRASO_RAYOS, withTiming(1, { duration: movimiento.acunarMedalla })));
    giro.set(
      withTiming(GIRO_RAYOS, {
        duration: movimiento.rayosMedalla,
        easing: Easing.out(Easing.cubic),
      }),
    );
    chispas.set(
      withDelay(
        RETRASO_PARTICULAS,
        withTiming(1, {
          duration: movimiento.particulasMedalla,
          easing: Easing.out(Easing.quad),
        }),
      ),
    );
  }, [reducir, acunar, rayos, giro, chispas]);

  useEffect(() => {
    if (activo) return;
    // Fuera de foco: todo queda en su estado final, sin seguir animando.
    [acunar, rayos, giro, chispas].forEach((v) => cancelAnimation(v));
    acunar.set(1);
    rayos.set(1);
    chispas.set(1);
  }, [activo, acunar, rayos, giro, chispas]);

  const estiloMedalla = useAnimatedStyle(() => {
    if (reducir) return { opacity: acunar.value };
    return {
      opacity: interpolate(acunar.value, [0, 0.6], [0, 1], 'clamp'),
      transform: [
        { perspective: PERSPECTIVA },
        { rotateY: `${GIRO_INICIAL * (1 - acunar.value)}deg` },
        { scale: ESCALA_INICIAL + (1 - ESCALA_INICIAL) * acunar.value },
      ],
    };
  });

  return (
    <View style={[styles.escenario, { width: lado, height: lado }]}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rayos lado={lado} color={paleta.glow} opacidad={rayos} giro={giro} />
        {reducir ? null : <Particulas lado={lado} tamano={tamano} progreso={chispas} />}
      </Canvas>
      {/* Sin boxShadow: en Android, sobre una vista transparente, se dibuja como un óvalo oscuro
          relleno detrás de la medalla (no sigue su silueta como el drop-shadow de la maqueta). */}
      <Animated.View style={estiloMedalla}>{children}</Animated.View>
    </View>
  );
}

function Rayos({
  lado,
  color,
  opacidad,
  giro,
}: {
  lado: number;
  color: string;
  opacidad: SharedValue<number>;
  giro: SharedValue<number>;
}) {
  const c = lado / 2;
  const cunas = useMemo(() => {
    const paso = (2 * Math.PI) / rayosMedalla.cunas;
    const ancho = (rayosMedalla.ancho * Math.PI) / 180;
    let d = '';
    for (let k = 0; k < rayosMedalla.cunas; k++) {
      const a0 = k * paso;
      d += `M${c} ${c}L${c + Math.cos(a0) * c} ${c + Math.sin(a0) * c}L${c + Math.cos(a0 + ancho) * c} ${c + Math.sin(a0 + ancho) * c}Z`;
    }
    return Skia.Path.MakeFromSVGString(d);
  }, [c]);
  const transformacion = useDerivedValue(() => [{ rotate: giro.value }]);
  const brillo = conAlfa(color, rayosMedalla.alfa);
  return (
    <Group opacity={opacidad} origin={vec(c, c)} transform={transformacion}>
      {cunas ? (
        <Path path={cunas}>
          <RadialGradient
            c={vec(c, c)}
            r={c}
            colors={[brillo, brillo, conAlfa(color, 0)]}
            positions={[0, rayosMedalla.inicioFundido, 1]}
          />
        </Path>
      ) : null}
    </Group>
  );
}

/** Partículas fijas por índice (nada al azar en cada cuadro). */
const DATOS_PARTICULAS = Array.from({ length: PARTICULAS }, (_, i) => {
  const angulo = (i / PARTICULAS) * 2 * Math.PI + (i % 3) * 0.17;
  return {
    angulo,
    alcance: 0.55 + ((i * 37) % 11) / 22,
    radio: 1.6 + (i % 4) * 0.7,
    color: coloresMedalla.particula[i % coloresMedalla.particula.length],
  };
});

function Particulas({
  lado,
  tamano,
  progreso,
}: {
  lado: number;
  tamano: number;
  progreso: SharedValue<number>;
}) {
  return (
    <Group>
      {DATOS_PARTICULAS.map((d, i) => (
        <Particula key={i} {...d} lado={lado} tamano={tamano} progreso={progreso} />
      ))}
    </Group>
  );
}

function Particula({
  angulo,
  alcance,
  radio,
  color,
  lado,
  tamano,
  progreso,
}: (typeof DATOS_PARTICULAS)[number] & {
  lado: number;
  tamano: number;
  progreso: SharedValue<number>;
}) {
  const c = lado / 2;
  const distancia = (lado / 2) * alcance;
  // Caída leve, como si las chispas tuvieran peso.
  const caida = tamano * 0.18;
  const cx = useDerivedValue(() => c + Math.cos(angulo) * distancia * progreso.value);
  const cy = useDerivedValue(
    () => c + Math.sin(angulo) * distancia * progreso.value + caida * progreso.value * progreso.value,
  );
  const opacidad = useDerivedValue(() => (progreso.value <= 0 ? 0 : 1 - progreso.value));
  return <Circle cx={cx} cy={cy} r={radio} color={color} opacity={opacidad} />;
}

// Colección completa ---------------------------------------------------------------------------

/** Medallas pequeñas en el arco. */
const TAMANO_ARCO = 48;
/** Medalla de la colección. */
const TAMANO_COLECCION = 112;
const ANCHO_ESCENA = 280;
const ALTO_ESCENA = 250;
/** Arco: de 200° a 340° (por arriba), radio en pt. */
const ARCO_DESDE = (200 * Math.PI) / 180;
const ARCO_HASTA = (340 * Math.PI) / 180;
const RADIO_ARCO = 104;
const CENTRO_Y = 150;

export function ColeccionCompleta({
  nombre,
  lecturas,
  reducir,
}: {
  nombre: string;
  lecturas: Lectura[];
  reducir: boolean;
}) {
  const n = lecturas.length;
  const posiciones = lecturas.map((_, i) => {
    const a =
      n === 1 ? (ARCO_DESDE + ARCO_HASTA) / 2 : ARCO_DESDE + ((ARCO_HASTA - ARCO_DESDE) * i) / (n - 1);
    return {
      x: ANCHO_ESCENA / 2 + Math.cos(a) * RADIO_ARCO - TAMANO_ARCO / 2,
      y: CENTRO_Y + Math.sin(a) * RADIO_ARCO - (TAMANO_ARCO * PROPORCION_MEDALLA) / 2,
    };
  });
  const paso = movimiento.coleccionCompleta / 2 / Math.max(1, n);

  return (
    <View
      style={{ width: ANCHO_ESCENA, height: ALTO_ESCENA }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      {lecturas.map((l, i) => (
        <MedallaEnArco key={l.id} lectura={l} destino={posiciones[i]} retraso={i * paso} reducir={reducir} />
      ))}
      <MedallaColeccionEntrando
        nombre={nombre}
        reducir={reducir}
        retraso={movimiento.coleccionCompleta / 2}
      />
    </View>
  );
}

function MedallaEnArco({
  lectura,
  destino,
  retraso,
  reducir,
}: {
  lectura: Lectura;
  destino: { x: number; y: number };
  retraso: number;
  reducir: boolean;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(
        reducir ? 0 : retraso,
        withTiming(1, {
          duration: reducir ? movimiento.fundido : movimiento.coleccionCompleta / 2,
          easing: Easing.out(Easing.cubic),
        }),
      ),
    );
  }, [p, retraso, reducir]);
  // Salen del centro (donde está la medalla recién ganada) y se ordenan en el arco.
  const origen = {
    x: ANCHO_ESCENA / 2 - TAMANO_ARCO / 2,
    y: CENTRO_Y - (TAMANO_ARCO * PROPORCION_MEDALLA) / 2,
  };
  const estilo = useAnimatedStyle(() => {
    if (reducir)
      return {
        opacity: p.value,
        transform: [{ translateX: destino.x }, { translateY: destino.y }],
      };
    return {
      opacity: interpolate(p.value, [0, 0.3], [0, 1], 'clamp'),
      transform: [
        { translateX: origen.x + (destino.x - origen.x) * p.value },
        { translateY: origen.y + (destino.y - origen.y) * p.value },
        { scale: 0.6 + 0.4 * p.value },
      ],
    };
  });
  return (
    <Animated.View style={[styles.enArco, estilo]}>
      <Medalla variante="lectura" lectura={lectura} rasgos={lectura.traits} tamano={TAMANO_ARCO} />
    </Animated.View>
  );
}

function MedallaColeccionEntrando({
  nombre,
  reducir,
  retraso,
}: {
  nombre: string;
  reducir: boolean;
  retraso: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(
      withDelay(
        retraso,
        withTiming(
          1,
          reducir
            ? { duration: movimiento.fundido }
            : {
                duration: movimiento.coleccionCompleta / 2,
                easing: CURVA_ACUNAR,
              },
        ),
      ),
    );
  }, [p, retraso, reducir]);
  const estilo = useAnimatedStyle(() => {
    if (reducir) return { opacity: p.value };
    return {
      opacity: interpolate(p.value, [0, 0.5], [0, 1], 'clamp'),
      transform: [
        { perspective: PERSPECTIVA },
        { rotateY: `${360 * (1 - p.value)}deg` },
        { scale: 0.3 + 0.7 * p.value },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.enArco,
        {
          left: ANCHO_ESCENA / 2 - TAMANO_COLECCION / 2,
          top: CENTRO_Y - (TAMANO_COLECCION * PROPORCION_MEDALLA) / 2 + 24,
        },
        estilo,
      ]}>
      <Medalla variante="coleccion" nombre={nombre} tamano={TAMANO_COLECCION} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  escenario: { alignItems: 'center', justifyContent: 'center' },
  enArco: { position: 'absolute', left: 0, top: 0 },
});
