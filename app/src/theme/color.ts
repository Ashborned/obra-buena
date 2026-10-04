/**
 * Utilidades de color puras (sin React ni React Native) para resolver los tokens del tema.
 *
 * La maqueta (prototype/obra-buena.html) usa `color-mix(in oklab, A p%, B)`; React Native no lo
 * entiende, así que lo calculamos aquí con la misma matemática (OKLab de Björn Ottosson).
 */

/** Color hexadecimal `#rrggbb` (minúsculas o mayúsculas). */
export type Hex = `#${string}`;

type Rgb = { r: number; g: number; b: number };

export function hexARgb(hex: string): Rgb {
  const limpio = hex.replace('#', '');
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) {
    throw new Error(`Color hexadecimal inválido: ${hex}`);
  }
  return {
    r: parseInt(completo.slice(0, 2), 16),
    g: parseInt(completo.slice(2, 4), 16),
    b: parseInt(completo.slice(4, 6), 16),
  };
}

function aHex2(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return v.toString(16).padStart(2, '0');
}

export function rgbAHex({ r, g, b }: Rgb): Hex {
  return `#${aHex2(r)}${aHex2(g)}${aHex2(b)}`;
}

/** `#rrggbb` + opacidad 0–1 → `rgba(r, g, b, a)`. Equivale a `color-mix(in oklab, X a%, transparent)`. */
export function conAlfa(hex: string, alfa: number): string {
  const { r, g, b } = hexARgb(hex);
  const a = Math.max(0, Math.min(1, alfa));
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

// --- sRGB <-> OKLab ---------------------------------------------------------

function aLineal(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function deLineal(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return c * 255;
}

type Oklab = { L: number; a: number; b: number };

function rgbAOklab({ r, g, b }: Rgb): Oklab {
  const lr = aLineal(r);
  const lg = aLineal(g);
  const lb = aLineal(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabARgb({ L, a, b }: Oklab): Rgb {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return {
    r: deLineal(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: deLineal(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: deLineal(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

// --- OKLCH -> sRGB -----------------------------------------------------------

/** sRGB lineal (0–1) de un punto OKLab, sin recortar. */
function oklabALineal({ L, a, b }: Oklab): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const TOLERANCIA_GAMA = 1e-4;

function oklchAOklab(L: number, C: number, h: number): Oklab {
  const rad = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

/** El color OKLCH cabe en sRGB (con una tolerancia mínima de redondeo). */
export function oklchEnGama(L: number, C: number, h: number): boolean {
  return oklabALineal(oklchAOklab(L, C, h)).every(
    (v) => v >= -TOLERANCIA_GAMA && v <= 1 + TOLERANCIA_GAMA,
  );
}

/**
 * `oklch(L C h)` de CSS → `#rrggbb`. React Native no entiende OKLCH; los tonos de Emociones
 * (docs/sistema-diseno.md) se definen así y se convierten aquí.
 *
 * - `L` 0–1, `C` ≥ 0, `h` en grados.
 * - Si el color no cabe en sRGB, se baja la croma (manteniendo L y h) hasta que cabe, como el mapeo
 *   de gama de CSS Color 4; así el matiz no se corre al recortar canales.
 */
export function oklchAHex(L: number, C: number, h: number): Hex {
  const luz = Math.max(0, Math.min(1, L));
  let croma = Math.max(0, C);
  if (!oklchEnGama(luz, croma, h)) {
    let bajo = 0;
    let alto = croma;
    for (let i = 0; i < 24; i++) {
      const medio = (bajo + alto) / 2;
      if (oklchEnGama(luz, medio, h)) bajo = medio;
      else alto = medio;
    }
    croma = bajo;
  }
  const [r, g, b] = oklabALineal(oklchAOklab(luz, croma, h)).map((v) =>
    deLineal(Math.max(0, Math.min(1, v))),
  );
  return rgbAHex({ r, g, b });
}

/**
 * Equivalente a `color-mix(in oklab, a peso, b)`, con `peso` entre 0 y 1 (proporción de `a`).
 * Ejemplo: `mezclarOklab('#ffd3e4', '#ffffff', 0.6)` = `color-mix(in oklab, #ffd3e4 60%, #fff)`.
 */
export function mezclarOklab(a: string, b: string, peso: number): Hex {
  const p = Math.max(0, Math.min(1, peso));
  const A = rgbAOklab(hexARgb(a));
  const B = rgbAOklab(hexARgb(b));
  return rgbAHex(
    oklabARgb({
      L: A.L * p + B.L * (1 - p),
      a: A.a * p + B.a * (1 - p),
      b: A.b * p + B.b * (1 - p),
    }),
  );
}

// --- Contraste (WCAG 2.x) ---------------------------------------------------

function luminancia(hex: string): number {
  const { r, g, b } = hexARgb(hex);
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b);
}

/** Razón de contraste WCAG entre dos colores opacos (1–21). AA texto normal: ≥ 4.5. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Color `rgba(...)` o `#hex` compuesto sobre un fondo opaco → `#hex` opaco. */
export function aplanar(color: string, fondo: string): Hex {
  const m = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!m) return rgbAHex(hexARgb(color));
  const f = hexARgb(fondo);
  const a = Number(m[4]);
  return rgbAHex({
    r: Number(m[1]) * a + f.r * (1 - a),
    g: Number(m[2]) * a + f.g * (1 - a),
    b: Number(m[3]) * a + f.b * (1 - a),
  });
}

/**
 * Devuelve `color` sin cambios si ya alcanza `minimo` de contraste contra todos los `fondos`;
 * si no, lo mezcla en OKLab hacia `hacia` (p. ej. la tinta) en pasos de 2 % hasta lograrlo.
 * Sirve para cumplir AA sin salirse de la familia de color de la paleta.
 */
export function asegurarContraste(
  color: Hex,
  fondos: readonly string[],
  minimo: number,
  hacia: string,
): Hex {
  const cumple = (c: string) => fondos.every((f) => contraste(c, f) >= minimo);
  if (cumple(color)) return color;
  for (let paso = 0.02; paso <= 1; paso += 0.02) {
    const candidato = mezclarOklab(hacia, color, paso);
    if (cumple(candidato)) return candidato;
  }
  return rgbAHex(hexARgb(hacia));
}
