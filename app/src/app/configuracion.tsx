/**
 * Configuración (modal sobre las pestañas), por secciones en tarjetas de vidrio: Apariencia, Idioma y
 * país, Recordatorios, Privacidad, Apoyar la app y Acerca de. Cada cambio se aplica al instante y
 * queda guardado en el teléfono.
 *
 * Calma: las secciones entran con la entrada de calma (nivel 3) y nada más se mueve.
 */
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonRedondo } from '@/components/boton-redondo';
import { SeccionAcercaDe } from '@/components/config/acerca-de';
import { SeccionApariencia } from '@/components/config/apariencia';
import { SeccionApoyo } from '@/components/config/apoyo';
import { SeccionIdiomaPais } from '@/components/config/idioma-pais';
import { SeccionPrivacidad } from '@/components/config/privacidad';
import { SeccionRecordatorios } from '@/components/config/recordatorios';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
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
          <SeccionApariencia orden={0} />
          <SeccionIdiomaPais orden={1} />
          <SeccionRecordatorios orden={2} />
          <SeccionPrivacidad orden={3} />
          <SeccionApoyo orden={4} />
          <SeccionAcercaDe orden={5} />
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
