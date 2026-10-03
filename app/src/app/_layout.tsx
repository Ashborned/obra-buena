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
import { ThemeProvider, useTema } from '@/theme';
import { archivosDeFuentes } from '@/theme/fuentes';

SplashScreen.preventAutoHideAsync();

/** Navegación con los colores del tema (evita destellos blancos entre pantallas). */
function Navegacion() {
  const tema = useTema();
  const reducirMovimiento = useReducedMotion();

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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="configuracion"
          options={{
            presentation: 'modal',
            // Con "Reducir movimiento", el modal entra con un fundido en vez de deslizarse.
            animation: reducirMovimiento ? 'fade' : 'default',
          }}
        />
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
      <Navegacion />
    </ThemeProvider>
  );
}
