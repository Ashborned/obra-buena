/**
 * Nueve velas grandes del detalle de una novena (`.candles` / `.candlecard` en la maqueta), dibujadas
 * con Skia. Cada vela es tocable y elige el día cuya oración se muestra.
 *
 * - Encendida: llama con resplandor. Día de hoy: contorno de acento en la cera. Elegida: el número
 *   va en un círculo de acento.
 * - Las velas son un registro personal (principio 1): no hay contadores, rachas ni puntos.
 *
 * Movimiento (docs/guia-movimiento.md):
 * - Nivel 1, encender: la llama nace con rebote (escala 0 → 1), destello cálido alrededor y chispas
 *   que suben (0.7 s). Novena completa (`celebrar` cambia): las nueve llamas laten juntas y sube una
 *   columna de luz (1.5 s).
 * - Nivel 2, titileo muy leve con tres duraciones distintas (no se sincronizan); solo con `titilar`.
 * - Apagar: fundido simple.
 * - "Reducir movimiento": solo fundidos (sin rebote, chispas, titileo ni latido; la columna de luz
 *   pasa a un brillo que aparece y se va).
 *
 * Accesibilidad: grupo de radio; cada vela dice "Día 3, encendida, hoy". Objetivo táctil ≥ 44 pt: en
 * un teléfono las nueve no caben en una fila con ese ancho, así que se reparten en filas parejas
 * (5 + 4, o 3 + 3 + 3 con letra muy grande).
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
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';
import { coloresVela, conAlfa, espaciado, FACTOR_INTERLINEADO, familias, interlineado, medidas, useTema } from '@/theme';
import { movimiento } from '@/theme/movimiento';

const V = coloresVela;
const DIAS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

// Medidas de la vela grande (maqueta: cera 52 de alto, llama 14 × 22, mecha 6).
const CERA_ANCHO = 22;
const CERA_ALTO = 52;
const MECHA = 6;
const LLAMA_ANCHO = 14;
const LLAMA_ALTO = 22;
/** Alto del lienzo de cada vela: cera, llama y espacio para que suban las chispas. */
const ALTO_LIENZO = 104;
const CERA_Y = ALTO_LIENZO - CERA_ALTO - 4;
const LLAMA_BASE = CERA_Y - 3;
const LLAMA_TOPE = LLAMA_BASE - LLAMA_ALTO;
/** Ancho máximo de una celda (las velas no se estiran sin fin en pantallas anchas). */
const CELDA_MAX = 64;
const SEPARACION = espaciado.xs + 2;
/** Número del día (`.candles .n`: 700 12 en un círculo de 22). */
const TAMANO_NUMERO = 12;
const CIRCULO_NUMERO = 22;
/** Amplitud del latido de la novena completa. */
const LATIDO = 0.3;

/** Chispas: desplazamiento horizontal final y retraso relativo (fijos: nada al azar en cada cuadro). */
const CHISPAS = [
  { dx: -7, retraso: 0, sube: 46 },
  { dx: 5, retraso: 0.08, sube: 52 },
  { dx: -2, retraso: 0.16, sube: 40 },
  { dx: 9, retraso: 0.04, sube: 36 },
  { dx: -10, retraso: 0.12, sube: 30 },
] as const;

/** Como la maqueta: cada 3.ª vela 1.6 s, cada 2.ª 2.3 s, las demás 1.9 s. */
function grupoDeLlama(dia: number): 0 | 1 | 2 {
  if (dia % 3 === 0) return 2;
  if (dia % 2 === 0) return 1;
  return 0;
}

/** Filas parejas: cuántas velas por fila caben con un objetivo táctil ≥ 44 pt. */
function repartir(ancho: number, celdaMinima: number): { porFila: number; celda: number } {
  const caben = Math.max(1, Math.floor((ancho + SEPARACION) / (celdaMinima + SEPARACION)));
  const filas = Math.ceil(DIAS.length / Math.min(caben, DIAS.length));
  const porFila = Math.ceil(DIAS.length / filas);
  const celda = Math.min(CELDA_MAX, (ancho - SEPARACION * (porFila - 1)) / porFila);
  return { porFila, celda };
}

export type VelasNovenaProps = {
  /** Días (1–9) con vela encendida. */
  encendidas: readonly number[];
  /** Día de la novena que toca hoy, o null. */
  diaActual: number | null;
  /** Día elegido (su oración está a la vista). */
  elegido: number;
  onElegir: (dia: number) => void;
  /** Día recién encendido por la persona: su llama nace con rebote y chispas. */
  recienEncendida: number | null;
  /** Cambia (se incrementa) cada vez que hay que celebrar la novena completa. 0 = nunca. */
  celebrar: number;
  /** Titileo de ambiente (solo con la pantalla a la vista). */
  titilar: boolean;
  reducir: boolean;
};

export function VelasNovena({
  encendidas,
  diaActual,
  elegido,
  onElegir,
  recienEncendida,
  celebrar,
  titilar,
  reducir,
}: VelasNovenaProps) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [ancho, setAncho] = useState(0);
  const [alto, setAlto] = useState(0);

  // Titileo: tres ritmos compartidos (como las velas pequeñas).
  const r0 = useSharedValue(0);
  const r1 = useSharedValue(0.4);
  const r2 = useSharedValue(0.8);
  const ritmos = useMemo(() => [r0, r1, r2], [r0, r1, r2]);
  const hayLlamas = encendidas.length > 0;

  useEffect(() => {
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
  }, [titilar, reducir, hayLlamas, ritmos]);

  // Novena completa: latido de las nueve llamas y columna de luz.
  const latido = useSharedValue(0);
  const columna = useSharedValue(0);
  const ultimaCelebracion = useRef(0);
  useEffect(() => {
    if (!celebrar || celebrar === ultimaCelebracion.current) return;
    ultimaCelebracion.current = celebrar;
    const total = movimiento.novenaCompleta;
    // Espera a que la última llama termine de nacer.
    const espera = recienEncendida ? movimiento.encenderVela * 0.6 : 0;
    columna.value = 0;
    columna.value = withDelay(espera, withTiming(1, { duration: total, easing: Easing.inOut(Easing.quad) }));
    if (!reducir) {
      const pulso = total / 4;
      latido.value = withDelay(
        espera,
        withSequence(
          withTiming(1, { duration: pulso, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: pulso, easing: Easing.in(Easing.quad) }),
          withTiming(1, { duration: pulso, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: pulso, easing: Easing.in(Easing.quad) }),
        ),
      );
    }
  }, [celebrar, reducir, recienEncendida, latido, columna]);

  const alMedir = (e: LayoutChangeEvent) => {
    setAncho(e.nativeEvent.layout.width);
    setAlto(e.nativeEvent.layout.height);
  };

  const celdaMinima = Math.max(medidas.toqueMinimo, CIRCULO_NUMERO * fontScale + espaciado.sm);
  const { porFila, celda } = ancho ? repartir(ancho, celdaMinima) : { porFila: 9, celda: 0 };
  const filas: number[][] = [];
  for (let i = 0; i < DIAS.length; i += porFila) filas.push(DIAS.slice(i, i + porFila));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('novenas.velasGrupo')}
      onLayout={alMedir}
      style={styles.grupo}>
      {/* Detrás de las velas: la luz sube entre ellas. */}
      {ancho > 0 && alto > 0 ? (
        <ColumnaDeLuz ancho={ancho} alto={alto} progreso={columna} reducir={reducir} />
      ) : null}
      {celda > 0 &&
        filas.map((fila) => (
          <View key={fila[0]} style={styles.fila}>
            {fila.map((dia) => (
              <Vela
                key={dia}
                dia={dia}
                ancho={celda}
                encendida={encendidas.includes(dia)}
                hoy={diaActual === dia}
                elegida={elegido === dia}
                nacer={recienEncendida === dia}
                ritmo={ritmos[grupoDeLlama(dia)]}
                latido={latido}
                reducir={reducir}
                onPress={() => onElegir(dia)}
              />
            ))}
          </View>
        ))}
    </View>
  );
}

function Vela({
  dia,
  ancho,
  encendida,
  hoy,
  elegida,
  nacer,
  ritmo,
  latido,
  reducir,
  onPress,
}: {
  dia: number;
  ancho: number;
  encendida: boolean;
  hoy: boolean;
  elegida: boolean;
  nacer: boolean;
  ritmo: SharedValue<number>;
  latido: SharedValue<number>;
  reducir: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colores, cielo } = useTema();
  const { fontScale } = useWindowDimensions();
  // Círculo del número: crece con la letra grande (hasta ×2, como el texto) y sigue siendo círculo.
  const lado = Math.max(
    CIRCULO_NUMERO,
    Math.ceil(interlineado(TAMANO_NUMERO, FACTOR_INTERLINEADO.interfazChica) * Math.min(fontScale, 2)) + espaciado.xs,
  );

  // Escala de la llama (rebote al nacer), opacidad (fundidos), destello y chispas.
  const escala = useSharedValue(encendida ? 1 : 0);
  const opacidad = useSharedValue(encendida ? 1 : 0);
  const destello = useSharedValue(0);
  const chispas = useSharedValue(0);
  const primera = useRef(true);

  useEffect(() => {
    // Al montar, las velas ya encendidas aparecen tal cual (sin celebrar lo de otro día).
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (encendida) {
      if (nacer && !reducir) {
        escala.value = 0;
        escala.value = withTiming(1, {
          duration: movimiento.encenderVela,
          // cubic-bezier(.2, 1.6, .4, 1) de la maqueta: se pasa de largo y vuelve (rebote).
          easing: Easing.bezier(0.2, 1.6, 0.4, 1),
        });
        opacidad.value = withTiming(1, { duration: movimiento.encenderVela / 3 });
        destello.value = 0;
        destello.value = withTiming(1, { duration: movimiento.encenderVela, easing: Easing.out(Easing.cubic) });
        chispas.value = 0;
        chispas.value = withTiming(1, { duration: movimiento.chispasVela, easing: Easing.out(Easing.quad) });
      } else {
        escala.value = 1;
        opacidad.value = withTiming(1, { duration: movimiento.fundido });
      }
    } else {
      cancelAnimation(destello);
      cancelAnimation(chispas);
      destello.value = 0;
      chispas.value = 0;
      opacidad.value = withTiming(0, { duration: movimiento.apagarVela });
    }
  }, [encendida, nacer, reducir, escala, opacidad, destello, chispas]);

  const cx = ancho / 2;
  const ceraX = cx - CERA_ANCHO / 2;
  const media = LLAMA_ANCHO / 2;
  const forma = `M${cx} ${LLAMA_TOPE} C${cx + media * 1.15} ${LLAMA_TOPE + LLAMA_ALTO * 0.45} ${cx + media} ${LLAMA_BASE} ${cx} ${LLAMA_BASE} C${cx - media} ${LLAMA_BASE} ${cx - media * 1.15} ${LLAMA_TOPE + LLAMA_ALTO * 0.45} ${cx} ${LLAMA_TOPE} Z`;

  const transformLlama = useDerivedValue(() => {
    const r = ritmo.value;
    const s = escala.value * (1 + LATIDO * latido.value);
    return [
      { rotate: ((-2 + 3.5 * r) * Math.PI) / 180 },
      { scaleX: s * (1.03 - 0.07 * r) },
      { scaleY: s * (0.95 + 0.09 * r) },
    ];
  });
  // El destello no pasa del borde de la celda (el lienzo recorta y se vería un rectángulo).
  const radioDestello = useDerivedValue(() => 6 + Math.max(0, ancho / 2 - 6 - 14) * destello.value);
  const opacidadDestello = useDerivedValue(() =>
    destello.value > 0 && destello.value < 1 ? 0.9 * (1 - destello.value) : 0,
  );
  const opacidadResplandor = useDerivedValue(() => opacidad.value * (0.85 + 0.15 * latido.value));

  const partes = [t('novenas.velaDia', { n: dia }), t(encendida ? 'novenas.velaEncendida' : 'novenas.velaApagada')];
  if (hoy) partes.push(t('novenas.velaHoy'));

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={partes.join(', ')}
      accessibilityHint={t('novenas.velaPista')}
      accessibilityState={{ checked: elegida, selected: elegida }}
      onPress={onPress}
      style={({ pressed }) => [styles.celda, { width: ancho }, pressed && styles.presionada]}>
      <Canvas style={{ width: ancho, height: ALTO_LIENZO }} pointerEvents="none">
        {hoy && (
          <RoundedRect
            x={ceraX - 4}
            y={CERA_Y - 4}
            width={CERA_ANCHO + 8}
            height={CERA_ALTO + 8}
            r={7}
            style="stroke"
            strokeWidth={2}
            color={colores.acento}
          />
        )}
        <Group opacity={encendida ? 1 : 0.5}>
          <RoundedRect x={ceraX} y={CERA_Y} width={CERA_ANCHO} height={CERA_ALTO} r={4}>
            <LinearGradient
              start={vec(ceraX, 0)}
              end={vec(ceraX + CERA_ANCHO, 0)}
              colors={[V.ceraBorde, V.ceraLuz, V.ceraSombra]}
              positions={[0, 0.45, 1]}
            />
          </RoundedRect>
          <RoundedRect x={cx - 1} y={CERA_Y - MECHA} width={2} height={MECHA} r={1} color={V.mecha} />
        </Group>

        {/* Destello cálido al encender. */}
        <Circle cx={cx} cy={LLAMA_BASE - LLAMA_ALTO * 0.4} r={radioDestello} color={V.destello} opacity={opacidadDestello}>
          <BlurMask blur={6} style="normal" />
        </Circle>

        <Group opacity={opacidadResplandor}>
          <Circle cx={cx} cy={LLAMA_BASE - LLAMA_ALTO * 0.35} r={12} color={V.resplandor}>
            <BlurMask blur={9} style="normal" />
          </Circle>
          <Group transform={transformLlama} origin={vec(cx, LLAMA_BASE)}>
            <Path path={forma}>
              <RadialGradient
                c={vec(cx, LLAMA_TOPE + LLAMA_ALTO * 0.72)}
                r={LLAMA_ALTO * 0.6}
                colors={[V.llamaCentro, V.llamaOro, V.llamaNaranja, V.llamaBorde]}
                positions={[0, 0.4, 0.75, 1]}
              />
            </Path>
          </Group>
        </Group>

        {!reducir && CHISPAS.map((c, i) => <Chispa key={i} cx={cx} chispa={c} progreso={chispas} />)}
      </Canvas>
      <View
        style={[
          styles.numero,
          // Siempre con fondo (transparente si no está elegida): en Android, agregarlo después
          // de dibujada la vista perdía el radio y el círculo salía cuadrado.
          {
            width: lado,
            height: lado,
            borderRadius: lado / 2,
            backgroundColor: elegida ? colores.acento : conAlfa(colores.acento, 0),
          },
        ]}>
        <Texto
          style={[styles.numeroTexto, { color: elegida ? cielo.fondo : colores.textoSuave }]}
          maxFontSizeMultiplier={2}>
          {dia}
        </Texto>
      </View>
    </Pressable>
  );
}

function Chispa({
  cx,
  chispa,
  progreso,
}: {
  cx: number;
  chispa: (typeof CHISPAS)[number];
  progreso: SharedValue<number>;
}) {
  const local = useDerivedValue(() => {
    const t = (progreso.value - chispa.retraso) / (1 - chispa.retraso);
    return Math.min(1, Math.max(0, t));
  });
  const x = useDerivedValue(() => cx + chispa.dx * local.value + Math.sin(local.value * Math.PI * 2) * 1.5);
  const y = useDerivedValue(() => LLAMA_TOPE + 4 - chispa.sube * local.value);
  const r = useDerivedValue(() => 1.8 * (1 - local.value * 0.5));
  const opacidad = useDerivedValue(() => (local.value > 0 && local.value < 1 ? 1 - local.value : 0));
  return <Circle cx={x} cy={y} r={r} color={V.chispa} opacity={opacidad} />;
}

/** Columna de luz que sube sobre las velas al completar la novena (con "Reducir movimiento", solo brillo). */
function ColumnaDeLuz({
  ancho,
  alto,
  progreso,
  reducir,
}: {
  ancho: number;
  alto: number;
  progreso: SharedValue<number>;
  reducir: boolean;
}) {
  const { paleta } = useTema();
  const anchoColumna = Math.min(ancho, 220);
  const x0 = (ancho - anchoColumna) / 2;
  const y = useDerivedValue(() => (reducir ? 0 : alto * (1 - progreso.value) * 0.9));
  const altoRect = useDerivedValue(() => alto - y.value);
  const opacidad = useDerivedValue(() =>
    progreso.value > 0 && progreso.value < 1 ? Math.sin(progreso.value * Math.PI) * 0.9 : 0,
  );
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group opacity={opacidad}>
        <Rect x={x0} y={y} width={anchoColumna} height={altoRect}>
          <LinearGradient
            start={vec(x0, 0)}
            end={vec(x0 + anchoColumna, 0)}
            colors={[conAlfa(paleta.glowSoft, 0), conAlfa(paleta.glowSoft, 0.6), V.columnaLuz, conAlfa(paleta.glowSoft, 0.6), conAlfa(paleta.glowSoft, 0)]}
            positions={[0, 0.3, 0.5, 0.7, 1]}
          />
          <BlurMask blur={14} style="normal" />
        </Rect>
      </Group>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: espaciado.md },
  fila: { flexDirection: 'row', justifyContent: 'center', gap: SEPARACION },
  celda: {
    minHeight: medidas.toqueMinimo,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: espaciado.xs + 2,
    paddingBottom: espaciado.xs,
  },
  presionada: { opacity: 0.75 },
  numero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: {
    fontFamily: familias.interfazFuerte,
    fontSize: TAMANO_NUMERO,
    lineHeight: interlineado(TAMANO_NUMERO, FACTOR_INTERLINEADO.interfazChica),
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
