/**
 * Transiciones compartidas (guía de movimiento, nivel 3 y nivel 1):
 *
 * - **La tarjeta del santo se expande hacia su historia.** En Hoy, al tocar "Conocer su historia", el
 *   bloque del santo crece como una hoja de vidrio hasta cubrir la pantalla bajo el vitral, mientras
 *   la historia entra con un fundido debajo; luego la hoja se desvanece.
 * - **La medalla viaja del resultado del quiz a la vitrina.** La medalla ganada se levanta de la página,
 *   espera a que la vitrina esté a la vista y vuela en arco, girando una vez, hasta su casilla, donde
 *   se asienta con un pequeño rebote.
 *
 * Por qué no las "shared element transitions" de Reanimated 4.5: siguen detrás de una bandera nativa
 * estática (`ENABLE_SHARED_ELEMENT_TRANSITIONS: false`) que exige compilar la app (no corre en Expo Go)
 * y son experimentales con native-stack. Aquí la animación es una capa encima de toda la navegación
 * (`TransicionesProvider`, en el layout raíz) que mide el origen con `measureInWindow` y sigue al
 * destino **cuadro a cuadro en el hilo de UI** con `measure()`: si la pantalla de destino todavía se
 * está deslizando, la medalla la sigue igual. Nada de setState por cuadro.
 *
 * Con "Reducir movimiento" no hay capa: las pantallas solo se funden (lo decide quien llama y, por si
 * acaso, también el proveedor).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolateColor,
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type AnimatedRef,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReducirMovimiento } from '@/lib/animaciones';
import { radios, useTema } from '@/theme';
import { curvas, movimiento, resortes, tiempo } from '@/theme/movimiento';

/** Rectángulo en coordenadas de la ventana. */
export type Rect = { x: number; y: number; ancho: number; alto: number };

/** Altura del arco que dibuja la medalla al volar (pt). */
const ARCO_VUELO = 90;
/** La medalla se levanta un poco antes de volar. */
const LEVANTAR = 1.06;
/** Perspectiva del giro de la medalla en vuelo. */
const PERSPECTIVA = 700;
/** Al asentarse en la vitrina, la medalla crece apenas y vuelve. */
const ASENTAR = 1.12;

/** Mide una vista en la ventana. `null` si no está montada o no tiene tamaño. */
export function medirEnVentana(ref: RefObject<View | null>, alMedir: (r: Rect) => void): void {
  ref.current?.measureInWindow((x, y, ancho, alto) => {
    if (ancho > 0 && alto > 0) alMedir({ x, y, ancho, alto });
  });
}

type Vuelo = {
  clave: number;
  /** Id de la lectura cuya medalla vuela (la casilla de la vitrina con ese id es el destino). */
  id: string;
  medalla: ReactNode;
  origen: Rect;
  aterrizo: boolean;
};

type Contexto = {
  expandirTarjeta: (origen: Rect) => void;
  lanzarMedalla: (datos: { id: string; medalla: ReactNode; origen: Rect }) => void;
  vuelo: Vuelo | null;
  registrarDestino: (id: string, ref: AnimatedRef<View> | null) => void;
};

const Ctx = createContext<Contexto | null>(null);

export function TransicionesProvider({ children }: { children: ReactNode }) {
  const reducir = useReducirMovimiento();
  const [expansion, setExpansion] = useState<{ clave: number; origen: Rect } | null>(null);
  const [vuelo, setVuelo] = useState<Vuelo | null>(null);
  const [destino, setDestino] = useState<{ id: string; ref: AnimatedRef<View> } | null>(null);

  const expandirTarjeta = useCallback(
    (origen: Rect) => {
      if (reducir) return;
      setExpansion({ clave: Date.now(), origen });
    },
    [reducir],
  );

  const lanzarMedalla = useCallback(
    (datos: { id: string; medalla: ReactNode; origen: Rect }) => {
      if (reducir) return;
      setVuelo({ ...datos, clave: Date.now(), aterrizo: false });
    },
    [reducir],
  );

  const registrarDestino = useCallback((id: string, ref: AnimatedRef<View> | null) => {
    setDestino((d) => (ref ? { id, ref } : d?.id === id ? null : d));
  }, []);

  const valor = useMemo(
    () => ({ expandirTarjeta, lanzarMedalla, vuelo, registrarDestino }),
    [expandirTarjeta, lanzarMedalla, vuelo, registrarDestino],
  );

  const refDestino = vuelo && destino?.id === vuelo.id ? destino.ref : null;

  return (
    <Ctx.Provider value={valor}>
      <View style={styles.llenar}>
        {children}
        {expansion ? (
          <ExpansionTarjeta
            key={expansion.clave}
            origen={expansion.origen}
            alTerminar={() => setExpansion(null)}
          />
        ) : null}
        {vuelo ? (
          <VueloMedalla
            key={vuelo.clave}
            origen={vuelo.origen}
            destino={refDestino}
            alAterrizar={() => setVuelo((v) => (v ? { ...v, aterrizo: true } : v))}
            alTerminar={() => setVuelo(null)}>
            {vuelo.medalla}
          </VueloMedalla>
        ) : null}
      </View>
    </Ctx.Provider>
  );
}

const SIN_PROVEEDOR: Contexto = {
  expandirTarjeta: () => {},
  lanzarMedalla: () => {},
  vuelo: null,
  registrarDestino: () => {},
};

/** Fuera del proveedor (pruebas de un componente suelto) no hay transición: todo sigue funcionando. */
export function useTransiciones(): Pick<Contexto, 'expandirTarjeta' | 'lanzarMedalla'> {
  return useContext(Ctx) ?? SIN_PROVEEDOR;
}

/** Id de la lectura cuya medalla viene volando hacia la vitrina (y aún no aterriza), o null. */
export function useMedallaEnVuelo(): string | null {
  const { vuelo } = useContext(Ctx) ?? SIN_PROVEEDOR;
  return vuelo && !vuelo.aterrizo ? vuelo.id : null;
}

/**
 * Casilla de la vitrina que puede recibir una medalla en vuelo. Devuelve la ref animada para su vista,
 * si la medalla debe quedar oculta (todavía viene volando) y `asentar`, que cambia al aterrizar.
 */
export function useDestinoMedalla(id: string): {
  ref: AnimatedRef<View>;
  esperando: boolean;
  /** Llega una medalla a esta casilla (se haya registrado o no): para desplazar la vitrina hasta ella. */
  destino: boolean;
} {
  const { vuelo, registrarDestino } = useContext(Ctx) ?? SIN_PROVEEDOR;
  const ref = useAnimatedRef<View>();
  const destino = vuelo?.id === id;
  useEffect(() => {
    if (!destino) return;
    registrarDestino(id, ref);
    return () => registrarDestino(id, null);
  }, [destino, id, ref, registrarDestino]);
  return { ref, esperando: destino && !vuelo.aterrizo, destino };
}

/** Pequeño rebote de la medalla al asentarse en su casilla (sin rebote con movimiento reducido). */
export function useAsentar(esperando: boolean) {
  const reducir = useReducirMovimiento();
  const escala = useSharedValue(1);
  const antes = useRef(esperando);
  useEffect(() => {
    if (antes.current && !esperando && !reducir) {
      escala.set(
        withSequence(withTiming(ASENTAR, tiempo(movimiento.toque, curvas.salida)), withSpring(1, resortes.firme)),
      );
    }
    antes.current = esperando;
  }, [esperando, reducir, escala]);
  return useAnimatedStyle(() => ({
    opacity: esperando ? 0 : 1,
    transform: [{ scale: escala.value }],
  }));
}

// Tarjeta → historia ------------------------------------------------------------------------------

function ExpansionTarjeta({ origen, alTerminar }: { origen: Rect; alTerminar: () => void }) {
  const { width: anchoVentana, height: altoVentana } = useWindowDimensions();
  const { superficies, cielo } = useTema();
  const p = useSharedValue(0);
  const opacidad = useSharedValue(1);

  useEffect(() => {
    p.set(withTiming(1, tiempo(movimiento.cambioPantalla, curvas.calma), (fin) => {
      if (!fin) return;
      opacidad.set(withTiming(0, tiempo(movimiento.cambioPantalla, curvas.suave), (fin2) => {
        if (fin2) scheduleOnRN(alTerminar);
      }));
    }));
    // Solo al montar: cada expansión es una capa nueva (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const desde = superficies.vidrio;
  const hasta = cielo.fondo;
  const estilo = useAnimatedStyle(() => {
    const t = p.value;
    const altoFinal = Math.max(origen.alto, altoVentana - origen.y);
    const esquinaAbajo = radios.tarjeta * (1 - t);
    return {
      opacity: opacidad.value,
      left: origen.x * (1 - t),
      top: origen.y,
      width: origen.ancho + (anchoVentana - origen.ancho) * t,
      height: origen.alto + (altoFinal - origen.alto) * t,
      borderBottomLeftRadius: esquinaAbajo,
      borderBottomRightRadius: esquinaAbajo,
      backgroundColor: interpolateColor(t, [0, 1], [desde, hasta]),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.hoja, estilo]}
    />
  );
}

// Resultado → vitrina -----------------------------------------------------------------------------

function VueloMedalla({
  origen,
  destino,
  alAterrizar,
  alTerminar,
  children,
}: {
  origen: Rect;
  destino: AnimatedRef<View> | null;
  alAterrizar: () => void;
  alTerminar: () => void;
  children: ReactNode;
}) {
  const p = useSharedValue(0);
  const levantar = useSharedValue(1);
  const opacidad = useSharedValue(1);
  // Último rectángulo medido del destino (x, y, ancho, alto); ancho 0 = todavía no se ve.
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const dAncho = useSharedValue(0);
  const dAlto = useSharedValue(0);
  const enVuelo = useSharedValue(false);
  const termino = useSharedValue(false);

  const aterrizar = useCallback(() => {
    alAterrizar();
  }, [alAterrizar]);

  // Se levanta de la página mientras espera ver la vitrina.
  useEffect(() => {
    levantar.set(withTiming(LEVANTAR, tiempo(movimiento.cambioPantalla, curvas.salida)));
  }, [levantar]);

  // Si la vitrina no aparece a tiempo, la medalla se desvanece donde está (no queda flotando). La
  // espera es una animación "vacía" en el hilo de UI (sin temporizadores de JS).
  const espera = useSharedValue(0);
  useEffect(() => {
    espera.set(
      withDelay(
        movimiento.vueloMedallaEspera,
        withTiming(1, { duration: 0 }, (fin) => {
          if (!fin || enVuelo.value) return;
          termino.set(true);
          opacidad.set(
            withTiming(0, tiempo(movimiento.fundido, curvas.suave), (fin2) => {
              if (fin2) scheduleOnRN(alTerminar);
            }),
          );
        }),
      ),
    );
    // Solo al montar: cada vuelo es una capa nueva (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cada cuadro, en el hilo de UI: mide el destino (que puede estar deslizándose) y, la primera vez
  // que se ve, arranca el vuelo.
  useFrameCallback(() => {
    if (!destino || termino.value) return;
    const m = measure(destino);
    if (!m || m.width <= 0) return;
    dx.set(m.pageX);
    dy.set(m.pageY);
    dAncho.set(m.width);
    dAlto.set(m.height);
    if (!enVuelo.value) {
      enVuelo.set(true);
      p.set(withTiming(1, tiempo(movimiento.vueloMedalla, curvas.calma), (fin) => {
        if (!fin) return;
        termino.set(true);
        scheduleOnRN(aterrizar);
        opacidad.set(withTiming(0, tiempo(movimiento.toque, curvas.suave), (fin2) => {
          if (fin2) scheduleOnRN(alTerminar);
        }));
      }));
    }
  });

  const estilo = useAnimatedStyle(() => {
    const t = p.value;
    const hayDestino = dAncho.value > 0;
    const cx0 = origen.x + origen.ancho / 2;
    const cy0 = origen.y + origen.alto / 2;
    const cx1 = hayDestino ? dx.value + dAncho.value / 2 : cx0;
    const cy1 = hayDestino ? dy.value + dAlto.value / 2 : cy0;
    // El destino es la vista de la medalla en su casilla (sin el nombre): basta su ancho.
    const escalaFinal = hayDestino ? dAncho.value / origen.ancho : 1;
    const cx = cx0 + (cx1 - cx0) * t;
    const cy = cy0 + (cy1 - cy0) * t - ARCO_VUELO * Math.sin(Math.PI * t);
    const escala = levantar.value + (escalaFinal - levantar.value) * t;
    return {
      opacity: opacidad.value,
      transform: [
        { translateX: cx - origen.ancho / 2 },
        { translateY: cy - origen.alto / 2 },
        { perspective: PERSPECTIVA },
        { rotateY: `${360 * t}deg` },
        { scale: escala },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.vuelo, { width: origen.ancho, height: origen.alto }, estilo]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  llenar: { flex: 1 },
  hoja: {
    position: 'absolute',
    borderTopLeftRadius: radios.tarjeta,
    borderTopRightRadius: radios.tarjeta,
    borderCurve: 'continuous',
  },
  vuelo: { position: 'absolute', left: 0, top: 0 },
});
