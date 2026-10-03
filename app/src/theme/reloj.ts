/**
 * Cuándo vuelve a cambiar la hora de oración (05:00, 12:00, 20:00, hora local). Puro, probable con Jest.
 * Las fronteras son las mismas de `horaSegunReloj` en app/src/lib/hora-oracion.ts.
 */
const FRONTERAS = [5, 12, 20] as const;

/** Próxima fecha (estrictamente posterior a `desde`) en que cruza una frontera de hora. */
export function proximoCambioDeHora(desde: Date = new Date()): Date {
  for (const h of FRONTERAS) {
    const candidata = new Date(desde);
    candidata.setHours(h, 0, 0, 0);
    if (candidata.getTime() > desde.getTime()) return candidata;
  }
  const manana = new Date(desde);
  manana.setDate(manana.getDate() + 1);
  manana.setHours(FRONTERAS[0], 0, 0, 0);
  return manana;
}

/** Milisegundos hasta el próximo cambio, con un pequeño margen para caer ya dentro de la nueva hora. */
export function msHastaProximoCambio(desde: Date = new Date(), margenMs = 1000): number {
  return Math.max(0, proximoCambioDeHora(desde).getTime() - desde.getTime()) + margenMs;
}
