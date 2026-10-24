import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, randomId } from '../../api/client';
import {
  parseConfiguration,
  type Configuration,
} from '../../smart-home/domain';

type Answers = {
  need: string;
  property: string;
  environment: string;
  areas: number | null;
  spaces: string;
  existing: string;
  connectivity: string;
  goals: string[];
  preference: string;
  priority: string;
  installation: string;
  infrastructure: string;
  units: number;
  support: string;
};
function designFromLab() {
  try {
    const raw = sessionStorage.getItem('instalacam:advisory-design');
    return raw ? parseConfiguration(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}
const options = {
  need: [
    ['seguridad', 'Seguridad y videovigilancia'],
    ['camaras', 'Instalar cámaras'],
    ['domotica', 'Domótica y automatización'],
    ['mejora', 'Mejorar mi instalación'],
    ['integral', 'Solución integral'],
  ],
  property: [
    ['casa', 'Casa'],
    ['apartamento', 'Apartamento'],
    ['local', 'Local comercial'],
    ['oficina', 'Oficina'],
    ['edificio', 'Proyecto de vivienda / edificio'],
    ['otro', 'Empresa u otro'],
  ],
  goals: [
    ['accesos', 'Vigilar accesos'],
    ['supervision', 'Supervisar áreas'],
    ['grabacion', 'Grabar y consultar eventos'],
    ['notificaciones', 'Recibir notificaciones'],
    ['dispositivos', 'Controlar dispositivos'],
    ['iluminacion', 'Automatizar iluminación'],
    ['procesamiento_local', 'IA o procesamiento local'],
    ['integraciones', 'Integrar sistemas mediante API'],
  ],
};
export default function AdvisoryWizard({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [design] = useState<Configuration | undefined>(designFromLab),
    [attach, setAttach] = useState(Boolean(design));
  const [answers, setAnswers] = useState<Answers>({
    need: 'seguridad',
    property: design?.scenario || 'casa',
    environment: 'ambos',
    areas: null,
    spaces: '',
    existing: 'no',
    connectivity: 'desconocido',
    goals: ['accesos', 'grabacion'],
    preference: 'asesoria',
    priority: 'planificando',
    installation: 'asesoria',
    infrastructure: design?.infrastructure || 'ninguna',
    units: 1,
    support: 'asesoria',
  });
  const [step, setStep] = useState(0),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [profile, setProfile] = useState<any>(),
    [receipt, setReceipt] = useState<any>();
  const [name, setName] = useState(''),
    [contactMethod, setContactMethod] = useState('whatsapp'),
    [contact, setContact] = useState(''),
    [locality, setLocality] = useState(''),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState('');
  const key = useRef(randomId()),
    lastPayload = useRef(''),
    lock = useRef(false);
  const automation =
    ['domotica', 'integral'].includes(answers.need) ||
    answers.goals.some((g) =>
      [
        'dispositivos',
        'iluminacion',
        'procesamiento_local',
        'integraciones',
      ].includes(g),
    ) || Boolean(attach && design?.devices.some((d) => ['light', 'switch', 'outlet', 'server', 'rack', 'touchscreen'].includes(d.kind)));
  const change = (
    field: keyof Answers,
    value: string | number | null | string[],
  ) => {
    setAnswers((a) => ({ ...a, [field]: value }));
    setProfile(undefined);
  };
  const select = (field: keyof Answers, title: string, choices: string[][]) => (
    <label className="label mb-4">
      {title}
      <select
        className="input-field mt-1 bg-white"
        value={String(answers[field] ?? '')}
        onChange={(e) => {
          change(field, e.target.value);
          if (
            field === 'property' &&
            design &&
            e.target.value !== design.scenario &&
            ['casa', 'apartamento'].includes(e.target.value)
          )
            setAttach(false);
        }}
      >
        {choices.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  const configuration = attach ? design : undefined;
  async function next() {
    setError('');
    if (!answers.goals.length) {
      setError('Elige al menos un objetivo.');
      return;
    }
    if (
      answers.areas !== null &&
      (!Number.isInteger(answers.areas) ||
        answers.areas < 1 ||
        answers.areas > 500)
    ) {
      setError('Indica entre 1 y 500 áreas o deja «No lo sé».');
      return;
    }
    if (step === 2) {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        const p = await api.advisoryProfile({
          answers,
          configuration: configuration || null,
        });
        setProfile(p);
        setStep(3);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
        lock.current = false;
      }
    } else setStep(step + 1);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || !consent) return;
    if (
      contactMethod === 'email'
        ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
        : !/^[+\d ()-]+$/.test(contact) ||
          !/^\d{7,15}$/.test(contact.replace(/\D/g, ''))
    ) {
      setError('Revisa el correo o teléfono de contacto.');
      return;
    }
    const payload = {
      answers,
      configuration: configuration || null,
      name: name.trim(),
      contact_method: contactMethod,
      contact: contact.trim(),
      locality: locality.trim(),
      consent,
      consent_version: 'asesoria-2026-10-v1',
      website,
    };
    const encoded = JSON.stringify(payload);
    if (encoded !== lastPayload.current) {
      key.current = randomId();
      lastPayload.current = encoded;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      setReceipt(await api.submitAdvisory(payload, key.current));
      if (attach) sessionStorage.removeItem('instalacam:advisory-design');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  if (receipt)
    return (
      <section
        className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 md:p-10"
        aria-live="polite"
      >
        <span className="text-emerald-700 text-sm font-semibold">
          Solicitud recibida
        </span>
        <h2 className="text-2xl font-bold my-3">Gracias, {name}.</h2>
        <p className="text-gray-700">
          Referencia: <strong>{receipt.reference}</strong>. Un asesor revisará
          tu propuesta y las condiciones de tu inmueble.
        </p>
        <p className="my-4 text-gray-600">{receipt.profile.category}</p>
        <Link className="btn-primary inline-block" to="/">
          Volver al inicio
        </Link>
      </section>
    );
  return (
    <section
      id="asesoria"
      className={`bg-white border border-gray-200 rounded-2xl ${compact ? 'p-5' : 'p-6 md:p-10'} shadow-sm`}
    >
      <div className="flex justify-between gap-4 mb-5">
        <div>
          <p className="text-primary-600 text-xs uppercase tracking-widest font-semibold mb-2">
            Asesoría personalizada
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            Cuéntanos qué necesitas proteger
          </h2>
        </div>
        <span className="text-gray-500 text-sm shrink-0">{step + 1} / 4</span>
      </div>
      <ol
        className="grid grid-cols-4 gap-2 mb-7"
        aria-label="Pasos de asesoría"
      >
        {['Necesidad', 'Espacios', 'Solución', 'Contacto'].map((title, i) => (
          <li
            key={title}
            className={`border-t-4 pt-2 text-xs ${i === step ? 'border-primary-500 text-primary-700 font-semibold' : i < step ? 'border-emerald-300 text-gray-500' : 'border-gray-200 text-gray-400'}`}
          >
            {title}
          </li>
        ))}
      </ol>
      {design && (
        <div className="rounded-xl bg-primary-50 p-4 mb-6">
          <label className="flex gap-3 text-sm text-primary-800">
            <input
              type="checkbox"
              checked={attach}
              onChange={(e) => {
                setAttach(e.target.checked);
                if (e.target.checked) change('property', design.scenario);
              }}
            />
            Adjuntar mi diseño 3D de {design.scenario} · {design.devices.length}{' '}
            equipos virtuales
          </label>
        </div>
      )}
      {step === 0 && (
        <>
          {select('need', '¿Qué necesitas?', options.need)}
          {select('property', '¿En qué tipo de inmueble?', options.property)}
          <fieldset>
            <legend className="label mb-3">
              ¿Qué te gustaría lograr? Elige lo que necesitas.
            </legend>
            <div className="grid sm:grid-cols-2 gap-3">
              {options.goals.map(([value, text]) => (
                <label
                  key={value}
                  className="flex items-center gap-3 p-3 border rounded-lg text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={answers.goals.includes(value)}
                    onChange={(e) =>
                      change(
                        'goals',
                        e.target.checked
                          ? [...answers.goals, value]
                          : answers.goals.filter((g) => g !== value),
                      )
                    }
                  />
                  {text}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      {step === 1 && (
        <>
          {select('environment', '¿Dónde quieres instalar?', [
            ['interior', 'Interior'],
            ['exterior', 'Exterior'],
            ['ambos', 'Interior y exterior'],
            ['asesoria', 'No lo sé, necesito asesoría'],
          ])}
          <label className="label mb-4">
            Número aproximado de áreas (opcional)
            <input
              className="input-field mt-1"
              type="number"
              min="1"
              max="500"
              value={answers.areas ?? ''}
              onChange={(e) =>
                change('areas', e.target.value ? Number(e.target.value) : null)
              }
              placeholder="No lo sé, necesito asesoría"
            />
          </label>
          <label className="label mb-4">
            ¿Qué espacios quieres proteger? (opcional)
            <input
              className="input-field mt-1"
              maxLength={500}
              value={answers.spaces}
              onChange={(e) => change('spaces', e.target.value)}
              placeholder="Por ejemplo: acceso, jardín y sala"
            />
          </label>
          {select('existing', '¿Ya tienes cámaras o equipos inteligentes?', [
            ['no', 'No'],
            ['si', 'Sí, tengo equipos'],
            ['desconocido', 'Necesito que los revisen'],
          ])}
          {answers.goals.some((g) =>
            ['notificaciones', 'integraciones', 'dispositivos'].includes(g),
          ) &&
            select('connectivity', '¿Qué conexión hay en el inmueble?', [
              ['desconocido', 'No lo sé'],
              ['wifi', 'Wi-Fi'],
              ['cable', 'Red por cable'],
              ['sin_conexion', 'Sin conexión disponible'],
            ])}
          {answers.property === 'edificio' && (
            <label className="label">
              Viviendas previstas
              <input
                className="input-field"
                type="number"
                min="1"
                max="5000"
                value={answers.units}
                onChange={(e) => change('units', Number(e.target.value))}
              />
            </label>
          )}
        </>
      )}
      {step === 2 && (
        <>
          {select('preference', '¿Cómo prefieres resolverlo?', [
            ['asesoria', 'Recomiéndenme lo adecuado'],
            ['combo', 'Explorar un combo CCTV existente'],
            ['personalizado', 'Una solución personalizada'],
          ])}
          {select('priority', '¿En qué momento está tu proyecto?', [
            ['explorando', 'Estoy explorando opciones'],
            ['planificando', 'Estoy planificando la instalación'],
            ['pronto', 'Necesito coordinarla pronto'],
          ])}
          {automation && (
            <>
              {select(
                'installation',
                'Para automatizar tu espacio, ¿qué prefieres?',
                [
                  ['asesoria', 'Necesito asesoría'],
                  ['tomas_existentes', 'Equipos conectados a tomas existentes'],
                  ['electrica_integrada', 'Instalación eléctrica integrada'],
                ],
              )}
              {select(
                'infrastructure',
                '¿Cómo te gustaría gestionar la solución?',
                [
                  ['asesoria', 'Necesito asesoría'],
                  ['ninguna', 'Sin servidor adicional por ahora'],
                  ['local', 'Servidor propio en la vivienda'],
                  ['cloud', 'Administración en la nube'],
                  ['shared', 'Rack compartido con viviendas independientes'],
                ],
              )}
              {select('support', 'Preferencia de mantenimiento', [
                ['asesoria', 'Quiero conocer las opciones'],
                ['mensual', 'Mensual'],
                ['anual', 'Anual'],
                ['ninguno', 'No lo necesito por ahora'],
              ])}
            </>
          )}
          <p className="text-sm text-gray-500">
            La recomendación es preliminar. Tu solicitud no genera cobros ni una
            reserva.
          </p>
        </>
      )}
      {step === 3 && (
        <>
          <div className="p-5 rounded-xl border border-primary-100 bg-primary-50 mb-6">
            <h3 className="font-bold text-primary-900">{profile?.category}</h3>
            {profile?.reasons.map((r: string) => (
              <p key={r} className="text-sm text-primary-800 mt-2">
                {r}
              </p>
            ))}
            {profile?.combo_ids?.length > 0 && (
              <Link
                to={`/catalogo/${profile.combo_ids[0]}`}
                className="text-primary-600 text-sm underline mt-3 inline-block"
              >
                Revisar combo disponible
              </Link>
            )}
            <details className="mt-3 text-sm text-gray-600">
              <summary className="cursor-pointer">
                Información que confirmará el asesor
              </summary>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {profile?.pending.map((p: string) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          </div>
          <form onSubmit={submit}>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="label">
                Nombre
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  className="input-field mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="label">
                Localidad / municipio
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="address-level2"
                  className="input-field mt-1"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Sin dirección exacta"
                />
              </label>
              <label className="label">
                Medio de contacto
                <select
                  className="input-field bg-white mt-1"
                  value={contactMethod}
                  onChange={(e) => {
                    setContactMethod(e.target.value);
                    setContact('');
                  }}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telefono">Teléfono</option>
                  <option value="email">Correo electrónico</option>
                </select>
              </label>
              <label className="label">
                {contactMethod === 'email'
                  ? 'Correo electrónico'
                  : 'Número de contacto'}
                <input
                  required
                  type={contactMethod === 'email' ? 'email' : 'tel'}
                  autoComplete={contactMethod === 'email' ? 'email' : 'tel'}
                  minLength={7}
                  maxLength={254}
                  className="input-field mt-1"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </label>
            </div>
            <div className="hidden" aria-hidden="true">
              <label>
                Sitio web
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </label>
            </div>
            <label className="flex gap-3 text-sm text-gray-600 my-6">
              <input
                required
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Autorizo usar mis respuestas y datos de contacto para gestionar
                esta asesoría. Puedo solicitar su consulta, corrección o
                eliminación.{' '}
                <Link
                  to="/privacidad"
                  className="text-primary-600 underline"
                  target="_blank"
                >
                  Política de tratamiento de datos
                </Link>
                .
              </span>
            </label>
            <button disabled={busy || !consent} className="btn-primary w-full">
              {busy
                ? 'Enviando…'
                : 'Solicitar cotización y revisión del asesor'}
            </button>
          </form>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="text-red-700 bg-red-50 rounded-lg p-3 mt-4 text-sm"
        >
          {error}
        </p>
      )}
      <div className="flex justify-between gap-4 mt-7">
        {step > 0 ? (
          <button
            disabled={busy}
            onClick={() => {
              setStep(step - 1);
              setError('');
            }}
            className="text-primary-600 font-medium"
          >
            ← Volver
          </button>
        ) : (
          <span />
        )}
        {step < 3 && (
          <button disabled={busy} onClick={next} className="btn-primary">
            {busy ? 'Preparando propuesta…' : 'Continuar →'}
          </button>
        )}
      </div>
    </section>
  );
}
