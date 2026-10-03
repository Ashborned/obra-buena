import { Pantalla } from '@/components/pantalla';
import { useTranslation } from '@/i18n';

export default function PantallaHoy() {
  const { t } = useTranslation();
  return <Pantalla titulo={t('pestanas.hoy')} />;
}
