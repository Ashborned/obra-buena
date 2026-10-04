/**
 * Llamar a una línea de ayuda: abre el marcador del teléfono con el número ya escrito.
 * Nunca llama sola: la persona confirma en su marcador (`tel:` abre el marcador, no llama).
 *
 * - El número sale siempre del campo `marcar` del contenido (ningún número en el código).
 * - `#` se codifica como `%23` (en una URL inicia un fragmento); `*` y `+` van tal cual (RFC 3966).
 * - iOS no marca enlaces `tel:` que contengan `*` o `#` (restricción de Apple contra códigos
 *   de servicio). En ese caso no se abre nada y la interfaz muestra el número para marcarlo a mano.
 */
import { Linking, Platform } from 'react-native';

export type Plataforma = 'ios' | 'android' | string;

export type Llamada =
  | { tipo: 'marcador'; url: string; numero: string }
  | { tipo: 'manual'; numero: string; motivo: 'ios-codigo-servicio' | 'numero-invalido' | 'sin-marcador' };

const VALIDO = /^\+?[0-9*#]+$/;

/** URL `tel:` para un número a marcar. */
export function urlTel(marcar: string): string {
  return `tel:${marcar.replace(/#/g, '%23')}`;
}

/** Decide cómo llamar en esta plataforma, sin efectos. */
export function prepararLlamada(marcar: string, plataforma: Plataforma = Platform.OS): Llamada {
  const numero = marcar.replace(/[\s()-]/g, '');
  if (!VALIDO.test(numero)) return { tipo: 'manual', numero: marcar, motivo: 'numero-invalido' };
  if (plataforma === 'ios' && /[*#]/.test(numero)) {
    return { tipo: 'manual', numero, motivo: 'ios-codigo-servicio' };
  }
  return { tipo: 'marcador', url: urlTel(numero), numero };
}

/**
 * Abre el marcador. Devuelve la llamada preparada; si es `manual` o si abrir falla
 * (sin app de teléfono, p. ej. una tablet), la interfaz debe mostrar el número para marcarlo a mano.
 */
export async function abrirMarcador(marcar: string): Promise<Llamada> {
  const llamada = prepararLlamada(marcar);
  if (llamada.tipo === 'manual') return llamada;
  try {
    await Linking.openURL(llamada.url);
    return llamada;
  } catch {
    return { tipo: 'manual', numero: llamada.numero, motivo: 'sin-marcador' };
  }
}
