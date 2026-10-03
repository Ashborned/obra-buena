/**
 * Configuración (modal sobre las pestañas). Por ahora: paleta.
 * Faltan hora de oración (`setPreferenciaHora` ya existe y se guarda), idioma, país,
 * tamaño de letra y notificaciones.
 */
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonRedondo } from '@/components/boton-redondo';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { SelectorPaleta } from '@/components/selector-paleta';
import { useTranslation } from '@/i18n';
import { espaciado } from '@/theme';

export default function PantallaConfiguracion() {
  const { t } = useTranslation();
  return (
    <Fondo>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.relleno}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <Encabezado
            titulo={t('pantallas.configuracion')}
            accion={
              <BotonRedondo
                icono="cerrar"
                etiqueta={t('acciones.cerrar')}
                onPress={() => router.back()}
              />
            }
          />
          <SelectorPaleta />
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
    gap: espaciado.xxl,
  },
});
