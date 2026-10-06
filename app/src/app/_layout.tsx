import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider as NavegacionThemeProvider,
} from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

// Inicia i18next antes del primer render (textos de interfaz e idioma guardado).
import '@/i18n';
import { TransicionesProvider } from '@/components/transiciones';
import { AnimacionesProvider, useReducirMovimiento } from '@/lib/animaciones';
import { moduloNotificaciones } from '@/lib/avisos';
import { BienvenidaProvider, useBienvenida } from '@/lib/bienvenida';
import { PaisProvider } from '@/lib/pais';
import { ReinicioProvider } from '@/lib/reinicio';
import { rutaNovena } from '@/lib/rutas-novenas';
import { ThemeProvider, useTema } from '@/theme';
import { archivosDeFuentes } from '@/theme/fuentes';

SplashScreen.preventAutoHideAsync();

// Recordatorios de novena con la app abierta: se muestran como aviso, sin sonido ni globo en el ícono.
// (En Expo Go para Android no hay módulo de notificaciones: ver lib/avisos.ts.)
try {
  moduloNotificaciones()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Sin módulo de notificaciones (p. ej. en pruebas): la app sigue sin avisos.
}

/** Id de novena que trae un recordatorio en `data.novena`, o null. */
function novenaDelAviso(respuesta: NotificationResponse | null): string | null {
  const id = respuesta?.notification.request.content.data?.novena;
  return typeof id === 'string' && id ? id : null;
}

/**
 * Tocar un recordatorio abre el detalle de su novena (también si la app estaba cerrada).
 * Solo con la bienvenida completa: antes, la ruta está protegida.
 */
function useAbrirNovenaDesdeAviso(activo: boolean) {
  useEffect(() => {
    const Notifications = moduloNotificaciones();
    if (!activo || !Notifications) return;
    let sub: { remove: () => void } | undefined;
    try {
      const inicial = novenaDelAviso(Notifications.getLastNotificationResponse());
      if (inicial) {
        router.push(rutaNovena(inicial));
        Notifications.clearLastNotificationResponse();
      }
      sub = Notifications.addNotificationResponseReceivedListener((r) => {
        const id = novenaDelAviso(r);
        if (id) router.push(rutaNovena(id));
      });
    } catch {
      // Sin módulo de notificaciones: nada que escuchar.
    }
    return () => sub?.remove();
  }, [activo]);
}

/**
 * Navegación con los colores del tema (evita destellos blancos entre pantallas).
 *
 * Bienvenida: mientras no se haya completado, solo existe la ruta `bienvenida` (más los selectores
 * de idioma y país); las pestañas y Configuración quedan protegidas. Como la lectura es síncrona,
 * el primer render ya decide y las pestañas nunca se dibujan antes. Al completarla, el guardia
 * cambia y Expo Router pasa solo a las pestañas (Hoy).
 */
function Navegacion() {
  const tema = useTema();
  const reducirMovimiento = useReducirMovimiento();
  const { completa } = useBienvenida();
  useAbrirNovenaDesdeAviso(completa);

  const temaNavegacion = useMemo(() => {
    const base = tema.esOscuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: tema.esOscuro,
      colors: {
        ...base.colors,
        primary: tema.colores.acento,
        background: tema.cielo.fondo,
        card: tema.cielo.fondo,
        text: tema.colores.texto,
        border: tema.colores.linea,
      },
    };
  }, [tema]);

  return (
    <NavegacionThemeProvider value={temaNavegacion}>
      <StatusBar style={tema.barraEstado} />
      {/* Capa de transiciones compartidas (tarjeta → historia, medalla → vitrina), encima de todo. */}
      <TransicionesProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={completa}>
            {/* Al salir de la bienvenida, Hoy entra con un fundido (calma). */}
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="configuracion"
              options={{
                presentation: 'modal',
                // Con "Reducir movimiento", el modal entra con un fundido en vez de deslizarse.
                animation: reducirMovimiento ? 'fade' : 'default',
              }}
            />
            {/* Historia del santo: fuera de las pestañas, a pantalla completa (contrato en lib/hoy.ts).
                Entra con fundido: con movimiento completo, la tarjeta del santo se expande encima
                (components/transiciones.tsx) y el vitral queda en su lugar. */}
            <Stack.Screen name="santo/[clave]" options={{ animation: 'fade' }} />
            {/* Detalle de una emoción: pantalla de oración fuera de las pestañas; entra con fundido (calma). */}
            <Stack.Screen name="emocion/[id]" options={{ animation: 'fade' }} />
            {/* Detalle de una novena: pantalla de oración fuera de las pestañas; entra con fundido (calma). */}
            <Stack.Screen name="novena/[id]" options={{ animation: 'fade' }} />
            {/* Aprender: lector, quiz y medalla grande, fuera de las pestañas (el lector es calma y no
                lleva la barra a la vista). Entran deslizándose (la transición del sistema); con
                "Reducir movimiento", con fundido. */}
            <Stack.Screen
              name="lectura/[id]"
              options={{ animation: reducirMovimiento ? 'fade' : 'default' }}
            />
            <Stack.Screen
              name="quiz/[id]"
              options={{ animation: reducirMovimiento ? 'fade' : 'default' }}
            />
            {/* Medalla grande: con fundido (el espectáculo lo pone la medalla, no la transición). */}
            <Stack.Screen name="medalla/[id]" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={!completa}>
            <Stack.Screen name="bienvenida" options={{ animation: 'fade' }} />
          </Stack.Protected>
          {/* Selectores: desde la bienvenida y desde Configuración. Solo fundidos (calma). */}
          <Stack.Screen name="idioma" options={{ presentation: 'modal', animation: 'fade' }} />
          <Stack.Screen name="pais" options={{ presentation: 'modal', animation: 'fade' }} />
        </Stack>
      </TransicionesProvider>
    </NavegacionThemeProvider>
  );
}

export default function RootLayout() {
  const [fuentesListas, errorFuentes] = useFonts(archivosDeFuentes);

  useEffect(() => {
    if (fuentesListas || errorFuentes) SplashScreen.hide();
  }, [fuentesListas, errorFuentes]);

  // Si una fuente falla, se sigue con la del sistema antes que dejar la app en blanco.
  if (!fuentesListas && !errorFuentes) return null;

  // `ReinicioProvider` vuelve a montar todo tras "Borrar mis datos" (ver lib/reinicio.tsx).
  return (
    <ReinicioProvider>
      <ThemeProvider>
        <AnimacionesProvider>
          <PaisProvider>
            <BienvenidaProvider>
              <Navegacion />
            </BienvenidaProvider>
          </PaisProvider>
        </AnimacionesProvider>
      </ThemeProvider>
    </ReinicioProvider>
  );
}
