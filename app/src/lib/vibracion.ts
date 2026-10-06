/**
 * Vibración (expo-haptics), centralizada. Solo acompaña momentos de nivel 1 (recompensas y la vela);
 * nunca la lectura ni la oración en sí.
 *
 * Con movimiento reducido (sistema o Configuración → Animaciones: Reducidas) no vibra nada
 * (docs/decisiones.md, 2026-10-06; reemplaza la regla del 2026-10-05).
 *
 * Uso: `const vibrar = useVibracion();` y luego `vibrar('rasgo')` dentro del manejador. El hook lee la
 * preferencia al renderizar, así que la función siempre refleja el ajuste vigente.
 */
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useReducirMovimiento } from './animaciones';

/** Cada momento con vibración y cómo se siente. Agregar uno nuevo aquí, no en la pantalla. */
export type MomentoVibracion =
  /** La llama nace: un toque blando, como un fósforo. */
  | 'vela'
  /** Las 9 velas encendidas. */
  | 'novenaCompleta'
  /** Un rasgo descubierto en la lectura: leve. */
  | 'rasgo'
  /** Medalla acuñada. */
  | 'medalla'
  /** Colección completa. */
  | 'coleccion'
  /** Tope de un gesto (la medalla de la vitrina llega a su ángulo máximo). */
  | 'tope';

function ejecutar(momento: MomentoVibracion): Promise<void> {
  switch (momento) {
    case 'vela':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    case 'rasgo':
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    case 'tope':
      return Haptics.selectionAsync();
    case 'novenaCompleta':
    case 'medalla':
    case 'coleccion':
      return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Vibra si corresponde. Nunca lanza: en web o sin motor de vibración simplemente no pasa nada. */
export function vibrar(momento: MomentoVibracion, reducirMovimiento: boolean): void {
  if (reducirMovimiento || Platform.OS === 'web') return;
  try {
    ejecutar(momento).catch(() => {});
  } catch {
    // Sin vibración disponible: el momento sigue igual, solo sin vibrar.
  }
}

/** `vibrar` ya atado a la preferencia de movimiento vigente. */
export function useVibracion(): (momento: MomentoVibracion) => void {
  const reducir = useReducirMovimiento();
  return useCallback((momento: MomentoVibracion) => vibrar(momento, reducir), [reducir]);
}
