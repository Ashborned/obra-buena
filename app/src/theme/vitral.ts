/**
 * Tokens de lo dibujado (vitral, ventana en arco, halo, haz de luz, velas, estrellas, grano).
 * Son los valores fijos de la maqueta (`drawGlass`, `.window`, `.ray`, `.halo`, `.cd`, `--stars`,
 * `.phone::after`); lo que depende de la paleta se calcula con `mezclarOklab` en el componente.
 */
import type { Hex } from './color';
import type { ColorLiturgico } from './tokens';
import { liturgicos } from './tokens';

/** Medidas del vitral de Hoy y de la historia del santo (`.glasswrap`, `.window`, `.halo`, `.ribbon`). */
export const medidasVitral = {
  alto: 318,
  ventanaAncho: 142,
  ventanaAlto: 196,
  ventanaArriba: 62,
  ventanaBorde: 6,
  /** Radio inferior de la ventana (arriba es medio punto). */
  ventanaRadioInferior: 16,
  haloDiametro: 196,
  haloArriba: 44,
  cintaAncho: 22,
  cintaAlto: 92,
  cintaDerecha: 26,
  /** Tamaño de la inicial del santo dentro de la ventana. */
  inicial: 92,
} as const;

export const coloresVitral = {
  /** Emplomado entre celdas y marco de la ventana. */
  emplomado: '#0A0A12',
  /** Reflejo fino sobre el emplomado. */
  reflejoEmplomado: 'rgba(255, 255, 255, 0.13)',
  /** Mezclas del degradado de cada celda (luz arriba a la izquierda, sombra abajo a la derecha). */
  luzCelda: '#FFFFFF',
  sombraCelda: '#000000',
  /** Velo según la hora: Completas oscurece, Vísperas entibia. */
  veloCompletas: 'rgba(4, 5, 18, 0.42)',
  veloVisperas: 'rgba(255, 130, 60, 0.12)',
  /** Viñeta alrededor. */
  vineta: 'rgba(0, 0, 0, 0.4)',
  vinetaCentro: 'rgba(0, 0, 0, 0)',
  /** Haz de luz que recorre el vitral. */
  haz: 'rgba(255, 244, 210, 0.55)',
  hazMedio: 'rgba(255, 244, 210, 0.12)',
  hazFin: 'rgba(255, 244, 210, 0)',
  /** Centro luminoso de la ventana en arco. */
  luzVentana: '#FFFDF3',
  blanco: '#FFFFFF',
  /** Base del dorado viejo del borde de la ventana. */
  oroViejo: '#6B3D00',
  /** Resplandor interior de la ventana. */
  brilloInterior: 'rgba(255, 255, 255, 0.7)',
  /** Sombra de la cinta litúrgica. */
  sombraCinta: 'rgba(0, 0, 0, 0.35)',
  sombraPliegue: 'rgba(0, 0, 0, 0.22)',
  sinSombra: 'rgba(0, 0, 0, 0)',
  /** Botón "Volver" sobre el vitral (`.back.onglass`). */
  // La maqueta usa 0.35; con 0.6 el texto blanco cumple AA aunque debajo quede la celda más clara.
  botonSobreVitral: 'rgba(10, 10, 20, 0.6)',
  botonSobreVitralBorde: 'rgba(255, 255, 255, 0.25)',
  textoSobreVitral: '#FFFFFF',
} as const;

/** Velas (`.cd`): cera, mecha y llama. */
export const coloresVela = {
  ceraBorde: '#E7DCC2',
  ceraLuz: '#FFFAF0',
  ceraSombra: '#D9CCAD',
  mecha: '#3B2D1F',
  llamaCentro: '#FFFBE0',
  llamaOro: '#FFD24A',
  llamaNaranja: '#FF8A00',
  llamaBorde: 'rgba(255, 90, 0, 0.6)',
  resplandor: 'rgba(255, 190, 70, 0.55)',
} as const;

/** Cielo de Completas. */
export const coloresCielo = {
  estrella: '#FFFFFF',
  /** El grano es ruido oscuro con alfa (la maqueta: feColorMatrix con RGB en 0). */
  grano: '#000000',
} as const;

/** Botón "¿Cómo te sientes hoy?" (`.cta`): texto blanco sobre el degradado primary → primaryDeep. */
export const coloresLlamada = {
  texto: '#FFFFFF',
  brillo: 'rgba(255, 255, 255, 0.28)',
  brilloFin: 'rgba(255, 255, 255, 0)',
} as const;

/** Color del día (ids de `lib/liturgia`) → token de la cinta del misal. */
export const liturgicoPorId = {
  green: 'verde',
  white: 'blanco',
  red: 'rojo',
  purple: 'morado',
  rose: 'rosado',
} as const satisfies Record<string, ColorLiturgico>;

export type IdColorLiturgico = keyof typeof liturgicoPorId;

export function hexLiturgico(id: IdColorLiturgico): Hex {
  return liturgicos[liturgicoPorId[id]];
}
