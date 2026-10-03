/**
 * Letra grande en Android 14+ (API 34): el sistema escala los tamaños en `sp` de forma NO lineal
 * (los tamaños grandes crecen menos que los chicos). React Native convierte `fontSize` y `lineHeight`
 * por separado con esa curva, así que con letra grande el interlineado crece menos que la letra y
 * vuelve a recortar descendentes y acentos (visto en el emulador con escala 2.0).
 *
 * `interlineadoCompensado` busca el `lineHeight` (en sp) que, después de pasar por la curva del
 * sistema, mantiene la misma proporción con el tamaño ya escalado. Puro, sin React Native.
 *
 * Tablas: AOSP `FontScaleConverterFactory` (Android 14). Si el sistema escalara de forma lineal,
 * el resultado solo sería un poco más holgado; nunca menor que el interlineado pedido.
 */

/** Tamaños de referencia (sp) de las tablas de AOSP. */
const DESDE_SP = [8, 10, 12, 14, 18, 20, 24, 30, 100] as const;

/** Escala del sistema → tamaño resultante (dp) para cada valor de `DESDE_SP`. */
const TABLAS: readonly { escala: number; hasta: readonly number[] }[] = [
  { escala: 1, hasta: DESDE_SP },
  { escala: 1.15, hasta: [9.2, 11.5, 13.8, 16.4, 19.8, 21.8, 25.2, 30, 100] },
  { escala: 1.3, hasta: [10.4, 13, 15.6, 18.8, 21.6, 23.6, 26.4, 30, 100] },
  { escala: 1.5, hasta: [12, 15, 18, 22, 24, 26, 28, 30, 100] },
  { escala: 1.8, hasta: [14.4, 18, 21.6, 24.4, 27.6, 30.8, 32.8, 34.8, 100] },
  { escala: 2, hasta: [16, 20, 24, 26, 30, 34, 36, 38, 100] },
];

/** Bajo esta escala Android escala de forma lineal. */
const ESCALA_MINIMA_NO_LINEAL = 1.03;

function tablaPara(escala: number): readonly number[] {
  const ultima = TABLAS[TABLAS.length - 1];
  if (escala >= ultima.escala) return ultima.hasta;
  for (let i = 1; i < TABLAS.length; i++) {
    const a = TABLAS[i - 1];
    const b = TABLAS[i];
    if (escala <= b.escala) {
      const t = (escala - a.escala) / (b.escala - a.escala);
      return a.hasta.map((v, j) => v + (b.hasta[j] - v) * t);
    }
  }
  return ultima.hasta;
}

/** Tamaño escalado por el sistema (en dp) para un valor en sp. */
export function escalarSp(sp: number, escala: number): number {
  if (escala < ESCALA_MINIMA_NO_LINEAL) return sp * escala;
  const hasta = tablaPara(escala);
  if (sp <= DESDE_SP[0]) return sp * (hasta[0] / DESDE_SP[0]);
  const ultimo = DESDE_SP.length - 1;
  if (sp >= DESDE_SP[ultimo]) return sp * (hasta[ultimo] / DESDE_SP[ultimo]);
  let i = 1;
  while (DESDE_SP[i] < sp) i++;
  const t = (sp - DESDE_SP[i - 1]) / (DESDE_SP[i] - DESDE_SP[i - 1]);
  return hasta[i - 1] + (hasta[i] - hasta[i - 1]) * t;
}

/** Igual que React Native: escala del sistema, con el tope de `maxFontSizeMultiplier` si lo hay. */
function escalarConTope(sp: number, escala: number, tope?: number): number {
  const escalado = escalarSp(sp, escala);
  return tope !== undefined && tope >= 1 ? Math.min(escalado, sp * tope) : escalado;
}

/**
 * `lineHeight` (sp) que conserva la proporción `lineHeight / fontSize` después de la escala no
 * lineal del sistema. Nunca devuelve menos que `lineHeight`.
 */
export function interlineadoCompensado(
  fontSize: number,
  lineHeight: number,
  escala: number,
  tope?: number,
): number {
  if (!(escala > 1) || fontSize <= 0) return lineHeight;
  const objetivo = (lineHeight / fontSize) * escalarConTope(fontSize, escala, tope);
  // La función es creciente y escalar(x) ≥ x con escala ≥ 1: la respuesta está en [0, objetivo].
  let bajo = 0;
  let alto = objetivo;
  for (let i = 0; i < 30; i++) {
    const medio = (bajo + alto) / 2;
    if (escalarConTope(medio, escala, tope) < objetivo) bajo = medio;
    else alto = medio;
  }
  return Math.max(lineHeight, Math.ceil(alto));
}

/**
 * Tamaño en sp que, después de la escala del sistema, mide `dp`. Sirve para glifos que deben
 * quedar del mismo tamaño que su caja (p. ej. los íconos de Material Symbols, que en Android se
 * dibujan como texto dentro de una caja fija y se recortarían con letra grande).
 *
 * @param noLineal `true` en Android 14+; en versiones anteriores la escala es lineal.
 */
export function spParaDp(dp: number, escala: number, noLineal: boolean): number {
  if (!(escala > 0) || escala === 1) return dp;
  if (!noLineal || escala < 1) return dp / escala;
  let bajo = 0;
  let alto = dp;
  for (let i = 0; i < 30; i++) {
    const medio = (bajo + alto) / 2;
    if (escalarSp(medio, escala) < dp) bajo = medio;
    else alto = medio;
  }
  return bajo;
}
