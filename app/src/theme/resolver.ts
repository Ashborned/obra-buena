/**
 * Resolución de tokens: paleta × hora de oración → colores concretos. Puro (sin React), probable con Jest.
 *
 * Traducción directa de `.phone`, `.phone[data-pal]` y `.phone[data-hour]` en prototype/obra-buena.html.
 * La hora se calcula con `app/src/lib/hora-oracion.ts`; aquí solo se recibe ya resuelta.
 */
import type { HoraOracion } from '@/lib/hora-oracion';

import { aplanar, asegurarContraste, conAlfa, mezclarOklab, type Hex } from './color';
import { paletas, type Paleta, type PaletaId } from './paletas';

/** Colores fijos de cada hora (no dependen de la paleta). */
export const constantesHora = {
  blanco: '#FFFFFF',
  /** Durazno de Vísperas. */
  durazno: '#FFC3A6',
  /** Lila claro de Vísperas. */
  lilaClaro: '#F2E4FF',
  /** Bases oscuras de Completas. */
  nocheProfunda: '#0A0B1C',
  nocheMorada: '#1A0F2A',
  /** Fondo de cada hora (bg3). */
  fondoLaudes: '#FBFAF7',
  fondoVisperas: '#FFF3EC',
  fondoCompletas: '#07081A',
  /** Texto de noche. */
  textoNoche: '#F4F2FB',
  /** Base del dorado viejo (gilt) de día. */
  oroViejo: '#6B3D00',
  /** Vidrio de noche y sombras. */
  vidrioNoche: '#18193A',
  sombraNoche: '#000000',
} as const satisfies Record<string, Hex>;

export type Cielo = {
  /** Mancha de luz superior izquierda (bg1). */
  luz: Hex;
  /** Mancha lateral derecha (bg2). */
  bruma: Hex;
  /** Fondo sólido (bg3). */
  fondo: Hex;
  /** Si se dibujan estrellas (solo Completas). */
  estrellas: boolean;
};

export type TemaResuelto = {
  paletaId: PaletaId;
  hora: HoraOracion;
  paleta: Paleta;
  cielo: Cielo;
  colores: {
    /** Texto principal. */
    texto: string;
    /** Texto secundario. */
    textoSuave: string;
    /** Acento: primary de día, glow de noche. Exacto de la paleta; para gráficos y superficies. */
    acento: Hex;
    /** Acento para texto pequeño (etiquetas, enlaces): el acento, oscurecido solo si no llega a AA. */
    acentoTexto: Hex;
    /** Dorado de capitulares y detalles. */
    oro: Hex;
    /** Líneas divisorias. */
    linea: string;
    /** Texto sobre botón dorado. */
    sobreLuz: Hex;
  };
  superficies: {
    /** Tarjeta de vidrio. */
    vidrio: string;
    /** Borde de la tarjeta de vidrio. */
    vidrioBorde: string;
    /** Color de sombra de las tarjetas. */
    sombra: string;
    /** Barra de pestañas flotante (más opaca que el vidrio). */
    barraFondo: string;
    barraBorde: string;
    barraSombra: string;
    /** Pestaña activa: fondo y tinta. */
    pestanaActivaFondo: string;
    pestanaActiva: string;
    pestanaInactiva: string;
    /** Botón dorado (`.btn.gold`): fondo sólido de respaldo y degradado vertical encima. */
    botonLuz: Hex;
    botonLuzDegradado: string;
  };
  /** Estilo de la barra de estado del sistema sobre el fondo. */
  barraEstado: 'dark' | 'light';
  /** Para componentes nativos que preguntan claro/oscuro. */
  esOscuro: boolean;
};

function cieloDe(p: Paleta, hora: HoraOracion): Cielo {
  const k = constantesHora;
  switch (hora) {
    case 'day':
      return {
        luz: mezclarOklab(p.glowSoft, k.blanco, 0.6),
        bruma: mezclarOklab(p.primary, k.blanco, 0.16),
        fondo: k.fondoLaudes,
        estrellas: false,
      };
    case 'dusk':
      return {
        luz: mezclarOklab(p.glow, k.durazno, 0.42),
        bruma: mezclarOklab(p.primary, k.lilaClaro, 0.32),
        fondo: k.fondoVisperas,
        estrellas: false,
      };
    case 'night':
      return {
        luz: mezclarOklab(p.primary, k.nocheProfunda, 0.55),
        bruma: mezclarOklab(p.primaryDeep, k.nocheMorada, 0.7),
        fondo: k.fondoCompletas,
        estrellas: true,
      };
  }
}

/**
 * Las dos manchas de luz del cielo como `radial-gradient` CSS (mismas medidas que `.phone` en la maqueta).
 * Se termina en el mismo color con alfa 0 (no en `transparent`) para que el degradado no se agrise.
 */
export function degradadosCielo(cielo: Cielo): string {
  return [
    `radial-gradient(120% 55% at 15% 0%, ${cielo.luz}, ${conAlfa(cielo.luz, 0)} 62%)`,
    `radial-gradient(90% 60% at 100% 45%, ${cielo.bruma}, ${conAlfa(cielo.bruma, 0)} 66%)`,
  ].join(', ');
}

/** Contraste mínimo AA para texto normal. */
export const CONTRASTE_AA = 4.5;

/** Resuelve todos los tokens de color para una paleta y una hora de oración. */
export function resolverTema(paletaId: PaletaId, hora: HoraOracion): TemaResuelto {
  const p = paletas[paletaId];
  const k = constantesHora;
  const cielo = cieloDe(p, hora);
  const noche = hora === 'night';

  const texto = noche ? k.textoNoche : p.ink;
  const acento = noche ? p.glow : p.primary;

  // Fondos sobre los que puede caer texto: el cielo sólido y sus dos manchas de luz.
  const fondosCielo = [cielo.fondo, cielo.luz, cielo.bruma];
  const barraFondo = conAlfa(cielo.fondo, 0.84);
  const barraPlana = aplanar(barraFondo, cielo.fondo);
  const pestanaActivaFondo = conAlfa(acento, 0.13);

  // De noche la maqueta usa blanco al 66 % y ya cumple AA; de día se parte de ink 60 % + blanco
  // y se oscurece hacia ink solo lo necesario (ver docs/sistema-diseno.md y el informe de la tarea).
  const textoSuave = noche
    ? conAlfa(k.textoNoche, 0.66)
    : asegurarContraste(mezclarOklab(p.ink, k.blanco, 0.6), [...fondosCielo, barraPlana], CONTRASTE_AA, p.ink);
  const acentoTexto = noche
    ? acento
    : asegurarContraste(acento, fondosCielo, CONTRASTE_AA, p.ink);
  const pestanaActiva = noche
    ? acento
    : asegurarContraste(acento, [aplanar(pestanaActivaFondo, barraPlana)], CONTRASTE_AA, p.ink);

  return {
    paletaId,
    hora,
    paleta: p,
    cielo,
    colores: {
      texto,
      textoSuave,
      acento,
      acentoTexto,
      oro: noche ? p.glow : mezclarOklab(p.glow, k.oroViejo, 0.55),
      linea: noche ? conAlfa(k.blanco, 0.12) : conAlfa(p.ink, 0.12),
      sobreLuz: p.onGlow,
    },
    superficies: {
      vidrio: noche
        ? conAlfa(k.vidrioNoche, 0.55)
        : conAlfa(k.blanco, hora === 'dusk' ? 0.55 : 0.62),
      vidrioBorde: noche ? conAlfa(k.blanco, 0.13) : conAlfa(k.blanco, 0.95),
      sombra: noche ? conAlfa(k.sombraNoche, 0.35) : conAlfa(p.primary, 0.16),
      barraFondo,
      barraBorde: noche ? conAlfa(k.blanco, 0.13) : conAlfa(k.blanco, 0.95),
      barraSombra: conAlfa(k.nocheProfunda, 0.3),
      pestanaActivaFondo,
      pestanaActiva,
      pestanaInactiva: textoSuave,
      botonLuz: p.glow,
      // Maqueta: linear-gradient(180deg, color-mix(g2 70%, #fff), g).
      botonLuzDegradado: `linear-gradient(180deg, ${mezclarOklab(p.glowSoft, k.blanco, 0.7)}, ${p.glow})`,
    },
    barraEstado: noche ? 'light' : 'dark',
    esOscuro: noche,
  };
}
