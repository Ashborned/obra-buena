/**
 * Detalle de una emoción (prototype/obra-buena.html, `state.tab==='feel'`, vista detalle):
 * cabecera con el tono de la emoción, Volver y Palabra · Oración · Compañía; "Para hoy · 2 de 3" con
 * "Otra oración"; el versículo, la oración y el santo compañero.
 *
 * Vive fuera de las pestañas (como la historia del santo): es una pantalla de oración y se reza sin
 * la barra de pestañas a la vista (una cosa por pantalla). Se abre con `rutaEmocion(id)`.
 *
 * Ayuda (principio 6): en Depresión, arriba de todo; en Triste y Soledad, al final
 * (`posicionAyuda`). Se muestra aunque la emoción no tenga entradas.
 *
 * Calma (nivel 3): los bloques entran con fundido + subida de 10 px; "Otra oración" cambia la
 * entrada con un fundido cruzado y se anuncia al lector. Sin partículas, rebotes ni repeticiones.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArcoInicial } from '@/components/arco-inicial';
import { Boton } from '@/components/boton';
import { Encabezado } from '@/components/encabezado';
import { Enlace } from '@/components/enlace';
import { Fondo } from '@/components/fondo';
import { Icono } from '@/components/icono';
import { TarjetaAyuda } from '@/components/tarjeta-ayuda';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { contenido, type Companero, type Emocion, type EntradaEmocion } from '@/contenido';
import { useIdioma, useTranslation, type ClaveTexto } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { entradaDelDia, posicionAyuda } from '@/lib/emociones';
import { useOtraOracion } from '@/lib/otra-oracion';
import { rutaLectura } from '@/lib/rutas-emociones';
import { rutaNovena } from '@/lib/rutas-novenas';
import { useAhora } from '@/lib/use-ahora';
import {
  esIdTonoEmocion,
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  medidas,
  radios,
  useTema,
  type IdTonoEmocion,
} from '@/theme';
import { entradaCalma, fundido, movimiento } from '@/theme/movimiento';

const PASOS: ClaveTexto[] = [
  'emociones.pasos.palabra',
  'emociones.pasos.oracion',
  'emociones.pasos.compania',
];

/** Versículo (`.verse q`: itálica 25; Cormorant necesita interlineado ≥ 1.3). */
const TAMANO_VERSICULO = 25;
/** Oración (`.prayertext`: 16.5 / 1.6). */
const TAMANO_ORACION = 16.5;
/** Línea del santo (`.comp p`: 13.5). */
const TAMANO_LINEA = 13.5;
const RAYA = 26;
/** "Para hoy · 2 de 3" (`.rot`: 700 11, 0.08em). */
const TAMANO_ROT = 11;

export default function PantallaEmocion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const emocion = contenido.emociones.find((e) => e.id === id);
  if (!emocion || !esIdTonoEmocion(emocion.id)) return <NoEncontrada />;
  return <Detalle emocion={emocion} tonoId={emocion.id} />;
}

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/emociones');
}

function Detalle({ emocion, tonoId }: { emocion: Emocion; tonoId: IdTonoEmocion }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const insets = useSafeAreaInsets();
  const { hoy } = useAhora();
  const [desplazamiento, avanzar] = useOtraOracion(emocion.id, hoy);
  // El desplazamiento con el que se abrió: si cambia, la entrada nueva entra con fundido cruzado.
  const [desplazamientoInicial] = useState(desplazamiento);
  const cambio = desplazamiento !== desplazamientoInicial;

  const delDia = entradaDelDia(emocion, hoy, desplazamiento);
  const posicion = posicionAyuda(emocion);
  const i = idioma === 'es' ? 0 : 1;

  const otra = () => {
    const siguiente = entradaDelDia(emocion, hoy, desplazamiento + 1);
    avanzar();
    if (siguiente) {
      AccessibilityInfo.announceForAccessibility(
        t('emociones.otraAnuncio', {
          n: siguiente.indice + 1,
          total: siguiente.total,
          referencia: siguiente.entrada.ref[i],
          santo: siguiente.entrada.c[idioma][0],
        }),
      );
    }
  };

  // "Otra oración": fundido cruzado (sin moverse), igual con movimiento reducido.
  const entradaBloque = cambio ? fundido.entrada(movimiento.cruceEntrada) : entradaCalma(reducir, 2);

  return (
    <Fondo>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + espaciado.xxxl }}>
        <Cabecera
          tonoId={tonoId}
          nombre={emocion[idioma]}
          arriba={insets.top}
          reducir={reducir}
        />

        <View style={styles.pagina}>
          {posicion === 'arriba' ? (
            <Animated.View entering={entradaCalma(reducir, 1)}>
              <TarjetaAyuda emocion={tonoId} />
            </Animated.View>
          ) : null}

          {delDia ? (
            <>
              <Animated.View entering={entradaCalma(reducir, 1)} style={styles.rot}>
                <Texto
                  style={styles.rotTexto}
                  tono="suave"
                  accessibilityLabel={t('emociones.paraHoyAccesible', {
                    n: delDia.indice + 1,
                    total: delDia.total,
                  })}>
                  {t('emociones.paraHoy', { n: delDia.indice + 1, total: delDia.total })}
                </Texto>
                {delDia.total > 1 ? (
                  <Enlace
                    rol="button"
                    icono="rotar"
                    texto={t('emociones.otraOracion')}
                    pista={t('emociones.otraOracionPista')}
                    onPress={otra}
                  />
                ) : null}
              </Animated.View>

              <Animated.View
                key={delDia.indice}
                entering={entradaBloque}
                exiting={fundido.salida(movimiento.cruceSalida)}
                style={styles.bloque}>
                <Entrada entrada={delDia.entrada} />
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={entradaCalma(reducir, 1)}>
              <Tarjeta style={styles.relleno}>
                <Texto tono="suave">{t('emociones.sinEntrada')}</Texto>
              </Tarjeta>
            </Animated.View>
          )}

          {posicion === 'final' ? (
            <Animated.View entering={entradaCalma(reducir, 3)}>
              <TarjetaAyuda emocion={tonoId} />
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </Fondo>
  );
}

function Cabecera({
  tonoId,
  nombre,
  arriba,
  reducir,
}: {
  tonoId: IdTonoEmocion;
  nombre: string;
  arriba: number;
  reducir: boolean;
}) {
  const { t } = useTranslation();
  const { emociones } = useTema();
  const tono = emociones[tonoId];
  const pildora = { backgroundColor: tono.pildoraFondo, borderColor: tono.pildoraBorde };

  return (
    <View
      style={[
        styles.cabecera,
        {
          paddingTop: arriba + espaciado.sm,
          backgroundColor: tono.hondo,
          experimental_backgroundImage: tono.degradadoCabecera,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('acciones.volver')}
        onPress={volver}
        hitSlop={espaciado.xs}
        style={({ pressed }) => [styles.volver, pildora, pressed && styles.presionado]}>
        <Icono nombre="volver" color={tono.texto} tamano={medidas.iconoBoton - 3} />
        <Texto rol="boton" style={{ color: tono.texto }}>
          {t('acciones.volver')}
        </Texto>
      </Pressable>
      <Animated.View entering={entradaCalma(reducir)} style={styles.cabeceraTexto}>
        <View style={styles.pasos} accessible accessibilityLabel={t('emociones.pasosAccesible')}>
          {PASOS.map((clave) => (
            <View key={clave} style={[styles.paso, pildora]}>
              <Texto rol="etiqueta" style={[styles.pasoTexto, { color: tono.texto }]}>
                {t(clave)}
              </Texto>
            </View>
          ))}
        </View>
        <Texto rol="displayEmocion" accessibilityRole="header" style={{ color: tono.texto }}>
          {nombre}
        </Texto>
      </Animated.View>
    </View>
  );
}

function Entrada({ entrada }: { entrada: EntradaEmocion }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const { paleta } = useTema();
  const i = idioma === 'es' ? 0 : 1;

  return (
    <>
      <View
        accessible
        accessibilityLabel={t('emociones.versiculoAccesible', {
          texto: entrada.v[i],
          referencia: entrada.ref[i],
        })}>
        <Texto rol="displayItalica" style={styles.versiculo}>
          {entrada.v[i]}
        </Texto>
        <View style={styles.referencia}>
          <View style={[styles.raya, { backgroundColor: paleta.glow }]} />
          <Texto rol="boton" tono="suave" style={styles.referenciaTexto}>
            {entrada.ref[i]}
          </Texto>
        </View>
      </View>

      <Tarjeta style={styles.relleno}>
        <Texto rol="etiqueta" tono="acento" accessibilityRole="header">
          {t('emociones.oracion')}
        </Texto>
        <Texto style={styles.oracion}>{entrada.p[i]}</Texto>
      </Tarjeta>

      <TarjetaCompanero companero={entrada.c} />
    </>
  );
}

function TarjetaCompanero({ companero }: { companero: Companero }) {
  const { t } = useTranslation();
  const idioma = useIdioma();
  const [nombre, linea] = companero[idioma];
  const lectura = companero.lrn;

  return (
    <Tarjeta style={styles.companero}>
      <View style={styles.companeroFila}>
        <ArcoInicial inicial={companero.ini} />
        <View style={styles.companeroTexto}>
          <Texto rol="etiqueta" tono="acento">
            {t('emociones.teAcompana')}
          </Texto>
          <Texto rol="titulo">{nombre}</Texto>
          <Texto tono="suave" style={styles.linea}>
            {linea}
          </Texto>
        </View>
      </View>
      {companero.nov || lectura ? (
        <View style={styles.enlaces}>
          {companero.nov ? (
            <Enlace
              texto={t('emociones.rezarNovena')}
              pista={t('emociones.rezarNovenaPista')}
              onPress={() => router.push(rutaNovena(companero.nov as string))}
            />
          ) : null}
          {lectura ? (
            <Enlace
              texto={t('emociones.conocerHistoria')}
              pista={t('emociones.conocerHistoriaPista')}
              onPress={() => router.navigate(rutaLectura(lectura))}
            />
          ) : null}
        </View>
      ) : null}
    </Tarjeta>
  );
}

function NoEncontrada() {
  const { t } = useTranslation();
  const reducir = useReducirMovimiento();
  return (
    <Fondo>
      <SafeAreaView style={styles.llenar} edges={['top', 'left', 'right', 'bottom']}>
        <Animated.View entering={entradaCalma(reducir)} style={styles.vacio}>
          <Encabezado titulo={t('emociones.noEncontrada')} />
          <Texto tono="suave">{t('emociones.noEncontradaDetalle')}</Texto>
          <View style={styles.inicioFila}>
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
  inicioFila: { flexDirection: 'row' },
  cabecera: {
    paddingHorizontal: espaciado.xl,
    paddingBottom: espaciado.xxl + 2,
    borderBottomLeftRadius: radios.hero,
    borderBottomRightRadius: radios.hero,
    borderCurve: 'continuous',
    gap: espaciado.sm,
  },
  cabeceraTexto: { gap: espaciado.sm, marginTop: espaciado.sm },
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
  presionado: { opacity: 0.7 },
  pasos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm - 2 },
  paso: {
    paddingVertical: espaciado.xs + 1,
    paddingHorizontal: espaciado.sm + 2,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
  // `.steps span`: 0.12em en vez del 0.14em de las etiquetas.
  pasoTexto: { letterSpacing: 1.26 },
  pagina: {
    paddingHorizontal: espaciado.lg + 2,
    paddingTop: espaciado.lg + 2,
    gap: espaciado.md + 2,
  },
  rot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: espaciado.md,
  },
  rotTexto: {
    fontFamily: familias.interfazFuerte,
    fontSize: TAMANO_ROT,
    lineHeight: interlineado(TAMANO_ROT, FACTOR_INTERLINEADO.interfazChica),
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  bloque: { gap: espaciado.md + 2 },
  versiculo: {
    fontSize: TAMANO_VERSICULO,
    lineHeight: interlineado(TAMANO_VERSICULO, FACTOR_INTERLINEADO.display),
  },
  referencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginTop: espaciado.md - 2,
  },
  raya: { width: RAYA, height: 2, borderRadius: 2 },
  referenciaTexto: { fontSize: 12, letterSpacing: 0.72, flexShrink: 1 },
  relleno: { padding: espaciado.lg, gap: espaciado.xs + 2 },
  oracion: {
    fontSize: TAMANO_ORACION,
    lineHeight: interlineado(TAMANO_ORACION, 1.6),
  },
  companero: {
    paddingVertical: espaciado.md + 2,
    paddingHorizontal: espaciado.lg,
    gap: espaciado.xs,
  },
  companeroFila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md + 2 },
  companeroTexto: { flex: 1, gap: espaciado.xxs },
  linea: {
    fontSize: TAMANO_LINEA,
    lineHeight: interlineado(TAMANO_LINEA, FACTOR_INTERLINEADO.cuerpo),
  },
  enlaces: { marginTop: espaciado.xs },
});
