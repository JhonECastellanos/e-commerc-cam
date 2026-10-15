import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/public/Home';
import Catalog from './pages/public/Catalog';
import ComboDetail from './pages/public/ComboDetail';
const Checkout = lazy(() => import('./pages/public/Checkout'));
const PaymentConfirm = lazy(() => import('./pages/public/PaymentConfirm'));
import Terms from './pages/public/Terms';
import QuienesSomos from './pages/public/QuienesSomos';
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Prices = lazy(() => import('./pages/admin/Prices'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const OrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const SocialLinks = lazy(() => import('./pages/admin/SocialLinks'));
const CoverageAreas = lazy(() => import('./pages/admin/CoverageAreas'));
const CombosAdmin = lazy(() => import('./pages/admin/CombosAdmin'));
const ProductosAdmin = lazy(() => import('./pages/admin/ProductosAdmin'));
const AdminMedia = lazy(() => import('./pages/admin/AdminMedia'));
const AdminAgenda = lazy(() => import('./pages/admin/AdminAgenda'));
const AgentConsole = lazy(() => import('./pages/admin/AgentConsole'));
const Agenda = lazy(() => import('./pages/public/Agenda'));

import Advisory from './pages/public/Advisory';
const Advisories = lazy(() => import('./pages/admin/Advisories'));
const SmartServicesPage = lazy(
  () => import('./pages/public/SmartServicesPage'),
);
import Privacy from './pages/public/Privacy';
import FAQ from './pages/public/FAQ';
const SmartHomeLab = lazy(() => import('./pages/public/SmartHomeLab'));

export default function App() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Cargando…</div>}>
      <Routes>
        <Route
          path="/simulador/:scenario"
          element={
            <Suspense
              fallback={
                <div className="p-12 text-center">Abriendo laboratorio 3D…</div>
              }
            >
              <SmartHomeLab />
            </Suspense>
          }
        />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/asesoria" element={<Advisory />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/servicios" element={<SmartServicesPage />} />
          <Route path="/privacidad" element={<Privacy />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/catalogo/:id" element={<ComboDetail />} />
          <Route path="/checkout/:comboId" element={<Checkout />} />
          <Route path="/checkout/custom" element={<Checkout />} />
          <Route path="/confirmacion" element={<PaymentConfirm />} />
          <Route path="/condiciones" element={<Terms />} />
          <Route path="/conocenos" element={<QuienesSomos />} />
          <Route path="/quienes-somos" element={<QuienesSomos />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/precios" element={<Prices />} />
          <Route path="/admin/ordenes" element={<Orders />} />
          <Route path="/admin/asesorias" element={<Advisories />} />
          <Route path="/admin/ordenes/:id" element={<OrderDetail />} />
          <Route path="/admin/notificaciones" element={<Notifications />} />
          <Route path="/admin/redes" element={<SocialLinks />} />
          <Route path="/admin/combos" element={<CombosAdmin />} />
          <Route path="/admin/productos" element={<ProductosAdmin />} />
          <Route path="/admin/multimedia" element={<AdminMedia />} />
          <Route path="/admin/agenda" element={<AdminAgenda />} />
          <Route path="/admin/agente" element={<AgentConsole />} />
          <Route path="/admin/cobertura" element={<CoverageAreas />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
