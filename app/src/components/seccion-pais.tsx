/**
 * Sección País de Configuración: muestra el país actual y abre el selector (`/pais`).
 * Mismo aspecto que las opciones de radio (vidrio, radio de tarjeta, ≥ 44 pt).
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';
import { useNombrePais, usePais } from '@/lib/pais';
import { espaciado, medidas, radios, useTema } from '@/theme';

export function SeccionPais() {
  const { t } = useTranslation();
  const { superficies } = useTema();
  const { pais } = usePais();
  const nombre = useNombrePais();
  const tituloSeccion = t('configuracion.pais');
  const textoPais = pais ? nombre(pais) : t('pais.sinElegir');

  return (
    <View style={styles.seccion}>
      <Texto rol="etiqueta" tono="suave" accessibilityRole="header">
        {tituloSeccion}
      </Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('configuracion.paisActual', { pais: textoPais })}
        accessibilityHint={t('configuracion.cambiarPais')}
        onPress={() => router.push('/pais')}
        style={({ pressed }) => [
          styles.fila,
          { backgroundColor: superficies.vidrio, borderColor: superficies.vidrioBorde },
          pressed && styles.presionada,
        ]}>
        <Texto rol="titulo" style={styles.nombre}>
          {textoPais}
        </Texto>
        <Texto rol="boton" tono="acento">
          {t('acciones.cambiar')}
        </Texto>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: espaciado.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: espaciado.md,
    minHeight: medidas.toqueMinimo + espaciado.md,
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.tarjeta,
    // Mismo grosor que el borde de las opciones de radio, para que las secciones alineen.
    borderWidth: 2,
    borderCurve: 'continuous',
  },
  presionada: { opacity: 0.7 },
  nombre: { flex: 1 },
});
