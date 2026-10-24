import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import FloatingWhatsApp from './FloatingWhatsApp';
import BusinessChat from '../public/BusinessChat';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <a href="#contenido-principal" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue-800 focus:text-white focus:p-3 focus:rounded-lg">Saltar al contenido principal</a>
      <Header />
      <main id="contenido-principal" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <FloatingWhatsApp />
      <BusinessChat />
    </div>
  );
}
