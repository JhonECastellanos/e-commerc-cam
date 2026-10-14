import { useState } from 'react';
import { Link } from 'react-router-dom';
import SmartServices from '../../components/public/SmartServices';
import AdvisoryWizard from '../../components/public/AdvisoryWizard';
import '../../commerce.css';
import {
  commercialSources,
  formatCOP,
  RESEARCH_DATE,
  serviceCostProposal,
  type ServiceCostInput,
} from '../../smart-home/commercial';
export default function SmartServicesPage() {
  const [input, setInput] = useState<ServiceCostInput>({
    infrastructure: 'local',
    units: 1,
    servers: 1,
    points: 0,
    integrated: false,
  });
  const proposal = serviceCostProposal(input);
  return (
    <main className="commerce-surface">
      <SmartServices />
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {[
            [
              'Servidor propio',
              'Compra del equipo, instalación y puesta en marcha por separado. Las reglas locales no necesitan un servicio externo para funcionar.',
            ],
            [
              'Gestión en la nube',
              'Administración y soporte del software; hosting, conectividad y consumos externos se definen en la propuesta.',
            ],
            [
              'Rack para proyectos de vivienda',
              'Cada vivienda requiere una cuenta del propietario y aislamiento de datos y redes. La atención de fallas respeta sus permisos.',
            ],
          ].map(([title, text]) => (
            <article className="card" key={title}>
              <h2 className="text-xl font-bold mb-3">{title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
            </article>
          ))}
        </div>
        <section className="grid md:grid-cols-2 gap-8 rounded-2xl border bg-gray-50 p-6 md:p-10">
          <div>
            <p className="uppercase tracking-widest text-xs font-semibold text-primary-600 mb-3">
              Planeación comercial
            </p>
            <h2 className="text-2xl font-bold mb-4">
              Estimación orientativa del servicio
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Valores sugeridos para estudiar el proyecto; el asesor confirma el
              alcance y la tarifa final. Los equipos se cotizan aparte. No se
              realiza ningún cobro.
            </p>
            <label className="label mb-4">
              Modalidad
              <select
                className="input-field mt-1 bg-white"
                value={input.infrastructure}
                onChange={(e) =>
                  setInput({
                    ...input,
                    infrastructure: e.target
                      .value as ServiceCostInput['infrastructure'],
                  })
                }
              >
                <option value="local">Servidor propio</option>
                <option value="cloud">Gestión en la nube</option>
                <option value="shared">Rack compartido</option>
              </select>
            </label>
            {input.infrastructure !== 'cloud' && (
              <label className="label mb-4">
                Servidores previstos
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  max="50"
                  value={input.servers}
                  onChange={(e) =>
                    setInput({ ...input, servers: Number(e.target.value) || 1 })
                  }
                />
              </label>
            )}
            {input.infrastructure === 'shared' && (
              <label className="label mb-4">
                Viviendas independientes
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  max="5000"
                  value={input.units}
                  onChange={(e) =>
                    setInput({ ...input, units: Number(e.target.value) || 1 })
                  }
                />
              </label>
            )}
            <label className="label mb-4">
              Puntos de instalación de equipos
              <input
                className="input-field"
                type="number"
                min="0"
                max="10000"
                value={input.points}
                onChange={(e) =>
                  setInput({ ...input, points: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className="flex gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={input.integrated}
                onChange={(e) =>
                  setInput({ ...input, integrated: e.target.checked })
                }
              />
              Estudiar instalación eléctrica integrada
            </label>
          </div>
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-bold text-lg mb-5">Propuesta preliminar</h3>
            <dl className="space-y-4 text-sm">
              {[
                [
                  'Instalación de servidor / puesta en marcha',
                  proposal.serverSetup,
                ],
                ['Configuración de viviendas y redes', proposal.tenantSetup],
                ['Instalación de dispositivos', proposal.deviceInstallation],
                ['Total de servicios iniciales', proposal.setupTotal],
                ['Administración y soporte mensual', proposal.monthly],
                ['Alternativa anual (12 mensualidades)', proposal.annual],
              ].map(([label, value]) => (
                <div className="flex justify-between gap-4" key={label}>
                  <dt className="text-gray-600">{label}</dt>
                  <dd className="font-semibold whitespace-nowrap">
                    {formatCOP(value as number)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-gray-500 leading-relaxed mt-6">
              Referencia de servicios antes de IVA cuando aplique. Excluye
              equipos, cableado y obra civil, desplazamientos, hosting, consumo
              de APIs, repuestos y nuevas funcionalidades. Soporte remoto y
              actualizaciones del alcance acordado; visitas y tiempos de
              respuesta se pactan por contrato.
            </p>
            <Link className="btn-primary block text-center mt-6" to="/asesoria">
              Ajustar mi propuesta con un asesor
            </Link>
          </div>
        </section>
        <section className="mt-14">
          <h2 className="text-2xl font-bold mb-5">
            Hardware para estudiar tu solución
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              [
                'Home Assistant Green',
                'Controlador dedicado para automatización doméstica. No sustituye un servidor de IA intensiva.',
                'https://www.home-assistant.io/green/',
              ],
              [
                'Beelink S12 · N100 · 16 GB · SSD 500 GB',
                'Referencia consultada: 1.504.000 COP. Candidato para automatización y servicios ligeros; su capacidad de voz/video necesita prueba.',
                commercialSources[3].url,
              ],
              [
                'Infraestructura central y GPU',
                'PowerEdge T150: referencia de 10.113.599 COP. Para IA, estudiar un nodo GPU compatible con 16 GB VRAM; no sumar una GPU a cualquier servidor sin verificar chasis, potencia y soporte.',
                commercialSources[4].url,
              ],
            ].map(([title, text, url]) => (
              <article className="card" key={title}>
                <h3 className="font-bold mb-3">{title}</h3>
                <p className="text-sm text-gray-600 mb-4">{text}</p>
                <a
                  className="text-primary-600 text-sm underline"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Consultar referencia
                </a>
              </article>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-5">
            Consulta: {RESEARCH_DATE}. Precios de terceros variables; no
            representan disponibilidad ni precios propios. UPS, respaldo,
            almacenamiento y redes requieren dimensionamiento por proyecto.
          </p>
        </section>
        <details className="mt-12 border rounded-xl p-6">
          <summary className="font-semibold cursor-pointer">
            Fuentes y criterio de la propuesta
          </summary>
          <p className="text-sm text-gray-600 my-4">
            Se tomó la instalación de servidor como base separada de los
            equipos. El soporte doméstico tiene un alcance remoto más acotado
            que los planes empresariales. En edificios se separan el coste
            central y el coste por vivienda. La anualidad conserva 12
            mensualidades, sin descuentos inventados. Los puntos de instalación
            adaptan la regla de Smarthome; las tarifas son propuestas para
            validar.
          </p>
          <ul className="space-y-3">
            {commercialSources.map((s) => (
              <li key={s.url}>
                <a
                  className="text-primary-600 underline text-sm"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.name}
                </a>
                <p className="text-xs text-gray-500 mt-1">{s.reference}</p>
              </li>
            ))}
          </ul>
        </details>
        <section className="mt-14 rounded-2xl bg-primary-50 p-8">
          <h2 className="font-bold text-xl mb-3">
            Un combo cuando basta. Una solución a medida cuando hace falta.
          </h2>
          <p className="text-gray-600 mb-6">
            Conservamos el catálogo existente. Si necesitas 12 cámaras o un
            alcance que no aparece entre los combos activos, el asesor
            configurará una propuesta sin inventar disponibilidad.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link className="btn-primary" to="/asesoria">
              Solicitar cotización
            </Link>
            <Link className="btn-outline" to="/catalogo">
              Ver combos disponibles
            </Link>
          </div>
        </section>
        <section className="mt-14" aria-label="Asesoría para software e infraestructura inteligente">
          <AdvisoryWizard />
        </section>
      </div>
    </main>
  );
}
