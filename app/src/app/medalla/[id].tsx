/**
 * Medalla grande de la vitrina (guía de movimiento, nivel 1: "Medalla en la vitrina": se puede girar
 * con el dedo y refleja la luz según el ángulo). Se abre con `rutaMedalla(id)` (lectura) o
 * `rutaMedallaColeccion(id)` (colección completa).
 *
 * - Gesto: arrastrar gira la medalla (rotateY / rotateX con perspectiva) y mueve el reflejo; al
 *   soltar vuelve con un resorte. Con "Reducir movimiento" se puede girar igual (lo controla el dedo),
 *   pero vuelve sin rebote.
 * - Debajo: nombre, fecha en que se ganó (formato del idioma) y los tres rasgos con su nombre; en la
 *   de colección, las lecturas que la forman.
 * - Si la medalla aún no se gana: la silueta y un enlace a la lectura.
 */
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type DerivedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/components/boton';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { Icono } from '@/components/icono';
import { IconoRasgo } from '@/components/icono-rasgo';
import { Medalla } from '@/components/medalla';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { contenido, type Coleccion, type Lectura } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { lecturaPorId, lecturasDeColeccion, rasgosEnOrden } from '@/lib/aprender';
import { useProgresoAprender } from '@/lib/aprender-progreso';
import { fechaConAnio } from '@/lib/formato-fecha';
import { rutaLectura } from '@/lib/rutas-aprender';
import {
  conAlfa,
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  medidas,
  medidasMedalla,
  radios,
  useTema,
} from '@/theme';
import { entradaCalma, movimiento } from '@/theme/movimiento';

/** Giro máximo con el dedo (grados). */
const GIRO_Y = 55;
const GIRO_X = 35;
/** Grados por punto arrastrado. */
const SENSIBILIDAD = 0.45;
const PERSPECTIVA = 700;
/** Ícono de rasgo en la lista. */
const ICONO = 30;

export default function PantallaMedalla() {
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo?: string }>();
  const progreso = useProgresoAprender();

  if (tipo === 'coleccion') {
    const coleccion = contenido.colecciones.find((c) => c.id === id);
    if (!coleccion) return <NoEncontrada />;
    return <DetalleColeccion coleccion={coleccion} ganadaEn={progreso.colecciones.get(coleccion.id) ?? null} cargado={progreso.cargado} />;
  }
  const lectura = id ? lecturaPorId(contenido, id) : undefined;
  if (!lectura) return <NoEncontrada />;
  return (
    <DetalleLectura
      lectura={lectura}
      ganadaEn={progreso.medallas.get(lectura.id) ?? null}
      rasgos={progreso.rasgos[lectura.id] ?? []}
      cargado={progreso.cargado}
    />
  );
}

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/aprender');
}

/** Marco común: Volver, la medalla que se gira y el contenido debajo. */
function Marco({ medalla, children }: { medalla: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colores, superficies } = useTema();
  return (
    <GestureHandlerRootView style={styles.llenar}>
      <Fondo>
        <ScrollView
          contentContainerStyle={[
            styles.pagina,
            { paddingTop: insets.top + espaciado.sm, paddingBottom: insets.bottom + espaciado.xxxl },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('acciones.volver')}
            onPress={volver}
            hitSlop={espaciado.xs}
            style={({ pressed }) => [
              styles.volver,
              { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
              pressed && styles.presionado,
            ]}>
            <Icono nombre="volver" color={colores.texto} tamano={medidas.iconoBoton - 3} />
            <Texto rol="boton">{t('acciones.volver')}</Texto>
          </Pressable>
          <View style={styles.escenario}>{medalla}</View>
          {children}
        </ScrollView>
      </Fondo>
    </GestureHandlerRootView>
  );
}

/** La medalla grande que se gira con el dedo. */
function MedallaGiratoria({ children }: { children: (brillo: DerivedValue<number>) => ReactNode }) {
  const reducir = useReducirMovimiento();
  const giroY = useSharedValue(0);
  const giroX = useSharedValue(0);
  const brillo = useDerivedValue(() => giroY.value / GIRO_Y);

  const gesto = Gesture.Pan()
    .onChange((e) => {
      giroY.value = Math.max(-GIRO_Y, Math.min(GIRO_Y, giroY.value + e.changeX * SENSIBILIDAD));
      giroX.value = Math.max(-GIRO_X, Math.min(GIRO_X, giroX.value - e.changeY * SENSIBILIDAD));
    })
    .onFinalize(() => {
      if (reducir) {
        giroY.value = withTiming(0, { duration: movimiento.regresoMedalla, easing: Easing.out(Easing.quad) });
        giroX.value = withTiming(0, { duration: movimiento.regresoMedalla, easing: Easing.out(Easing.quad) });
      } else {
        giroY.value = withSpring(0, { damping: 9, stiffness: 120 });
        giroX.value = withSpring(0, { damping: 9, stiffness: 120 });
      }
    });

  const estilo = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVA }, { rotateY: `${giroY.value}deg` }, { rotateX: `${giroX.value}deg` }],
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View style={estilo}>{children(brillo)}</Animated.View>
    </GestureDetector>
  );
}

function DetalleLectura({
  lectura,
  ganadaEn,
  rasgos,
  cargado,
}: {
  lectura: Lectura;
  ganadaEn: string | null;
  rasgos: string[];
  cargado: boolean;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const { colores, paleta } = useTema();
  const nombre = lectura[idioma].name;
  const ordenados = rasgosEnOrden(lectura, rasgos);

  if (!cargado) return <Marco medalla={<View style={styles.reserva} />}>{null}</Marco>;

  if (!ganadaEn) {
    return (
      <Marco medalla={<Medalla variante="silueta" tamano={medidasMedalla.resultadoSilueta} />}>
        <Animated.View entering={entradaCalma(reducir)} style={styles.textos}>
          <Texto rol="displayGrande" accessibilityRole="header" style={styles.centrado}>
            {nombre}
          </Texto>
          <Texto tono="suave" style={styles.centrado}>
            {t('aprender.sinGanar')}
          </Texto>
          <View style={styles.filaCentrada}>
            <Boton variante="luz" texto={t('aprender.leerHistoria')} onPress={() => router.replace(rutaLectura(lectura.id))} />
          </View>
        </Animated.View>
      </Marco>
    );
  }

  return (
    <Marco
      medalla={
        <MedallaGiratoria>
          {(brillo) => (
            <Medalla
              variante="lectura"
              lectura={lectura}
              rasgos={rasgos}
              tamano={medidasMedalla.detalle}
              brillo={brillo}
              etiqueta={t('aprender.medallaGanadaAccesible', { nombre })}
            />
          )}
        </MedallaGiratoria>
      }>
      <Animated.View entering={entradaCalma(reducir)} style={styles.textos}>
        <Texto rol="etiqueta" tono="acento" style={styles.centrado}>
          {t('aprender.medallaObtenida')}
        </Texto>
        <Texto rol="displayGrande" accessibilityRole="header" style={styles.centrado}>
          {nombre}
        </Texto>
        <Texto rol="interfazSecundaria" tono="suave" style={styles.centrado}>
          {t('aprender.ganadaEl', { fecha: fechaConAnio(new Date(ganadaEn), idioma) })}
        </Texto>
      </Animated.View>

      <Animated.View entering={entradaCalma(reducir, 1)}>
        <Tarjeta style={styles.tarjeta}>
          <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
            {t('aprender.rasgosMedalla')}
          </Texto>
          {ordenados.map((r) => {
            const [nombreRasgo, linea] = contenido.rasgos[r]?.[idioma] ?? [r, ''];
            return (
              <View key={r} style={styles.rasgo} accessible accessibilityLabel={`${nombreRasgo}. ${linea}`}>
                <View style={[styles.rasgoIcono, { backgroundColor: conAlfa(paleta.glow, 0.16) }]}>
                  <IconoRasgo rasgo={r} tamano={ICONO} color={colores.oro} />
                </View>
                <View style={styles.rasgoTexto}>
                  <Texto style={styles.rasgoNombre}>{nombreRasgo}</Texto>
                  {linea ? (
                    <Texto rol="interfazSecundaria" tono="suave">
                      {linea}
                    </Texto>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Tarjeta>
      </Animated.View>
      <Animated.View entering={entradaCalma(reducir, 2)} style={styles.filaCentrada}>
        <Boton texto={t('aprender.leerHistoria')} onPress={() => router.push(rutaLectura(lectura.id))} />
      </Animated.View>
    </Marco>
  );
}

function DetalleColeccion({
  coleccion,
  ganadaEn,
  cargado,
}: {
  coleccion: Coleccion;
  ganadaEn: string | null;
  cargado: boolean;
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const nombre = coleccion[idioma];
  const lecturas = lecturasDeColeccion(contenido, coleccion);

  if (!cargado) return <Marco medalla={<View style={styles.reserva} />}>{null}</Marco>;

  return (
    <Marco
      medalla={
        ganadaEn ? (
          <MedallaGiratoria>
            {(brillo) => (
              <Medalla
                variante="coleccion"
                nombre={nombre}
                tamano={medidasMedalla.detalle}
                brillo={brillo}
                etiqueta={t('aprender.medallaColeccionAccesible', { nombre })}
              />
            )}
          </MedallaGiratoria>
        ) : (
          <Medalla variante="silueta" tamano={medidasMedalla.resultadoSilueta} />
        )
      }>
      <Animated.View entering={entradaCalma(reducir)} style={styles.textos}>
        <Texto rol="etiqueta" tono="acento" style={styles.centrado}>
          {t('aprender.coleccion')}
        </Texto>
        <Texto rol="displayGrande" accessibilityRole="header" style={styles.centrado}>
          {nombre}
        </Texto>
        {ganadaEn ? (
          <Texto rol="interfazSecundaria" tono="suave" style={styles.centrado}>
            {t('aprender.ganadaEl', { fecha: fechaConAnio(new Date(ganadaEn), idioma) })}
          </Texto>
        ) : null}
      </Animated.View>
      <Animated.View entering={entradaCalma(reducir, 1)}>
        <Tarjeta style={styles.tarjeta}>
          <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
            {t('aprender.lecturasColeccion')}
          </Texto>
          {lecturas.map((l) => (
            <Pressable
              key={l.id}
              accessibilityRole="link"
              accessibilityLabel={`${l[idioma].name}. ${l[idioma].sub}`}
              accessibilityHint={t('aprender.tarjetaPista')}
              onPress={() => router.push(rutaLectura(l.id))}
              style={({ pressed }) => [styles.rasgo, pressed && styles.presionado]}>
              <Medalla variante="lectura" lectura={l} rasgos={l.traits} tamano={40} />
              <View style={styles.rasgoTexto}>
                <Texto style={styles.rasgoNombre}>{l[idioma].name}</Texto>
                <Texto rol="interfazSecundaria" tono="suave">
                  {l[idioma].sub}
                </Texto>
              </View>
            </Pressable>
          ))}
        </Tarjeta>
      </Animated.View>
    </Marco>
  );
}

function NoEncontrada() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  return (
    <Fondo>
      <SafeAreaView style={styles.llenar} edges={['top', 'left', 'right', 'bottom']}>
        <Animated.View entering={entradaCalma(reducir)} style={styles.vacio}>
          <Encabezado titulo={t('aprender.medallaNoEncontrada')} />
          <Texto tono="suave">{t('aprender.medallaNoEncontradaDetalle')}</Texto>
          <View style={styles.fila}>
            <Boton texto={t('acciones.volver')} onPress={volver} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </Fondo>
  );
}

const styles = StyleSheet.create({
  llenar: { flex: 1 },
  vacio: { paddingHorizontal: espaciado.xl, paddingTop: espaciado.lg, gap: espaciado.lg },
  pagina: { paddingHorizontal: espaciado.lg + 2, gap: espaciado.lg },
  volver: {
    alignSelf: 'flex-start',
    minHeight: medidas.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xxs,
    paddingLeft: espaciado.sm,
    paddingRight: espaciado.md + 2,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
  presionado: { opacity: 0.75 },
  escenario: { alignItems: 'center', justifyContent: 'center', paddingVertical: espaciado.lg },
  reserva: { height: medidasMedalla.detalle * (medidasMedalla.alto / medidasMedalla.ancho) },
  textos: { alignItems: 'center', gap: espaciado.sm },
  centrado: { textAlign: 'center' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  filaCentrada: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: espaciado.sm },
  tarjeta: { padding: espaciado.lg, gap: espaciado.md },
  rasgo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md, minHeight: medidas.toqueMinimo },
  rasgoIcono: { width: ICONO + 14, height: ICONO + 14, borderRadius: radios.pildora, alignItems: 'center', justifyContent: 'center' },
  rasgoTexto: { flex: 1, gap: espaciado.xxs },
  rasgoNombre: {
    fontFamily: familias.displaySemi,
    fontSize: 19,
    lineHeight: interlineado(19, FACTOR_INTERLINEADO.display),
  },
});
