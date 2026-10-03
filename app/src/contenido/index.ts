/**
 * Contenido local de la app (sin internet): `content/contenido.json` empaquetado en el bundle.
 * En desarrollo se muestra todo; en producción solo lo aprobado (ver `filtro.ts`).
 */
import datos from '../../../content/contenido.json';

import { filtrarPorRevision, type ModoContenido } from './filtro';
import type { Contenido } from './tipos';

export const MODO_CONTENIDO: ModoContenido = __DEV__ ? 'desarrollo' : 'produccion';

// TypeScript infiere el JSON con tipos anchos (`revision: string`), así que no puede comprobar la
// forma; la garantiza `scripts/validar-contenido.mjs` (obligatorio antes de cada commit).
export const contenido: Contenido = filtrarPorRevision(datos as unknown as Contenido, MODO_CONTENIDO);

export * from './tipos';
export { ayudaParaPais, normalizarPais, paisesConAyuda, type AyudaElegida } from './ayuda';
export { filtrarPorRevision, type ModoContenido } from './filtro';
