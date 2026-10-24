import AdvisoryWizard from '../../components/public/AdvisoryWizard';
export default function Advisory() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <p className="text-gray-600 mb-6">Cotiza software optimizado para tu vivienda, asesoría e instalación opcional de servidor local. Para constructoras e inversionistas: integración directa en proyectos de vivienda, infraestructura compartida y datos separados por vivienda, con cotización por proyecto.</p>
      <AdvisoryWizard />
    </main>
  );
}
