import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
export default function Advisories() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<any>(),
    [status, setStatus] = useState('nuevo'),
    [notes, setNotes] = useState(''),
    [recommendation, setRecommendation] = useState('');
  useEffect(() => {
    api
      .adminGetAdvisories(page)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [page]);
  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await api.adminReviewAdvisory(selected.id, {
        status,
        advisor_notes: notes,
        recommendation: recommendation || null,
      });
      setRows((r) =>
        r.map((row) => (row.id === selected.id ? { ...row, ...result } : row)),
      );
      setSelected({ ...selected, ...result });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function viewDesign() {
    if (!selected?.configuration) return;
    sessionStorage.setItem(
      'instalacam:review-design',
      JSON.stringify(selected.configuration),
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Solicitudes de asesoría</h1>
      <p className="text-gray-500 mb-6">
        Revisa el perfil preliminar y ajusta la propuesta antes de cotizar.
      </p>
      {error && (
        <p role="alert" className="text-red-600 mb-4">
          {error}
        </p>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {rows.map((row) => (
            <button
              key={row.id}
              className="w-full text-left card p-4"
              onClick={() => {
                setSelected(row);
                setStatus(row.status);
                setNotes(row.advisor_notes || '');
                setRecommendation(row.profile.advisor_recommendation || '');
              }}
            >
              <strong>
                {row.reference} · {row.name}
              </strong>
              <p className="text-sm text-gray-500 my-2">
                {row.profile.category} · {row.locality}
              </p>
              <span className="text-xs rounded-full bg-primary-50 text-primary-700 px-3 py-1">
                {row.status}
              </span>
            </button>
          ))}
          {!rows.length && (
            <p className="text-gray-500 py-12">
              No hay solicitudes en esta página.
            </p>
          )}
          <div className="flex justify-between">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              ← Anterior
            </button>
            <span>Página {page}</span>
            <button
              disabled={rows.length < 50}
              onClick={() => setPage(page + 1)}
            >
              Siguiente →
            </button>
          </div>
        </div>
        {selected && (
          <section className="card">
            <h2 className="font-bold text-xl mb-3">{selected.reference}</h2>
            <p>
              {selected.name} · {selected.contact_method}: {selected.contact}
            </p>
            <p className="text-sm text-gray-500">
              {selected.locality} · Consentimiento {selected.consent_version}
            </p>
            <h3 className="font-semibold mt-5">{selected.profile.category}</h3>
            {selected.profile.reasons.map((r: string) => (
              <p className="text-sm text-gray-600 mt-2" key={r}>
                {r}
              </p>
            ))}
            <details className="my-5">
              <summary>Respuestas y perfil</summary>
              <pre className="bg-gray-50 p-4 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
                {JSON.stringify(
                  { answers: selected.answers, profile: selected.profile },
                  null,
                  2,
                )}
              </pre>
            </details>
            {selected.configuration && (
              <Link
                to={`/simulador/${selected.configuration.scenario}?revision=1`}
                onClick={viewDesign}
                className="text-primary-600 underline"
              >
                Abrir diseño 3D asociado
              </Link>
            )}
            <label className="label mt-5">
              Estado
              <select
                className="input-field bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {[
                  'nuevo',
                  'en_revision',
                  'contactado',
                  'cotizado',
                  'cerrado',
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="label mt-4">
              Ajustar recomendación
              <select
                className="input-field bg-white"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
              >
                <option value="">Conservar perfil preliminar</option>
                {[
                  'Combo CCTV básico',
                  'Combo CCTV ampliado',
                  'Instalación de seguridad personalizada',
                  'Seguridad con automatización y domótica',
                  'Proyecto integral avanzado',
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="label mt-4">
              Revisión del asesor
              <textarea
                className="input-field"
                rows={5}
                maxLength={4000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajustes, información pendiente y alcance acordado"
              />
            </label>
            <button className="btn-primary mt-5" disabled={busy} onClick={save}>
              {busy ? 'Guardando…' : 'Guardar revisión'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
