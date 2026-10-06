/**
 * Hoy (prototype/obra-buena.html, `state.tab==='today'`): vitral del santo del día con el color
 * litúrgico, chips de hora de oración y color, nombre y "Conocer su historia"; debajo, la novena del
 * día, el evangelio, "¿Cómo te sientes hoy?" y la línea de privacidad.
 *
 * - Sin santo cargado ese día: respaldo sin nombre ni inicial (nunca el santo de otro día), con el
 *   color del tiempo litúrgico y el vitral sembrado con la fecha.
 * - Movimiento: la apertura del vitral (nivel 1) corre una vez por día; el haz, el halo, las llamas,
 *   las estrellas, el brillo del botón y la inclinación (nivel 2) solo mientras Hoy está a la vista.
 *   "Conocer su historia": el bloque del santo se expande hacia la historia (`expandirTarjeta`).
 */
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEspacioBarra } from '@/components/barra-pestanas';
import { Boton } from '@/components/boton';
import { BotonLlamada } from '@/components/boton-llamada';
import { BotonRedondo } from '@/components/boton-redondo';
import { Chip } from '@/components/chip';
import { Fondo } from '@/components/fondo';
import { Icono } from '@/components/icono';
import { TarjetaEvangelio } from '@/components/tarjeta-evangelio';
import { TarjetaNovenaHoy } from '@/components/tarjeta-novena-hoy';
import { Texto } from '@/components/texto';
import { medirEnVentana, useTransiciones } from '@/components/transiciones';
import { Vitral } from '@/components/vitral';
import { contenido } from '@/contenido';
import { useIdioma, useTranslation } from '@/i18n';
import { useReducirMovimiento } from '@/lib/animaciones';
import { fechaCorta, fechaLarga } from '@/lib/formato-fecha';
import {
  colorLiturgicoDelDia,
  novenaDelDia,
  rutaHistoriaSanto,
  santoDelDia,
} from '@/lib/hoy';
import { usePais } from '@/lib/pais';
import { guardarUltimaAperturaVitral, leerUltimaAperturaVitral } from '@/lib/preferencias';
import { rutaNovena } from '@/lib/rutas-novenas';
import { useAhora } from '@/lib/use-ahora';
import { semillaDeFecha } from '@/lib/vitral';
import { espaciado, hexLiturgico, medidasVitral, useTema } from '@/theme';
import { entradaCalma } from '@/theme/movimiento';

/** Cuánto montan los chips sobre el borde del vitral (`.meta`: 34 − 18 de relleno). */
const CHIPS_SOBRE_VITRAL = 16;
const ICONO_CANDADO = 13;

export default function PantallaHoy() {
  const { t } = useTranslation();
  const idioma = useIdioma();
  // Hora del reloj (no la del tema): el chip nombra el oficio real aunque el cielo esté fijado.
  const { hoy, hora } = useAhora();
  const enfocada = useIsFocused();
  const reducir = useReducirMovimiento();
  const insets = useSafeAreaInsets();
  const espacioBarra = useEspacioBarra();
  const { expandirTarjeta } = useTransiciones();
  const refSanto = useRef<View>(null);

  const dia = semillaDeFecha(hoy);
  const santoHoy = santoDelDia(contenido, hoy);
  const { pais } = usePais();
  const color = colorLiturgicoDelDia(contenido, hoy, pais);
  const novenaHoy = novenaDelDia(contenido.novenas, hoy, { pais, traslados: contenido.traslados });
  const evangelio = contenido.evangelio_ejemplo;
  const indicePar = idioma === 'es' ? 0 : 1;

  // Nivel 1, una vez por día: se decide al montar y se anota de inmediato.
  const [apertura] = useState(() => leerUltimaAperturaVitral() !== dia);
  useEffect(() => {
    guardarUltimaAperturaVitral(dia);
  }, [dia]);

  // Barra de estado clara sobre el vitral; al bajar, la del tema (oscura de día).
  const limiteVitral = medidasVitral.alto - insets.top;
  const [sobreVitral, setSobreVitral] = useState(true);
  const alDesplazar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const arriba = e.nativeEvent.contentOffset.y < limiteVitral;
    if (arriba !== sobreVitral) setSobreVitral(arriba);
  };

  const nombre = santoHoy ? santoHoy.santo[idioma][0] : null;
  const subtitulo = santoHoy ? santoHoy.santo[idioma][1] : null;
  const nombreHora = t(`hoy.horas.${hora}`);
  const nombreColor = t(`liturgia.colores.${color}`);

  return (
    <Fondo titilar={enfocada}>
      {enfocada && sobreVitral ? <StatusBar style="light" /> : null}
      <ScrollView
        onScroll={alDesplazar}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingBottom: espacioBarra }}>
        <View>
          <Vitral
            semilla={santoHoy ? santoHoy.clave : dia}
            inicial={santoHoy ? santoHoy.santo.ini : null}
            colorLiturgico={color}
            apertura={apertura}
            vida={enfocada}
          />
          <View style={[styles.configuracion, { top: insets.top + espaciado.sm }]}>
            <BotonRedondo
              icono="configuracion"
              etiqueta={t('acciones.abrirConfiguracion')}
              onPress={() => router.push('/configuracion')}
            />
          </View>
        </View>

        <Animated.View ref={refSanto} entering={entradaCalma(reducir)} style={styles.textoHero}>
          <View style={styles.chips}>
            <Chip
              texto={t('hoy.horaFecha', { hora: nombreHora, fecha: fechaCorta(hoy, idioma) })}
              etiquetaAccesible={t('hoy.horaFechaAccesible', {
                hora: nombreHora,
                fecha: fechaLarga(hoy, idioma),
              })}
            />
            <Chip texto={nombreColor} punto={hexLiturgico(color)} />
          </View>
          <Texto rol="etiqueta" tono="acento" style={styles.etiquetaSanto}>
            {t('hoy.santoDelDia')}
          </Texto>
          {santoHoy && nombre ? (
            <>
              <Texto rol="display" accessibilityRole="header" style={styles.centrado}>
                {nombre}
              </Texto>
              <Texto rol="displayItalica" tono="suave" style={styles.centrado}>
                {subtitulo}
              </Texto>
              {santoHoy.historia ? (
                <View style={styles.botonHistoria}>
                  <Boton
                    variante="luz"
                    texto={t('hoy.conocerHistoria')}
                    pista={t('hoy.conocerHistoriaPista', { nombre })}
                    // Las rutas tipadas no aceptan `/santo/${string}` genérico; la ruta existe (santo/[clave].tsx).
                    onPress={() => {
                      router.push(rutaHistoriaSanto(santoHoy.clave));
                      // La capa se mide en paralelo: la navegación no espera a la animación.
                      if (!reducir) medirEnVentana(refSanto, expandirTarjeta);
                    }}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <Texto rol="displayItalica" tono="suave" style={styles.centrado}>
              {t('hoy.sinSanto')}
            </Texto>
          )}
        </Animated.View>

        <View style={styles.pila}>
          {novenaHoy ? (
            <Animated.View entering={entradaCalma(reducir, 1)}>
              <TarjetaNovenaHoy
                novenaHoy={novenaHoy}
                activo={enfocada}
                onPress={() => router.push(rutaNovena(novenaHoy.novena.id))}
              />
            </Animated.View>
          ) : null}
          {evangelio ? (
            <Animated.View entering={entradaCalma(reducir, 2)}>
              <TarjetaEvangelio
                referencia={evangelio.ref[indicePar]}
                texto={evangelio.t[indicePar]}
                ejemplo={evangelio.revision !== 'aprobado'}
              />
            </Animated.View>
          ) : null}
          <Animated.View entering={entradaCalma(reducir, 3)}>
            <BotonLlamada
              texto={t('hoy.comoTeSientes')}
              pista={t('hoy.comoTeSientesPista')}
              activo={enfocada}
              onPress={() => router.navigate('/emociones')}
            />
          </Animated.View>
          <View style={styles.privacidad} accessible accessibilityLabel={t('hoy.privacidad')}>
            <PrivacidadIcono />
            <Texto rol="interfazSecundaria" tono="suave" style={styles.privacidadTexto}>
              {t('hoy.privacidad')}
            </Texto>
          </View>
        </View>
      </ScrollView>
    </Fondo>
  );
}

function PrivacidadIcono() {
  const { colores } = useTema();
  return <Icono nombre="candado" color={colores.textoSuave} tamano={ICONO_CANDADO} />;
}

const styles = StyleSheet.create({
  configuracion: { position: 'absolute', left: espaciado.lg },
  textoHero: {
    paddingTop: 0,
    paddingHorizontal: espaciado.xl + 2,
    paddingBottom: espaciado.xs + 2,
    alignItems: 'center',
    gap: espaciado.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espaciado.sm - 2,
    marginTop: -CHIPS_SOBRE_VITRAL,
  },
  etiquetaSanto: { marginTop: espaciado.sm, textAlign: 'center' },
  centrado: { textAlign: 'center' },
  botonHistoria: { marginTop: espaciado.xs + 2 },
  pila: {
    paddingTop: espaciado.md + 2,
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.sm,
    gap: espaciado.md,
  },
  privacidad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm - 1,
    paddingTop: espaciado.xs,
    paddingBottom: espaciado.xxs,
  },
  privacidadTexto: { fontSize: 12, lineHeight: 17, flexShrink: 1, textAlign: 'center' },
});
