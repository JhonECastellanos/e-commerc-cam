import { useEffect, useState } from 'react';
import { api } from '../../api/client';
export default function Privacy() {
  const [policy, setPolicy] = useState<any>();
  useEffect(() => {
    api
      .getAdvisoryPrivacy()
      .then(setPolicy)
      .catch(() => {});
  }, []);
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-gray-700">
      <h1 className="text-3xl font-bold mb-6">
        Tratamiento de datos para asesoría
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Versión asesoria-2026-10-v1 · 12 de octubre de 2026
      </p>
      <div className="space-y-6 leading-relaxed">
        <p>Agenda y asistencia comercial: guardamos el nombre, contacto, horario y conversación necesarios para atender tu solicitud. Si el negocio activa un proveedor de IA, este puede recibir tus mensajes y el catálogo público para responder; evita compartir contraseñas, documentos o datos sensibles en el chat. Puedes pedir atención humana escribiendo ASESOR y detener respuestas automáticas por WhatsApp escribiendo BAJA. Las reservas se confirman después de comprobar la disponibilidad.</p>
        <p>
          Recopilamos tu nombre, medio de contacto, localidad general y las
          respuestas necesarias para estudiar tu instalación. Si lo decides,
          también asociamos la configuración de dispositivos virtuales de tu
          inmueble.
        </p>
        <p>
          Usamos esta información para clasificar la solicitud, coordinar la
          asesoría y preparar una propuesta. La recomendación inicial requiere
          revisión humana. El consentimiento de asesoría no autoriza publicidad
          ni control de equipos físicos.
        </p>
        <p>
          Los datos están disponibles para administradores autorizados. Puedes
          solicitar consulta, corrección, revocación del consentimiento o
          eliminación cuando proceda, indicando tu referencia de solicitud y
          contactando al responsable.
        </p>
        <p>
          Responsable: <strong>{policy?.responsible || 'InstalaCámara'}</strong>
          . Canal de atención:{' '}
          <strong>
            {policy?.contact ||
              'Solicita el canal del responsable al asesor antes de compartir datos personales.'}
          </strong>
          .{' '}
          {policy?.retention && (
            <>
              Conservación de solicitudes: {policy.retention} días, salvo
              obligaciones contractuales o legales.
            </>
          )}
        </p>
        <p>
          El diseño del laboratorio se guarda en tu navegador al pulsar Guardar.
          Puedes exportarlo y borrarlo desde los datos del navegador. El chat
          local no envía órdenes a terceros. Si activas Gemini, autorizas enviar
          la orden escrita y los tipos, identificadores y habitaciones virtuales
          a Google para interpretarla; no incluye los datos del formulario.
        </p>
        <p>
          Referencia sobre derechos y finalidades:{' '}
          <a
            className="text-primary-600 underline"
            href="https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/diferencia-entre-politica-de-tratamiento-de-datos-y-manuales-internos-de-tratamiento-de-datos"
            target="_blank"
            rel="noopener noreferrer"
          >
            Superintendencia de Industria y Comercio
          </a>
          .
        </p>
      </div>
    </main>
  );
}
