import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('terms.title')}</h1>

      <div className="card prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-bold text-gray-900">Cobertura geográfica</h2>
          <p className="text-gray-600">
            El servicio de instalación se presta exclusivamente en Bogotá D.C. y los municipios de la Sabana de Bogotá 
            que estén listados como activos en el sistema de cobertura del prestador.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Anticipo y reserva</h2>
          <p className="text-gray-600">
            El anticipo del 50% del valor total aparta la fecha de instalación y congela el precio cotizado. 
            El saldo del 50% restante se paga contraentrega el día de la instalación, salvo que el prestador 
            indique otra condición.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Política de cancelación</h2>
          <p className="text-gray-600">
            [DEFINIR — ej: reembolsable si se cancela con X días de anticipación]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Plazo de instalación</h2>
          <p className="text-gray-600">
            [DEFINIR — Plazo estimado de instalación tras confirmar el anticipo]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Garantía</h2>
          <p className="text-gray-600">
            La garantía de los equipos corresponde a la póliza del fabricante. La garantía de la mano de obra 
            es de [DEFINIR] meses a partir de la fecha de instalación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Tratamiento de datos personales</h2>
          <p className="text-gray-600">
            De conformidad con la Ley 1581 de 2012 (Habeas Data), los datos personales suministrados por el 
            cliente serán utilizados exclusivamente para la prestación del servicio de instalación, facturación, 
            y envío de información relacionada. El cliente puede ejercer sus derechos de acceso, actualización, 
            rectificación y supresión contactando al prestador.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900">Legislación aplicable</h2>
          <p className="text-gray-600">
            Este acuerdo se rige por las leyes de la República de Colombia, incluyendo el Estatuto del Consumidor 
            (Ley 1480 de 2011).
          </p>
        </section>

        <div className="border-t pt-6 text-sm text-gray-500">
          <p>
            Este documento es una plantilla de partida. Antes de operar con clientes reales, 
            debe ser revisado por un abogado. Todo lo marcado como <code>[DEFINIR]</code> debe 
            ser completado por el dueño del negocio.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link to="/catalogo" className="btn-primary">
          {t('terms.back')}
        </Link>
      </div>
    </div>
  );
}
