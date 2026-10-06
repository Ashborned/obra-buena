/**
 * Medalla de Aprender (`medalSVG` en prototype/obra-buena.html), dibujada con Skia.
 *
 * - `lectura`: disco de oro (degradados `mg1` y `mg2`), cinta arriba en el color litúrgico de la
 *   lectura, el texto `ring` curvado por el borde superior y, al centro, los rasgos descubiertos en
 *   el orden de `rasgosEnOrden` (el primero grande al centro, los otros dos pequeños abajo a los
 *   lados, como la maqueta). Sin rasgos: la inicial.
 * - `silueta`: medalla bloqueada (cinta y disco punteado en el color de las líneas, con "?").
 * - `coleccion`: medalla de una colección completa. Se distingue de la de una lectura: cinta en los
 *   dos colores de la paleta, perlas alrededor y una estrella grabada al centro.
 *
 * Se dibuja en el lienzo de la maqueta (120 × 150) y se escala al ancho pedido. `brillo` y
 * `brilloVertical` (−1 a 1, opcionales) mueven un reflejo según el ángulo con que se gira la medalla:
 * la franja de luz cruza el disco de lado a lado, se corre arriba o abajo y se intensifica cuanto
 * más se inclina (como el oro bajo una lámpara).
 *
 * Accesibilidad: con `etiqueta` es una imagen con ese nombre; sin ella, el lector la salta.
 */
import {
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  Skia,
  Text as TextoSkia,
  TextBlob,
  useTypeface,
  vec,
  type SkTextBlob,
  type SkTypeface,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { DibujoRasgo } from '@/components/icono-rasgo';
import type { Lectura } from '@/contenido/tipos';
import { useIdioma, type Idioma } from '@/i18n';
import { rasgosEnOrden } from '@/lib/aprender';
import { coloresMedalla, hexLiturgico, medidasMedalla, mezclarOklab, useTema } from '@/theme';
import { archivosDeFuentes } from '@/theme/fuentes';
import { familias } from '@/theme/tipografia';

const M = medidasMedalla;
const C = coloresMedalla;

/** Proporción alto / ancho de la medalla. */
export const PROPORCION_MEDALLA = M.alto / M.ancho;

/** Cinta de la medalla de una lectura: dos tiras (la derecha más oscura). */
const CINTA_IZQUIERDA = 'M40 0h18l8 46H50z';
const CINTA_DERECHA = 'M62 0h18l-12 46H54z';
/** Cinta de la silueta. */
const CINTA_SILUETA = 'M42 0h36l-8 44H50z';
/**
 * Tira derecha de la cinta: cuánto del color se conserva al mezclar con negro (maqueta: brightness .75).
 * `mezclarOklab(a, b, peso)` conserva `peso` de `a`; con 0.25 la tira salía casi negra en todos los colores.
 */
const SOMBRA_CINTA = 0.75;
/** Medalla de colección: perlas entre el disco interior y el texto. */
const PERLAS = 24;
const RADIO_PERLAS = 40;
const RADIO_PERLA = 1.1;

type Comun = {
  /** Ancho en pantalla (pt). */
  tamano: number;
  /** Nombre para el lector de pantalla; sin él la medalla es decorativa. */
  etiqueta?: string;
  /** Ángulo horizontal normalizado (−1 a 1) para mover el reflejo. */
  brillo?: SharedValue<number>;
  /** Ángulo vertical normalizado (−1 a 1): el reflejo sube o baja. */
  brilloVertical?: SharedValue<number>;
};

export type PropsMedalla = Comun &
  (
    | { variante: 'lectura'; lectura: Lectura; rasgos: readonly string[] }
    | { variante: 'silueta' }
    | { variante: 'coleccion'; nombre: string }
  );

/** Trazados fijos (se crean una vez). */
let trazadosFijos: Record<
  'izq' | 'der' | 'silueta' | 'estrella' | 'disco',
  ReturnType<typeof Skia.Path.MakeFromSVGString>
> | null = null;
function fijos() {
  if (!trazadosFijos) {
    trazadosFijos = {
      izq: Skia.Path.MakeFromSVGString(CINTA_IZQUIERDA),
      der: Skia.Path.MakeFromSVGString(CINTA_DERECHA),
      silueta: Skia.Path.MakeFromSVGString(CINTA_SILUETA),
      estrella: Skia.Path.MakeFromSVGString(estrella(M.cx, M.cy, 19, 8, 8)),
      disco: Skia.Path.MakeFromSVGString(
        `M${M.cx - M.radioExterior} ${M.cy}a${M.radioExterior} ${M.radioExterior} 0 1 0 ${2 * M.radioExterior} 0a${M.radioExterior} ${M.radioExterior} 0 1 0 ${-2 * M.radioExterior} 0`,
      ),
    };
  }
  return trazadosFijos;
}

/** Estrella de `puntas` puntas alternando radio exterior e interior. */
function estrella(cx: number, cy: number, exterior: number, interior: number, puntas: number): string {
  let d = '';
  for (let i = 0; i < puntas * 2; i++) {
    const a = (i * Math.PI) / puntas - Math.PI / 2;
    const r = i % 2 ? interior : exterior;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  }
  return `${d}z`;
}

/**
 * Texto curvado por el semicírculo superior del anillo, centrado y con espaciado entre letras
 * (TextPath de Skia no tiene espaciado, así que cada letra se coloca con un RSXform).
 * Si no cabe, se achica. Devuelve `null` si no hay fuente todavía.
 */
function textoEnArco(texto: string, tipografia: SkTypeface | null): SkTextBlob | null {
  if (!tipografia || !texto) return null;
  try {
    const largo = texto.length > M.anilloLargo;
    let tamano = largo ? M.anilloTamanoLargo : M.anilloTamano;
    let espacio = largo ? M.anilloEspaciadoLargo : M.anilloEspaciado;
    let fuente = Skia.Font(tipografia, tamano);
    const glifos = fuente.getGlyphIDs(texto);
    let anchos = fuente.getGlyphWidths(glifos);
    const r = M.radioAnillo;
    const maximo = Math.PI * r * M.anilloOcupacion;
    const medir = () => anchos.reduce((a, b) => a + b, 0) + espacio * (glifos.length - 1);
    let total = medir();
    if (total > maximo) {
      const f = maximo / total;
      tamano *= f;
      espacio *= f;
      fuente = Skia.Font(tipografia, tamano);
      anchos = fuente.getGlyphWidths(glifos);
      total = medir();
    }
    let s = (Math.PI * r - total) / 2;
    const transformaciones = glifos.map((_, i) => {
      const mitad = s + anchos[i] / 2;
      s += anchos[i] + espacio;
      // Ángulo sobre el arco (de π, a la izquierda, a 2π, a la derecha, pasando por arriba).
      const fi = Math.PI + mitad / r;
      const px = M.cx + r * Math.cos(fi);
      const py = M.cy + r * Math.sin(fi);
      const coseno = -Math.sin(fi);
      const seno = Math.cos(fi);
      return Skia.RSXform(coseno, seno, px - (anchos[i] / 2) * coseno, py - (anchos[i] / 2) * seno);
    });
    return Skia.TextBlob.MakeFromRSXformGlyphs(glifos, transformaciones, fuente);
  } catch {
    return null;
  }
}

/** Letra centrada en x (para la inicial y el "?"). */
function letraCentrada(texto: string, tipografia: SkTypeface | null, tamano: number) {
  if (!tipografia) return null;
  try {
    const fuente = Skia.Font(tipografia, tamano);
    const ancho = fuente.getGlyphWidths(fuente.getGlyphIDs(texto)).reduce((a, b) => a + b, 0);
    return { fuente, x: M.cx - ancho / 2 };
  } catch {
    return null;
  }
}

export function Medalla(props: PropsMedalla) {
  const { tamano, etiqueta } = props;
  const alto = tamano * PROPORCION_MEDALLA;
  // El tema y el idioma se leen aquí, fuera del <Canvas>: Skia dibuja con su propio renderizador
  // y los contextos de React no llegan adentro (useTema() lanzaba y la vitrina quedaba vacía).
  const { colores, paleta } = useTema();
  const idioma = useIdioma();
  return (
    <View
      accessible={!!etiqueta}
      accessibilityRole={etiqueta ? 'image' : undefined}
      accessibilityLabel={etiqueta}
      accessibilityElementsHidden={!etiqueta}
      importantForAccessibility={etiqueta ? 'yes' : 'no-hide-descendants'}
      style={{ width: tamano, height: alto }}>
      <Canvas style={{ width: tamano, height: alto }} pointerEvents="none">
        <Group transform={[{ scale: tamano / M.ancho }]}>
          {props.variante === 'silueta' ? (
            <Silueta linea={colores.linea} textoSuave={colores.textoSuave} />
          ) : (
            <Disco {...props} idioma={idioma} primary={paleta.primary} glow={paleta.glow} />
          )}
        </Group>
      </Canvas>
    </View>
  );
}

/** Dentro del <Canvas>: sin hooks de contexto (colores por props). */
function Silueta({ linea, textoSuave }: { linea: string; textoSuave: string }) {
  const tipografiaDisplay = useTypeface(archivosDeFuentes[familias.displaySemi]);
  const signo = useMemo(() => letraCentrada('?', tipografiaDisplay, M.siluetaTamano), [tipografiaDisplay]);
  const t = fijos();
  return (
    <Group>
      {t.silueta ? <Path path={t.silueta} color={linea} /> : null}
      <Circle
        cx={M.cx}
        cy={M.cy}
        r={M.radioSilueta}
        color={textoSuave}
        style="stroke"
        strokeWidth={3}
        opacity={0.45}>
        <DashPathEffect intervals={[6, 5]} />
      </Circle>
      {signo ? <TextoSkia x={signo.x} y={M.cy + 10} text="?" font={signo.fuente} color={textoSuave} /> : null}
    </Group>
  );
}

/** Dentro del <Canvas>: sin hooks de contexto (idioma y colores de la paleta por props). */
function Disco(
  props: Exclude<PropsMedalla, { variante: 'silueta' }> & {
    idioma: Idioma;
    primary: string;
    glow: string;
  },
) {
  const { idioma } = props;
  const tipografiaAnillo = useTypeface(archivosDeFuentes[familias.interfazFuerte]);
  const tipografiaDisplay = useTypeface(archivosDeFuentes[familias.displaySemi]);
  const t = fijos();

  const lectura = props.variante === 'lectura' ? props.lectura : null;
  const anillo =
    props.variante === 'lectura' ? props.lectura[idioma].ring : props.nombre.toLocaleUpperCase(idioma);
  const blob = useMemo(() => textoEnArco(anillo, tipografiaAnillo), [anillo, tipografiaAnillo]);

  const rasgos = props.variante === 'lectura' ? rasgosEnOrden(props.lectura, props.rasgos) : [];
  const inicial = useMemo(
    () =>
      lectura && rasgos.length === 0 ? letraCentrada(lectura.ini, tipografiaDisplay, M.inicialTamano) : null,
    [lectura, rasgos.length, tipografiaDisplay],
  );

  // Cinta: color litúrgico de la lectura; en la de colección, los dos colores de la paleta.
  const cintaIzq = lectura ? hexLiturgico(lectura.lit) : props.primary;
  const cintaDer = lectura ? mezclarOklab(cintaIzq, C.sombraCinta, SOMBRA_CINTA) : props.glow;

  return (
    <Group>
      {t.izq ? <Path path={t.izq} color={cintaIzq} /> : null}
      {t.der ? <Path path={t.der} color={cintaDer} /> : null}
      {/* Contorno fino: la cinta blanca se perdía sobre el cielo claro de Laudes. */}
      {t.izq ? <Path path={t.izq} color={C.bordeExterior} style="stroke" strokeWidth={1} opacity={0.5} /> : null}
      {t.der ? <Path path={t.der} color={C.bordeExterior} style="stroke" strokeWidth={1} opacity={0.5} /> : null}

      <Circle cx={M.cx} cy={M.cy} r={M.radioExterior}>
        <LinearGradient
          start={vec(M.cx - M.radioExterior, M.cy - M.radioExterior)}
          end={vec(M.cx + M.radioExterior, M.cy + M.radioExterior)}
          colors={C.oroExterior}
          positions={C.oroExteriorPosiciones}
        />
      </Circle>
      <Circle
        cx={M.cx}
        cy={M.cy}
        r={M.radioExterior}
        color={C.bordeExterior}
        style="stroke"
        strokeWidth={2}
      />
      <Circle cx={M.cx} cy={M.cy} r={M.radioInterior}>
        <RadialGradient
          c={vec(
            M.cx - M.radioInterior + 0.4 * 2 * M.radioInterior,
            M.cy - M.radioInterior + 0.35 * 2 * M.radioInterior,
          )}
          r={0.8 * 2 * M.radioInterior}
          colors={C.oroInterior}
          positions={C.oroInteriorPosiciones}
        />
      </Circle>
      <Circle
        cx={M.cx}
        cy={M.cy}
        r={M.radioInterior}
        color={C.bordeInterior}
        style="stroke"
        strokeWidth={1.4}
      />

      {blob ? <TextBlob blob={blob} color={C.textoAnillo} /> : null}

      {props.variante === 'coleccion' ? (
        <Group>
          {Array.from({ length: PERLAS }, (_, i) => {
            const a = (i * 2 * Math.PI) / PERLAS;
            return (
              <Circle
                key={i}
                cx={M.cx + Math.cos(a) * RADIO_PERLAS}
                cy={M.cy + Math.sin(a) * RADIO_PERLAS}
                r={RADIO_PERLA}
                color={C.perla}
              />
            );
          })}
          {t.estrella ? (
            <Path path={t.estrella} color={C.grabado} style="stroke" strokeWidth={1.8} strokeJoin="round" />
          ) : null}
          <Circle cx={M.cx} cy={M.cy} r={3} color={C.grabado} />
        </Group>
      ) : null}

      {rasgos.slice(0, M.posicionesRasgos.length).map((r, i) => {
        const [x, y, lado] = M.posicionesRasgos[i];
        return <DibujoRasgo key={r} rasgo={r} x={x} y={y} tamano={lado} color={C.grabado} />;
      })}
      {inicial && lectura ? (
        <TextoSkia x={inicial.x} y={M.cy + 10} text={lectura.ini} font={inicial.fuente} color={C.grabado} />
      ) : null}

      {/* Reflejo fijo arriba a la izquierda (maqueta: elipse rotada −30°). */}
      <Group origin={vec(44, 70)} transform={[{ rotate: (-30 * Math.PI) / 180 }]}>
        <Oval x={28} y={63} width={32} height={14} color={C.reflejo} />
      </Group>
      {props.brillo && t.disco ? (
        <Brillo brillo={props.brillo} vertical={props.brilloVertical} disco={t.disco} />
      ) : null}
    </Group>
  );
}

/** Recorrido del reflejo con la medalla del todo girada (unidades del lienzo de 120 × 150). */
const REFLEJO_X = 46;
const REFLEJO_Y = 22;
/** Intensidad del reflejo con la medalla de frente y del todo girada. */
const REFLEJO_MIN = 0.55;

/** Franja de luz que cruza el disco según el ángulo de la medalla. */
function Brillo({
  brillo,
  vertical,
  disco,
}: {
  brillo: SharedValue<number>;
  vertical?: SharedValue<number>;
  disco: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>;
}) {
  const dy = useDerivedValue(() => (vertical ? vertical.value : 0) * REFLEJO_Y);
  const inicio = useDerivedValue(() =>
    vec(M.cx - 34 + brillo.value * REFLEJO_X, M.cy - M.radioExterior + dy.value),
  );
  const fin = useDerivedValue(() =>
    vec(M.cx + 6 + brillo.value * REFLEJO_X, M.cy + M.radioExterior + dy.value),
  );
  const intensidad = useDerivedValue(() => {
    const v = vertical ? vertical.value : 0;
    const angulo = Math.min(1, Math.sqrt(brillo.value * brillo.value + v * v));
    return REFLEJO_MIN + (1 - REFLEJO_MIN) * angulo;
  });
  return (
    <Group clip={disco} opacity={intensidad}>
      <Rect
        x={M.cx - M.radioExterior}
        y={M.cy - M.radioExterior}
        width={2 * M.radioExterior}
        height={2 * M.radioExterior}>
        <LinearGradient
          start={inicio}
          end={fin}
          colors={[C.brilloFin, C.brillo, C.brilloFin]}
          positions={[0.2, 0.5, 0.8]}
        />
      </Rect>
    </Group>
  );
}
