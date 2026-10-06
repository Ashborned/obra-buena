/**
 * Configuración → Idioma y país. Los dos salen del teléfono (idioma del sistema y región, sin pedir
 * ubicación) y se pueden cambiar aquí. El país decide las líneas de ayuda y las fiestas trasladadas.
 */
import { SeccionConfig } from '@/components/config/seccion';
import { SeccionPais } from '@/components/seccion-pais';
import { SelectorIdioma } from '@/components/selector-idioma';
import { Texto } from '@/components/texto';
import { useTranslation } from '@/i18n';

export function SeccionIdiomaPais({ orden }: { orden?: number }) {
  const { t } = useTranslation();
  return (
    <SeccionConfig titulo={t('configuracion.secciones.idiomaPais')} orden={orden}>
      <Texto rol="interfazSecundaria" tono="suave">
        {t('configuracion.idiomaPaisExplicacion')}
      </Texto>
      <SelectorIdioma />
      <SeccionPais />
    </SeccionConfig>
  );
}
