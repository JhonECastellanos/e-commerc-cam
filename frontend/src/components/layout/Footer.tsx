import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

export default function Footer() {
  const { t } = useTranslation();
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  useEffect(() => {
    api.getSocialLinks().then(setSocialLinks).catch(() => {});
  }, []);

  const platformIcons: Record<string, string> = {
    whatsapp: '💬',
    facebook: '📘',
    instagram: '📷',
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">InstalaCámara</span>
            </div>
            <p className="text-sm text-gray-400">
              Venta e instalación profesional de cámaras de seguridad en Bogotá y la Sabana.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Enlaces</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link></li>
              <li><Link to="/catalogo" className="hover:text-white transition-colors">{t('nav.catalog')}</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">{t('nav.faq')}</Link></li>
              <li><Link to="/condiciones" className="hover:text-white transition-colors">{t('nav.terms')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Redes sociales</h3>
            <div className="space-y-2">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm hover:text-white transition-colors"
                >
                  <span>{platformIcons[link.platform] || '🔗'}</span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} InstalaCámara. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
