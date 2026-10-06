/**
 * Reinicio de la app sin cerrarla, tras "Borrar mis datos".
 *
 * Los proveedores (tema, país, bienvenida, animaciones) leen lo guardado una sola vez, al montarse.
 * `reiniciar()` cambia la `key` del árbol: todo se vuelve a montar, lee el almacenamiento ya vacío
 * y, como la bienvenida no está completa, la navegación muestra la bienvenida.
 */
import { createContext, Fragment, useCallback, useContext, useState, type ReactNode } from 'react';

const Contexto = createContext<(() => void) | null>(null);

export function ReinicioProvider({ children }: { children: ReactNode }) {
  const [generacion, setGeneracion] = useState(0);
  const reiniciar = useCallback(() => setGeneracion((g) => g + 1), []);
  return (
    <Contexto.Provider value={reiniciar}>
      <Fragment key={generacion}>{children}</Fragment>
    </Contexto.Provider>
  );
}

export function useReiniciar(): () => void {
  const reiniciar = useContext(Contexto);
  if (!reiniciar) throw new Error('useReiniciar() debe usarse dentro de <ReinicioProvider>.');
  return reiniciar;
}
