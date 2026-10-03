/**
 * Tokens fijos (no dependen de paleta ni de hora). Fuente: docs/sistema-diseno.md y la maqueta.
 */
import type { Hex } from './color';

/** Colores litúrgicos (cinta del misal). */
export const liturgicos = {
  verde: '#2F7D4F',
  blanco: '#F6EFDC',
  rojo: '#B3263A',
  morado: '#5B2A86',
  /** Domingos Gaudete y Laetare. */
  rosado: '#E39AB5',
} as const satisfies Record<string, Hex>;

export type ColorLiturgico = keyof typeof liturgicos;

/** Semánticos del quiz. No se usan como acento. */
export const semanticos = {
  correcto: '#2F9E5F',
  incorrecto: '#C23B4F',
} as const satisfies Record<string, Hex>;

/** Radios de borde (pt). */
export const radios = {
  sm: 12,
  md: 16,
  /** Botón de pestaña activo. */
  pestana: 20,
  /** Tarjeta de vidrio, mosaicos. */
  tarjeta: 24,
  /** Barra de pestañas flotante. */
  barra: 26,
  /** Borde inferior del vitral y encabezados de emoción. */
  hero: 36,
  /** Chips y píldoras. */
  pildora: 999,
} as const;

/** Escala de espaciado (pt). */
export const espaciado = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Medidas de interacción y de la barra de pestañas. */
export const medidas = {
  /** Objetivo táctil mínimo (pt). */
  toqueMinimo: 44,
  /** Margen de la barra flotante respecto de los bordes. */
  barraMargen: 14,
  /** Relleno interno de la barra. */
  barraRelleno: 6,
  /** Tamaño de ícono de pestaña. */
  iconoPestana: 23,
  /** Tamaño de ícono dentro de un botón redondo. */
  iconoBoton: 21,
  /** Alto aproximado de la barra (sin el área segura), para dejar espacio al contenido. */
  barraAlto: 64,
} as const;

/** Superficies que no dependen de la hora. */
export const superficiesFijas = {
  /** Desenfoque de la tarjeta de vidrio (cuando haya BlurView). */
  desenfoqueTarjeta: 18,
  /** Desenfoque de la barra de pestañas. */
  desenfoqueBarra: 20,
  /** Opacidad del grano de película sobre toda la pantalla. */
  granoOpacidad: 0.16,
} as const;

/** Duraciones de transición (ms), según docs/guia-movimiento.md. */
export const duraciones = {
  /** Cambio de pestaña: fundido cruzado. */
  cambioPestana: 200,
  /** Cielo al cruzar de una hora de oración a otra. */
  cambioCielo: 600,
  /** Contenido de calma (bienvenida, selectores): fundido de entrada (nivel 3). */
  fundidoCalma: 400,
} as const;
