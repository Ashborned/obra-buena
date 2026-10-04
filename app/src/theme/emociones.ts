/**
 * Tono de cada emoción (docs/sistema-diseno.md → Emociones). Puro: sin React ni React Native.
 *
 * La maqueta pinta mosaicos y cabeceras con `oklch(L C h)`: el matiz cambia por emoción y la
 * luminosidad es la misma para todas. React Native no entiende OKLCH, así que cada tono se convierte
 * a hex con `oklchAHex` (color.ts) al resolver el tema.
 *
 * - Día (Laudes y Vísperas): L 0.955 / 0.88, C 0.04 / 0.085, texto `ink` de la paleta.
 * - Noche (Completas): L 0.34 / 0.25, C 0.07 / 0.06, texto `#F4F2FB`.
 * - Brillo del mosaico (`.tile::before`): L2 − 0.10, C2 + 0.08. Brillo de la cabecera
 *   (`.emohead`): L2 − 0.08, C2 + 0.07.
 *
 * Contraste: el texto se comprueba contra los tres puntos del fondo (los dos extremos del degradado
 * y el centro del brillo). El nombre usa el texto pleno; la línea secundaria parte de la opacidad de
 * la maqueta (0.72) y se acerca al texto pleno solo si no llega a AA (ver la prueba de tonos).
 */
import type { HoraOracion } from '@/lib/hora-oracion';

import { asegurarContraste, conAlfa, mezclarOklab, oklchAHex, type Hex } from './color';

/** Matiz OKLCH (grados) de cada emoción. Las claves son los ids de `content/contenido.json`. */
export const MATICES_EMOCION = {
  happy: 85,
  tired: 250,
  healing: 160,
  depression: 280,
  sad: 235,
  confused: 310,
  anger: 30,
  joy: 62,
  lonely: 205,
  love: 8,
  forgiveness: 340,
  gratitude: 115,
} as const;

export type IdTonoEmocion = keyof typeof MATICES_EMOCION;

/** Luminosidad y croma de los dos extremos del degradado, de día y de noche (maqueta: --tL1…--tC2). */
export const LUZ_EMOCION = {
  dia: { L1: 0.955, C1: 0.04, L2: 0.88, C2: 0.085 },
  noche: { L1: 0.34, C1: 0.07, L2: 0.25, C2: 0.06 },
} as const;

/** Desplazamientos del brillo respecto del segundo extremo (maqueta). */
const BRILLO_MOSAICO = { L: -0.1, C: 0.08 } as const;
const BRILLO_CABECERA = { L: -0.08, C: 0.07 } as const;

/** Opacidad de la línea secundaria del mosaico en la maqueta (`.tile small`). */
const OPACIDAD_SECUNDARIA = 0.72;
/** Opacidad del brillo del mosaico (`.tile::before`). */
export const OPACIDAD_BRILLO_MOSAICO = 0.9;

const AA = 4.5;

const BLANCO: Hex = '#FFFFFF';
const TEXTO_NOCHE: Hex = '#F4F2FB';

export type TonoEmocion = {
  /** Primer extremo del degradado (el más claro de día). */
  claro: Hex;
  /** Segundo extremo del degradado. */
  hondo: Hex;
  /** Centro del brillo circular del mosaico. */
  brillo: Hex;
  /** Centro del brillo de la cabecera del detalle. */
  brilloCabecera: Hex;
  /** `linear-gradient(150deg, claro, hondo)` del mosaico. */
  degradadoMosaico: string;
  /** Brillo circular del mosaico (va en una vista redonda arriba a la derecha). */
  degradadoBrillo: string;
  /** Fondo de la cabecera: brillo arriba a la derecha + degradado de 170°. */
  degradadoCabecera: string;
  /** Texto sobre el tono (nombre, título, botones de la cabecera). */
  texto: Hex;
  /** Texto secundario sobre el tono ("con Santa Mónica"). Opaco y AA. */
  textoSuave: Hex;
  /** Píldoras de la cabecera (Palabra · Oración · Compañía) y botón Volver. */
  pildoraFondo: string;
  pildoraBorde: string;
  /** Borde de la tarjeta de ayuda, teñido con el tono. */
  borde: string;
};

export type FondosTono = readonly Hex[];

/** Puntos del fondo de un mosaico o cabecera contra los que se mide el contraste del texto. */
export function fondosDeTono(t: Pick<TonoEmocion, 'claro' | 'hondo' | 'brillo' | 'brilloCabecera'>): FondosTono {
  return [t.claro, t.hondo, t.brillo, t.brilloCabecera];
}

/** Tono de una emoción para la hora de oración. `ink` es la tinta de la paleta (texto de día). */
export function tonoEmocion(id: IdTonoEmocion, hora: HoraOracion, ink: Hex): TonoEmocion {
  const h = MATICES_EMOCION[id];
  const noche = hora === 'night';
  const { L1, C1, L2, C2 } = noche ? LUZ_EMOCION.noche : LUZ_EMOCION.dia;

  const claro = oklchAHex(L1, C1, h);
  const hondo = oklchAHex(L2, C2, h);
  const brillo = oklchAHex(L2 + BRILLO_MOSAICO.L, C2 + BRILLO_MOSAICO.C, h);
  const brilloCabecera = oklchAHex(L2 + BRILLO_CABECERA.L, C2 + BRILLO_CABECERA.C, h);

  const texto = noche ? TEXTO_NOCHE : ink;
  const fondos = fondosDeTono({ claro, hondo, brillo, brilloCabecera });
  // Texto al 72 % sobre el extremo medio, como punto de partida; luego, solo lo necesario hacia el texto.
  const textoSuave = asegurarContraste(
    mezclarOklab(texto, hondo, OPACIDAD_SECUNDARIA),
    fondos,
    AA,
    texto,
  );

  return {
    claro,
    hondo,
    brillo,
    brilloCabecera,
    degradadoMosaico: `linear-gradient(150deg, ${claro}, ${hondo})`,
    degradadoBrillo: `radial-gradient(circle, ${brillo}, ${conAlfa(brillo, 0)} 68%)`,
    degradadoCabecera: [
      `radial-gradient(90% 90% at 90% 0%, ${brilloCabecera}, ${conAlfa(brilloCabecera, 0)} 70%)`,
      `linear-gradient(170deg, ${claro}, ${hondo})`,
    ].join(', '),
    texto,
    textoSuave,
    pildoraFondo: noche ? conAlfa(BLANCO, 0.08) : conAlfa(BLANCO, 0.35),
    pildoraBorde: noche ? conAlfa(BLANCO, 0.14) : conAlfa(BLANCO, 0.5),
    borde: noche ? mezclarOklab(claro, TEXTO_NOCHE, 0.7) : brillo,
  };
}

/** Los 12 tonos para una hora y una tinta. */
export function tonosEmocion(hora: HoraOracion, ink: Hex): Record<IdTonoEmocion, TonoEmocion> {
  const ids = Object.keys(MATICES_EMOCION) as IdTonoEmocion[];
  return Object.fromEntries(ids.map((id) => [id, tonoEmocion(id, hora, ink)])) as Record<
    IdTonoEmocion,
    TonoEmocion
  >;
}

/** El id tiene un tono definido (para ids que vienen del contenido como texto). */
export function esIdTonoEmocion(id: string): id is IdTonoEmocion {
  return Object.prototype.hasOwnProperty.call(MATICES_EMOCION, id);
}
