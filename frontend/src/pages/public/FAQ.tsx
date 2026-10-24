import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WhatsappCTA from '../../components/public/WhatsappCTA';
import '../../commerce.css';
export default function FAQ() {
  const { t } = useTranslation();
  const faqs = [1, 2, 3, 4].map((n) => ({
    q: t(`home.faq_${n}_q`),
    a: t(`home.faq_${n}_a`),
  }));
  faqs.push(
    {
      q: '¿Cuándo conviene una solución personalizada?',
      a: 'Cuando necesitas integrar equipos existentes, automatizar espacios o dimensionar varias áreas e inmuebles. El asesor revisa tu necesidad y puede recomendar un combo si resulta suficiente.',
    },
    {
      q: '¿El laboratorio 3D controla dispositivos reales?',
      a: 'Las pruebas modifican únicamente dispositivos virtuales. Puedes compartir la configuración de la demo como referencia para tu asesoría; la instalación física necesita revisión de compatibilidad y puesta en marcha.',
    },
    {
      q: '¿Cómo se cobra la instalación de servidores y el soporte?',
      a: 'Los equipos, la instalación y el soporte se presupuestan por separado. La administración puede ser mensual o anual. Las nuevas funcionalidades y los trabajos fuera del alcance acordado se cotizan aparte.',
    },
  );
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Preguntas frecuentes</h1>
      <div className="space-y-4">
        {faqs.map((f) => (
          <details className="card" key={f.q}>
            <summary className="font-semibold cursor-pointer">{f.q}</summary>
            <p className="text-gray-600 mt-4 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
      <Link to="/asesoria" className="btn-primary inline-block mt-8">
        Solicitar asesoría personalizada
      </Link>
      <div className="mt-4"><WhatsappCTA message="Hola, tengo una consulta sobre cámaras e instalación."/></div>
    </main>
  );
}
