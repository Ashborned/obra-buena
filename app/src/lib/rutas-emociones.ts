/**
 * Rutas de Emociones y sus enlaces de salida.
 *
 * - El detalle vive fuera de las pestañas (`app/emocion/[id].tsx`), como la historia del santo.
 * - "Conocer su historia" del santo compañero apunta a una lectura de Aprender. Aprender todavía no
 *   existe: mientras tanto se abre la pestaña Aprender. Cuando exista `app/aprender/[id].tsx`,
 *   basta con que `rutaLectura` devuelva `/aprender/${id}`; quien la llama ya le pasa el id.
 */
import type { Href } from 'expo-router';

export function rutaEmocion(id: string): Extract<Href, string> {
  // Las rutas tipadas no aceptan el patrón `/emocion/${string}`; la forma la fija esta función.
  return `/emocion/${id}` as Extract<Href, string>;
}

/**
 * Destino de "Conocer su historia" para una lectura de Aprender.
 * Hoy: la pestaña Aprender. Con la ruta de lectura: `/aprender/${id}`.
 */
export function rutaLectura(id: string): Extract<Href, string> {
  return '/aprender';
}
