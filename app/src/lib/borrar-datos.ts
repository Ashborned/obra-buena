/**
 * "Borrar mis datos" (Configuración → Privacidad): deja el teléfono como recién instalado.
 *
 * Borra, en este orden:
 * 1. Los recordatorios programados (si no, seguirían sonando sin novena guardada).
 * 2. El progreso: velas, rasgos, medallas y medallas de colección (tablas vacías, esquema intacto).
 * 3. Todas las preferencias de `kv-store`: paleta, hora de oración, animaciones, idioma, país,
 *    bienvenida, letra del lector, hora de los recordatorios, recordatorios activos, apertura del vitral.
 * 4. Lo que vive en memoria durante la sesión ("Otra oración") y el idioma de la interfaz, que vuelve
 *    al del teléfono sin guardarse.
 *
 * Después, la interfaz llama `reiniciar()` (`reinicio.tsx`): los proveedores se vuelven a montar,
 * leen el almacenamiento vacío y la app muestra la bienvenida.
 *
 * Nada de esto pasa por internet: no hay copia en ningún servidor que borrar.
 */
import Storage from 'expo-sqlite/kv-store';

import { restablecerIdioma } from '@/i18n';

import { moduloNotificaciones } from './avisos';
import { reiniciarOtraOracion } from './otra-oracion';
import { borrarProgreso } from './progreso';

export async function borrarMisDatos(): Promise<void> {
  try {
    await moduloNotificaciones()?.cancelAllScheduledNotificationsAsync();
  } catch {
    // Sin módulo de notificaciones (Expo Go en Android, pruebas): no hay avisos que cancelar.
  }
  // Si un paso falla, los demás se hacen igual (no dejar el borrado a medias) y al final se avisa.
  let fallo: unknown = null;
  try {
    await borrarProgreso();
  } catch (e) {
    fallo = e;
  }
  try {
    await Storage.clearAsync();
  } catch (e) {
    fallo ??= e;
  }
  reiniciarOtraOracion();
  await restablecerIdioma().catch(() => {});
  if (fallo) throw fallo;
}
