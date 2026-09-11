import { useTranslation } from 'react-i18next';

export default function FAQ() {
  const { t } = useTranslation();

  const faqs = [
    { q: t('home.faq_1_q'), a: t('home.faq_1_a') },
    { q: t('home.faq_2_q'), a: t('home.faq_2_a') },
    { q: t('home.faq_3_q'), a: t('home.faq_3_a') },
    { q: t('home.faq_4_q'), a: t('home.faq_4_a') },
    {
      q: '¿Puedo cambiar mi combo después de haber pagado el anticipo?',
      a: 'Sí, puedes cambiar a un combo de igual o mayor valor. Si el nuevo combo es más costoso, se ajusta el saldo pendiente. Si es más económico, la diferencia se descuenta del saldo.',
    },
    {
      q: '¿Qué métodos de pago aceptan para el anticipo?',
      a: 'Aceptamos pagos con tarjeta de crédito, débito y PSE a través de Wompi, una plataforma de pagos colombiana autorizada por la Superintendencia Financiera.',
    },
    {
      q: '¿Cuánto tiempo dura la instalación?',
      a: 'Una instalación típica de 4 a 6 cámaras toma entre 2 y 4 horas. Los sistemas más grandes (8 cámaras) pueden tomar hasta 6 horas. Nuestro técnico te confirmará el tiempo estimado al agendar.',
    },
    {
      q: '¿Ofrecen soporte después de la instalación?',
      a: 'Sí, incluye soporte remoto para configuraciones y solución de problemas. Si se requiere una visita técnica, aplica la garantía de mano de obra según los términos acordados.',
    },
    {
      q: '¿Qué pasa si vivo en un municipio que no está en la lista?',
      a: 'Escríbenos por WhatsApp y lo evaluamos. En algunos casos podemos hacer instalaciones fuera de la Sabana con un costo adicional de desplazamiento.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('home.faq_title')}</h1>

      <div className="space-y-4 mb-8">
        {faqs.map((faq, i) => (
          <details key={i} className="card group">
            <summary className="font-medium text-gray-900 cursor-pointer list-none flex items-center justify-between">
              <span>{faq.q}</span>
              <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p className="mt-4 text-gray-600 border-t border-gray-100 pt-4">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <div className="card bg-primary-50 border-primary-100 text-center">
        <h3 className="font-bold text-gray-900 mb-2">¿No encuentras lo que buscas?</h3>
        <p className="text-gray-600 mb-4">Escríbenos directo por WhatsApp y te responderemos en minutos.</p>
        <a
          href={`https://wa.me/[COMPLETAR]`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block"
        >
          {t('home.faq_more')}
        </a>
      </div>
    </div>
  );
}
