/**
 * Fechas formateadas con el idioma de la interfaz, sin escribir nombres de meses a mano:
 * `Intl.DateTimeFormat` (Hermes lo trae en Android e iOS; comprobado en el emulador con es y en).
 * Si un motor no lo tuviera, se cae a `toLocaleDateString`, que nunca rompe la pantalla.
 */

const cache = new Map<string, Intl.DateTimeFormat>();

function formateador(idioma: string, opciones: Intl.DateTimeFormatOptions): Intl.DateTimeFormat | null {
  const clave = `${idioma}|${JSON.stringify(opciones)}`;
  let f = cache.get(clave);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat(idioma, opciones);
    } catch {
      return null;
    }
    cache.set(clave, f);
  }
  return f;
}

function formatear(fecha: Date, idioma: string, opciones: Intl.DateTimeFormatOptions): string {
  const f = formateador(idioma, opciones);
  return f ? f.format(fecha) : fecha.toLocaleDateString(idioma, opciones);
}

/** Día y mes abreviado: "3 oct" / "Oct 3". Para chips y tarjetas. */
export function fechaCorta(fecha: Date, idioma: string): string {
  // Algunos datos de CLDR ponen punto en la abreviatura ("3 oct."); en un chip sobra.
  return formatear(fecha, idioma, { day: 'numeric', month: 'short' }).replace(/\.$/, '');
}

/** Día y mes completo: "3 de octubre" / "October 3". Para el lector de pantalla. */
export function fechaLarga(fecha: Date, idioma: string): string {
  return formatear(fecha, idioma, { day: 'numeric', month: 'long' });
}

/** Día, mes y año: "3 de octubre de 2026" / "October 3, 2026". Para la fecha de una medalla. */
export function fechaConAnio(fecha: Date, idioma: string): string {
  return formatear(fecha, idioma, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Hora y minutos con la convención del idioma: "8:00" / "8:00 AM". Para recordatorios. */
export function horaCorta(h: number, m: number, idioma: string): string {
  const fecha = new Date(2000, 0, 1, h, m);
  const f = formateador(idioma, { hour: 'numeric', minute: '2-digit' });
  return f ? f.format(fecha) : fecha.toLocaleTimeString(idioma, { hour: 'numeric', minute: '2-digit' });
}

/** El idioma usa reloj de 24 horas (para el selector de hora nativo). */
export function usa24Horas(idioma: string): boolean {
  const f = formateador(idioma, { hour: 'numeric' });
  try {
    return f ? f.resolvedOptions().hour12 !== true : true;
  } catch {
    return true;
  }
}
