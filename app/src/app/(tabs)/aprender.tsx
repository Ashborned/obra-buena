/**
 * Pestaña Aprender (prototype/obra-buena.html, `renderLearn`, vista lista): título, texto guía,
 * "Tu vitrina" con las medallas y una sección por colección con su avance y un carrusel de lecturas.
 *
 * - Vitrina: fila deslizable con las medallas de colección ganadas (primero) y una medalla por lectura
 *   publicada (las que faltan en silueta con "?"). Tocar una ganada abre la medalla grande; una sin
 *   ganar abre la lectura. Nota con candado: se guarda solo en el teléfono (principio 2).
 * - Colecciones: las del país de la persona primero (principio 8). Cada tarjeta: arco con la inicial,
 *   nombre, subtítulo e insignia ("Nuevo · 6 min", "Medalla obtenida" o "Próximamente").
 *
 * Principio 1: el juego vive aquí y es de conocimiento. Sin rachas ni contadores de días.
 * Calma: los bloques entran con fundido y subida de 10 px. Al volver del quiz con una medalla nueva,
 * la vitrina se desplaza hasta su casilla y la medalla llega volando (components/transiciones.tsx);
 * mientras vuela, la casilla la espera vacía y al llegar se asienta con un pequeño rebote.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { ArcoInicial } from '@/components/arco-inicial';
import { Icono } from '@/components/icono';
import { Medalla, PROPORCION_MEDALLA } from '@/components/medalla';
import { Pantalla } from '@/components/pantalla';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { useAsentar, useDestinoMedalla, useMedallaEnVuelo } from '@/components/transiciones';
import { contenido, type Coleccion } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import {
  avanceColeccion,
  coleccionesOrdenadas,
  itemsDeColeccion,
  medallasVitrina,
  type ItemColeccion,
} from '@/lib/aprender';
import { useProgresoAprender } from '@/lib/aprender-progreso';
import { usePais } from '@/lib/pais';
import { rutaLectura, rutaMedalla, rutaMedallaColeccion } from '@/lib/rutas-aprender';
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
import { entradaCalma } from '@/theme/movimiento';

/** Casilla de la vitrina (`.mslot`: 74 de ancho). */
const CASILLA = 74;
/** Nombre bajo la medalla (`.mslot small`: 600 10.5; un poco más para leerlo). */
const TAMANO_CASILLA = 11;
/** Tarjeta del carrusel (`.lcard`: 150 × 184). */
const TARJETA_ANCHO = 150;
const TARJETA_ALTO = 184;
/** La tarjeta crece con la letra grande, hasta este factor. */
const CRECIMIENTO_MAXIMO = 1.7;
/** Nombre en la tarjeta (`.lcard b`: 600 19). */
const TAMANO_NOMBRE = 19;
const TAMANO_SUB = 12;
const TAMANO_INSIGNIA = 11;
const TAMANO_NOTA = 11.5;
/** Fondo de la insignia "Nuevo" y "Próximamente" (maqueta: acento al 12 %). */
const ALFA_INSIGNIA = 0.12;

export default function PantallaAprender() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  const { pais } = usePais();
  const progreso = useProgresoAprender();

  const colecciones = useMemo(() => coleccionesOrdenadas(contenido, pais), [pais]);

  return (
    <Pantalla titulo={t('pestanas.aprender')}>
      <Animated.View entering={entradaCalma(reducir)}>
        <Texto rol="interfazSecundaria" tono="suave">
          {t('aprender.guia')}
        </Texto>
      </Animated.View>

      <Animated.View entering={entradaCalma(reducir, 1)}>
        <Vitrina progreso={progreso} colecciones={colecciones} />
      </Animated.View>

      {colecciones.length === 0 ? (
        <Texto tono="suave">{t('aprender.sinLecturas')}</Texto>
      ) : (
        colecciones.map((col, i) => (
          <Animated.View key={col.id} entering={entradaCalma(reducir, i + 2)}>
            <SeccionColeccion coleccion={col} medallas={progreso.medallas} />
          </Animated.View>
        ))
      )}
    </Pantalla>
  );
}

// Vitrina ---------------------------------------------------------------------------------------

function Vitrina({
  progreso,
  colecciones,
}: {
  progreso: ReturnType<typeof useProgresoAprender>;
  colecciones: Coleccion[];
}) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { pais } = usePais();
  const { colores } = useTema();

  const medallas = useMemo(
    () => medallasVitrina(contenido, progreso.medallas, pais),
    [progreso.medallas, pais],
  );
  const ganadas = medallas.filter((m) => m.ganadaEn).length;
  const deColeccion = colecciones.filter((c) => progreso.colecciones.has(c.id));
  const contador = t('aprender.vitrinaContador', {
    n: ganadas,
    count: medallas.length,
  });
  const altoMedalla = medidasMedalla.vitrina * PROPORCION_MEDALLA;

  // Medalla en vuelo desde el quiz: la vitrina se desplaza hasta su casilla.
  const enVuelo = useMedallaEnVuelo();
  const repisa = useRef<ScrollView>(null);
  const posiciones = useRef(new Map<string, number>());
  const medirCasilla = (id: string) => (x: number) => {
    posiciones.current.set(id, x);
    if (id === enVuelo) repisa.current?.scrollTo({ x: Math.max(0, x - espaciado.lg), animated: true });
  };
  useEffect(() => {
    if (!enVuelo) return;
    const x = posiciones.current.get(enVuelo);
    if (x !== undefined) repisa.current?.scrollTo({ x: Math.max(0, x - espaciado.lg), animated: true });
  }, [enVuelo]);

  return (
    <Tarjeta style={styles.vitrina}>
      <View
        style={styles.vitrinaArriba}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${t('aprender.vitrina')}. ${contador}`}>
        <Texto rol="etiqueta" tono="acento">
          {t('aprender.vitrina')}
        </Texto>
        <Texto tono="suave" style={styles.contador}>
          {contador}
        </Texto>
      </View>

      <View style={[styles.repisa, { minHeight: altoMedalla + espaciado.xxl }]}>
        {/* Repisa: una línea bajo las medallas (maqueta: franja de ink 8 %). */}
        <View
          style={[styles.repisaLinea, { top: altoMedalla + espaciado.sm, backgroundColor: colores.linea }]}
          pointerEvents="none"
        />
        {progreso.cargado ? (
          <ScrollView
            ref={repisa}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.medallas}>
            {deColeccion.map((col) => (
              <CasillaMedalla
                key={`col-${col.id}`}
                nombre={col[idioma]}
                detalle={t('aprender.coleccion')}
                etiqueta={t('aprender.medallaColeccionAccesible', {
                  nombre: col[idioma],
                })}
                pista={t('aprender.medallaGanadaPista')}
                onPress={() => router.push(rutaMedallaColeccion(col.id))}>
                <Medalla variante="coleccion" nombre={col[idioma]} tamano={medidasMedalla.vitrina} />
              </CasillaMedalla>
            ))}
            {medallas.map(({ lectura, ganadaEn }) => {
              const nombre = lectura[idioma].name;
              return (
                <CasillaMedalla
                  key={lectura.id}
                  destinoId={lectura.id}
                  alMedir={medirCasilla(lectura.id)}
                  nombre={nombre}
                  ganada={!!ganadaEn}
                  etiqueta={t(
                    ganadaEn ? 'aprender.medallaGanadaAccesible' : 'aprender.medallaPendienteAccesible',
                    { nombre },
                  )}
                  pista={t(ganadaEn ? 'aprender.medallaGanadaPista' : 'aprender.medallaPendientePista')}
                  onPress={() => router.push(ganadaEn ? rutaMedalla(lectura.id) : rutaLectura(lectura.id))}>
                  {ganadaEn ? (
                    <Medalla
                      variante="lectura"
                      lectura={lectura}
                      rasgos={progreso.rasgos[lectura.id] ?? []}
                      tamano={medidasMedalla.vitrina}
                    />
                  ) : (
                    <Medalla variante="silueta" tamano={medidasMedalla.vitrina} />
                  )}
                </CasillaMedalla>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.nota}>
        <Icono nombre="candado" color={colores.textoSuave} tamano={12} />
        <Texto tono="suave" style={styles.notaTexto}>
          {t('aprender.soloEnTuTelefono')}
        </Texto>
      </View>
    </Tarjeta>
  );
}

function CasillaMedalla({
  destinoId,
  alMedir,
  nombre,
  detalle,
  ganada = true,
  etiqueta,
  pista,
  onPress,
  children,
}: {
  /** Id de la lectura: la casilla puede recibir su medalla volando desde el quiz. */
  destinoId?: string;
  /** Posición x de la casilla en la repisa (para desplazarse hasta ella). */
  alMedir?: (x: number) => void;
  nombre: string;
  detalle?: string;
  ganada?: boolean;
  etiqueta: string;
  pista: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colores } = useTema();
  const { ref, esperando } = useDestinoMedalla(destinoId ?? '');
  const estiloMedalla = useAsentar(esperando);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={pista}
      onPress={onPress}
      onLayout={alMedir ? (e) => alMedir(e.nativeEvent.layout.x) : undefined}
      style={({ pressed }) => [styles.casilla, pressed && styles.presionada]}>
      {/* Sin boxShadow alrededor: en Android dibuja un óvalo oscuro detrás de la medalla. */}
      <Animated.View ref={ref} collapsable={false} style={estiloMedalla}>
        {children}
      </Animated.View>
      {detalle ? (
        // Una línea: con el espaciado de la etiqueta, "COLLECTION" se partía a mitad de palabra.
        <Texto
          rol="etiqueta"
          tono="acento"
          style={styles.casillaDetalle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {detalle}
        </Texto>
      ) : null}
      <Texto style={[styles.casillaNombre, { color: ganada ? colores.texto : colores.textoSuave }]}>
        {nombre}
      </Texto>
    </Pressable>
  );
}

// Colecciones -----------------------------------------------------------------------------------

function SeccionColeccion({ coleccion, medallas }: { coleccion: Coleccion; medallas: Map<string, string> }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const conMedalla = useMemo(() => new Set(medallas.keys()), [medallas]);
  const avance = avanceColeccion(contenido, coleccion, conMedalla);
  const items = itemsDeColeccion(contenido, coleccion);
  const nombre = coleccion[idioma];

  return (
    <View style={styles.coleccion}>
      <View
        style={styles.coleccionArriba}
        accessible
        accessibilityRole="header"
        accessibilityLabel={t('aprender.avanceColeccionAccesible', {
          nombre,
          n: avance.conMedalla,
          count: avance.total,
        })}>
        <Texto rol="etiqueta" tono="suave" style={styles.coleccionNombre}>
          {nombre}
        </Texto>
        <Texto tono="suave" style={styles.avance}>
          {t('aprender.avanceColeccion', {
            n: avance.conMedalla,
            total: avance.total,
          })}
        </Texto>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.carrusel}
        contentContainerStyle={styles.carruselContenido}>
        {items.map((item) => (
          <TarjetaLectura
            key={item.tipo === 'lectura' ? item.lectura.id : item.item.id}
            item={item}
            ganada={item.tipo === 'lectura' && medallas.has(item.lectura.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TarjetaLectura({ item, ganada }: { item: ItemColeccion; ganada: boolean }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { colores, paleta } = useTema();
  const { fontScale } = useWindowDimensions();
  const crecimiento = Math.min(Math.max(fontScale, 1), CRECIMIENTO_MAXIMO);
  const medida = {
    width: TARJETA_ANCHO * crecimiento,
    minHeight: TARJETA_ALTO,
  };

  if (item.tipo === 'proximamente') {
    const { name, sub } = item.item[idioma];
    return (
      <View
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={`${name}. ${sub}. ${t('aprender.proximamente')}`}>
        <Tarjeta style={[styles.tarjeta, styles.tarjetaProxima, medida]}>
          <ArcoInicial inicial={item.item.ini} />
          <Texto style={[styles.nombre, { color: colores.textoSuave }]}>{name}</Texto>
          <Texto tono="suave" style={styles.sub}>
            {sub}
          </Texto>
          <Insignia texto={t('aprender.proximamente')} />
        </Tarjeta>
      </View>
    );
  }

  const { lectura } = item;
  const { name, sub } = lectura[idioma];
  const insignia = ganada ? t('aprender.medallaObtenida') : t('aprender.nuevo', { min: lectura.mins });
  const insigniaAccesible = ganada ? insignia : t('aprender.nuevoAccesible', { min: lectura.mins });

  return (
    <Tarjeta
      onPress={() => router.push(rutaLectura(lectura.id))}
      etiquetaAccesible={`${name}. ${sub}. ${insigniaAccesible}`}
      pista={t('aprender.tarjetaPista')}
      style={[styles.tarjeta, medida, ganada && { borderColor: conAlfa(paleta.glow, 0.7) }]}>
      <ArcoInicial inicial={lectura.ini} />
      <Texto style={styles.nombre}>{name}</Texto>
      <Texto tono="suave" style={styles.sub}>
        {sub}
      </Texto>
      <Insignia texto={insignia} luz={ganada} />
    </Tarjeta>
  );
}

function Insignia({ texto, luz = false }: { texto: string; luz?: boolean }) {
  const { colores, paleta } = useTema();
  return (
    <View
      style={[
        styles.insignia,
        {
          backgroundColor: luz ? paleta.glow : conAlfa(colores.acento, ALFA_INSIGNIA),
        },
      ]}>
      <Texto style={[styles.insigniaTexto, { color: luz ? colores.sobreLuz : colores.acentoTexto }]}>
        {texto}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  vitrina: {
    paddingTop: espaciado.lg,
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.md,
    gap: espaciado.sm,
  },
  vitrinaArriba: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: espaciado.sm,
  },
  contador: {
    fontSize: 12.5,
    lineHeight: interlineado(12.5, FACTOR_INTERLINEADO.cuerpo),
    fontVariant: ['tabular-nums'],
  },
  repisa: { marginHorizontal: -espaciado.lg },
  repisaLinea: {
    position: 'absolute',
    left: espaciado.lg,
    right: espaciado.lg,
    height: 3,
    borderRadius: 2,
  },
  medallas: {
    paddingHorizontal: espaciado.lg - 4,
    paddingVertical: espaciado.xs,
    gap: espaciado.sm,
  },
  casilla: {
    width: CASILLA,
    minHeight: medidas.toqueMinimo,
    alignItems: 'center',
    gap: espaciado.xs,
  },
  presionada: { opacity: 0.75 },
  casillaDetalle: { textAlign: 'center' },
  casillaNombre: {
    fontFamily: familias.interfazSemi,
    fontSize: TAMANO_CASILLA,
    lineHeight: interlineado(TAMANO_CASILLA, 1.25),
    textAlign: 'center',
  },
  nota: { flexDirection: 'row', alignItems: 'center', gap: espaciado.xs + 2 },
  notaTexto: {
    flexShrink: 1,
    fontSize: TAMANO_NOTA,
    lineHeight: interlineado(TAMANO_NOTA, FACTOR_INTERLINEADO.cuerpo),
  },
  coleccion: { gap: espaciado.sm },
  coleccionArriba: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: espaciado.sm,
    marginTop: espaciado.xs + 2,
  },
  coleccionNombre: { flexShrink: 1 },
  avance: {
    fontFamily: familias.interfazFuerte,
    fontSize: 12,
    lineHeight: interlineado(12, FACTOR_INTERLINEADO.interfazChica),
    fontVariant: ['tabular-nums'],
  },
  // El carrusel llega a los bordes de la pantalla (maqueta: margin-inline −18).
  carrusel: { marginHorizontal: -espaciado.xl },
  carruselContenido: {
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.xxs,
    paddingBottom: espaciado.md,
    gap: espaciado.md - 2,
  },
  tarjeta: { padding: espaciado.lg - 2, gap: espaciado.sm - 2 },
  tarjetaProxima: { borderStyle: 'dashed', boxShadow: [] },
  nombre: {
    fontFamily: familias.displaySemi,
    fontSize: TAMANO_NOMBRE,
    lineHeight: interlineado(TAMANO_NOMBRE, FACTOR_INTERLINEADO.display),
  },
  sub: { fontSize: TAMANO_SUB, lineHeight: interlineado(TAMANO_SUB, 1.3) },
  insignia: {
    alignSelf: 'flex-start',
    marginTop: 'auto',
    paddingVertical: espaciado.xs + 1,
    paddingHorizontal: espaciado.sm + 2,
    borderRadius: radios.pildora,
  },
  insigniaTexto: {
    fontFamily: familias.interfazFuerte,
    fontSize: TAMANO_INSIGNIA,
    lineHeight: interlineado(TAMANO_INSIGNIA, FACTOR_INTERLINEADO.interfazChica),
    fontVariant: ['tabular-nums'],
  },
});
