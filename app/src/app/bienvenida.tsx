/**
 * Bienvenida de primera apertura (docs/decisiones.md, 2026-10-02: sin permiso de ubicación).
 *
 * Una cosa por pantalla: confirmar con un toque el idioma y el país que informa el teléfono.
 * Cada uno se puede cambiar (abre su selector). Si el teléfono no informa región, el botón
 * principal lleva a elegir el país, o se puede seguir con "Prefiero no decirlo" (país null → la
 * ayuda usa Find A Helpline).
 *
 * La muestra el layout raíz mientras `leerBienvenidaCompleta()` sea false. Al confirmar se guardan
 * idioma, país y la bienvenida, y el layout pasa a las pestañas (Hoy).
 *
 * Movimiento: solo un fundido de entrada (nivel 3, calma). Con "Reducir movimiento", aparece sin animar.
 */
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/boton';
import { Fondo } from '@/components/fondo';
import { nombreIdioma } from '@/components/selector-idioma';
import { Texto } from '@/components/texto';
import { cambiarIdioma, idiomaDelSistema, useIdioma, useTranslation } from '@/i18n';
import { useBienvenida } from '@/lib/bienvenida';
import { useNombrePais, usePais } from '@/lib/pais';
import { paisDelSistema } from '@/lib/region';
import { espaciado, radios, useTema } from '@/theme';
import { movimiento } from '@/theme/movimiento';

export default function PantallaBienvenida() {
  const { t } = useTranslation();
  const { superficies } = useTema();
  const { pais, setPais } = usePais();
  const { completar } = useBienvenida();
  const nombrePais = useNombrePais();

  const idioma = useIdioma();
  const sistema = useMemo(() => ({ idioma: idiomaDelSistema(), pais: paisDelSistema() }), []);
  const delTelefono = idioma === sistema.idioma && pais !== null && pais === sistema.pais;

  const textoIdioma = nombreIdioma(idioma);
  const textoPais = pais ? nombrePais(pais) : t('pais.sinElegir');

  const entrar = (paisElegido: string | null) => {
    void cambiarIdioma(idioma);
    setPais(paisElegido);
    completar();
  };

  return (
    <Fondo>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.relleno}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <Animated.View entering={FadeIn.duration(movimiento.fundido)} style={styles.bloque}>
            <View style={styles.saludo}>
              <Texto rol="etiqueta" tono="acento">
                {t('app.nombre')}
              </Texto>
              <Texto rol="displayGrande" accessibilityRole="header">
                {t('bienvenida.titulo')}
              </Texto>
              <Texto rol="interfaz" tono="suave">
                {t('bienvenida.texto')}
              </Texto>
            </View>

            <View
              style={[
                styles.tarjeta,
                { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
              ]}>
              <View
                accessible
                accessibilityLabel={t('bienvenida.resumenAccesible', {
                  idioma: textoIdioma,
                  pais: textoPais,
                })}>
                <Texto rol="etiqueta" tono="suave">
                  {delTelefono ? t('bienvenida.detectado') : t('bienvenida.elegido')}
                </Texto>
                <Texto rol="display">
                  {t('bienvenida.resumen', { idioma: textoIdioma, pais: textoPais })}
                </Texto>
              </View>
              <View style={styles.cambios}>
                <Boton
                  variante="contorno"
                  texto={t('bienvenida.cambiarIdioma')}
                  onPress={() => router.push('/idioma')} />
                <Boton
                  variante="contorno"
                  texto={t('bienvenida.cambiarPais')}
                  onPress={() => router.push('/pais')} />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(movimiento.fundido)} style={styles.acciones}>
            {pais ? (
              <Boton
                variante="luz"
                texto={t('bienvenida.confirmar')}
                pista={t('bienvenida.confirmarPista')}
                onPress={() => entrar(pais)}
              />
            ) : (
              <>
                <Boton
                  variante="luz"
                  texto={t('bienvenida.elegirPais')}
                  onPress={() => router.push('/pais')}
                />
                <Boton texto={t('bienvenida.prefieroNoDecirlo')} onPress={() => entrar(null)} />
              </>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Fondo>
  );
}

const styles = StyleSheet.create({
  relleno: { flex: 1 },
  contenido: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: espaciado.xxxl,
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.xxxl,
    paddingBottom: espaciado.xxl,
  },
  bloque: { gap: espaciado.xxl },
  saludo: { gap: espaciado.sm },
  tarjeta: {
    gap: espaciado.lg,
    padding: espaciado.xl,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  cambios: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  acciones: { gap: espaciado.sm },
});
