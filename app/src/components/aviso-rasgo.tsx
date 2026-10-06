/**
 * Aviso de rasgo descubierto (`.toast` y `showToast` en prototype/obra-buena.html): entra desde el
 * costado con un rebote suave, el ícono gira y brilla. Nivel 1 de la guía de movimiento
 * (0.45 s de entrada); quien lo muestra lo cierra a los 4 s, y también se cierra al tocarlo.
 *
 * Con "Reducir movimiento": solo fundido, sin rebote, giro ni brillo.
 * Lo anuncia quien lo muestra (AccessibilityInfo); aquí queda como botón "cerrar" con todo el texto.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { IconoRasgo } from '@/components/icono-rasgo';
import { Texto } from '@/components/texto';
import { contenido } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import {
  coloresMedalla,
  conAlfa,
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  medidas,
  radios,
  useTema,
} from '@/theme';
import { movimiento } from '@/theme/movimiento';

const ANCHO = 268;
const ICONO_FONDO = 48;
const ICONO = 28;
/** Nombre del rasgo (`.toast b`: 600 19). */
const TAMANO_NOMBRE = 19;
/** Línea (`.toast p`: 12.5). */
const TAMANO_LINEA = 12.5;
/** Giro inicial del ícono (grados). */
const GIRO = -200;

export function AvisoRasgo({
  rasgo,
  n,
  total,
  reducir,
  onCerrar,
}: {
  rasgo: string;
  /** Rasgos descubiertos de la lectura, contando este. */
  n: number;
  total: number;
  reducir: boolean;
  onCerrar: () => void;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { cielo, paleta, colores } = useTema();
  const [nombre, linea] = contenido.rasgos[rasgo]?.[idioma] ?? [rasgo, ''];
  const contador = t('aprender.rasgoDescubierto', { n, total });

  // Ícono: gira y brilla al entrar (solo sin "Reducir movimiento").
  const giro = useSharedValue(reducir ? 0 : GIRO);
  const brillo = useSharedValue(0);
  useEffect(() => {
    if (reducir) return;
    giro.value = withTiming(0, { duration: movimiento.giroIconoRasgo, easing: Easing.out(Easing.back(1.4)) });
    brillo.value = withSequence(
      withTiming(1, { duration: movimiento.giroIconoRasgo / 2 }),
      withTiming(0.35, { duration: movimiento.giroIconoRasgo }),
    );
  }, [reducir, giro, brillo]);
  const estiloIcono = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }));
  const estiloHalo = useAnimatedStyle(() => ({ opacity: brillo.value, transform: [{ scale: 1 + brillo.value * 0.25 }] }));

  const entrada = reducir
    ? FadeIn.duration(movimiento.fundido).reduceMotion(ReduceMotion.Never)
    : SlideInRight.springify().damping(14).stiffness(140).mass(0.8);
  const salida = reducir
    ? FadeOut.duration(movimiento.fundido).reduceMotion(ReduceMotion.Never)
    : SlideOutRight.duration(movimiento.avisoRasgoEntrada);

  return (
    <Animated.View entering={entrada} exiting={salida} style={styles.contenedor} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${contador}. ${nombre}. ${linea}`}
        accessibilityHint={t('aprender.cerrarAviso')}
        onPress={onCerrar}
        style={({ pressed }) => [
          styles.aviso,
          {
            backgroundColor: conAlfa(cielo.fondo, 0.94),
            borderColor: conAlfa(paleta.glow, 0.55),
            boxShadow: `0 16px 36px -10px ${conAlfa(colores.texto, 0.4)}, 0 0 0 4px ${conAlfa(paleta.glow, 0.14)}`,
          },
          pressed && styles.presionado,
        ]}>
        <View style={styles.iconoCaja}>
          <Animated.View
            style={[styles.halo, { backgroundColor: conAlfa(paleta.glow, 0.6) }, estiloHalo]}
          />
          <View
            style={[
              styles.iconoFondo,
              {
                backgroundColor: paleta.glow,
                experimental_backgroundImage: `radial-gradient(circle at 40% 35%, ${coloresMedalla.avisoIcono[0]}, ${paleta.glow} 70%, ${coloresMedalla.avisoIcono[1]})`,
              },
            ]}>
            <Animated.View style={estiloIcono}>
              <IconoRasgo rasgo={rasgo} tamano={ICONO} color={coloresMedalla.grabado} />
            </Animated.View>
          </View>
        </View>
        <View style={styles.textos}>
          <Texto rol="etiqueta" tono="acento">
            {contador}
          </Texto>
          <Texto style={styles.nombre}>{nombre}</Texto>
          {linea ? (
            <Texto tono="suave" style={styles.linea}>
              {linea}
            </Texto>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { maxWidth: ANCHO, width: '86%' },
  aviso: {
    minHeight: medidas.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.md + 2,
    borderRadius: radios.tarjeta - 4,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  presionado: { opacity: 0.85 },
  iconoCaja: { width: ICONO_FONDO, height: ICONO_FONDO, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: ICONO_FONDO, height: ICONO_FONDO, borderRadius: ICONO_FONDO / 2 },
  iconoFondo: {
    width: ICONO_FONDO,
    height: ICONO_FONDO,
    borderRadius: ICONO_FONDO / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: espaciado.xxs },
  nombre: {
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_NOMBRE,
    lineHeight: interlineado(TAMANO_NOMBRE, FACTOR_INTERLINEADO.display),
  },
  linea: {
    fontSize: TAMANO_LINEA,
    lineHeight: interlineado(TAMANO_LINEA, 1.35),
  },
});
