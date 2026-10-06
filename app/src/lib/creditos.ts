/**
 * Créditos de imágenes (Configuración → Acerca de), leídos de `assets/manifiesto.json`.
 * Formato del manifiesto: `.claude/agents/imagenes.md`. Metro vigila `/assets` (metro.config.js).
 * Hoy la lista está vacía: Acerca de no muestra la sección de créditos hasta que haya imágenes.
 */
import manifiesto from '../../../assets/manifiesto.json';

export type CreditoImagen = {
  id: string;
  archivo: string;
  santo: string;
  obra: string;
  autor: string;
  anio: string | number;
  museo?: string;
  url_fuente: string;
  licencia: string;
  notas?: string;
};

/** Créditos ordenados por autor y obra. Se omite una entrada sin obra, autor o licencia. */
export function creditosImagenes(lista: unknown = manifiesto): CreditoImagen[] {
  if (!Array.isArray(lista)) return [];
  return (lista as Partial<CreditoImagen>[])
    .filter((c): c is CreditoImagen => !!c && !!c.obra && !!c.autor && !!c.licencia)
    .sort((a, b) => a.autor.localeCompare(b.autor) || a.obra.localeCompare(b.obra));
}
