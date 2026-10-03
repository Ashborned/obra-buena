/**
 * Paletas elegibles en Configuración (docs/sistema-diseno.md → Paletas).
 * Rosa mística es la paleta por defecto (docs/decisiones.md, 2026-10-02).
 */
import type { Hex } from './color';

export type PaletaId = 'rosaMistica' | 'vitral';

export type Paleta = {
  id: PaletaId;
  /** p — color principal (acento de día). */
  primary: Hex;
  /** pd — principal profundo (fondo del vitral, cielo de noche). */
  primaryDeep: Hex;
  /** g — luz (acento de noche, botón dorado, velas). */
  glow: Hex;
  /** g2 — luz suave. */
  glowSoft: Hex;
  /** Texto principal de día. */
  ink: Hex;
  /** gink — texto sobre superficies de luz (botón dorado). */
  onGlow: Hex;
  /** Colores del vitral generativo, en el orden del sistema de diseño. */
  vitral: readonly Hex[];
};

export const rosaMistica: Paleta = {
  id: 'rosaMistica',
  primary: '#7B55C9',
  primaryDeep: '#34264F',
  glow: '#F28CB6',
  glowSoft: '#FFD3E4',
  ink: '#2A2531',
  onGlow: '#17130A',
  vitral: ['#7B55C9', '#A684E6', '#C9A6FF', '#5D3FA0', '#B98AE0', '#F28CB6', '#F7B3CF', '#FFD3E4'],
};

export const vitral: Paleta = {
  id: 'vitral',
  primary: '#1B2A8C',
  primaryDeep: '#0D1452',
  glow: '#F5C542',
  glowSoft: '#FFE08A',
  ink: '#10111F',
  onGlow: '#17130A',
  vitral: ['#1B2A8C', '#22379E', '#2C4BC0', '#0F1A66', '#3A6FD0', '#F5C542', '#E8A91C', '#B3264A'],
};

export const paletas: Record<PaletaId, Paleta> = { rosaMistica, vitral };

export const PALETA_POR_DEFECTO: PaletaId = 'rosaMistica';

export const PALETAS_IDS: readonly PaletaId[] = ['rosaMistica', 'vitral'];
