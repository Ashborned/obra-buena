/**
 * Contenido que llega a la app (docs/decisiones.md, 2026-10-04: sin paso de aprobación).
 *
 * El contenido se muestra directo, sin filtrar por `revision`: se puede agregar y cambiar
 * en cualquier momento y se revisa en la revisión final. Solo dos excepciones en producción:
 * - `ayuda.paises`: un número de crisis solo aparece si está verificado con fuente oficial
 *   (`revision: "aprobado"`, principio 6). Si no, la app muestra el respaldo (Find A Helpline),
 *   que se muestra siempre.
 * - `evangelio_ejemplo`: es un texto de ejemplo, no el evangelio del día; no se publica.
 */
import type { Contenido } from './tipos';

export type ModoContenido = 'desarrollo' | 'produccion';

const aprobado = (x: { revision?: unknown }) => x.revision === 'aprobado';

export function filtrarPorRevision(c: Contenido, modo: ModoContenido): Contenido {
  if (modo === 'desarrollo') return c;
  return {
    ...c,
    evangelio_ejemplo: undefined,
    ayuda: { respaldo: c.ayuda.respaldo, paises: c.ayuda.paises.filter(aprobado) },
  };
}
