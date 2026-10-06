/**
 * Preferencia de animaciones (Configuración → Apariencia): "Según el sistema" o "Reducidas".
 *
 * - `useReducirMovimiento()` reemplaza a `useReducedMotion()` de Reanimated en toda la app:
 *   es `true` si el teléfono pide reducir movimiento **o** si la persona eligió "Reducidas".
 * - Con "Reducidas" también se monta `ReducedMotionConfig` en `Always`, así las animaciones de
 *   Reanimated que siguen al sistema (`ReduceMotion.System`) se reducen igual. Con "Según el sistema"
 *   no se monta (Reanimated ya sigue al sistema, y así no avisa en desarrollo que se sobrescribió).
 * - `useInclinacionVitral()`: la luz del vitral sigue la inclinación del teléfono solo si la persona
 *   lo encendió **y** no hay movimiento reducido. Usa los sensores de Reanimated (sin permisos).
 *
 * Duraciones, curvas y resortes: `@/theme/movimiento`. Vibración: `@/lib/vibracion`.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ReducedMotionConfig, ReduceMotion, useReducedMotion } from 'react-native-reanimated';

import {
  guardarInclinacion,
  guardarPreferenciaAnimaciones,
  leerInclinacion,
  leerPreferenciaAnimaciones,
  type PreferenciaAnimaciones,
} from './preferencias';

type ContextoAnimaciones = {
  preferencia: PreferenciaAnimaciones;
  setPreferencia: (p: PreferenciaAnimaciones) => void;
  /** Lo que eligió la persona (el interruptor), aunque el movimiento reducido lo deje sin efecto. */
  inclinacion: boolean;
  setInclinacion: (activa: boolean) => void;
};

const Contexto = createContext<ContextoAnimaciones | null>(null);

export function AnimacionesProvider({ children }: { children: ReactNode }) {
  const [preferencia, setEstado] = useState<PreferenciaAnimaciones>(leerPreferenciaAnimaciones);

  const setPreferencia = useCallback((p: PreferenciaAnimaciones) => {
    setEstado(p);
    guardarPreferenciaAnimaciones(p);
  }, []);

  const [inclinacion, setInclinacionEstado] = useState<boolean>(leerInclinacion);

  const setInclinacion = useCallback((activa: boolean) => {
    setInclinacionEstado(activa);
    guardarInclinacion(activa);
  }, []);

  const valor = useMemo(
    () => ({ preferencia, setPreferencia, inclinacion, setInclinacion }),
    [preferencia, setPreferencia, inclinacion, setInclinacion],
  );
  return (
    <Contexto.Provider value={valor}>
      {/* Solo con "Reducidas": al desmontarse, Reanimated vuelve a seguir al sistema. */}
      {preferencia === 'reducidas' ? <ReducedMotionConfig mode={ReduceMotion.Always} /> : null}
      {children}
    </Contexto.Provider>
  );
}

export function usePreferenciaAnimaciones(): ContextoAnimaciones {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('usePreferenciaAnimaciones() debe usarse dentro de <AnimacionesProvider>.');
  return ctx;
}

/** Reducir movimiento: lo pide el teléfono o la persona eligió "Reducidas". Fuera del proveedor, solo el sistema. */
export function useReducirMovimiento(): boolean {
  const sistema = useReducedMotion();
  const ctx = useContext(Contexto);
  return sistema || ctx?.preferencia === 'reducidas';
}

/** La luz del vitral sigue la inclinación: encendida en Configuración y sin movimiento reducido. */
export function useInclinacionVitral(): boolean {
  const reducir = useReducirMovimiento();
  const ctx = useContext(Contexto);
  return !reducir && ctx?.inclinacion === true;
}
