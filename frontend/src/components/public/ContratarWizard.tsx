import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

type PathType = 'prebuilt' | 'custom' | null;
type StepName = 'choose-path' | 'path-a-carousel' | 'path-b-brand' | 'path-b-dvr' | 'path-b-cameras' | 'final-questions';

interface FixedCombo {
  id: number;
  brand_name: string;
  level: string;
  cameras_count: number;
  resolution: string;
  mode: string;
  final_price: number;
}

export default function ContratarWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [started, setStarted] = useState(false);
  const [path, setPath] = useState<PathType>(null);
  const [stepName, setStepName] = useState<StepName>('choose-path');
  const [progress, setProgress] = useState(0);

  const [fixedCombos, setFixedCombos] = useState<FixedCombo[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  const [customBrand, setCustomBrand] = useState('');
  const [customMode, setCustomMode] = useState('');
  const [customCameras, setCustomCameras] = useState(4);

  const [finalAnswers, setFinalAnswers] = useState<Record<string, string>>({});
  const [finalStep, setFinalStep] = useState(0);

  const [selectedCombo, setSelectedCombo] = useState<FixedCombo | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: false, align: 'center' },
    [Autoplay({ delay: 5000, stopOnInteraction: true })]
  );

  useEffect(() => {
    Promise.all([
      api.getCombos({}),
      api.getBrands(),
    ]).then(([combos, brandsData]) => {
      const levelOrder = ['economico', 'intermedio', 'premium'];
      const sorted = [...combos].sort(
        (a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
      );
      setFixedCombos(sorted);
      setBrands(brandsData);
    }).catch(console.error);
  }, []);

  const finalQuestions = [
    {
      field: 'place',
      question: t('wizard.q_place'),
      options: [
        { value: 'casa', label: t('wizard.place_house'), icon: '\u{1F3E0}' },
        { value: 'local', label: t('wizard.place_store'), icon: '\u{1F3EA}' },
        { value: 'bodega', label: t('wizard.place_warehouse'), icon: '\u{1F3ED}' },
        { value: 'oficina', label: t('wizard.place_office'), icon: '\u{1F3E2}' },
      ],
    },
    {
      field: 'priority',
      question: t('wizard.q_priority'),
      options: [
        { value: 'calidad', label: t('wizard.priority_quality'), icon: '\u{1F50D}' },
        { value: 'precio', label: t('wizard.priority_price'), icon: '\u{1F4B0}' },
        { value: 'facilidad', label: t('wizard.priority_easy'), icon: '\u{1F4F1}' },
      ],
    },
    {
      field: 'area',
      question: t('wizard.q_area'),
      options: [
        { value: 'interior', label: t('wizard.area_indoor'), icon: '\u{1F3E0}' },
        { value: 'exterior', label: t('wizard.area_outdoor'), icon: '\u{1F333}' },
        { value: 'ambos', label: t('wizard.area_both'), icon: '\u{1F500}' },
      ],
    },
  ];

  const formatPrice = (price: number) =>
    '$' + Math.round(price).toLocaleString('es-CO') + ' COP';

  const getPathSteps = useCallback(() => {
    if (path === 'prebuilt') return 1 + finalQuestions.length;
    if (path === 'custom') return 3 + finalQuestions.length;
    return 1;
  }, [path]);

  const getCurrentStepIndex = useCallback(() => {
    if (stepName === 'choose-path') return 0;
    if (path === 'prebuilt') {
      if (stepName === 'path-a-carousel') return 1;
      if (stepName === 'final-questions') return 2 + finalStep;
    }
    if (path === 'custom') {
      if (stepName === 'path-b-brand') return 1;
      if (stepName === 'path-b-dvr') return 2;
      if (stepName === 'path-b-cameras') return 3;
      if (stepName === 'final-questions') return 4 + finalStep;
    }
    return 0;
  }, [stepName, path, finalStep]);

  useEffect(() => {
    const total = getPathSteps();
    const current = getCurrentStepIndex();
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    setProgress(pct);
  }, [getPathSteps, getCurrentStepIndex]);

  const handleStart = () => setStarted(true);

  const selectPath = (p: PathType) => {
    setPath(p);
    if (p === 'prebuilt') setStepName('path-a-carousel');
    if (p === 'custom') setStepName('path-b-brand');
  };

  const selectPrebuiltCombo = (combo: FixedCombo) => {
    setSelectedCombo(combo);
    setStepName('final-questions');
    setFinalStep(0);
  };

  const selectCustomBrand = (slug: string) => {
    setCustomBrand(slug);
    setStepName('path-b-dvr');
  };

  const selectCustomDVR = (mode: string) => {
    setCustomMode(mode);
    setStepName('path-b-cameras');
  };

  const selectCustomCameras = (count: number) => {
    setCustomCameras(count);
    setStepName('final-questions');
    setFinalStep(0);
  };

  const handleFinalAnswer = (field: string, value: string) => {
    const next = { ...finalAnswers, [field]: value };
    setFinalAnswers(next);
    if (finalStep < finalQuestions.length - 1) {
      setFinalStep(finalStep + 1);
    } else {
      finishWizard();
    }
  };

  const finishWizard = async () => {
    if (path === 'prebuilt' && selectedCombo) {
      navigate(`/checkout/${selectedCombo.id}`);
    } else if (path === 'custom') {
      const resolution = '2MP';
      try {
        await api.getCustomPrice({
          brand_slug: customBrand,
          mode: customMode || 'cableado',
          cameras_count: customCameras,
          resolution,
        });
        navigate(`/checkout/custom?brand=${customBrand}&mode=${customMode || 'cableado'}&cameras=${customCameras}&resolution=${resolution}`);
      } catch {
        navigate(`/checkout/custom?brand=${customBrand}&mode=${customMode || 'cableado'}&cameras=${customCameras}&resolution=${resolution}`);
      }
    }
  };

  const goBack = () => {
    if (stepName === 'path-a-carousel' || stepName === 'path-b-brand') {
      setStepName('choose-path');
      setPath(null);
    } else if (stepName === 'path-b-dvr') {
      setStepName('path-b-brand');
    } else if (stepName === 'path-b-cameras') {
      setStepName('path-b-dvr');
    } else if (stepName === 'final-questions') {
      if (finalStep > 0) {
        setFinalStep(finalStep - 1);
      } else if (path === 'prebuilt') {
        setStepName('path-a-carousel');
      } else {
        setStepName('path-b-cameras');
      }
    }
  };

  const levelLabels: Record<string, string> = {
    economico: 'Económico',
    intermedio: 'Intermedio',
    premium: 'Premium',
  };
  const levelIcons: Record<string, string> = {
    economico: '\u{1F4B0}',
    intermedio: '\u26A1',
    premium: '\u{1F3C6}',
  };
  const levelColors: Record<string, string> = {
    economico: 'bg-green-500',
    intermedio: 'bg-blue-500',
    premium: 'bg-yellow-500',
  };

  const slideVariants = {
    enter: { opacity: 0, y: 30, scale: 0.97 },
    center: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
    exit: { opacity: 0, y: -30, scale: 0.97, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
  };

  if (!started) {
    const totalSteps = 4;
    return (
      <section id="contratar" className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {'¿Cómo funciona en solo '}{totalSteps}{' pasos?'}
          </h2>
          <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
            {t('home.wizard_desc')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-2xl mx-auto">
            {[
              { icon: '\u{1F50D}', label: 'Explora opciones', animate: false },
              { icon: '\u{1F4B3}', label: 'Confianza mutua', animate: false },
              { icon: '\u{1F4C5}', label: 'Agendamos', animate: false },
              { icon: '\u{1F6E0}\uFE0F', label: 'Instalamos', animate: true },
            ].map((s, i) => (
              <div key={i} className="text-center p-3">
                <motion.div
                  className={`w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2 ${s.animate ? 'animate-bounce' : ''}`}
                  initial={s.animate ? { rotate: -10 } : {}}
                  animate={s.animate ? { rotate: [0, -15, 10, -5, 0] } : {}}
                  transition={s.animate ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  <span className="text-2xl">{s.icon}</span>
                </motion.div>
                <p className="text-xs text-gray-600 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <motion.button
            onClick={handleStart}
            className="btn-primary text-lg px-12 py-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('home.wizard_cta')}
          </motion.button>
        </div>
      </section>
    );
  }

  return (
    <section id="contratar" className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">
              {stepName !== 'choose-path' && (
                <button onClick={goBack} className="text-primary-500 hover:text-primary-600 mr-3">
                  ← Volver
                </button>
              )}
            </span>
            <span className="text-sm font-medium text-primary-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="bg-primary-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {stepName === 'choose-path' && (
            <motion.div key="choose-path" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Elige la mejor opción para ti?</h3>
                <p className="text-gray-500">Tenemos varias opciones, fácil y rápido combos prearmados o puedes ajustar tu combo según tus necesidades.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <motion.button
                  onClick={() => selectPath('prebuilt')}
                  className="card p-8 text-center hover:border-primary-400 hover:shadow-lg transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-5xl mb-4">📦</div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Combos prearmados</h4>
                  <p className="text-sm text-gray-500">Elige entre nuestras opciones diseñadas para cubrir diferentes necesidades y presupuestos.</p>
                </motion.button>
                <motion.button
                  onClick={() => selectPath('custom')}
                  className="card p-8 text-center hover:border-primary-400 hover:shadow-lg transition-all duration-300 border-2 border-dashed border-primary-200"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-5xl mb-4">🔧</div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Personalizado</h4>
                  <p className="text-sm text-gray-500">Selecciona marca, DVR y cantidad de cámaras para crear un sistema a tu medida.</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {stepName === 'path-a-carousel' && (
            <motion.div key="path-a-carousel" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Combos prearmados</h3>
                <p className="text-gray-500">Desliza para ver todas las opciones.</p>
              </div>
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {fixedCombos.map((combo) => (
                    <div key={combo.id} className="flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 pl-4">
                      <motion.button
                        onClick={() => selectPrebuiltCombo(combo)}
                        className="card w-full text-left hover:shadow-xl transition-all duration-300 h-full"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="mb-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${levelColors[combo.level]}`}>
                            {levelIcons[combo.level]} {levelLabels[combo.level] || combo.level}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 mb-1">{combo.brand_name}</h4>
                        <p className="text-sm text-gray-500 mb-2">
                          {combo.cameras_count} {t('catalog.cameras')} - {combo.resolution}
                        </p>
                        <p className="text-lg font-bold text-primary-500">{formatPrice(combo.final_price)}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {combo.mode === 'cableado' ? 'Cableado CCTV+DVR' :
                           combo.mode === 'inalambrico' ? 'Inalámbrico WiFi' :
                           combo.mode === 'hibrido' ? 'Híbrido' : 'Solar / PoE'}
                        </p>
                      </motion.button>
                    </div>
                  ))}
                  <div className="flex-[0_0_85%] sm:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 pl-4">
                    <motion.button
                      onClick={() => selectPath('custom')}
                      className="card w-full text-center hover:shadow-xl transition-all duration-300 h-full flex flex-col items-center justify-center border-2 border-dashed border-primary-300"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-4xl mb-3">🔧</div>
                      <h4 className="font-bold text-gray-900 mb-1">Personalizado</h4>
                      <p className="text-sm text-gray-500">Arma tu combo desde cero</p>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {stepName === 'path-b-brand' && (
            <motion.div key="path-b-brand" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Elige la marca</h3>
                <p className="text-gray-500">Selecciona la marca de tus dispositivos.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {brands.filter((b) => b.active).map((brand) => (
                  <motion.button
                    key={brand.id}
                    onClick={() => selectCustomBrand(brand.slug)}
                    className={`card p-4 text-center hover:border-primary-400 hover:shadow-lg transition-all duration-300 ${
                      customBrand === brand.slug ? 'border-primary-500 bg-primary-50' : ''
                    }`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="text-3xl mb-2">📹</div>
                    <p className="font-medium text-gray-900 text-sm">{brand.name}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stepName === 'path-b-dvr' && (
            <motion.div key="path-b-dvr" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Qué tipo de sistema prefieres?</h3>
                <p className="text-gray-500">Elige el modo de instalación y tipo de DVR.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {[
                  { value: 'cableado', label: 'Cableado CCTV+DVR', icon: '\u{1F4FA}', desc: 'Conexión por cable, máxima estabilidad y calidad de imagen.' },
                  { value: 'inalambrico', label: 'Inalámbrico WiFi', icon: '\u{1F4F6}', desc: 'Fácil instalación, sin cableado de video.' },
                  { value: 'hibrido', label: 'Híbrido', icon: '\u{1F500}', desc: 'Combina cableado e inalámbrico según cada zona.' },
                  { value: 'solar', label: 'Solar / PoE', icon: '\u2600\uFE0F', desc: 'Independiente, ideal para exteriores sin toma corriente.' },
                ].map((opt) => (
                  <motion.button
                    key={opt.value}
                    onClick={() => selectCustomDVR(opt.value)}
                    className={`card p-5 text-left hover:border-primary-400 hover:shadow-lg transition-all duration-300 ${
                      customMode === opt.value ? 'border-primary-500 bg-primary-50' : ''
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-3xl mb-2">{opt.icon}</div>
                    <h4 className="font-bold text-gray-900 mb-1">{opt.label}</h4>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stepName === 'path-b-cameras' && (
            <motion.div key="path-b-cameras" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¿Cuántas cámaras necesitas?</h3>
                <p className="text-gray-500">Elige la cantidad según los puntos que quieras cubrir.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                {[4, 6, 8].map((count) => (
                  <motion.button
                    key={count}
                    onClick={() => selectCustomCameras(count)}
                    className={`card p-6 text-center hover:border-primary-400 hover:shadow-lg transition-all duration-300 ${
                      customCameras === count ? 'border-primary-500 bg-primary-50' : ''
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="text-4xl mb-2">📹</div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500">{t('catalog.cameras')}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {stepName === 'final-questions' && (
            <motion.div key="final-questions" variants={slideVariants} initial="enter" animate="center" exit="exit">
              <div className="flex items-center justify-center mb-6 space-x-2">
                {finalQuestions.map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      i === finalStep ? 'bg-primary-500 scale-125' : i < finalStep ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-6">
                {finalQuestions[finalStep].question}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {finalQuestions[finalStep].options.map((opt) => (
                  <motion.button
                    key={opt.value}
                    onClick={() => handleFinalAnswer(finalQuestions[finalStep].field, opt.value)}
                    className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                      finalAnswers[finalQuestions[finalStep].field] === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-medium text-gray-800">{opt.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
