/**
 * Tokens de lo dibujado en Aprender: medallas, íconos de rasgo, rayos y partículas.
 * Son los valores fijos de la maqueta (`mg1`, `mg2`, `medalSVG`, `traitSVG`, `.toast .ticon`,
 * `.reveal .rays`). La medalla es de oro en las dos paletas (como la maqueta); lo que depende de la
 * paleta (rayos, halo, silueta) se toma del tema en el componente.
 */
import type { Hex } from './color';

/** Lienzo de la medalla (viewBox de `medalSVG`: 120 × 150). */
export const medidasMedalla = {
  ancho: 120,
  alto: 150,
  /** Centro del disco. */
  cx: 60,
  cy: 94,
  /** Disco exterior, interior y arco donde va el texto del anillo. */
  radioExterior: 48,
  radioInterior: 37,
  radioAnillo: 43,
  /** Silueta (bloqueada): disco punteado. */
  radioSilueta: 46,
  /** Posiciones de los rasgos [x, y, lado] (el primero, el principal, grande al centro). */
  posicionesRasgos: [
    [43, 72, 34],
    [27, 102, 18],
    [75, 102, 18],
  ] as const,
  /** Texto del anillo: tamaño y espaciado de la maqueta (corto / largo); se achica si no cabe. */
  anilloTamano: 7.6,
  anilloEspaciado: 1.6,
  anilloTamanoLargo: 6.3,
  anilloEspaciadoLargo: 0.9,
  /** Largo (en letras) desde el que se usa el tamaño largo (maqueta: > 20). */
  anilloLargo: 20,
  /** Fracción del semicírculo que puede ocupar el texto del anillo. */
  anilloOcupacion: 0.86,
  /** Inicial (sin rasgos) y signo de la silueta. */
  inicialTamano: 30,
  siluetaTamano: 34,
  /** Lado de un ícono de rasgo en su propio lienzo (viewBox de `traitSVG`). */
  ladoRasgo: 48,
  trazoRasgo: 2.6,
  /** Tamaños en pantalla (pt de ancho). */
  vitrina: 64,
  resultado: 190,
  resultadoSilueta: 150,
  detalle: 220,
} as const;

export const coloresMedalla = {
  /** `mg1`: degradado diagonal del disco exterior. */
  oroExterior: ['#FFF6C8', '#F5C542', '#B8860B', '#FFE9A0'] as Hex[],
  oroExteriorPosiciones: [0, 0.35, 0.7, 1] as number[],
  /** `mg2`: degradado radial del disco interior. */
  oroInterior: ['#FFF3C0', '#F0C040', '#C8960C'] as Hex[],
  oroInteriorPosiciones: [0, 0.6, 1] as number[],
  bordeExterior: '#7A5200',
  bordeInterior: '#8A6100',
  /** Texto del anillo. */
  textoAnillo: '#5A3C00',
  /** Rasgos e inicial grabados en el centro. */
  grabado: '#6B4A00',
  /** Reflejo fijo arriba a la izquierda y brillo que se mueve con el ángulo. */
  reflejo: 'rgba(255, 255, 255, 0.35)',
  brillo: 'rgba(255, 255, 255, 0.55)',
  brilloFin: 'rgba(255, 255, 255, 0)',
  /** Sombra que oscurece la mitad derecha de la cinta (maqueta: brightness .75). */
  sombraCinta: '#000000',
  /** Medalla de colección: perlas del borde. */
  perla: '#FFF8DC',
  /** Ícono del aviso de rasgo (`.toast .ticon`): degradado radial dorado. */
  avisoIcono: ['#FFF6C8', '#B8860B'] as Hex[],
  /** Partículas doradas al acuñar. */
  particula: ['#FFE9A0', '#F5C542', '#FFF6C8'] as Hex[],
  /** Sobre verde o rojo del quiz: la marca de correcta/incorrecta. */
  sobreSemantico: '#FFFFFF',
} as const;

/** Rayos detrás de la medalla al acuñar (`.reveal .rays`: cuñas de 6° cada 18°). */
export const rayosMedalla = {
  cunas: 20,
  /** Grados de cada cuña. */
  ancho: 6,
  /** Alfa del glow en las cuñas (maqueta: 55 %). */
  alfa: 0.55,
  /** Donde empieza a desvanecerse (maqueta: máscara radial 30 %). */
  inicioFundido: 0.3,
} as const;
