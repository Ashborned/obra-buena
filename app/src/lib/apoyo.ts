/**
 * "Apoyar la app" (docs/apoyo.md): compra voluntaria de pago único, consumible y repetible.
 *
 * - **No desbloquea nada** (principio 3): este módulo no guarda nada en el teléfono ni expone ningún
 *   estado de "apoyador". Solo dice si el aporte salió bien para mostrar un "gracias".
 * - Librería elegida para la tienda: `expo-iap` (docs/decisiones.md, 2026-10-05). Aún no está
 *   instalada: necesita una development build y las cuentas de tienda (pendientes 7 y 11).
 * - Mientras tanto, la interfaz habla con `ServicioApoyo`. En desarrollo se usa el servicio simulado
 *   (no cobra, no llama a nada); en producción, el servicio no disponible: la sección explica qué
 *   cubren los aportes, sin botones de compra.
 *
 * Para conectar la tienda: crear `servicioTienda` con `expo-iap` (initConnection → fetchProducts de
 * `PRODUCTOS_APOYO` → requestPurchase → finishTransaction con `isConsumable: true`, para que se
 * pueda aportar otra vez) y devolverlo en `servicioApoyo()`. Nada más cambia.
 */

/** Ids de producto en Google Play y App Store (los mismos en las dos tiendas). Montos por definir. */
export const PRODUCTOS_APOYO = ['apoyo_pequeno', 'apoyo_mediano', 'apoyo_grande'] as const;
export type IdAporte = (typeof PRODUCTOS_APOYO)[number];

export type Aporte = {
  id: IdAporte;
  /** Precio ya formateado por la tienda en la moneda de la persona; `null` mientras no hay monto. */
  precio: string | null;
};

export type ResultadoAporte =
  /** Se cobró: mostrar el gracias. */
  | 'gracias'
  /** La persona cerró la hoja de pago: no se muestra error. */
  | 'cancelado'
  /** Sin tienda en este entorno. */
  | 'no_disponible'
  | 'error';

export interface ServicioApoyo {
  /** `true` en el servicio simulado: la interfaz lo marca como "Compra simulada". */
  readonly simulado: boolean;
  /** Aportes que se pueden ofrecer, en el orden de `PRODUCTOS_APOYO`. Vacío = sin compras aquí. */
  aportes(): Promise<Aporte[]>;
  aportar(id: IdAporte): Promise<ResultadoAporte>;
}

/** Simulado (desarrollo y pruebas): no cobra, no guarda nada y no llama a la red. */
export const servicioSimulado: ServicioApoyo = {
  simulado: true,
  async aportes() {
    return PRODUCTOS_APOYO.map((id) => ({ id, precio: null }));
  },
  async aportar(id) {
    return PRODUCTOS_APOYO.includes(id) ? 'gracias' : 'error';
  },
};

/** Sin tienda conectada (build de producción antes de `expo-iap`): no se ofrecen aportes. */
export const servicioNoDisponible: ServicioApoyo = {
  simulado: false,
  async aportes() {
    return [];
  },
  async aportar() {
    return 'no_disponible';
  },
};

export function servicioApoyo(): ServicioApoyo {
  return __DEV__ ? servicioSimulado : servicioNoDisponible;
}
