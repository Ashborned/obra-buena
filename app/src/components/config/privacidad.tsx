/**
 * Configuración → Privacidad: qué hace (y qué no hace) la app con los datos, y "Borrar mis datos".
 *
 * Borrar pide confirmación en una hoja propia (no el Alert del sistema), que explica qué se borra y que
 * no se puede deshacer. Al confirmar se llama `borrarMisDatos()` y después `reiniciar()`: la app vuelve
 * a montarse y aparece la bienvenida. Si algo falla, se avisa con calma y no se reinicia.
 */
import { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  findNodeHandle,
} from 'react-native';

import { BloqueConfig, SeccionConfig } from '@/components/config/seccion';
import { Texto } from '@/components/texto';
import { useTranslation, type ClaveTexto } from '@/i18n';
import { borrarMisDatos } from '@/lib/borrar-datos';
import { useReiniciar } from '@/lib/reinicio';
import { conAlfa, espaciado, medidas, radios, useTema } from '@/theme';

const PUNTOS: ClaveTexto[] = [
  'configuracion.privacidad.sinCuenta',
  'configuracion.privacidad.sinAnuncios',
  'configuracion.privacidad.sinUbicacion',
  'configuracion.privacidad.enTuTelefono',
];

const SE_BORRA: ClaveTexto[] = [
  'configuracion.borrado.velas',
  'configuracion.borrado.aprender',
  'configuracion.borrado.recordatorios',
  'configuracion.borrado.preferencias',
];

/** Viñeta de las listas (un punto, no un carácter en el texto). */
const VINETA = 6;

export function SeccionPrivacidad({ orden }: { orden?: number }) {
  const { t } = useTranslation();
  const [confirmando, setConfirmando] = useState(false);
  return (
    <SeccionConfig titulo={t('configuracion.secciones.privacidad')} orden={orden}>
      <Lista claves={PUNTOS} />
      <BloqueConfig>
        <BotonPeligro
          texto={t('configuracion.privacidad.borrar')}
          pista={t('configuracion.privacidad.borrarPista')}
          onPress={() => setConfirmando(true)}
        />
      </BloqueConfig>
      {confirmando ? <ConfirmarBorrado onCerrar={() => setConfirmando(false)} /> : null}
    </SeccionConfig>
  );
}

function Lista({ claves }: { claves: ClaveTexto[] }) {
  const { t } = useTranslation();
  const { colores } = useTema();
  return (
    <View style={styles.lista}>
      {claves.map((c) => (
        <View key={c} style={styles.punto}>
          <View style={[styles.vineta, { backgroundColor: colores.acento }]} />
          <Texto style={styles.crece}>{t(c)}</Texto>
        </View>
      ))}
    </View>
  );
}

/** Botón de peligro sobrio: contorno y texto en el rojo del tema (`lleno` para confirmar). */
function BotonPeligro({
  texto,
  onPress,
  pista,
  lleno = false,
  deshabilitado = false,
}: {
  texto: string;
  onPress: () => void;
  pista?: string;
  lleno?: boolean;
  deshabilitado?: boolean;
}) {
  const { colores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityHint={pista}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        styles.boton,
        lleno
          ? { backgroundColor: colores.peligroFondo }
          : { borderWidth: 1.5, borderColor: conAlfa(colores.peligro, 0.6) },
        (pressed || deshabilitado) && styles.presionado,
      ]}>
      <Texto rol="boton" style={[styles.textoBoton, { color: lleno ? colores.sobrePeligro : colores.peligro }]}>
        {texto}
      </Texto>
    </Pressable>
  );
}

/**
 * Hoja de confirmación: modal propio, con velo. `accessibilityViewIsModal` deja al lector solo dentro
 * de la hoja; el botón atrás de Android la cierra (salvo mientras se borra). Entra con un fundido.
 */
function ConfirmarBorrado({ onCerrar }: { onCerrar: () => void }) {
  const { t } = useTranslation();
  const { colores, superficies } = useTema();
  const reiniciar = useReiniciar();
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState(false);
  const titulo = useRef<View>(null);

  // Al mostrarse la hoja, el lector empieza por su título.
  const enfocarTitulo = () => {
    const nodo = titulo.current ? findNodeHandle(titulo.current) : null;
    if (nodo) AccessibilityInfo.setAccessibilityFocus(nodo);
  };

  const borrar = async () => {
    setBorrando(true);
    setError(false);
    try {
      await borrarMisDatos();
    } catch {
      setBorrando(false);
      setError(true);
      return;
    }
    // Todo se vuelve a montar desde cero: esta hoja desaparece y aparece la bienvenida.
    reiniciar();
  };

  const cerrar = () => {
    if (!borrando) onCerrar();
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onShow={enfocarTitulo}
      onRequestClose={cerrar}>
      <View style={[styles.velo, { backgroundColor: superficies.velo }]}>
        <View
          accessibilityViewIsModal
          style={[
            styles.hoja,
            {
              backgroundColor: superficies.hoja,
              borderColor: superficies.vidrioBorde,
              boxShadow: `0 16px 40px ${superficies.sombra}`,
            },
          ]}>
          <ScrollView contentContainerStyle={styles.contenidoHoja}>
            <View ref={titulo} accessible accessibilityRole="header">
              <Texto rol="titulo">{t('configuracion.borrado.titulo')}</Texto>
            </View>
            <Texto>{t('configuracion.borrado.intro')}</Texto>
            <Lista claves={SE_BORRA} />
            <Texto tono="suave">{t('configuracion.borrado.advertencia')}</Texto>
            {error ? (
              <Texto accessibilityLiveRegion="polite" style={{ color: colores.peligro }}>
                {t('configuracion.borrado.error')}
              </Texto>
            ) : null}
            <View style={styles.acciones}>
              <BotonPeligro
                lleno
                texto={borrando ? t('configuracion.borrado.borrando') : t('configuracion.borrado.confirmar')}
                deshabilitado={borrando}
                onPress={borrar}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('configuracion.borrado.cancelar')}
                accessibilityState={{ disabled: borrando }}
                disabled={borrando}
                onPress={cerrar}
                style={({ pressed }) => [
                  styles.boton,
                  { borderWidth: 1, borderColor: colores.linea },
                  (pressed || borrando) && styles.presionado,
                ]}>
                <Texto rol="boton" tono="acento" style={styles.textoBoton}>
                  {t('configuracion.borrado.cancelar')}
                </Texto>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  lista: { gap: espaciado.sm },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.sm },
  // Centrada con la primera línea del cuerpo (15 / 1.45).
  vineta: { width: VINETA, height: VINETA, borderRadius: radios.pildora, marginTop: espaciado.sm },
  crece: { flex: 1 },
  boton: {
    alignSelf: 'flex-start',
    minHeight: medidas.toqueMinimo + espaciado.xs,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.xl,
    borderRadius: radios.pildora,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.7 },
  textoBoton: { textAlign: 'center' },
  velo: { flex: 1, justifyContent: 'center', padding: espaciado.xl },
  hoja: {
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: radios.tarjeta,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  contenidoHoja: { padding: espaciado.xl, gap: espaciado.md },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm, marginTop: espaciado.xs },
});
