import { Link } from 'react-router-dom';

const offers = [
  {
    number: '01',
    title: 'Seguridad según tu espacio',
    text: 'Ubicación de cámaras, grabación, accesos y notificaciones. Aprovechamos equipos compatibles y proponemos mejoras justificadas.',
    detail: 'Combos existentes o instalación personalizada.',
    to: '/asesoria',
  },
  {
    number: '02',
    title: 'Automatización que te ayuda',
    text: 'Control de iluminación y equipos desde tomas existentes, o un proyecto eléctrico integrado cuando el inmueble lo permita.',
    detail: 'Escenas y reglas adaptadas a tu rutina.',
    to: '/simulador/casa',
  },
  {
    number: '03',
    title: 'IA local o gestión en la nube',
    text: 'Servidor propio, equipos que puedes adquirir con nosotros y administración en la nube. La instalación y puesta en marcha se cotizan por separado.',
    detail: 'Infraestructura dimensionada para tus objetivos.',
    to: '/servicios',
  },
  {
    number: '04',
    title: 'Edificios con viviendas independientes',
    text: 'Diseñamos infraestructura compartida para varios pisos y apartamentos, con permisos, redes y datos separados para cada propietario.',
    detail: 'Soporte mensual o anual; funciones adicionales aparte.',
    to: '/servicios',
  },
];
export default function SmartServices() {
  return (
    <section className="py-16 bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex justify-between gap-8 items-end mb-10">
          <div className="max-w-2xl">
            <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-3">
              Soluciones personalizadas
            </p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Tu seguridad puede crecer contigo.
            </h2>
            <p className="text-primary-100 mt-4">
              Empieza por los accesos que necesitas vigilar. Añade
              automatización o infraestructura avanzada cuando tu proyecto lo
              justifique.
            </p>
          </div>
          <Link
            to="/asesoria"
            className="inline-block bg-white text-primary-800 font-semibold px-5 py-3 rounded-lg mt-5 md:mt-0 shrink-0"
          >
            Solicitar asesoría →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {offers.map((o) => (
            <Link
              to={o.to}
              key={o.number}
              className="block p-6 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-emerald-200 text-sm">{o.number}</span>
              <h3 className="text-xl font-semibold mt-4 mb-3">{o.title}</h3>
              <p className="text-primary-100 text-sm leading-relaxed">
                {o.text}
              </p>
              <p className="text-emerald-200 text-xs mt-5 leading-relaxed">
                {o.detail}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex gap-5 flex-wrap text-sm">
          <Link to="/simulador/casa" className="underline underline-offset-4">
            Configurar mi casa en 3D
          </Link>
          <Link
            to="/simulador/apartamento"
            className="underline underline-offset-4"
          >
            Configurar mi apartamento en 3D
          </Link>
          <Link to="/catalogo" className="underline underline-offset-4">
            Explorar combos CCTV disponibles
          </Link>
        </div>
      </div>
    </section>
  );
}
