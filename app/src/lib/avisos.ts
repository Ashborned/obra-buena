/**
 * Carga protegida de `expo-notifications` y de `recordatorios.ts`.
 *
 * En Expo Go para Android (SDK 53+), solo importar `expo-notifications` lanza un error (su módulo
 * de registro de push corre al cargarse). Para que la app no se caiga ahí, el módulo se carga a
 * pedido y, en ese entorno, ni se intenta: los recordatorios quedan ocultos. En un build de
 * desarrollo o de tienda funcionan normal.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type ModuloRecordatorios = typeof import('./recordatorios');
type ModuloNotificaciones = typeof import('expo-notifications');

/** Expo Go en Android no permite cargar expo-notifications. */
const sinNotificaciones = Platform.OS === 'android' && isRunningInExpoGo();

let recordatorios: ModuloRecordatorios | null | undefined;
let notificaciones: ModuloNotificaciones | null | undefined;

/** `recordatorios.ts`, o null si en este entorno no hay notificaciones. */
export function moduloRecordatorios(): ModuloRecordatorios | null {
  if (recordatorios === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      recordatorios = sinNotificaciones ? null : (require('./recordatorios') as ModuloRecordatorios);
    } catch {
      recordatorios = null;
    }
  }
  return recordatorios;
}

/** `expo-notifications`, o null si en este entorno no se puede cargar. */
export function moduloNotificaciones(): ModuloNotificaciones | null {
  if (notificaciones === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      notificaciones = sinNotificaciones ? null : (require('expo-notifications') as ModuloNotificaciones);
    } catch {
      notificaciones = null;
    }
  }
  return notificaciones;
}
