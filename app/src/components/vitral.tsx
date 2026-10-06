/**
 * Vitral (hero de Hoy y de la historia del santo): celdas tipo Voronoi con emplomado oscuro, ventana
 * en arco con la inicial del santo, halo, haz de luz y cinta del misal con el color litúrgico del día.
 * Portado de `glassHero` y `drawGlass` en prototype/obra-buena.html, dibujado con Skia.
 *
 * Tres lienzos para no redibujar de más:
 * 1. Celdas, velo de la hora, viñeta y resplandor de la ventana: estático (solo se mueve durante la apertura).
 * 2. Haz de luz y halo: lo único que se anima siempre (nivel 2), dos figuras.
 * 3. Ventana en arco y cinta: estático, encima del halo.
 *
 * Movimiento (docs/guia-movimiento.md):
 * - Nivel 1, `apertura`: el vitral se arma celda por celda desde el centro, la luz entra en diagonal
 *   y el halo se enciende (1.2 s). Quien decide si toca (una vez por día) es la pantalla.
 * - Nivel 2, `vida`: haz de luz 11 s ida y vuelta y halo 40 s por vuelta. La pantalla lo apaga al
 *   perder el foco.
 * - Nivel 2, inclinación (opcional, Configuración → Apariencia): con `vida` y el interruptor
 *   encendido, el haz se corre unos pocos puntos y el halo unos grados según la gravedad
 *   (`useAnimatedSensor(SensorType.GRAVITY)` de Reanimated: hilo de UI, sin permisos). El sensor
 *   solo existe mientras el vitral está a la vista; al apagarse, la luz vuelve suave al centro.
 * - Con "Reducir movimiento": la apertura es un fundido y no hay haz, giro ni inclinación.
 *
 * Es decorativo: queda oculto al lector de pantalla (el nombre del santo está debajo, en texto).
 */
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Shadow,
  SweepGradient,
  TwoPointConicalGradient,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  SensorType,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useInclinacionVitral, useReducirMovimiento } from '@/lib/animaciones';
import { celdasVitral, type CeldaVitral } from '@/lib/vitral';
import {
  coloresVitral,
  conAlfa,
  familias,
  hexLiturgico,
  medidasVitral,
  mezclarOklab,
  radios,
  useTema,
  type IdColorLiturgico,
} from '@/theme';
import { curvas, movimiento, tiempo } from '@/theme/movimiento';

const M = medidasVitral;
const C = coloresVitral;

/** Parte de la apertura (0–1) en que arranca cada celda según su distancia al centro, y lo que dura. */
const APERTURA_CELDAS_RETRASO = 0.55;
const APERTURA_CELDA = 0.35;
/** La luz entra en diagonal en la segunda mitad y el halo se enciende al final. */
const APERTURA_LUZ_DESDE = 0.25;
const APERTURA_HALO_DESDE = 0.5;
const HALO_OPACIDAD = 0.85;
const DOS_PI = Math.PI * 2;

/** Inclinación: cuánto se corre el haz (pt) y gira el halo (rad) con el teléfono del todo inclinado. */
const INCLINACION_HAZ_X = 16;
const INCLINACION_HAZ_Y = 10;
const INCLINACION_HALO = 0.1;
/** Gravedad (m/s², la unidad del sensor en las dos plataformas). */
const GRAVEDAD = 9.81;
/** iOS informa la gravedad hacia el suelo y Android al revés: se lleva todo al eje de Android. */
const SIGNO_GRAVEDAD = Platform.OS === 'ios' ? -1 : 1;
/** Suavizado exponencial por cuadro (60 fps) con las constantes de tiempo de `movimiento`. */
const CUADRO = 1000 / 60;
const ALFA_INCLINACION = 1 - Math.exp(-CUADRO / (movimiento.inclinacion / 3));
const ALFA_CENTRO = 1 - Math.exp(-CUADRO / movimiento.inclinacionCentro);

const acotar = (v: number) => {
  'worklet';
  return Math.min(1, Math.max(0, v));
};

/** Polígono → trazo SVG (Skia acepta la cadena directamente). */
function trazo(celda: CeldaVitral): string {
  return (
    celda.poligono.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z'
  );
}

/** Ventana en arco: medio punto arriba y esquinas redondeadas abajo. */
function trazoArco(x: number, y: number, ancho: number, alto: number, radioInferior: number): string {
  const r = ancho / 2;
  const b = y + alto;
  const d = x + ancho;
  return [
    `M${x} ${y + r}`,
    `A${r} ${r} 0 0 1 ${d} ${y + r}`,
    `L${d} ${b - radioInferior}`,
    `Q${d} ${b} ${d - radioInferior} ${b}`,
    `L${x + radioInferior} ${b}`,
    `Q${x} ${b} ${x} ${b - radioInferior}`,
    'Z',
  ].join(' ');
}

const acotarSimetrico = (v: number) => {
  'worklet';
  return Math.min(1, Math.max(-1, v));
};

/**
 * Lee la gravedad y deja en `x` / `y` la inclinación suavizada (−1 a 1). Solo se monta mientras la
 * luz debe seguir al teléfono: al desmontarse, Reanimated suelta el sensor. Todo corre en el hilo de
 * UI (nada de setState por cuadro).
 *
 * - `x`: de lado (izquierda / derecha), con el centro en el teléfono derecho.
 * - `y`: adelante / atrás, relativo a cómo se sostiene el teléfono; ese centro se acomoda muy lento,
 *   así la luz vuelve al medio si la persona se queda quieta en otra postura.
 */
function SensorInclinacion({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  const { sensor } = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const centroY = useSharedValue<number | null>(null);
  useAnimatedReaction(
    () => sensor.value,
    (g) => {
      // Antes del primer dato el sensor entrega ceros: no hay inclinación que seguir.
      if (g.x === 0 && g.y === 0 && g.z === 0) return;
      const gx = acotarSimetrico((SIGNO_GRAVEDAD * g.x) / GRAVEDAD);
      const gy = acotarSimetrico((SIGNO_GRAVEDAD * g.y) / GRAVEDAD);
      const previo = centroY.get();
      const centro = previo === null ? gy : previo + (gy - previo) * ALFA_CENTRO;
      centroY.set(centro);
      x.set(x.get() + (gx - x.get()) * ALFA_INCLINACION);
      y.set(y.get() + (acotarSimetrico(gy - centro) - y.get()) * ALFA_INCLINACION);
    },
  );
  return null;
}

function Celda({ celda, progreso }: { celda: CeldaVitral; progreso: SharedValue<number> }) {
  const inicio = celda.distancia * APERTURA_CELDAS_RETRASO;
  const opacidad = useDerivedValue(() => {
    const t = acotar((progreso.value - inicio) / APERTURA_CELDA);
    return 1 - (1 - t) * (1 - t);
  });
  const transform = useDerivedValue(() => [{ scale: 0.82 + 0.18 * opacidad.value }]);
  const path = useMemo(() => trazo(celda), [celda]);
  const [cx, cy] = celda.centro;
  const colores = useMemo(
    () => [
      mezclarOklab(celda.color, C.luzCelda, 0.62),
      celda.color,
      mezclarOklab(celda.color, C.sombraCelda, 0.78),
    ],
    [celda.color],
  );

  return (
    <Group opacity={opacidad} transform={transform} origin={vec(cx, cy)}>
      <Path path={path}>
        <LinearGradient
          start={vec(cx - 50, cy - 50)}
          end={vec(cx + 50, cy + 50)}
          colors={colores}
          positions={[0, 0.55, 1]}
        />
      </Path>
      <Path path={path} style="stroke" strokeWidth={4.5} strokeJoin="round" color={C.emplomado} />
      <Path path={path} style="stroke" strokeWidth={1} strokeJoin="round" color={C.reflejoEmplomado} />
    </Group>
  );
}

export type VitralProps = {
  /** Semilla del dibujo: clave `MM-DD` del santo o, sin santo, la fecha. */
  semilla: string;
  /** Inicial del santo (marcador hasta que existan imágenes); `null` en el respaldo sin santo. */
  inicial: string | null;
  colorLiturgico: IdColorLiturgico;
  /** Nivel 1: armar el vitral al aparecer. */
  apertura?: boolean;
  /** Nivel 2: haz y halo en movimiento (apagar al perder el foco). */
  vida?: boolean;
};

export function Vitral({ semilla, inicial, colorLiturgico, apertura = false, vida = false }: VitralProps) {
  const { paleta, hora } = useTema();
  const reducir = useReducirMovimiento();
  const inclinar = useInclinacionVitral() && vida;
  const { width: ancho } = useWindowDimensions();
  const alto = M.alto;
  const lit = hexLiturgico(colorLiturgico);

  const celdas = useMemo(
    // Como la maqueta: el color litúrgico entra dos veces en la lista para que se vea.
    () => celdasVitral(semilla, ancho, alto, [...paleta.vitral, lit, lit]),
    [semilla, ancho, alto, paleta.vitral, lit],
  );

  // --- Movimiento ---------------------------------------------------------------------------------
  const armar = apertura && !reducir;
  const progreso = useSharedValue(armar ? 0 : 1);
  const fundido = useSharedValue(apertura && reducir ? 0 : 1);
  const haz = useSharedValue(reducir ? 0.5 : 0);
  const angulo = useSharedValue(0);
  const inclinacionX = useSharedValue(0);
  const inclinacionY = useSharedValue(0);

  useEffect(() => {
    if (!apertura) return;
    if (reducir) {
      fundido.value = withTiming(1, tiempo(movimiento.fundido));
    } else {
      progreso.value = withTiming(1, tiempo(movimiento.aperturaVitral, curvas.lineal));
    }
    // Solo al montar: la apertura no se repite si cambian las preferencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!vida || reducir) {
      cancelAnimation(haz);
      cancelAnimation(angulo);
      if (reducir) {
        haz.value = 0.5;
        angulo.value = 0;
      }
      return;
    }
    // Desde donde quedó: termina el tramo hacia 1 y sigue ida y vuelta completo.
    haz.value = withSequence(
      withTiming(1, tiempo(movimiento.haz * (1 - haz.value), curvas.vaiven)),
      withRepeat(withTiming(0, tiempo(movimiento.haz, curvas.vaiven)), -1, true),
    );
    const desde = angulo.value % DOS_PI;
    angulo.value = desde;
    angulo.value = withRepeat(withTiming(desde + DOS_PI, tiempo(movimiento.halo, curvas.lineal)), -1, false);
    return () => {
      cancelAnimation(haz);
      cancelAnimation(angulo);
    };
  }, [vida, reducir, haz, angulo]);

  // Sin inclinación (apagada, fuera de foco o movimiento reducido): la luz vuelve suave al centro.
  useEffect(() => {
    if (inclinar) return;
    inclinacionX.value = withTiming(0, tiempo(movimiento.inclinacion, curvas.suave));
    inclinacionY.value = withTiming(0, tiempo(movimiento.inclinacion, curvas.suave));
  }, [inclinar, inclinacionX, inclinacionY]);

  // Haz (`.ray`): mide 1.9 × el vitral y va de (−20 %, −12 %) a (20 %, 14 %) de su tamaño.
  const centro = vec(ancho / 2, alto / 2);
  const transformHaz = useDerivedValue(() => {
    const entrada = acotar((progreso.value - APERTURA_LUZ_DESDE) / (1 - APERTURA_LUZ_DESDE));
    const falta = 1 - entrada * entrada * (3 - 2 * entrada);
    const x =
      (-0.2 + 0.4 * haz.value) * 1.9 * ancho - falta * 0.7 * ancho - inclinacionX.value * INCLINACION_HAZ_X;
    const y =
      (-0.12 + 0.26 * haz.value) * 1.9 * alto - falta * 0.6 * alto + inclinacionY.value * INCLINACION_HAZ_Y;
    return [{ translateX: x }, { translateY: y }];
  });
  const opacidadHaz = useDerivedValue(() =>
    acotar((progreso.value - APERTURA_LUZ_DESDE) / (1 - APERTURA_LUZ_DESDE)),
  );
  const haloCentro = vec(ancho / 2, M.haloArriba + M.haloDiametro / 2);
  const transformHalo = useDerivedValue(() => [
    { rotate: angulo.value - inclinacionX.value * INCLINACION_HALO },
  ]);
  const opacidadHalo = useDerivedValue(
    () => HALO_OPACIDAD * acotar((progreso.value - APERTURA_HALO_DESDE) / (1 - APERTURA_HALO_DESDE)),
  );
  const estiloFundido = useAnimatedStyle(() => ({ opacity: fundido.value }));

  // --- Colores derivados de la paleta ----------------------------------------------------------------
  const tonos = useMemo(() => {
    const brilloHalo = mezclarOklab(paleta.glow, C.blanco, 0.85);
    const sinHalo = conAlfa(brilloHalo, 0);
    return {
      halo: [
        sinHalo, sinHalo, brilloHalo, sinHalo, sinHalo, brilloHalo, sinHalo,
        sinHalo, brilloHalo, sinHalo, sinHalo, brilloHalo, sinHalo, sinHalo,
      ],
      ventana: [
        C.luzVentana,
        mezclarOklab(paleta.glowSoft, C.blanco, 0.8),
        paleta.glow,
        mezclarOklab(paleta.glow, C.oroViejo, 0.55),
      ],
      resplandor: conAlfa(paleta.glow, 0.5),
      anillo: conAlfa(paleta.glow, 0.55),
    };
  }, [paleta]);

  // --- Geometría de la ventana y la cinta ------------------------------------------------------------
  const vx = (ancho - M.ventanaAncho) / 2;
  const vy = M.ventanaArriba;
  const exterior = trazoArco(vx, vy, M.ventanaAncho, M.ventanaAlto, M.ventanaRadioInferior);
  const b = M.ventanaBorde;
  const ix = vx + b;
  const iy = vy + b;
  const iAncho = M.ventanaAncho - 2 * b;
  const iAlto = M.ventanaAlto - 2 * b;
  const interior = trazoArco(ix, iy, iAncho, iAlto, M.ventanaRadioInferior - b);
  const cx0 = ancho - M.cintaDerecha - M.cintaAncho;
  const cinta = `M${cx0} 0 L${cx0 + M.cintaAncho} 0 L${cx0 + M.cintaAncho} ${M.cintaAlto} L${
    cx0 + M.cintaAncho / 2
  } ${M.cintaAlto * 0.84} L${cx0} ${M.cintaAlto} Z`;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.marco, { height: alto, backgroundColor: paleta.primaryDeep }, estiloFundido]}>
      {inclinar ? <SensorInclinacion x={inclinacionX} y={inclinacionY} /> : null}
      {/* 1. Celdas, velo de la hora y viñeta */}
      <Canvas style={StyleSheet.absoluteFill}>
        {celdas.map((celda, i) => (
          <Celda key={i} celda={celda} progreso={progreso} />
        ))}
        {hora === 'night' && <Rect x={0} y={0} width={ancho} height={alto} color={C.veloCompletas} />}
        {hora === 'dusk' && <Rect x={0} y={0} width={ancho} height={alto} color={C.veloVisperas} />}
        <Rect x={0} y={0} width={ancho} height={alto}>
          <TwoPointConicalGradient
            start={vec(ancho / 2, alto * 0.45)}
            startR={alto * 0.15}
            end={vec(ancho / 2, alto * 0.45)}
            endR={alto * 0.85}
            colors={[C.vinetaCentro, C.vineta]}
          />
        </Rect>
        {/* Resplandor de la ventana: debajo del halo, para que el halo se vea encima de la luz. */}
        <Path path={exterior} color={tonos.resplandor}>
          <BlurMask blur={30} style="normal" />
        </Path>
      </Canvas>

      {/* 2. Haz de luz y halo (lo único que se anima siempre) */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={transformHaz} opacity={opacidadHaz}>
          <Group transform={[{ scaleX: ancho / alto }]} origin={centro}>
            <Circle c={centro} r={0.95 * alto * 0.7}>
              <RadialGradient
                c={centro}
                r={0.95 * alto}
                colors={[C.haz, C.hazMedio, C.hazFin]}
                positions={[0, 0.45, 0.7]}
              />
            </Circle>
          </Group>
        </Group>
        <Group transform={transformHalo} origin={haloCentro} opacity={opacidadHalo}>
          <Circle
            c={haloCentro}
            r={(M.haloDiametro / 2) * 0.81}
            style="stroke"
            strokeWidth={(M.haloDiametro / 2) * 0.1}>
            <SweepGradient
              c={haloCentro}
              colors={tonos.halo}
              positions={[0, 0.08, 0.12, 0.18, 0.3, 0.36, 0.42, 0.55, 0.62, 0.68, 0.8, 0.86, 0.92, 1]}
            />
            <BlurMask blur={1.5} style="normal" />
          </Circle>
        </Group>
      </Canvas>

      {/* 3. Ventana en arco y cinta del misal */}
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={exterior} style="stroke" strokeWidth={4} color={tonos.anillo} />
        <Path path={exterior} color={C.emplomado} />
        <Path path={interior}>
          <RadialGradient
            c={vec(ancho / 2, iy + iAlto * 0.28)}
            r={iAlto * 0.75}
            colors={tonos.ventana}
            positions={[0, 0.3, 0.72, 1]}
          />
        </Path>
        <Group clip={interior}>
          <Path path={interior} style="stroke" strokeWidth={18} color={C.brilloInterior}>
            <BlurMask blur={10} style="normal" />
          </Path>
        </Group>
        <Path path={cinta} color={lit}>
          <Shadow dx={0} dy={4} blur={3} color={C.sombraCinta} />
        </Path>
        <Path path={cinta}>
          <LinearGradient
            start={vec(cx0, 0)}
            end={vec(cx0 + M.cintaAncho, 0)}
            colors={[C.sombraPliegue, C.sinSombra, C.sinSombra, C.sombraPliegue]}
            positions={[0, 0.3, 0.7, 1]}
          />
        </Path>
      </Canvas>

      {inicial ? (
        <View
          pointerEvents="none"
          style={[styles.ventanaTexto, { left: ix, top: iy, width: iAncho, height: iAlto }]}>
          <Text
            allowFontScaling={false}
            style={[
              styles.inicial,
              { color: paleta.primaryDeep, textShadowColor: conAlfa(C.blanco, 0.6) },
            ]}>
            {inicial}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  marco: {
    overflow: 'hidden',
    borderBottomLeftRadius: radios.hero,
    borderBottomRightRadius: radios.hero,
  },
  ventanaTexto: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: {
    fontFamily: familias.displaySemi,
    fontSize: M.inicial,
    lineHeight: Math.ceil(M.inicial * 1.3),
    includeFontPadding: false,
    textShadowRadius: 18,
    transform: [{ translateY: 8 }],
  },
});
