import { Pantalla } from '@/components/pantalla';
import { useTranslation } from '@/i18n';

export default function PantallaNovenas() {
  const { t } = useTranslation();
  return <Pantalla titulo={t('pestanas.novenas')} />;
}
