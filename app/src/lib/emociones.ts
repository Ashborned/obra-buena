/**
 * Rotación diaria de Emociones (CLAUDE.md, "Rota una entrada distinta cada día").
 *
 * - Cada emoción muestra una entrada según la fecha local: la misma todo el día, la siguiente
 *   al día siguiente, y vuelve al principio al terminar la lista.
 * - El índice se cuenta en días civiles desde una fecha fija, no desde el 1 de enero
 *   (la maqueta usaba el día del año y saltaba o repetía al cambiar de año).
 * - "Otra oración" suma un desplazamiento que vive solo en la sesión (ver `otra-oracion.ts`).
 * - Ninguna de estas acciones da puntos ni se registra (principio 1).
 */
import type { Emocion, EntradaEmocion } from '@/contenido/tipos';

import { diasEntre } from './novenas';

/** Origen de la cuenta de días. Cualquier fecha fija sirve; cambiarla cambia la rotación de todos. */
const ORIGEN = new Date(2026, 0, 1);

/** Días civiles desde el origen (puede ser negativo antes de 2026). */
export function indiceDelDia(fecha: Date): number {
  return diasEntre(ORIGEN, fecha);
}

/** Módulo siempre positivo. */
const modulo = (n: number, m: number) => ((n % m) + m) % m;

export type EntradaDelDia = {
  entrada: EntradaEmocion;
  /** Posición en la lista, desde 0. */
  indice: number;
  /** Cantidad de entradas de la emoción ("Para hoy · indice+1 de total"). */
  total: number;
};

/**
 * Entrada de la emoción para la fecha, con el desplazamiento de "Otra oración".
 * `null` si la emoción no tiene entradas (p. ej. en producción sin contenido aprobado).
 */
export function entradaDelDia(emocion: Emocion, fecha: Date, desplazamiento = 0): EntradaDelDia | null {
  const total = emocion.items.length;
  if (total === 0) return null;
  const indice = modulo(indiceDelDia(fecha) + desplazamiento, total);
  return { entrada: emocion.items[indice], indice, total };
}

/** Emociones que siempre muestran la tarjeta de ayuda del país (principio 6). */
export const EMOCIONES_CON_AYUDA = ['depression', 'sad', 'lonely'] as const;

/** La emoción muestra ayuda: por su campo `care` o por ser una de las tres de cuidado. */
export function muestraAyuda(emocion: Emocion): boolean {
  return !!emocion.care || (EMOCIONES_CON_AYUDA as readonly string[]).includes(emocion.id);
}

/** Dónde va la tarjeta de ayuda: arriba de todo en Depresión, al final en las demás. */
export function posicionAyuda(emocion: Emocion): 'arriba' | 'final' | null {
  if (!muestraAyuda(emocion)) return null;
  return emocion.id === 'depression' ? 'arriba' : 'final';
}
