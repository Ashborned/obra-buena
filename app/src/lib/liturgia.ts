/**
 * Tiempo litúrgico y color del día (rito romano, Calendario Romano General).
 * Cálculo, no datos: la Pascua sale del algoritmo gregoriano anónimo (Meeus/Jones/Butcher)
 * y el resto de las fechas se derivan de ella y de Navidad.
 *
 * Celebraciones móviles calculadas: Trinidad, Corpus Christi (jueves, fecha universal), Sagrado Corazón,
 * Cristo Rey (solemnidades, blanco), María Madre de la Iglesia e Inmaculado Corazón (memorias, blanco).
 *
 * Simplificaciones conocidas (se resuelven con el calendario por país, pendiente n.º 13):
 * - Epifanía, Ascensión y Corpus en su fecha universal (no trasladadas al domingo).
 * - Las solemnidades impedidas (p. ej. San José en domingo de Cuaresma) no se trasladan a otro día.
 * - Las fiestas del Señor que caen en domingo del tiempo ordinario no se distinguen de las demás fiestas.
 * - Jueves Santo en blanco todo el día (Misa Crismal y Cena del Señor).
 * - El rosado de Gaudete y Laetare es opcional en la liturgia; aquí se muestra siempre.
 */
import type { RangoCelebracion } from '@/contenido/tipos';

import { diasEntre, inicioDelDia, sumarDias } from './novenas';

export type ColorLiturgico = 'green' | 'white' | 'red' | 'purple';
/** Color del día: los cuatro de la cinta del misal más el rosado de Gaudete y Laetare. */
export type ColorDelDia = ColorLiturgico | 'rose';

export type TiempoLiturgico = 'adviento' | 'navidad' | 'ordinario' | 'cuaresma' | 'triduo' | 'pascua';

const mismoDia = (a: Date, b: Date) => diasEntre(a, b) === 0;

/** Domingo de Pascua del año (calendario gregoriano). */
export function pascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

/** Primer domingo de Adviento: el domingo entre el 27 de noviembre y el 3 de diciembre. */
export function primerDomingoAdviento(anio: number): Date {
  const nov27 = new Date(anio, 10, 27);
  return sumarDias(nov27, (7 - nov27.getDay()) % 7);
}

/** Bautismo del Señor: domingo después del 6 de enero (fin del tiempo de Navidad). */
export function bautismoDelSenor(anio: number): Date {
  const ene6 = new Date(anio, 0, 6);
  return sumarDias(ene6, 7 - ene6.getDay());
}

/** Fechas móviles del año alrededor de la Pascua. */
export function fechasMoviles(anio: number) {
  const p = pascua(anio);
  return {
    pascua: p,
    miercolesCeniza: sumarDias(p, -46),
    laetare: sumarDias(p, -21),
    ramos: sumarDias(p, -7),
    juevesSanto: sumarDias(p, -3),
    viernesSanto: sumarDias(p, -2),
    sabadoSanto: sumarDias(p, -1),
    pentecostes: sumarDias(p, 49),
    mariaMadreIglesia: sumarDias(p, 50),
    trinidad: sumarDias(p, 56),
    corpus: sumarDias(p, 60),
    sagradoCorazon: sumarDias(p, 68),
    inmaculadoCorazon: sumarDias(p, 69),
  };
}

/**
 * Corpus Christi: jueves después de la Trinidad (Pascua + 60), o el domingo siguiente
 * (Pascua + 63) en los países que lo trasladan (`contenido.traslados`).
 */
export function corpusChristi(anio: number, enDomingo = false): Date {
  return sumarDias(pascua(anio), enDomingo ? 63 : 60);
}

type Celebracion = { lit: ColorLiturgico; rango?: RangoCelebracion };

/** Diferencias del calendario según el país (ver `traslados` en el contenido). */
export type OpcionesCalendario = { corpusEnDomingo?: boolean };

/** Celebración móvil del Calendario Romano General que cae en esta fecha, si la hay. */
export function celebracionMovil(fecha: Date, opciones: OpcionesCalendario = {}): Celebracion | null {
  const t = inicioDelDia(fecha);
  const anio = t.getFullYear();
  const m = fechasMoviles(anio);
  const cristoRey = sumarDias(primerDomingoAdviento(anio), -7);
  const corpus = corpusChristi(anio, !!opciones.corpusEnDomingo);
  for (const d of [m.trinidad, corpus, m.sagradoCorazon, cristoRey]) {
    if (mismoDia(t, d)) return { lit: 'white', rango: 'solemnidad' };
  }
  for (const d of [m.mariaMadreIglesia, m.inmaculadoCorazon]) {
    if (mismoDia(t, d)) return { lit: 'white', rango: 'memoria' };
  }
  return null;
}

const PRECEDENCIA: Record<RangoCelebracion, number> = { solemnidad: 4, fiesta: 3, memoria: 2, memoria_libre: 1 };

/** Entre dos celebraciones del mismo día, la de mayor rango. */
function masAlta(a: Celebracion | null | undefined, b: Celebracion | null | undefined): Celebracion | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return PRECEDENCIA[b.rango ?? 'memoria_libre'] > PRECEDENCIA[a.rango ?? 'memoria_libre'] ? b : a;
}

export function tiempoLiturgico(fecha: Date): TiempoLiturgico {
  const t = inicioDelDia(fecha);
  const anio = t.getFullYear();
  const m = fechasMoviles(anio);
  if (t < bautismoDelSenor(anio) || mismoDia(t, bautismoDelSenor(anio))) return 'navidad';
  if (t >= new Date(anio, 11, 25)) return 'navidad';
  if (t >= primerDomingoAdviento(anio)) return 'adviento';
  if (t >= m.miercolesCeniza && t < m.juevesSanto) return 'cuaresma';
  if (t >= m.juevesSanto && t < m.pascua) return 'triduo';
  if (t >= m.pascua && t <= m.pentecostes) return 'pascua';
  return 'ordinario';
}

/** Color del día según el tiempo litúrgico, sin contar santos. */
export function colorDelTiempo(fecha: Date): ColorDelDia {
  const t = inicioDelDia(fecha);
  const anio = t.getFullYear();
  const m = fechasMoviles(anio);
  if (mismoDia(t, m.ramos) || mismoDia(t, m.viernesSanto) || mismoDia(t, m.pentecostes)) return 'red';
  if (mismoDia(t, m.juevesSanto)) return 'white';
  if (mismoDia(t, m.laetare)) return 'rose';
  if (mismoDia(t, sumarDias(primerDomingoAdviento(anio), 14))) return 'rose'; // Gaudete
  switch (tiempoLiturgico(t)) {
    case 'adviento':
    case 'cuaresma':
    case 'triduo': // Sábado Santo: sin misa durante el día.
      return 'purple';
    case 'navidad':
    case 'pascua':
      return 'white';
    default:
      return 'green';
  }
}

/**
 * Días que ninguna memoria ni fiesta desplaza: domingos de Adviento, Cuaresma y Pascua,
 * Miércoles de Ceniza, Semana Santa y la Octava de Pascua.
 */
function diaPrivilegiado(t: Date): boolean {
  const m = fechasMoviles(t.getFullYear());
  const tiempo = tiempoLiturgico(t);
  const domingo = t.getDay() === 0;
  if (domingo && (tiempo === 'adviento' || tiempo === 'cuaresma' || tiempo === 'pascua')) return true;
  if (mismoDia(t, m.miercolesCeniza)) return true;
  if (t >= m.ramos && t <= sumarDias(m.pascua, 7)) return true;
  return false;
}

/**
 * Color litúrgico del día, combinando el tiempo con la celebración del día: la de mayor rango
 * entre el santo (si lo hay) y la celebración móvil (si la hay).
 * - solemnidad: manda, salvo en días privilegiados;
 * - fiesta: manda, salvo domingos y días privilegiados;
 * - memoria: manda, salvo domingos, días privilegiados, Cuaresma y 17–24 de diciembre
 *   (ahí la memoria es solo conmemoración);
 * - memoria libre o sin rango: manda el tiempo (la memoria es opcional).
 */
export function colorDelDia(
  fecha: Date,
  santo?: Celebracion | null,
  opciones: OpcionesCalendario = {},
): ColorDelDia {
  const t = inicioDelDia(fecha);
  const tiempo = colorDelTiempo(t);
  const celebracion = masAlta(celebracionMovil(t, opciones), santo);
  if (!celebracion?.rango || celebracion.rango === 'memoria_libre') return tiempo;
  if (diaPrivilegiado(t)) return tiempo;
  if (celebracion.rango === 'solemnidad') return celebracion.lit;
  if (t.getDay() === 0) return tiempo;
  if (celebracion.rango === 'fiesta') return celebracion.lit;
  const dic17a24 = t.getMonth() === 11 && t.getDate() >= 17 && t.getDate() <= 24;
  if (tiempoLiturgico(t) === 'cuaresma' || dic17a24) return tiempo;
  return celebracion.lit;
}
