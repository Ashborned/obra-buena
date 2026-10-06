/**
 * Lector de Aprender (prototype/obra-buena.html, `renderLearn` vista `read` y `setupReader`).
 *
 * - Cabecera fija: Volver, A− y A+ (15–23 en pasos de 2, guardado en el teléfono y leído síncrono al
 *   abrir) y la barra de progreso de lectura según el desplazamiento (hilo de UI).
 * - Texto en Literata con el tamaño elegido (además de la letra grande del sistema), letra capital
 *   gótica en el primer párrafo y citas con filete dorado y su referencia.
 * - Al final: los tres rasgos de la medalla y "Responder el quiz".
 *
 * Rasgos: cuando una sección con `trait` queda visible (≈55 %, como el IntersectionObserver de la
 * maqueta, pero medido sobre lo que cabe en pantalla para que una sección larga también cuente), se
 * guarda con `descubrirRasgo`; solo si es nuevo aparece el aviso (nivel 1), se anuncia al lector de
 * pantalla, vibra suave y se actualiza su espacio al final. Un rasgo ya descubierto no vuelve a avisar.
 *
 * El resto es calma (nivel 3): sin partículas, sin rebotes y nada infinito mientras se lee. Se abre
 * con `rutaLectura(id)` desde la pestaña Aprender, la vitrina y "Conocer su historia" en Emociones.
 */
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { ArcoInicial } from '@/components/arco-inicial';
import { AvisoRasgo } from '@/components/aviso-rasgo';
import { Boton } from '@/components/boton';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { Icono } from '@/components/icono';
import { IconoRasgo } from '@/components/icono-rasgo';
import { ParrafoCapitular } from '@/components/parrafo-capitular';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { contenido, type Lectura, type SeccionLectura } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { cambiarLetraLector, LETRA_LECTOR, lecturaPorId, seccionesConRasgo } from '@/lib/aprender';
import { guardarLetraLector, leerLetraLector } from '@/lib/preferencias';
import { descubrirRasgo, rasgosDescubiertos } from '@/lib/progreso';
import { rutaQuiz } from '@/lib/rutas-aprender';
import { useVibracion } from '@/lib/vibracion';
import {
  conAlfa,
  espaciado,
  estiloLectura,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  medidas,
  radios,
  useTema,
} from '@/theme';
import { entradaCalma, movimiento } from '@/theme/movimiento';

/** Fracción visible de una sección para descubrir su rasgo (maqueta: threshold .55). */
const UMBRAL_VISIBLE = 0.55;
/** Títulos de sección (`.rsec h3`: 600 26; Cormorant necesita ≥ 1.3). */
const TAMANO_SECCION = 26;
/** La cita es 1.35 veces el texto (`.reader blockquote q`). */
const FACTOR_CITA = 1.35;
/** Referencia de la cita (`cite`: 700 12, espaciado .06em). */
const TAMANO_REFERENCIA = 12;
/** Ícono de un rasgo en su espacio (`.tslot svg`: 34). */
const ICONO_ESPACIO = 34;
/** Punto dorado junto al título de una sección con rasgo. */
const PUNTO = 8;
/** Alto de la barra de progreso de lectura. */
const BARRA = 3;

type Zona = { arriba: number; alto: number; rasgo: string };

/**
 * Rasgos cuyas secciones están visibles en al menos `UMBRAL_VISIBLE` (de la sección o de la pantalla,
 * lo que sea menor). Corre en el hilo de UI al desplazar y en JS al medir.
 */
function rasgosVisibles(zonas: Zona[], pendientes: string[], y: number, alto: number): string[] {
  'worklet';
  const vistos: string[] = [];
  if (alto <= 0) return vistos;
  for (const z of zonas) {
    if (!pendientes.includes(z.rasgo) || z.alto <= 0) continue;
    const visible = Math.min(z.arriba + z.alto, y + alto) - Math.max(z.arriba, y);
    if (visible / Math.min(z.alto, alto) >= UMBRAL_VISIBLE) vistos.push(z.rasgo);
  }
  return vistos;
}

export default function PantallaLectura() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lectura = id ? lecturaPorId(contenido, id) : undefined;
  if (!lectura) return <NoEncontrada />;
  return <Lector key={lectura.id} lectura={lectura} />;
}

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/aprender');
}

function Lector({ lectura }: { lectura: Lectura }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const vibrar = useVibracion();
  const enfocada = useIsFocused();
  const insets = useSafeAreaInsets();
  const { cielo, colores, paleta, superficies } = useTema();
  const texto = lectura[idioma];

  // Tamaño de letra ------------------------------------------------------------------------------
  const [tamano, setTamano] = useState(leerLetraLector);
  const estilo = estiloLectura(tamano);
  const cambiarTamano = (direccion: 1 | -1) => {
    const nuevo = cambiarLetraLector(tamano, direccion);
    if (nuevo === tamano) return;
    setTamano(nuevo);
    guardarLetraLector(nuevo);
    AccessibilityInfo.announceForAccessibility(t('aprender.anuncioTamano', { n: nuevo }));
  };

  // Rasgos descubiertos ----------------------------------------------------------------------------
  const [descubiertos, setDescubiertos] = useState<string[] | null>(null);
  const descubiertosRef = useRef<string[]>([]);
  const pedidos = useRef(new Set<string>());
  const [aviso, setAviso] = useState<{ rasgo: string; n: number; clave: number } | null>(null);

  const zonas = useSharedValue<Zona[]>([]);
  // Hasta leer lo guardado, ningún rasgo está pendiente (así no se avisa uno ya descubierto).
  const pendientes = useSharedValue<string[]>([]);
  const desplazamiento = useSharedValue(0);
  const altoVista = useSharedValue(0);
  const progreso = useSharedValue(0);

  const descubrir = useCallback(
    async (rasgo: string) => {
      if (pedidos.current.has(rasgo)) return;
      pedidos.current.add(rasgo);
      let nuevo = false;
      try {
        nuevo = await descubrirRasgo(lectura.id, rasgo);
      } catch {
        // Sin base de datos: no se avisa; se vuelve a intentar al volver a abrir la lectura.
        pedidos.current.delete(rasgo);
        return;
      }
      if (!nuevo) return;
      const lista = descubiertosRef.current.includes(rasgo)
        ? descubiertosRef.current
        : [...descubiertosRef.current, rasgo];
      descubiertosRef.current = lista;
      setDescubiertos(lista);
      const n = lectura.traits.filter((r) => lista.includes(r)).length;
      const total = lectura.traits.length;
      setAviso({ rasgo, n, clave: Date.now() });
      const [nombre, linea] = contenido.rasgos[rasgo]?.[idioma] ?? [rasgo, ''];
      AccessibilityInfo.announceForAccessibility(t('aprender.anuncioRasgo', { n, total, nombre, linea }));
      vibrar('rasgo');
    },
    [lectura, idioma, t, vibrar],
  );

  /** Revisa desde JS (al medir o al terminar de cargar): lo que ya está a la vista sin desplazar. */
  const revisar = useCallback(() => {
    const vistos = rasgosVisibles(zonas.get(), pendientes.get(), desplazamiento.get(), altoVista.get());
    if (vistos.length === 0) return;
    pendientes.set(pendientes.get().filter((r) => !vistos.includes(r)));
    vistos.forEach((r) => descubrir(r));
  }, [zonas, pendientes, desplazamiento, altoVista, descubrir]);

  // Se relee al volver a la pantalla (p. ej. tras aprobar el quiz quedan los tres descubiertos).
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      rasgosDescubiertos(lectura.id)
        .then((d) => {
          if (!vigente) return;
          descubiertosRef.current = d;
          setDescubiertos(d);
        })
        .catch(() => {
          if (vigente) setDescubiertos([]);
        });
      return () => {
        vigente = false;
      };
    }, [lectura.id]),
  );

  // Con lo guardado ya leído: quedan pendientes los rasgos sin descubrir y se revisa lo que ya está a
  // la vista sin desplazar.
  useEffect(() => {
    if (!descubiertos) return;
    pendientes.set(lectura.traits.filter((r) => !descubiertos.includes(r) && !pedidos.current.has(r)));
    revisar();
  }, [descubiertos, lectura, pendientes, revisar]);

  // El aviso se cierra solo a los 4 s; fuera de foco no se muestra.
  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), movimiento.avisoRasgoVisible);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const alDesplazar = useAnimatedScrollHandler({
    onScroll: (e) => {
      const maximo = e.contentSize.height - e.layoutMeasurement.height;
      progreso.set(maximo > 0 ? Math.min(1, Math.max(0, e.contentOffset.y / maximo)) : 1);
      desplazamiento.set(e.contentOffset.y);
      altoVista.set(e.layoutMeasurement.height);
      const vistos = rasgosVisibles(zonas.get(), pendientes.get(), e.contentOffset.y, e.layoutMeasurement.height);
      if (vistos.length === 0) return;
      pendientes.set(pendientes.get().filter((r) => !vistos.includes(r)));
      for (const r of vistos) scheduleOnRN(descubrir, r);
    },
  });
  const estiloBarra = useAnimatedStyle(() => ({ width: `${progreso.get() * 100}%` }));

  // Medidas de las secciones con rasgo -------------------------------------------------------------
  const conRasgo = useMemo(() => seccionesConRasgo(lectura, idioma), [lectura, idioma]);
  const medidasSecciones = useRef<Record<number, { y: number; alto: number }>>({});
  const cuerpoY = useRef(0);
  const actualizarZonas = () => {
    zonas.set(
      conRasgo.flatMap(({ seccion, rasgo }) => {
        const m = medidasSecciones.current[seccion];
        return m ? [{ arriba: cuerpoY.current + m.y, alto: m.alto, rasgo }] : [];
      }),
    );
    revisar();
  };
  const medirSeccion = (i: number) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    medidasSecciones.current[i] = { y, alto: height };
    if (conRasgo.some((c) => c.seccion === i)) actualizarZonas();
  };

  const [altoCabecera, setAltoCabecera] = useState(0);
  const enExtremoMenor = tamano <= LETRA_LECTOR.min;
  const enExtremoMayor = tamano >= LETRA_LECTOR.max;

  return (
    <Fondo>
      <View style={styles.llenar}>
        {/* Cabecera fija ------------------------------------------------------------------------ */}
        <View
          onLayout={(e) => setAltoCabecera(e.nativeEvent.layout.height)}
          style={[styles.cabecera, { paddingTop: insets.top + espaciado.sm, backgroundColor: conAlfa(cielo.fondo, 0.86) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('acciones.volver')}
            onPress={volver}
            hitSlop={espaciado.xs}
            style={({ pressed }) => [
              styles.pildora,
              styles.volver,
              { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
              pressed && styles.presionado,
            ]}>
            <Icono nombre="volver" color={colores.texto} tamano={medidas.iconoBoton - 3} />
            <Texto rol="boton">{t('acciones.volver')}</Texto>
          </Pressable>
          <View style={styles.tamanos} accessibilityRole="toolbar" accessibilityLabel={t('aprender.tamanoLetra')}>
            {(
              [
                { dir: -1, icono: 'menos', etiqueta: t('aprender.letraMenor'), tope: enExtremoMenor },
                { dir: 1, icono: 'mas', etiqueta: t('aprender.letraMayor'), tope: enExtremoMayor },
              ] as const
            ).map((b) => (
              <Pressable
                key={b.dir}
                accessibilityRole="button"
                accessibilityLabel={b.etiqueta}
                accessibilityValue={{ text: t('aprender.anuncioTamano', { n: tamano }) }}
                accessibilityState={{ disabled: b.tope }}
                disabled={b.tope}
                onPress={() => cambiarTamano(b.dir)}
                style={({ pressed }) => [
                  styles.pildora,
                  styles.botonTamano,
                  { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
                  b.tope && styles.deshabilitado,
                  pressed && styles.presionado,
                ]}>
                <Texto rol="boton" style={styles.letraA} importantForAccessibility="no">
                  {t('aprender.letraA')}
                </Texto>
                <Icono nombre={b.icono} color={colores.texto} tamano={12} />
              </Pressable>
            ))}
          </View>
          <View style={[styles.barra, { backgroundColor: colores.linea }]} pointerEvents="none">
            <Animated.View
              style={[
                styles.barraRelleno,
                {
                  backgroundColor: paleta.glow,
                  experimental_backgroundImage: `linear-gradient(90deg, ${paleta.glow}, ${colores.acento})`,
                },
                estiloBarra,
              ]}
            />
          </View>
        </View>

        {/* Lectura ------------------------------------------------------------------------------ */}
        <Animated.ScrollView
          onScroll={alDesplazar}
          scrollEventThrottle={16}
          onLayout={(e) => {
            altoVista.set(e.nativeEvent.layout.height);
            revisar();
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + espaciado.xxxl }}>
          <Animated.View
            entering={entradaCalma(reducir)}
            style={styles.lector}
            onLayout={(e) => {
              cuerpoY.current = e.nativeEvent.layout.y;
              actualizarZonas();
            }}>
            <View style={styles.arriba}>
              <ArcoInicial inicial={lectura.ini} />
              <View style={styles.arribaTexto}>
                <Texto
                  rol="etiqueta"
                  tono="acento"
                  accessibilityLabel={t('aprender.minLecturaAccesible', { min: lectura.mins })}>
                  {t('aprender.minLectura', { min: lectura.mins })}
                </Texto>
                <Texto rol="displayGrande" accessibilityRole="header">
                  {texto.name}
                </Texto>
                <Texto rol="displayItalica" tono="suave">
                  {texto.sub}
                </Texto>
              </View>
            </View>

            {texto.secs.map((s, i) => (
              <View key={i} onLayout={medirSeccion(i)} style={styles.seccion}>
                <Seccion seccion={s} primera={i === 0} tamano={tamano} estilo={estilo} />
              </View>
            ))}

            <Tarjeta style={styles.final}>
              <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
                {t('aprender.rasgosMedalla')}
              </Texto>
              <View style={styles.espacios}>
                {lectura.traits.map((r) => (
                  <EspacioRasgo key={r} rasgo={r} descubierto={!!descubiertos?.includes(r)} />
                ))}
              </View>
              <View style={styles.filaBoton}>
                <Boton
                  variante="luz"
                  texto={t('aprender.responderQuiz', { count: texto.quiz.length })}
                  pista={t('aprender.responderQuizPista')}
                  onPress={() => router.push(rutaQuiz(lectura.id))}
                />
              </View>
              <Texto rol="interfazSecundaria" tono="suave">
                {t('aprender.necesitas', { pass: lectura.pass, total: texto.quiz.length })}
              </Texto>
            </Tarjeta>
          </Animated.View>
        </Animated.ScrollView>

        {aviso && enfocada ? (
          <View style={[styles.capaAviso, { top: altoCabecera + espaciado.sm }]} pointerEvents="box-none">
            <AvisoRasgo
              key={aviso.clave}
              rasgo={aviso.rasgo}
              n={aviso.n}
              total={lectura.traits.length}
              reducir={reducir}
              onCerrar={() => setAviso(null)}
            />
          </View>
        ) : null}
      </View>
    </Fondo>
  );
}

/** Una sección: título (con punto dorado si descubre un rasgo), párrafos, cita y párrafos finales. */
function Seccion({
  seccion,
  primera,
  tamano,
  estilo,
}: {
  seccion: SeccionLectura;
  primera: boolean;
  tamano: number;
  estilo: ReturnType<typeof estiloLectura>;
}) {
  const { t } = useTranslation();
  const { paleta } = useTema();
  const tamanoCita = tamano * FACTOR_CITA;

  return (
    <>
      <View style={styles.tituloFila}>
        <Texto
          rol="titulo"
          accessibilityRole="header"
          accessibilityLabel={seccion.trait ? t('aprender.seccionConRasgo', { titulo: seccion.h }) : undefined}
          style={styles.tituloSeccion}>
          {seccion.h}
        </Texto>
        {seccion.trait ? (
          <View
            style={[styles.punto, { backgroundColor: paleta.glow, boxShadow: `0 0 10px ${paleta.glow}` }]}
            importantForAccessibility="no"
          />
        ) : null}
      </View>
      {seccion.ps.map((p, k) =>
        primera && k === 0 ? (
          // Se vuelve a montar al cambiar el tamaño para medir otra vez las líneas junto a la capital.
          <ParrafoCapitular key={`capital-${tamano}`} texto={p} estilo={estilo} />
        ) : (
          <Texto key={k} style={estilo}>
            {p}
          </Texto>
        ),
      )}
      {seccion.q && seccion.q[0] ? (
        <View
          accessible
          accessibilityLabel={[seccion.q[0], seccion.q[1]].filter(Boolean).join('. ')}
          style={[styles.cita, { borderLeftColor: paleta.glow }]}>
          <Texto
            rol="displayItalica"
            style={{ fontSize: tamanoCita, lineHeight: interlineado(tamanoCita, FACTOR_INTERLINEADO.display) }}>
            {seccion.q[0]}
          </Texto>
          {seccion.q[1] ? (
            <Texto rol="boton" tono="suave" style={styles.referencia}>
              {seccion.q[1]}
            </Texto>
          ) : null}
        </View>
      ) : null}
      {(seccion.ps2 ?? []).map((p, k) => (
        <Texto key={`f${k}`} style={estilo}>
          {p}
        </Texto>
      ))}
    </>
  );
}

/** Espacio de un rasgo al final de la lectura (`.tslot`): ícono y nombre si se descubrió, "?" si no. */
function EspacioRasgo({ rasgo, descubierto }: { rasgo: string; descubierto: boolean }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { colores, paleta } = useTema();
  const nombre = contenido.rasgos[rasgo]?.[idioma][0] ?? rasgo;

  return (
    <View
      accessible
      accessibilityLabel={descubierto ? t('aprender.rasgoAccesible', { nombre }) : t('aprender.rasgoSinDescubrir')}
      style={[
        styles.espacio,
        descubierto
          ? {
              borderStyle: 'solid',
              borderColor: conAlfa(paleta.glow, 0.6),
              backgroundColor: conAlfa(paleta.glow, 0.14),
            }
          : { borderColor: colores.linea },
      ]}>
      {descubierto ? (
        <IconoRasgo rasgo={rasgo} tamano={ICONO_ESPACIO} color={colores.oro} />
      ) : (
        <View style={styles.signoCaja}>
          <Texto rol="titulo" tono="suave" allowFontScaling={false} style={styles.signo}>
            ?
          </Texto>
        </View>
      )}
      <Texto style={[styles.espacioNombre, { color: descubierto ? colores.texto : colores.textoSuave }]}>
        {descubierto ? nombre : ' '}
      </Texto>
    </View>
  );
}

function NoEncontrada() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  return (
    <Fondo>
      <SafeAreaView style={styles.llenar} edges={['top', 'left', 'right', 'bottom']}>
        <Animated.View entering={entradaCalma(reducir)} style={styles.vacio}>
          <Encabezado titulo={t('aprender.noEncontrada')} />
          <Texto tono="suave">{t('aprender.noEncontradaDetalle')}</Texto>
          <View style={styles.filaBoton}>
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
  cabecera: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.lg + 2,
    paddingBottom: espaciado.md,
    zIndex: 2,
  },
  pildora: {
    minHeight: medidas.toqueMinimo,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
  volver: { gap: espaciado.xxs, paddingLeft: espaciado.sm, paddingRight: espaciado.md + 2 },
  tamanos: { flexDirection: 'row', gap: espaciado.xs + 2 },
  botonTamano: { minWidth: medidas.toqueMinimo + 8, justifyContent: 'center', gap: 1, paddingHorizontal: espaciado.md },
  letraA: { fontSize: 14 },
  deshabilitado: { opacity: 0.4 },
  presionado: { opacity: 0.7 },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, height: BARRA },
  barraRelleno: { height: BARRA, borderTopRightRadius: BARRA, borderBottomRightRadius: BARRA },
  lector: { paddingTop: espaciado.sm + 2, paddingHorizontal: espaciado.xxl, gap: espaciado.xs },
  arriba: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md + 2, marginTop: espaciado.sm, marginBottom: espaciado.lg + 2 },
  arribaTexto: { flex: 1, gap: espaciado.xxs },
  seccion: { paddingTop: espaciado.sm, paddingBottom: espaciado.sm + 2, gap: espaciado.md },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm + 2, marginTop: espaciado.sm },
  tituloSeccion: {
    flexShrink: 1,
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_SECCION,
    lineHeight: interlineado(TAMANO_SECCION, FACTOR_INTERLINEADO.display),
  },
  punto: { width: PUNTO, height: PUNTO, borderRadius: PUNTO / 2 },
  cita: { borderLeftWidth: 3, paddingLeft: espaciado.lg, paddingVertical: espaciado.xxs, marginVertical: espaciado.xs, gap: espaciado.xs + 2 },
  referencia: { fontSize: TAMANO_REFERENCIA, letterSpacing: 0.72 },
  final: { padding: espaciado.lg, gap: espaciado.md, marginTop: espaciado.md },
  espacios: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  espacio: {
    flex: 1,
    minWidth: 88,
    alignItems: 'center',
    gap: espaciado.xs + 2,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.xs + 2,
    borderRadius: radios.tarjeta - 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  signoCaja: { width: ICONO_ESPACIO, height: ICONO_ESPACIO, alignItems: 'center', justifyContent: 'center' },
  signo: { fontSize: 26, lineHeight: interlineado(26, FACTOR_INTERLINEADO.display) },
  espacioNombre: {
    fontFamily: familias.interfazFuerte,
    fontSize: 11,
    lineHeight: interlineado(11, 1.3),
    textAlign: 'center',
  },
  filaBoton: { flexDirection: 'row', flexWrap: 'wrap' },
  capaAviso: { position: 'absolute', left: 0, right: 0, alignItems: 'flex-end', paddingRight: espaciado.md - 2 },
});
