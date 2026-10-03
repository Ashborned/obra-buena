/**
 * Tipado de claves: una clave mal escrita en `t('...')` es un error de TypeScript.
 * El español es la referencia; los demás idiomas deben tener las mismas claves
 * (lo comprueba src/i18n/__tests__/claves.test.ts).
 */
import 'i18next';

import type es from './locales/es.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof es };
    returnNull: false;
  }
}
