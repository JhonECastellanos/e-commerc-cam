import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

const LEVEL_ORDER = ['economico', 'intermedio', 'premium'];
const LEVEL_LABELS: Record<string, string> = {
  economico: 'Económico',
  intermedio: 'Intermedio',
  premium: 'Premium',
};
const LEVEL_DESCS: Record<string, string> = {
  economico: 'Ideal para presupuestos ajustados, sin sacrificar calidad.',
  intermedio: 'El equilibrio perfecto entre precio y prestaciones.',
  premium: 'Lo mejor en tecnología y cobertura para máxima tranquilidad.',
};
const LEVEL_ICONS: Record<string, string> = {
  economico: '💰',
  intermedio: '⚡',
  premium: '🏆',
};

export default function Catalog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCombos({})
      .then(setCombos)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sortedCombos = [...combos].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
  );

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  const modeLabels: Record<string, string> = {
    cableado: t('catalog.mode_wired'),
    inalambrico: t('catalog.mode_wireless'),
    hibrido: t('catalog.mode_hybrid'),
    solar: t('catalog.mode_solar'),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('catalog.title')}</h1>
      <p className="text-gray-500 mb-8">Elige entre nuestros combos prearmados o crea uno a tu medida.</p>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedCombos.map((combo) => (
            <div
              key={combo.id}
              className="card hover:shadow-xl transition-all duration-300 relative group cursor-pointer flex flex-col"
              onClick={() => navigate(`/catalogo/${combo.id}`)}
            >
              <div className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-bold text-white ${
                combo.level === 'economico' ? 'bg-green-500' :
                combo.level === 'intermedio' ? 'bg-blue-500' :
                'bg-yellow-500'
              }`}>
                {LEVEL_LABELS[combo.level] || combo.level}
              </div>

              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                <span className="text-5xl">{LEVEL_ICONS[combo.level]}</span>
              </div>

              <div className="text-center mb-3">
                <h3 className="font-bold text-lg text-gray-900 mb-1">{combo.brand_name}</h3>
                <p className="text-sm text-gray-500">
                  {combo.cameras_count} {t('catalog.cameras')} - {combo.resolution}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {modeLabels[combo.mode] || combo.mode}
                </p>
              </div>

              <p className="text-sm text-gray-500 text-center mb-4 flex-grow">
                {LEVEL_DESCS[combo.level]}
              </p>

              <div className="mb-4">
                <div className="text-center text-xl font-bold text-primary-500">
                  {formatPrice(combo.final_price)}
                </div>
              </div>

              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                <Link
                  to={`/catalogo/${combo.id}`}
                  className="btn-primary w-full text-center block text-sm"
                >
                  Ver detalle
                </Link>
                <Link
                  to={`/checkout/${combo.id}`}
                  className="btn-outline w-full text-center block text-sm"
                >
                  {t('catalog.reserve')}
                </Link>
              </div>
            </div>
          ))}

          <div
            className="card border-2 border-dashed border-primary-300 hover:border-primary-500 hover:shadow-xl transition-all duration-300 relative group cursor-pointer flex flex-col items-center justify-center text-center min-h-[420px]"
            onClick={() => navigate('/#contratar')}
          >
            <div className="text-5xl mb-4">🔧</div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Personalizado</h3>
            <p className="text-sm text-gray-500 mb-4 max-w-[200px]">
              ¿Ningún combo se ajusta a lo que buscas? Arma el tuyo desde cero.
            </p>
            <span className="text-primary-500 font-semibold text-sm hover:underline">
              Crear mi combo →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
