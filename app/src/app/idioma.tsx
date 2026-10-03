/**
 * Selector de idioma en pantalla propia (se abre desde la bienvenida). En Configuración el mismo
 * selector va dentro de la lista. Elegir aplica el idioma al instante, lo guarda y vuelve.
 */
import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonRedondo } from '@/components/boton-redondo';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { SelectorIdioma } from '@/components/selector-idioma';
import { useTranslation } from '@/i18n';
import { espaciado } from '@/theme';

export default function PantallaIdioma() {
  const { t } = useTranslation();
  return (
    <Fondo>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.relleno}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <Encabezado
            titulo={t('pantallas.idioma')}
            accion={
              <BotonRedondo icono="cerrar" etiqueta={t('acciones.cerrar')} onPress={() => router.back()} />
            }
          />
          <SelectorIdioma conTitulo={false} alElegir={() => router.back()} />
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
