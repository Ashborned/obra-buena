/**
 * Pantalla de carga (splash nativo de `expo-splash-screen`): cómo se va.
 *
 * - Movimiento completo: fundido de `movimiento.salidaCarga` (calma). En Android el sistema siempre
 *   funde con `duration`; en iOS hace falta `fade: true`.
 * - Movimiento reducido (sistema **o** Configuración → Animaciones: Reducidas): corte directo
 *   (`duration: 0`, `fade: false`).
 *
 * Se decide sin esperar nada asíncrono: la preferencia "Reducidas" se lee síncrona de kv-store y la
 * del sistema llega síncrona desde Reanimated (`useReducedMotion()`, que lee el valor que el módulo
 * nativo deja listo al arrancar). Así no se retrasa la ocultación ni un cuadro.
 *
 * En Expo Go no hay splash propio y `setOptions` solo avisa: ahí únicamente se oculta.
 */
import { isRunningInExpoGo } from 'expo';
import * as SplashScreen from 'expo-splash-screen';

import { movimiento } from '@/theme/movimiento';

import { leerPreferenciaAnimaciones } from './preferencias';

export type OpcionesSalidaCarga = { duration: number; fade: boolean };

export function opcionesSalidaCarga(reducir: boolean): OpcionesSalidaCarga {
  return reducir ? { duration: 0, fade: false } : { duration: movimiento.salidaCarga, fade: true };
}

/** Oculta la pantalla de carga. `sistemaReduce`: `useReducedMotion()` de Reanimated. */
export function ocultarPantallaCarga(sistemaReduce: boolean): void {
  const reducir = sistemaReduce || leerPreferenciaAnimaciones() === 'reducidas';
  if (!isRunningInExpoGo()) SplashScreen.setOptions(opcionesSalidaCarga(reducir));
  SplashScreen.hide();
}
