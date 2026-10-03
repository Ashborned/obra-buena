/**
 * Barra de pestañas flotante (`.tabs` en la maqueta): 4 columnas, radio 26, fondo del cielo al 84 %,
 * borde claro y la pestaña activa con el acento al 13 %.
 *
 * Pendiente: desenfoque detrás de la barra (requiere expo-blur o Skia; ver informe).
 */
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';
import { espaciado, medidas, radios, tipografia, useTema } from '@/theme';

/**
 * Tope de crecimiento de las etiquetas con letra grande. La barra no tiene alto fijo (crece con la
 * etiqueta), pero son cuatro columnas angostas: igual que la barra nativa de iOS, la etiqueta crece
 * hasta un punto y el lector de pantalla lee siempre el nombre completo.
 */
const ESCALA_MAXIMA_ETIQUETA = 1.4;

/** Espacio inferior que deben dejar las pantallas para que la barra no tape su contenido. */
export function useEspacioBarra(): number {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  // Con letra grande la etiqueta (y la barra) crece; se suma lo que crece su interlineado.
  const escala = Math.min(Math.max(fontScale, 1), ESCALA_MAXIMA_ETIQUETA);
  const crecimiento = Math.ceil(tipografia.pestana.lineHeight * (escala - 1));
  return medidas.barraAlto + crecimiento + medidas.barraMargen + insets.bottom + espaciado.sm;
}

export function BarraPestanas({ state, descriptors, navigation }: BottomTabBarProps) {
  const { superficies } = useTema();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('navegacion.menu')}
      style={[
        styles.barra,
        {
          bottom: medidas.barraMargen + insets.bottom,
          backgroundColor: superficies.barraFondo,
          borderColor: superficies.barraBorde,
          boxShadow: `0 12px 30px -8px ${superficies.barraSombra}`,
        },
      ]}>
      {state.routes.map((route, indice) => {
        const { options } = descriptors[route.key];
        const enfocada = state.index === indice;
        const etiqueta = typeof options.title === 'string' ? options.title : route.name;
        const color = enfocada ? superficies.pestanaActiva : superficies.pestanaInactiva;

        const alPresionar = () => {
          const evento = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!enfocada && !evento.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const alMantener = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: enfocada }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? etiqueta}
            onPress={alPresionar}
            onLongPress={alMantener}
            style={({ pressed }) => [
              styles.boton,
              enfocada && { backgroundColor: superficies.pestanaActivaFondo },
              pressed && styles.presionado,
            ]}>
            {options.tabBarIcon?.({ focused: enfocada, color, size: medidas.iconoPestana })}
            <Texto
              rol="pestana"
              style={{ color }}
              numberOfLines={1}
              maxFontSizeMultiplier={ESCALA_MAXIMA_ETIQUETA}>
              {etiqueta}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute',
    left: medidas.barraMargen,
    right: medidas.barraMargen,
    flexDirection: 'row',
    gap: espaciado.xs,
    padding: medidas.barraRelleno,
    borderRadius: radios.barra,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  boton: {
    flex: 1,
    minHeight: medidas.toqueMinimo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xxs,
    paddingVertical: espaciado.sm,
    borderRadius: radios.pestana,
    borderCurve: 'continuous',
  },
  presionado: {
    opacity: 0.7,
  },
});
