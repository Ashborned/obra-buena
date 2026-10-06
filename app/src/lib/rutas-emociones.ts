/**
 * Rutas de Emociones y sus enlaces de salida.
 *
 * - El detalle vive fuera de las pestañas (`app/emocion/[id].tsx`), como la historia del santo.
 * - "Conocer su historia" del santo compañero abre la lectura de Aprender (`rutaLectura`).
 */
import type { Href } from 'expo-router';

export { rutaLectura } from './rutas-aprender';

export function rutaEmocion(id: string): Extract<Href, string> {
  // Las rutas tipadas no aceptan el patrón `/emocion/${string}`; la forma la fija esta función.
  return `/emocion/${id}` as Extract<Href, string>;
}
