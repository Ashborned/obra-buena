/**
 * Hora de oración: el cielo de la app cambia según el reloj (docs/sistema-diseno.md).
 * Portado de `hourNow` / `curHour` en prototype/obra-buena.html.
 *
 * - day   (Laudes)    05:00–11:59
 * - dusk  (Vísperas)  12:00–19:59
 * - night (Completas) 20:00–04:59
 */
export type HoraOracion = 'day' | 'dusk' | 'night';

/** Lo que la persona elige en Configuración: automático o una hora fija. */
export type PreferenciaHora = 'auto' | HoraOracion;

/** Hora de oración para una fecha, usando la hora local del teléfono. */
export function horaSegunReloj(fecha: Date = new Date()): HoraOracion {
  const h = fecha.getHours();
  if (h >= 5 && h < 12) return 'day';
  if (h >= 12 && h < 20) return 'dusk';
  return 'night';
}

/** Hora efectiva: la fijada en Configuración, o la del reloj si es `auto`. */
export function horaEfectiva(preferencia: PreferenciaHora, fecha: Date = new Date()): HoraOracion {
  return preferencia === 'auto' ? horaSegunReloj(fecha) : preferencia;
}
