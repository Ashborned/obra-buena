/**
 * Selector de país (bienvenida y Configuración). Sin permiso de ubicación: se ofrece primero el
 * país que informa el teléfono, luego los países con líneas de ayuda (en producción, solo los
 * aprobados) y al final "Otro país o prefiero no decirlo" (país null → Find A Helpline).
 *
 * Nombres: `lib/paises.ts` (Hermes no trae Intl.DisplayNames; se usan los nombres del contenido y,
 * si no hay, el código ISO). La lista completa de países ISO está pendiente de una fuente fiable
 * (`TODOS_LOS_PAISES` vacío); cuando la haya, aparece la sección "Todos los países" y la búsqueda.
 *
 * Elegir aplica el país al instante, lo guarda y vuelve. Sin animaciones (calma).
 */
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonRedondo } from '@/components/boton-redondo';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { OpcionRadio } from '@/components/opcion-radio';
import { Texto } from '@/components/texto';
import { contenido, paisesConAyuda, type CodigoPais } from '@/contenido';
import { useIdioma, useTranslation, type ClaveTexto } from '@/i18n';
import { useNombrePais, usePais } from '@/lib/pais';
import { filtrarPaises, seccionesPaises, type IdSeccionPaises } from '@/lib/paises';
import { paisDelSistema } from '@/lib/region';
import { espaciado, medidas, radios, tipografia, useTema } from '@/theme';

/** Todos los códigos ISO 3166-1 alfa-2. Vacío hasta tener una fuente fiable (ver informe). */
const TODOS_LOS_PAISES: CodigoPais[] = [];

/** Dominio del respaldo (findahelpline.com), tomado del contenido. */
const SITIO_RESPALDO = contenido.ayuda.respaldo.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Desde cuántos países se muestra la búsqueda por texto. */
const UMBRAL_BUSQUEDA = 15;

const TITULOS: Record<IdSeccionPaises, ClaveTexto> = {
  actual: 'pais.seccionActual',
  telefono: 'pais.seccionTelefono',
  ayuda: 'pais.seccionAyuda',
  todos: 'pais.seccionTodos',
};

export default function PantallaPais() {
  const { t } = useTranslation();
  const { colores, superficies } = useTema();
  const { pais, setPais } = usePais();
  const nombre = useNombrePais();
  const idioma = useIdioma();
  const [consulta, setConsulta] = useState('');

  const secciones = useMemo(
    () =>
      seccionesPaises({
        actual: pais,
        sistema: paisDelSistema(),
        conAyuda: paisesConAyuda(contenido.ayuda),
        todos: TODOS_LOS_PAISES,
        nombre,
        idioma,
      }),
    // `pais` no va en las dependencias a propósito: la lista no se reordena mientras se elige.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nombre, idioma],
  );

  const total = secciones.reduce((n, s) => n + s.codigos.length, 0);
  const conBusqueda = total >= UMBRAL_BUSQUEDA;
  const visibles = conBusqueda
    ? secciones
        .map((s) => ({ ...s, codigos: filtrarPaises(s.codigos, consulta, nombre) }))
        .filter((s) => s.codigos.length > 0)
    : secciones;

  const elegir = (codigo: CodigoPais | null) => {
    if (codigo !== pais) setPais(codigo);
    router.back();
  };

  return (
    <Fondo>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.relleno}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <Encabezado
            titulo={t('pantallas.pais')}
            accion={
              <BotonRedondo icono="cerrar" etiqueta={t('acciones.cerrar')} onPress={() => router.back()} />
            }
          />
          <Texto rol="interfaz" tono="suave">
            {t('pais.explicacion')}
          </Texto>

          {conBusqueda && (
            <TextInput
              value={consulta}
              onChangeText={setConsulta}
              placeholder={t('pais.buscar')}
              placeholderTextColor={colores.textoSuave}
              accessibilityLabel={t('pais.buscar')}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              style={[
                styles.busqueda,
                tipografia.interfaz,
                {
                  color: colores.texto,
                  backgroundColor: superficies.vidrio,
                  borderColor: superficies.vidrioBorde,
                },
              ]}
            />
          )}

          {visibles.map((seccion) => {
            const titulo = t(TITULOS[seccion.id]);
            return (
              <View key={seccion.id} style={styles.seccion}>
                <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
                  {titulo}
                </Texto>
                <View accessibilityRole="radiogroup" accessibilityLabel={titulo} style={styles.grupo}>
                  {seccion.codigos.map((codigo) => {
                    const n = nombre(codigo);
                    return (
                      <OpcionRadio
                        key={codigo}
                        etiqueta={n}
                        // Si no hay nombre, el código ya es la etiqueta; si lo hay, se muestra de apoyo.
                        detalle={n !== codigo ? codigo : undefined}
                        etiquetaAccesible={n}
                        seleccionada={codigo === pais}
                        onPress={() => elegir(codigo)}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}

          {conBusqueda && consulta.trim() !== '' && visibles.length === 0 && (
            <Texto rol="interfaz" tono="suave" accessibilityLiveRegion="polite">
              {t('pais.sinResultados')}
            </Texto>
          )}

          <View style={styles.seccion}>
            <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
              {t('pais.seccionOtro')}
            </Texto>
            <View accessibilityRole="radiogroup" accessibilityLabel={t('pais.seccionOtro')}>
              <OpcionRadio
                etiqueta={t('pais.otro')}
                detalle={t('pais.otroDetalle', { sitio: SITIO_RESPALDO })}
                seleccionada={pais === null}
                onPress={() => elegir(null)}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Fondo>
  );
}

const styles = StyleSheet.create({
  relleno: { flex: 1 },
  contenido: {
    paddingHorizontal: espaciado.xl,
    paddingTop: espaciado.lg,
    paddingBottom: espaciado.xxxl,
    gap: espaciado.xl,
  },
  seccion: { gap: espaciado.sm },
  grupo: { gap: espaciado.sm },
  busqueda: {
    minHeight: medidas.toqueMinimo,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
    borderRadius: radios.pildora,
    borderWidth: 1,
  },
});
