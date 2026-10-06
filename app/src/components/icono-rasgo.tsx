/**
 * Íconos propios de los rasgos de Aprender (docs/decisiones.md: "Íconos propios dibujados"),
 * portados de `traitSVG` en prototype/obra-buena.html: viewBox de 48, trazo 2.6, puntas y uniones
 * redondeadas. Dibujados con Skia.
 *
 * - `DibujoRasgo`: el ícono como grupo de Skia, para dibujarlo dentro de otro lienzo (la medalla).
 * - `IconoRasgo`: el ícono en su propio lienzo, para el aviso, el lector y la medalla grande.
 *
 * Un rasgo desconocido no rompe: se dibuja un círculo. Son decorativos (el nombre del rasgo va al
 * lado), así que el lector de pantalla los salta.
 */
import { Canvas, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { View } from 'react-native';

import { medidasMedalla } from '@/theme';

const LADO = medidasMedalla.ladoRasgo;

/** Círculo como trazo SVG (Skia lee los arcos de `MakeFromSVGString`). */
function circulo(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

/** Doce rayos alternando largo y corto (`light`). */
function rayos(): string {
  let d = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const largo = i % 2 ? 17 : 21;
    d += `M${(24 + c * 11).toFixed(1)} ${(24 + s * 11).toFixed(1)}L${(24 + c * largo).toFixed(1)} ${(24 + s * largo).toFixed(1)}`;
  }
  return d;
}

/** Trazos (`linea`) y rellenos (`relleno`) de cada rasgo, en coordenadas de 48 × 48. */
const TRAZOS: Record<string, { linea: string; relleno?: string }> = {
  light: { linea: rayos(), relleno: circulo(24, 24, 6.5) },
  book: {
    linea: 'M7 13c6-2.5 11.5-1.5 17 2 5.5-3.5 11-4.5 17-2v23c-6-2.5-11.5-1.5-17 2-5.5-3.5-11-4.5-17-2zM24 15v23',
  },
  keys: {
    linea: `${circulo(13, 13, 5)}M17 17l20 20M31 31l3-3M35 35l3-3${circulo(35, 13, 5)}M31 17 11 37M17 31l-3-3M13 35l-3-3`,
  },
  boat: { linea: 'M6 30h36l-5 9H11zM24 8v22M24 10l12 16H24z' },
  rooster: {
    linea:
      'M14 33c0-7 5-12 11-12l4-6 3 2-2 4c5 2 7 7 7 11 0 5-5 8-11 8s-12-3-12-7zM27 11l2-4 2 4 2-3 1 4M22 40v5M29 40v5M14 30c-4-4-5-9-3-12 2 4 4 6 6 7',
  },
  mount: { linea: 'M4 40 18 17l7 10 6-8 13 21zM14 23l4-6 4 6' },
  pen: { linea: 'M39 7C25 10 15 22 12 37l4-3c4-10 12-19 23-27zM12 37l-4 5M20 26l6 2' },
  cross: { linea: 'M24 6v36M14 16h20' },
  home: { linea: 'M7 22 24 9l17 13M12 19v20h24V19M21 39v-9h6v9' },
  truck: { linea: `M4 15h22v17H4zM26 21h9l7 7v4H26z${circulo(12, 34, 4)}${circulo(34, 34, 4)}` },
  heart: { linea: 'M24 40s-14-8.5-14-19a7.5 7.5 0 0 1 14-4 7.5 7.5 0 0 1 14 4c0 10.5-14 19-14 19z' },
  sword: { linea: `M38 8 18 32M38 8l1.5 6M38 8l-6 1.5M13 27l10 8M18 32l-6 7${circulo(10.5, 40.5, 2)}` },
};

/** Respaldo para un rasgo que no está en la lista. */
const DESCONOCIDO = { linea: circulo(24, 24, 14) };

type Trazados = { linea: SkPath | null; relleno: SkPath | null };
const cache = new Map<string, Trazados>();

function trazados(rasgo: string): Trazados {
  let t = cache.get(rasgo);
  if (!t) {
    const def = TRAZOS[rasgo] ?? DESCONOCIDO;
    t = {
      linea: Skia.Path.MakeFromSVGString(def.linea),
      relleno: def.relleno ? Skia.Path.MakeFromSVGString(def.relleno) : null,
    };
    cache.set(rasgo, t);
  }
  return t;
}

/** Rasgos con ícono propio (los demás se dibujan como un círculo). */
export const RASGOS_CON_ICONO = Object.keys(TRAZOS);

/**
 * El ícono como grupo de Skia, en `(x, y)` con lado `tamano`. Para usar dentro de otro `<Canvas>`.
 * `trazo` va en unidades del ícono (48); por defecto el de la maqueta.
 */
export function DibujoRasgo({
  rasgo,
  x = 0,
  y = 0,
  tamano,
  color,
  trazo = medidasMedalla.trazoRasgo,
}: {
  rasgo: string;
  x?: number;
  y?: number;
  tamano: number;
  color: string;
  trazo?: number;
}) {
  const { linea, relleno } = trazados(rasgo);
  const escala = tamano / LADO;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: escala }]}>
      {linea ? (
        <Path path={linea} color={color} style="stroke" strokeWidth={trazo} strokeCap="round" strokeJoin="round" />
      ) : null}
      {relleno ? <Path path={relleno} color={color} /> : null}
    </Group>
  );
}

/** El ícono en su propio lienzo (decorativo). */
export function IconoRasgo({ rasgo, tamano, color }: { rasgo: string; tamano: number; color: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: tamano, height: tamano }}>
      <Canvas style={{ width: tamano, height: tamano }} pointerEvents="none">
        <DibujoRasgo rasgo={rasgo} tamano={tamano} color={color} />
      </Canvas>
    </View>
  );
}
