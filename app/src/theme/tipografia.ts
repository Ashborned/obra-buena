/**
 * Tipografía por rol (docs/sistema-diseno.md → Tipografía). Puro: sin React ni React Native.
 *
 * Con expo-font cada peso es una familia distinta, así que el peso va en `fontFamily` y NO se
 * usa `fontWeight` (en Android, mezclar familia propia + fontWeight puede caer en la fuente del sistema).
 *
 * Letra grande: estos estilos no tocan `allowFontScaling`; los tamaños crecen con el sistema.
 * React Native escala `lineHeight` con el mismo factor que `fontSize` (y respeta el mismo
 * `maxFontSizeMultiplier`), así que la proporción se mantiene con letra grande.
 *
 * Interlineado: cada estilo lleva `lineHeight` explícito y nunca menor que la altura natural de la
 * fuente; si no, Android recorta los descendentes (g, j, p, q, y) y los acentos. Mínimos por familia,
 * redondeados hacia arriba con `interlineado()`:
 * - Figtree (interfaz) ≥ 1.25 (1.3 en tamaños chicos)
 * - Cormorant Garamond (display) ≥ 1.3
 * - Literata (lectura) ≥ 1.5 (se usa 1.72, como la maqueta)
 * - UnifrakturMaguntia (capitular) ≥ 1.3
 */

/** Nombres de familia tal como los registra `useFonts` (ver fuentes.ts). */
export const familias = {
  displaySemi: 'CormorantGaramond_600SemiBold',
  displayItalica: 'CormorantGaramond_500Medium_Italic',
  lectura: 'Literata_400Regular',
  interfaz: 'Figtree_400Regular',
  interfazMedia: 'Figtree_500Medium',
  interfazSemi: 'Figtree_600SemiBold',
  interfazFuerte: 'Figtree_700Bold',
  capitular: 'UnifrakturMaguntia_400Regular',
} as const;

export type EstiloTexto = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
};

/** Tamaño de lectura ajustable en Aprender (px), docs/sistema-diseno.md. */
export const LECTURA_MIN = 15;
export const LECTURA_MAX = 23;
export const LECTURA_POR_DEFECTO = 17;

/** Factores mínimos de interlineado por familia (ver encabezado). */
export const FACTOR_INTERLINEADO = {
  interfaz: 1.25,
  /** Cuerpo corto de interfaz, como la maqueta. */
  cuerpo: 1.45,
  interfazChica: 1.3,
  display: 1.3,
  lectura: 1.72,
  capitular: 1.3,
} as const;

/** Interlineado en pt: tamaño × factor, redondeado hacia arriba. */
export function interlineado(tamano: number, factor: number): number {
  // El épsilon evita que 14 × 1.3 = 18.200000000000003 suba a 19 por error de coma flotante.
  return Math.ceil(tamano * factor - 1e-9);
}

/** em → pt para letterSpacing (React Native usa puntos absolutos). */
const em = (valor: number, tamano: number) => Number((valor * tamano).toFixed(2));

export const tipografia = {
  /** Títulos grandes de pantalla y nombres de santos (`.big`, 38). */
  displayGrande: {
    fontFamily: familias.displaySemi,
    fontSize: 38,
    lineHeight: interlineado(38, FACTOR_INTERLINEADO.display),
    letterSpacing: em(-0.01, 38),
  },
  /** Nombre del santo en el vitral (`.herotext h1`, 36). */
  display: {
    fontFamily: familias.displaySemi,
    fontSize: 36,
    lineHeight: interlineado(36, FACTOR_INTERLINEADO.display),
    letterSpacing: em(-0.01, 36),
  },
  /** Títulos de tarjeta (`.nvcard b`, 21). */
  titulo: {
    fontFamily: familias.displaySemi,
    fontSize: 21,
    lineHeight: interlineado(21, FACTOR_INTERLINEADO.display),
  },
  /** Subtítulos y citas en itálica (`.sub`, 18). */
  displayItalica: {
    fontFamily: familias.displayItalica,
    fontSize: 18,
    lineHeight: interlineado(18, FACTOR_INTERLINEADO.display),
  },
  /** Texto largo en Aprender (Literata 17, interlineado 1.72). Usa `estiloLectura` para otro tamaño. */
  lectura: {
    fontFamily: familias.lectura,
    fontSize: LECTURA_POR_DEFECTO,
    lineHeight: interlineado(LECTURA_POR_DEFECTO, FACTOR_INTERLINEADO.lectura),
  },
  /** Cuerpo corto de interfaz (15, interlineado 1.45). */
  interfaz: {
    fontFamily: familias.interfaz,
    fontSize: 15,
    lineHeight: interlineado(15, FACTOR_INTERLINEADO.cuerpo),
  },
  /** Texto secundario (`.lead`, 14.5). */
  interfazSecundaria: {
    fontFamily: familias.interfaz,
    fontSize: 14.5,
    lineHeight: interlineado(14.5, FACTOR_INTERLINEADO.cuerpo),
  },
  /** Botones (`.pill`, `.back`: 700 14). */
  boton: {
    fontFamily: familias.interfazFuerte,
    fontSize: 14,
    lineHeight: interlineado(14, FACTOR_INTERLINEADO.interfazChica),
  },
  /** Etiqueta de pestaña (700 11). */
  pestana: {
    fontFamily: familias.interfazFuerte,
    fontSize: 11,
    lineHeight: interlineado(11, FACTOR_INTERLINEADO.interfazChica),
  },
  /** Etiquetas / eyebrow: Figtree 700, 10.5, mayúsculas, espaciado 0.14em. */
  etiqueta: {
    fontFamily: familias.interfazFuerte,
    fontSize: 10.5,
    lineHeight: interlineado(10.5, FACTOR_INTERLINEADO.interfazChica),
    letterSpacing: em(0.14, 10.5),
    textTransform: 'uppercase',
  },
  /** Letra capital: solo la primera letra de una historia (66). */
  capitular: {
    fontFamily: familias.capitular,
    fontSize: 66,
    // La maqueta usa 0.82, pero en Android un lineHeight menor que la altura de la fuente recorta
    // la letra. El ajuste visual fino (margen negativo) se hace en el componente de capitular.
    lineHeight: interlineado(66, FACTOR_INTERLINEADO.capitular),
  },
} as const satisfies Record<string, EstiloTexto>;

export type RolTipografico = keyof typeof tipografia;

/** Estilo de lectura para un tamaño elegido (se acota a 15–23). */
export function estiloLectura(tamano: number): EstiloTexto {
  const t = Math.max(LECTURA_MIN, Math.min(LECTURA_MAX, Math.round(tamano)));
  return {
    fontFamily: familias.lectura,
    fontSize: t,
    lineHeight: interlineado(t, FACTOR_INTERLINEADO.lectura),
  };
}
