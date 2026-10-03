import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavegacionThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

// Inicia i18next antes del primer render (textos de interfaz e idioma guardado).
import '@/i18n';
import { BienvenidaProvider, useBienvenida } from '@/lib/bienvenida';
import { PaisProvider } from '@/lib/pais';
import { ThemeProvider, useTema } from '@/theme';
import { archivosDeFuentes } from '@/theme/fuentes';

SplashScreen.preventAutoHideAsync();

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
  const reducirMovimiento = useReducedMotion();
  const { completa } = useBienvenida();

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
          {/* Historia del santo: fuera de las pestañas, a pantalla completa (contrato en lib/hoy.ts). */}
          <Stack.Screen
            name="santo/[clave]"
            options={{ animation: reducirMovimiento ? 'fade' : 'default' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!completa}>
          <Stack.Screen name="bienvenida" options={{ animation: 'fade' }} />
        </Stack.Protected>
        {/* Selectores: desde la bienvenida y desde Configuración. Solo fundidos (calma). */}
        <Stack.Screen name="idioma" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="pais" options={{ presentation: 'modal', animation: 'fade' }} />
      </Stack>
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

  return (
    <ThemeProvider>
      <PaisProvider>
        <BienvenidaProvider>
          <Navegacion />
        </BienvenidaProvider>
      </PaisProvider>
    </ThemeProvider>
  );
}
