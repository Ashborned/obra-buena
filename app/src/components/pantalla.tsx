/**
 * Marco común de una pantalla de pestaña: cielo de la hora, área segura, título y acceso a
 * Configuración (botón de engranaje arriba a la derecha).
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useEspacioBarra } from '@/components/barra-pestanas';
import { BotonRedondo } from '@/components/boton-redondo';
import { Encabezado } from '@/components/encabezado';
import { Fondo } from '@/components/fondo';
import { useTranslation } from '@/i18n';
import { espaciado } from '@/theme';

export function Pantalla({ titulo, children }: { titulo: string; children?: ReactNode }) {
  const espacioBarra = useEspacioBarra();
  const { t } = useTranslation();

  return (
    <Fondo>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.relleno}>
        <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: espacioBarra }]}>
          <Encabezado
            titulo={titulo}
            accion={
              <BotonRedondo
                icono="configuracion"
                etiqueta={t('acciones.abrirConfiguracion')}
                onPress={() => router.push('/configuracion')}
              />
            }
          />
          {children}
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
    gap: espaciado.lg,
  },
});
