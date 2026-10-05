/**
 * Ruta del detalle de una novena (`app/novena/[id].tsx`, fuera de las pestañas).
 * La usan la lista de Novenas, "Tu novena de hoy" en Hoy, "Rezar su novena" en la historia del santo
 * y en el santo compañero de Emociones, y el toque en un recordatorio.
 */
import type { Href } from 'expo-router';

export function rutaNovena(id: string): Extract<Href, string> {
  // Las rutas tipadas no aceptan el patrón `/novena/${string}`; la forma la fija esta función.
  return `/novena/${id}` as Extract<Href, string>;
}
