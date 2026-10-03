/**
 * Fechas de novenas: los 9 días que terminan la víspera de la fiesta.
 * Portado de `info` en prototype/obra-buena.html, con dos cambios aprobados (2026-10-03):
 * el día de la fiesta se reporta como `esFiesta` (la maqueta saltaba al año siguiente),
 * y el 29 de febrero se celebra el 28 en años no bisiestos.
 *
 * Todas las fechas son días civiles locales (medianoche local); la hora se descarta.
 */

/** Fiesta que se repite cada año (mes 1–12, día 1–31). */
export type FiestaAnual = { mes: number; dia: number };
/** Fiesta de fecha única (p. ej. una fiesta móvil ya calculada para un año). */
export type FiestaFija = { fecha: { anio: number; mes: number; dia: number } };
export type Fiesta = FiestaAnual | FiestaFija;

export type EstadoNovena = {
  /** Día de la fiesta (la de hoy si hoy es la fiesta; si no, la próxima). */
  fiesta: Date;
  /** Primer día de la novena (fiesta − 9 días). */
  inicio: Date;
  /** Último día de la novena (víspera de la fiesta). */
  fin: Date;
  /** Día de la novena que toca hoy (1–9), o null si hoy no hay novena en curso. */
  dia: number | null;
  /** Hoy es el día de la fiesta. Desde mañana, una fiesta anual pasa a la del año siguiente. */
  esFiesta: boolean;
  /** Días que faltan para empezar (0 si está en curso o es la fiesta; negativo si ya pasó una fiesta fija). */
  faltan: number;
};

/** Medianoche local del día de `fecha`. */
export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Suma días civiles (sin usar milisegundos, para no romperse con el cambio de hora). */
export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
}

/** Diferencia en días civiles entre dos fechas (b − a). */
export function diasEntre(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/** Días del mes (1–12) en un año dado. */
function diasDelMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

/**
 * Fecha de una fiesta anual en un año dado.
 * Convención de la app (docs/decisiones.md): una fiesta del 29 de febrero
 * se celebra el 28 de febrero en los años no bisiestos.
 * Una fecha imposible (p. ej. 31 de abril) es un error de contenido y lanza RangeError.
 */
export function fiestaEnAnio(fiesta: FiestaAnual, anio: number): Date {
  const { mes, dia } = fiesta;
  if (!Number.isInteger(mes) || !Number.isInteger(dia) || mes < 1 || mes > 12 || dia < 1) {
    throw new RangeError(`Fecha de fiesta inválida: ${mes}/${dia}`);
  }
  if (mes === 2 && dia === 29) {
    return new Date(anio, 1, esBisiesto(anio) ? 29 : 28);
  }
  if (dia > diasDelMes(2000, mes)) {
    throw new RangeError(`Fecha de fiesta inválida: ${mes}/${dia}`);
  }
  return new Date(anio, mes - 1, dia);
}

/**
 * Fiesta que corresponde a hoy: para fiestas anuales, la de este año si es hoy
 * o aún no llega; si ya pasó, la del año siguiente.
 */
export function proximaFiesta(fiesta: Fiesta, hoy: Date = new Date()): Date {
  const t = inicioDelDia(hoy);
  if ('fecha' in fiesta) {
    return new Date(fiesta.fecha.anio, fiesta.fecha.mes - 1, fiesta.fecha.dia);
  }
  const esteAnio = fiestaEnAnio(fiesta, t.getFullYear());
  return esteAnio < t ? fiestaEnAnio(fiesta, t.getFullYear() + 1) : esteAnio;
}

export function estadoNovena(fiesta: Fiesta, hoy: Date = new Date()): EstadoNovena {
  const t = inicioDelDia(hoy);
  const f = proximaFiesta(fiesta, t);
  const inicio = sumarDias(f, -9);
  const fin = sumarDias(f, -1);
  const desdeInicio = diasEntre(inicio, t);
  const dia = desdeInicio >= 0 && desdeInicio < 9 ? desdeInicio + 1 : null;
  const esFiesta = desdeInicio === 9;
  return { fiesta: f, inicio, fin, dia, esFiesta, faltan: dia || esFiesta ? 0 : diasEntre(t, inicio) };
}
