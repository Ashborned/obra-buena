/**
 * Textos de interfaz con i18next + react-i18next (docs/decisiones.md, 2026-10-03).
 *
 * REGLA: i18next es solo para textos de interfaz (botones, etiquetas, títulos, estados).
 * El contenido (oraciones, lecturas, santos, novenas, líneas de ayuda) viene de
 * content/contenido.json con sus campos por idioma; nunca se copia a estos JSON.
 *
 * Idioma: el guardado en el teléfono manda; si no hay, el primer idioma soportado de las
 * preferencias del teléfono (expo-localization); si ninguno es soportado, inglés.
 *
 * Para sumar un idioma: crear locales/<codigo>.json con las mismas claves que es.json
 * (la prueba de __tests__ lo exige), importarlo aquí y añadir una línea en IDIOMAS.
 */
// Hermes no trae Intl.PluralRules (comprobado en el emulador); sin él i18next usa una regla
// genérica que solo acierta en idiomas como es/en. El polyfill solo actúa si falta o está incompleto.
import 'intl-pluralrules';

import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { createInstance, type ParseKeys } from 'i18next';
import { initReactI18next } from 'react-i18next';

// Importación relativa (no '@/'): este módulo también lo cargan las pruebas de Jest.
import { guardarIdioma, leerIdioma } from '../lib/preferencias';
import en from './locales/en.json';
import es from './locales/es.json';

/** Idiomas de la interfaz. Añadir un idioma = su JSON + una línea aquí. */
export const IDIOMAS = {
  es,
  en,
} as const;

export type Idioma = keyof typeof IDIOMAS;

export const CODIGOS_IDIOMA = Object.keys(IDIOMAS) as Idioma[];

export const IDIOMA_RESPALDO: Idioma = 'en';

/** Clave de texto válida (con plurales ya resueltos: 'novenas.empiezaEn', no '..._one'). */
export type ClaveTexto = ParseKeys<'translation'>;

function esIdioma(codigo: string | null | undefined): codigo is Idioma {
  return !!codigo && (CODIGOS_IDIOMA as string[]).includes(codigo);
}

/** Primer idioma soportado entre las preferencias del teléfono; si no hay, el de respaldo. */
export function idiomaDelSistema(): Idioma {
  try {
    for (const locale of getLocales()) {
      const codigo = locale.languageCode?.toLowerCase();
      if (esIdioma(codigo)) return codigo;
    }
  } catch {
    // Sin información del sistema: idioma de respaldo.
  }
  return IDIOMA_RESPALDO;
}

/** Idioma con el que arranca la app: el elegido por la persona tiene prioridad sobre el del teléfono. */
export function idiomaInicial(): Idioma {
  return leerIdioma(CODIGOS_IDIOMA) ?? idiomaDelSistema();
}

const recursos = Object.fromEntries(
  Object.entries(IDIOMAS).map(([codigo, traduccion]) => [codigo, { translation: traduccion }]),
);

const i18n = createInstance();

// Inicio síncrono: los recursos van en el paquete, así que el primer render ya tiene textos.
i18n.use(initReactI18next).init({
  resources: recursos,
  lng: idiomaInicial(),
  fallbackLng: IDIOMA_RESPALDO,
  supportedLngs: CODIGOS_IDIOMA,
  defaultNS: 'translation',
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export function getIdioma(): Idioma {
  const actual = i18n.resolvedLanguage ?? i18n.language;
  return esIdioma(actual) ? actual : IDIOMA_RESPALDO;
}

/**
 * Cambia el idioma de toda la interfaz (las pantallas abiertas se vuelven a dibujar vía
 * `useTranslation`) y lo guarda en el teléfono.
 */
export async function cambiarIdioma(idioma: Idioma): Promise<void> {
  guardarIdioma(idioma);
  await i18n.changeLanguage(idioma);
}

/**
 * Vuelve al idioma del teléfono sin guardarlo ("Borrar mis datos"): la persona lo confirmará de
 * nuevo en la bienvenida.
 */
export async function restablecerIdioma(): Promise<void> {
  await i18n.changeLanguage(idiomaDelSistema());
}

function suscribirIdioma(avisar: () => void): () => void {
  i18n.on('languageChanged', avisar);
  return () => i18n.off('languageChanged', avisar);
}

/**
 * Idioma actual como valor reactivo. Usar esto en los componentes en vez de llamar a `getIdioma()`
 * durante el render: el React Compiler memoriza esa llamada (no tiene dependencias) y el valor
 * quedaba viejo tras cambiar de idioma (visto en el emulador).
 */
export function useIdioma(): Idioma {
  return useSyncExternalStore(suscribirIdioma, getIdioma, getIdioma);
}

export { useTranslation } from 'react-i18next';
export default i18n;


