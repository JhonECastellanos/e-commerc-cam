import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ComboCardProps {
  combo: any;
}

export default function ComboCard({ combo }: ComboCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const modeLabels: Record<string, string> = {
    cableado: t('catalog.mode_wired'),
    inalambrico: t('catalog.mode_wireless'),
    hibrido: t('catalog.mode_hybrid'),
    solar: t('catalog.mode_solar'),
  };

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  const complexityColors: Record<string, string> = {
    baja: 'text-green-600 bg-green-50',
    media: 'text-yellow-600 bg-yellow-50',
    alta: 'text-red-600 bg-red-50',
  };

  return (
    <div
      className="card hover:shadow-xl transition-shadow relative group cursor-pointer"
      onClick={() => navigate(`/catalogo/${combo.id}`)}
    >
      {combo.is_bestseller && (
        <div className="absolute top-3 right-3 badge-yellow z-10">
          🏆 {t('catalog.bestseller')}
        </div>
      )}
      {combo.is_budget && (
        <div className="absolute top-3 left-3 badge-green z-10">
          💰 {t('catalog.budget')}
        </div>
      )}

      <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 overflow-hidden flex items-center justify-center relative">
        {combo.image_url ? (
          <img src={combo.image_url} alt={combo.brand_name} className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <span className="text-4xl">📹</span>
        )}
        <div className="absolute bottom-2 right-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${complexityColors[combo.install_complexity] || 'text-gray-600 bg-gray-100'}`}>
            {combo.install_complexity === 'baja' ? 'Sencilla' : combo.install_complexity === 'media' ? 'Moderada' : 'Profesional'}
          </span>
        </div>
      </div>

      <div className="text-xs text-primary-500 font-semibold mb-1">
        {combo.brand_name}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">
        {combo.cameras_count} {t('catalog.cameras')} - {combo.resolution}
      </h3>
      <p className="text-sm text-gray-500 mb-2">
        {modeLabels[combo.mode] || combo.mode}
      </p>

      <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
        <span>🛡️ {t('catalog.guarantee')}: {combo.warranty_text}</span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-lg font-bold">
          <span>{t('catalog.total')}:</span>
          <span className="text-primary-500">{formatPrice(combo.final_price)}</span>
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
  );
}
