/**
 * Historia del santo (prototype/obra-buena.html, vista `saint`): vitral arriba, nombre, datos breves,
 * historia con letra capital en el primer párrafo, una cita y una oración. Si hay novena para su
 * fiesta, "Rezar su novena" abre su detalle (`rutaNovena`).
 *
 * Contrato con Hoy: se abre con `router.push(rutaHistoriaSanto(clave))` (`/santo/MM-DD`).
 *
 * Es una pantalla de lectura: calma (nivel 3). Los bloques entran con fundido y subida de 10 px; el
 * vitral queda quieto (sin haz ni giro) y el texto no se anima.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '@/components/boton';
import { BotonSobreVitral } from '@/components/boton-sobre-vitral';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { ParrafoCapitular } from '@/components/parrafo-capitular';
import { Tarjeta } from '@/components/tarjeta';
import { Texto } from '@/components/texto';
import { Vitral } from '@/components/vitral';
import { contenido } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { novenaDelDiaDeFiesta } from '@/lib/hoy';
import { rutaNovena } from '@/lib/rutas-novenas';
import {
  espaciado,
  FACTOR_INTERLINEADO,
  familias,
  interlineado,
  medidasVitral,
  radios,
  useTema,
  type IdColorLiturgico,
} from '@/theme';
import { entradaCalma } from '@/theme/movimiento';

/** Texto de la historia (`.story-p`: 16.5 / 1.65). */
const TAMANO_HISTORIA = 16.5;
const estiloHistoria = {
  fontFamily: familias.interfaz,
  fontSize: TAMANO_HISTORIA,
  lineHeight: interlineado(TAMANO_HISTORIA, 1.65),
};
/** Oración (`.prayertext`: 16.5 / 1.6). */
const estiloOracion = {
  fontSize: TAMANO_HISTORIA,
  lineHeight: interlineado(TAMANO_HISTORIA, 1.6),
};
/** Cita (`.verse q`: itálica 25 / 1.28; Cormorant necesita ≥ 1.3). */
const TAMANO_CITA = 25;
const estiloCita = {
  fontSize: TAMANO_CITA,
  lineHeight: interlineado(TAMANO_CITA, FACTOR_INTERLINEADO.display),
};
const RAYA_CITA = 26;

export default function PantallaSanto() {
  const { clave } = useLocalSearchParams<{ clave: string }>();
  const { t } = useTranslation();
  const idioma = useIdioma();
  const reducir = useReducirMovimiento();
  const insets = useSafeAreaInsets();
  const { paleta, superficies } = useTema();
  // Barra de estado clara sobre el vitral; al bajar, la del tema.
  const [sobreVitral, setSobreVitral] = useState(true);

  const santo = clave ? contenido.santos_del_dia[clave] : undefined;
  const historia = clave ? contenido.historias_santos[clave]?.[idioma] : undefined;
  const novena = clave && santo ? novenaDelDiaDeFiesta(contenido.novenas, clave) : null;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!santo || !clave) {
    return (
      <Fondo>
        <SafeAreaView style={styles.relleno} edges={['top', 'left', 'right', 'bottom']}>
          <Animated.View entering={entradaCalma(reducir)} style={styles.vacio}>
            <Encabezado titulo={t('santo.noEncontrado')} />
            <Texto tono="suave">{t('santo.noEncontradoDetalle')}</Texto>
            <View style={styles.inicioFila}>
              <Boton texto={t('acciones.volver')} onPress={volver} />
            </View>
          </Animated.View>
        </SafeAreaView>
      </Fondo>
    );
  }

  const [nombre, subtitulo] = santo[idioma];
  // El vitral de la historia usa el color de la celebración del santo (la cinta de su fiesta).
  const color: IdColorLiturgico = santo.lit;

  return (
    <Fondo>
      {sobreVitral ? <StatusBar style="light" /> : null}
      <ScrollView
        scrollEventThrottle={32}
        onScroll={(e) => {
          const arriba = e.nativeEvent.contentOffset.y < medidasVitral.alto - insets.top;
          if (arriba !== sobreVitral) setSobreVitral(arriba);
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + espaciado.xxxl }}>
        <View>
          <Vitral semilla={clave} inicial={santo.ini} colorLiturgico={color} />
          <View style={[styles.volver, { top: insets.top + espaciado.sm }]}>
            <BotonSobreVitral texto={t('acciones.volver')} onPress={volver} />
          </View>
        </View>

        <Animated.View entering={entradaCalma(reducir)} style={styles.textoHero}>
          <Texto rol="etiqueta" tono="acento" style={styles.centrado}>
            {t('hoy.santoDelDia')}
          </Texto>
          <Texto rol="display" accessibilityRole="header" style={styles.centrado}>
            {nombre}
          </Texto>
          <Texto rol="displayItalica" tono="suave" style={styles.centrado}>
            {subtitulo}
          </Texto>
        </Animated.View>

        <Animated.View entering={entradaCalma(reducir, 1)} style={styles.cuerpo}>
          {historia ? (
            <>
              {historia.f.length > 0 && (
                <View
                  style={styles.datos}
                  accessible
                  accessibilityLabel={`${t('santo.datos')}: ${historia.f.join(', ')}`}>
                  {historia.f.map((dato) => (
                    <View
                      key={dato}
                      style={[
                        styles.dato,
                        { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
                      ]}>
                      <Texto rol="interfazSecundaria" style={styles.datoTexto}>
                        {dato}
                      </Texto>
                    </View>
                  ))}
                </View>
              )}

              <Texto rol="etiqueta" tono="acento" accessibilityRole="header" style={styles.seccion}>
                {t('santo.suHistoria')}
              </Texto>
              <View style={styles.parrafos}>
                {historia.st.map((parrafo, i) =>
                  i === 0 ? (
                    <ParrafoCapitular key={i} texto={parrafo} estilo={estiloHistoria} />
                  ) : (
                    <Texto key={i} style={estiloHistoria}>
                      {parrafo}
                    </Texto>
                  ),
                )}
              </View>

              <Texto rol="etiqueta" tono="acento" accessibilityRole="header" style={styles.seccion}>
                {t('santo.enSusPalabras')}
              </Texto>
              <View accessible accessibilityLabel={`${historia.q} ${historia.qr}`}>
                <Texto rol="displayItalica" style={estiloCita}>
                  {historia.q}
                </Texto>
                <View style={styles.referencia}>
                  <View style={[styles.raya, { backgroundColor: paleta.glow }]} />
                  <Texto rol="boton" tono="suave" style={styles.referenciaTexto}>
                    {historia.qr}
                  </Texto>
                </View>
              </View>

              <Tarjeta style={styles.oracion}>
                <Texto rol="etiqueta" tono="acento">
                  {t('santo.oracion')}
                </Texto>
                <Texto style={estiloOracion}>{historia.pr}</Texto>
              </Tarjeta>
            </>
          ) : (
            <Texto tono="suave">{t('santo.sinHistoria')}</Texto>
          )}

          {novena ? (
            <View style={styles.inicioFila}>
              <Boton
                variante="luz"
                texto={t('santo.rezarNovena')}
                pista={t('santo.rezarNovenaPista')}
                onPress={() => router.push(rutaNovena(novena.id))}
              />
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </Fondo>
  );
}

const styles = StyleSheet.create({
  relleno: { flex: 1 },
  vacio: {
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.lg,
    gap: espaciado.lg,
  },
  volver: { position: 'absolute', left: espaciado.lg },
  textoHero: {
    paddingTop: espaciado.lg + 2,
    paddingHorizontal: espaciado.xl + 2,
    paddingBottom: espaciado.xs + 2,
    alignItems: 'center',
    gap: espaciado.sm,
  },
  centrado: { textAlign: 'center' },
  cuerpo: {
    paddingTop: espaciado.md + 2,
    paddingHorizontal: espaciado.xl,
    gap: espaciado.md + 2,
  },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm - 2 },
  dato: {
    borderWidth: 1,
    borderRadius: radios.pildora,
    paddingVertical: espaciado.sm - 2,
    paddingHorizontal: espaciado.md - 1,
  },
  datoTexto: {
    fontFamily: familias.interfazSemi,
    fontSize: 12.5,
    lineHeight: interlineado(12.5, FACTOR_INTERLINEADO.interfazChica),
    fontVariant: ['tabular-nums'],
  },
  seccion: { marginTop: espaciado.sm - 2 },
  parrafos: { gap: espaciado.md },
  referencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginTop: espaciado.md - 2,
  },
  raya: { width: RAYA_CITA, height: 2, borderRadius: 2 },
  referenciaTexto: { fontSize: 12, letterSpacing: 0.72, flexShrink: 1 },
  oracion: { padding: espaciado.lg, gap: espaciado.xs + 2 },
  inicioFila: { flexDirection: 'row' },
});
