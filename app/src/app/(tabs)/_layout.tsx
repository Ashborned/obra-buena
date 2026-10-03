import { Tabs } from 'expo-router/js-tabs';

import { BarraPestanas } from '@/components/barra-pestanas';
import { Icono, type NombreIcono } from '@/components/icono';
import { useTranslation, type ClaveTexto } from '@/i18n';
import { duraciones, useTema } from '@/theme';

const pestanas: { ruta: string; icono: NombreIcono; titulo: ClaveTexto }[] = [
  { ruta: 'index', icono: 'hoy', titulo: 'pestanas.hoy' },
  { ruta: 'emociones', icono: 'emociones', titulo: 'pestanas.emociones' },
  { ruta: 'novenas', icono: 'novenas', titulo: 'pestanas.novenas' },
  { ruta: 'aprender', icono: 'aprender', titulo: 'pestanas.aprender' },
];

export default function LayoutPestanas() {
  const { cielo } = useTema();
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <BarraPestanas {...props} />}
      screenOptions={{
        headerShown: false,
        // Cambio de pestaña: fundido cruzado de 200 ms (guía de movimiento, nivel 3).
        // Es un fundido, así que se mantiene igual con "Reducir movimiento".
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: duraciones.cambioPestana } },
        sceneStyle: { backgroundColor: cielo.fondo },
      }}>
      {pestanas.map(({ ruta, icono, titulo }) => (
        <Tabs.Screen
          key={ruta}
          name={ruta}
          options={{
            title: t(titulo),
            tabBarIcon: ({ color, size }) => <Icono nombre={icono} color={color} tamano={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
