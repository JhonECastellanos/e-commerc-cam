import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import ContratarWizard from '../../components/public/ContratarWizard';
import HeroCarousel from '../../components/public/HeroCarousel';
import ProductCarousel from '../../components/public/ProductCarousel';
import BrandCarousel from '../../components/public/BrandCarousel';

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StaggerChildren({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } } }}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>({});
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getPublicSettings(),
      api.getBrands(),
      api.getProducts(),
    ]).then(([s, b, p]) => {
      setSettings(s);
      setBrands(b);
      setProducts(p);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const faqs = [
    { q: t('home.faq_1_q'), a: t('home.faq_1_a') },
    { q: t('home.faq_2_q'), a: t('home.faq_2_a') },
    { q: t('home.faq_3_q'), a: t('home.faq_3_a') },
    { q: t('home.faq_4_q'), a: t('home.faq_4_a') },
  ];

  return (
    <div>
      <FadeInSection>
        <HeroCarousel settings={settings} />
      </FadeInSection>

      <FadeInSection delay={0.1}>
        <ContratarWizard />
      </FadeInSection>

      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('about.title')}</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  {t('about.desc_1')}
                </p>
              </div>
              <div className="flex justify-center">
                <img
                  src={settings.about_image_url || '/images/tecnico-default.svg'}
                  alt="Técnico profesional"
                  width={640}
                  height={480}
                  loading="lazy"
                  className="w-full max-w-md rounded-2xl shadow-lg object-cover"
                  style={{ aspectRatio: '4/3' }}
                />
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">{t('home.features_title')}</h2>
            <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">{t('about.why_subtitle')}</p>
          </FadeInSection>
          <StaggerChildren>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: '\u{1F6E0}\uFE0F', title: t('home.features_1_title'), desc: t('home.features_1_desc') },
                { icon: '\u{1F4CD}', title: t('home.features_2_title'), desc: t('home.features_2_desc') },
                { icon: '\u{1F6E1}\uFE0F', title: t('home.features_3_title'), desc: t('home.features_3_desc') },
                { icon: '\u{1F4B3}', title: t('home.features_4_title'), desc: t('home.features_4_desc') },
              ].map((feat, i) => (
                <StaggerItem key={i}>
                  <div className="text-center p-6">
                    <div className="text-4xl mb-4">{feat.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                    <p className="text-gray-600 text-sm">{feat.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </StaggerChildren>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="grid md:grid-cols-5 gap-8">
              <div className="md:col-span-3 flex flex-col min-h-[350px]">
                {products.length > 0 && (
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Nuestros productos <span className="text-gray-400 font-normal text-base">({products.length})</span></h2>
                    <ProductCarousel products={products} />
                  </div>
                )}
                {!loading && (
                  <div className="mt-auto pt-6 text-center md:text-left">
                    <Link to="/catalogo" className="inline-block px-5 py-2 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition-colors">
                      {t('home.hero_cta')}
                    </Link>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                {brands.length > 0 && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-6 md:text-center lg:text-right">Trabajamos con las mejores marcas</h2>
                    <BrandCarousel brands={brands} />
                  </div>
                )}
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('home.faq_title')}</h2>
          </FadeInSection>
          <StaggerChildren>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <StaggerItem key={i}>
                  <details className="border border-gray-200 rounded-lg overflow-hidden">
                    <summary className="px-6 py-4 font-medium text-gray-900 cursor-pointer hover:bg-gray-50">
                      {faq.q}
                    </summary>
                    <p className="px-6 py-4 text-gray-600 border-t border-gray-100">
                      {faq.a}
                    </p>
                  </details>
                </StaggerItem>
              ))}
            </div>
          </StaggerChildren>
          <FadeInSection delay={0.2}>
            <div className="text-center mt-8">
              <a
                href={`https://wa.me/${settings.whatsapp_number || '[COMPLETAR]'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                {t('home.faq_more')}
              </a>
            </div>
          </FadeInSection>
        </div>
      </section>
    </div>
  );
}
