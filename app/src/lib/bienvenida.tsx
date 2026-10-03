/**
 * Si la persona ya pasó por la bienvenida (confirmó idioma y país).
 *
 * La lectura es síncrona (kv-store), así que el layout raíz decide en el primer render qué mostrar:
 * la bienvenida o las pestañas, sin que las pestañas parpadeen antes.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { guardarBienvenidaCompleta, leerBienvenidaCompleta } from './preferencias';

export type ContextoBienvenida = {
  completa: boolean;
  completar: () => void;
};

const Contexto = createContext<ContextoBienvenida | null>(null);

export function BienvenidaProvider({ children }: { children: ReactNode }) {
  const [completa, setCompleta] = useState(leerBienvenidaCompleta);

  const completar = useCallback(() => {
    guardarBienvenidaCompleta();
    setCompleta(true);
  }, []);

  const valor = useMemo(() => ({ completa, completar }), [completa, completar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useBienvenida(): ContextoBienvenida {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useBienvenida() debe usarse dentro de <BienvenidaProvider>.');
  return ctx;
}
