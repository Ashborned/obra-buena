/**
 * Filtro por revisión (CLAUDE.md, principio 7: nada llega a producción sin `revision: "aprobado"`).
 *
 * - `desarrollo`: se muestra todo, tal cual.
 * - `produccion`: solo lo aprobado. Para lo que no trae campo `revision` propio:
 *   - `rasgos` se conservan solo si los usa una lectura aprobada.
 *   - `colecciones` se quedan solo con sus ítems visibles; una colección vacía desaparece.
 *   - `santos_del_dia` e `historias_santos` dependen de `revision_santos_del_dia`.
 *   - `ayuda.respaldo` (Find A Helpline) se muestra siempre: es la red de seguridad.
 *     Los países sin aprobar se quitan, así su número nunca aparece como verificado.
 *   - Una emoción sin entradas aprobadas se conserva con `items: []` (las 12 emociones son
 *     parte de la interfaz; la pantalla decide qué mostrar si no hay entradas).
 *   - Los enlaces del santo compañero (`nov`, `lrn`) a algo no visible se quitan.
 */
import type { Contenido } from './tipos';

export type ModoContenido = 'desarrollo' | 'produccion';

const aprobado = (x: { revision?: unknown }) => x.revision === 'aprobado';

export function filtrarPorRevision(c: Contenido, modo: ModoContenido): Contenido {
  if (modo === 'desarrollo') return c;

  const lecturas = c.lecturas.filter(aprobado);
  const proximamente = c.proximamente.filter(aprobado);
  const novenas = c.novenas.filter(aprobado);

  const idsNovenas = new Set(novenas.map((n) => n.id));
  const idsLecturas = new Set(lecturas.map((l) => l.id));
  const emociones = c.emociones.map((e) => ({
    ...e,
    items: e.items.filter(aprobado).map((it) => {
      const { nov, lrn, ...resto } = it.c;
      return {
        ...it,
        c: {
          ...resto,
          ...(nov && idsNovenas.has(nov) ? { nov } : {}),
          ...(lrn && idsLecturas.has(lrn) ? { lrn } : {}),
        },
      };
    }),
  }));

  const visibles = new Set([...idsLecturas, ...proximamente.map((p) => p.id)]);
  const colecciones = c.colecciones
    .map((col) => ({ ...col, items: col.items.filter((id) => visibles.has(id)) }))
    .filter((col) => col.items.length > 0);

  const rasgosUsados = new Set(lecturas.flatMap((l) => l.traits));
  const rasgos = Object.fromEntries(Object.entries(c.rasgos).filter(([k]) => rasgosUsados.has(k)));

  const santosAprobados = c.revision_santos_del_dia === 'aprobado';

  return {
    ...c,
    emociones,
    lecturas,
    proximamente,
    colecciones,
    rasgos,
    novenas,
    santos_del_dia: santosAprobados ? c.santos_del_dia : {},
    historias_santos: santosAprobados ? c.historias_santos : {},
    ayuda: { respaldo: c.ayuda.respaldo, paises: c.ayuda.paises.filter(aprobado) },
  };
}
