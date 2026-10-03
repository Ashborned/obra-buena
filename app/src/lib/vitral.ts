/**
 * Vitral generativo: celdas tipo Voronoi por recorte de semiplanos (portado de `drawGlass` en
 * prototype/obra-buena.html). Puro: sin React ni Skia, así se puede probar con Jest.
 *
 * La misma semilla da siempre el mismo vitral: Hoy usa la clave `MM-DD` del santo (el santo del
 * 1 de octubre se ve igual todos los años) y, si no hay santo, la fecha completa.
 * La semilla no incluye la paleta: al cambiar de paleta cambian los colores, no el dibujo.
 */

export type Punto = readonly [number, number];

export type CeldaVitral = {
  /** Semilla de la celda (punto de Voronoi). */
  centro: Punto;
  /** Polígono recortado (al menos 3 vértices). */
  poligono: Punto[];
  /** Color base, tomado de la lista recibida. */
  color: string;
  /** Distancia normalizada (0–1) al centro del vitral: orden en que se arma al abrir. */
  distancia: number;
};

/** Hash FNV-1a de 32 bits (igual que `hash` de la maqueta). */
export function hashTexto(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio mulberry32 (igual que `rng` de la maqueta). Devuelve valores en [0, 1). */
export function generadorAleatorio(semilla: number): () => number {
  let a = semilla | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recorta `poligono` al semiplano más cercano a `p` que a `q` (mediatriz de p–q). */
function recortar(poligono: Punto[], p: Punto, q: Punto): Punto[] {
  const mx = (p[0] + q[0]) / 2;
  const my = (p[1] + q[1]) / 2;
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const d = (v: Punto) => (v[0] - mx) * dx + (v[1] - my) * dy;
  const salida: Punto[] = [];
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i];
    const b = poligono[(i + 1) % poligono.length];
    const da = d(a);
    const db = d(b);
    if (da <= 0) salida.push(a);
    if (da <= 0 !== db <= 0) {
      const t = da / (da - db);
      salida.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return salida;
}

/** Columnas y filas de semillas (como la maqueta: 5 × 7). */
export const COLUMNAS_VITRAL = 5;
export const FILAS_VITRAL = 7;

/**
 * Celdas del vitral para un rectángulo de `ancho` × `alto`.
 * `colores` es la lista de la paleta (más el color litúrgico, si corresponde).
 */
export function celdasVitral(
  semilla: string,
  ancho: number,
  alto: number,
  colores: readonly string[],
): CeldaVitral[] {
  if (ancho <= 0 || alto <= 0 || colores.length === 0) return [];
  const r = generadorAleatorio(hashTexto(semilla));
  const puntos: Punto[] = [];
  for (let j = 0; j < FILAS_VITRAL; j++) {
    for (let i = 0; i < COLUMNAS_VITRAL; i++) {
      puntos.push([
        ((i + 0.12 + r() * 0.76) * ancho) / COLUMNAS_VITRAL,
        ((j + 0.12 + r() * 0.76) * alto) / FILAS_VITRAL,
      ]);
    }
  }
  const cx = ancho / 2;
  const cy = alto / 2;
  const maxDist = Math.hypot(cx, cy);
  const celdas: CeldaVitral[] = [];
  puntos.forEach((p, k) => {
    let poligono: Punto[] = [
      [-2, -2],
      [ancho + 2, -2],
      [ancho + 2, alto + 2],
      [-2, alto + 2],
    ];
    for (let m = 0; m < puntos.length && poligono.length; m++) {
      if (m !== k) poligono = recortar(poligono, p, puntos[m]);
    }
    // El color se sortea siempre (aunque la celda quede vacía) para no alterar la secuencia.
    const color = colores[Math.floor(r() * colores.length)];
    if (poligono.length >= 3) {
      celdas.push({ centro: p, poligono, color, distancia: Math.hypot(p[0] - cx, p[1] - cy) / maxDist });
    }
  });
  return celdas;
}

/** Semilla del vitral de un día sin santo cargado: la fecha local completa `AAAA-MM-DD`. */
export function semillaDeFecha(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}
