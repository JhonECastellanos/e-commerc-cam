import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface WizardStep {
  question: string;
  field: string;
  options: { value: string; label: string; icon?: string }[];
}

export default function RecomendacionWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const steps: WizardStep[] = [
    {
      question: t('wizard.q_place'),
      field: 'place',
      options: [
        { value: 'casa', label: t('wizard.place_house'), icon: '🏠' },
        { value: 'local', label: t('wizard.place_store'), icon: '🏪' },
        { value: 'bodega', label: t('wizard.place_warehouse'), icon: '🏭' },
        { value: 'oficina', label: t('wizard.place_office'), icon: '🏢' },
      ],
    },
    {
      question: t('wizard.q_priority'),
      field: 'priority',
      options: [
        { value: 'calidad', label: t('wizard.priority_quality'), icon: '🔍' },
        { value: 'precio', label: t('wizard.priority_price'), icon: '💰' },
        { value: 'facilidad', label: t('wizard.priority_easy'), icon: '📱' },
      ],
    },
    {
      question: t('wizard.q_area'),
      field: 'area',
      options: [
        { value: 'interior', label: t('wizard.area_indoor'), icon: '🏠' },
        { value: 'exterior', label: t('wizard.area_outdoor'), icon: '🌳' },
        { value: 'ambos', label: t('wizard.area_both'), icon: '🔀' },
      ],
    },
  ];

  const handleSelect = (field: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleReset = () => {
    setStep(0);
    setAnswers({});
  };

  const getRecommendedMode = () => {
    const { place, priority, area } = answers;
    if (priority === 'precio' && area === 'interior') return 'inalambrico';
    if (priority === 'calidad' || area === 'exterior') return 'cableado';
    if (area === 'ambos') return 'hibrido';
    if (place === 'bodega') return 'cableado';
    if (place === 'oficina') return 'hibrido';
    return 'cableado';
  };

  const mapModeToQuery: Record<string, string> = {
    cableado: 'cableado',
    inalambrico: 'inalambrico',
    hibrido: 'hibrido+calidad',
  };

  if (step >= steps.length) {
    return (
      <div className="bg-primary-50 rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('wizard.result_title')}</h3>
        <p className="text-gray-600 mb-6">{t('wizard.result_desc')}</p>
        <Link
          to={`/catalogo?mode=${getRecommendedMode()}`}
          className="btn-primary inline-block"
        >
          {t('wizard.result_cta')}
        </Link>
        <button onClick={handleReset} className="block mx-auto mt-4 text-sm text-primary-500 hover:text-primary-600">
          {t('wizard.restart')}
        </button>
      </div>
    );
  }

  const current = steps[step];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i === step ? 'bg-primary-500' : i < step ? 'bg-green-400' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-400">{t('wizard.step')} {step + 1} {t('wizard.of')} {steps.length}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-5">{current.question}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {current.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(current.field, opt.value)}
            className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
              answers[current.field] === opt.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="font-medium text-gray-800">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
