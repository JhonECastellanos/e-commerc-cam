import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/public/Home';
import Catalog from './pages/public/Catalog';
import ComboDetail from './pages/public/ComboDetail';
import Checkout from './pages/public/Checkout';
import PaymentConfirm from './pages/public/PaymentConfirm';
import Terms from './pages/public/Terms';
import QuienesSomos from './pages/public/QuienesSomos';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Prices from './pages/admin/Prices';
import Orders from './pages/admin/Orders';
import OrderDetail from './pages/admin/OrderDetail';
import Notifications from './pages/admin/Notifications';
import SocialLinks from './pages/admin/SocialLinks';
import CoverageAreas from './pages/admin/CoverageAreas';
import CombosAdmin from './pages/admin/CombosAdmin';
import ProductosAdmin from './pages/admin/ProductosAdmin';
import AdminMedia from './pages/admin/AdminMedia';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
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
        <Route path="/admin/ordenes/:id" element={<OrderDetail />} />
        <Route path="/admin/notificaciones" element={<Notifications />} />
        <Route path="/admin/redes" element={<SocialLinks />} />
        <Route path="/admin/combos" element={<CombosAdmin />} />
        <Route path="/admin/productos" element={<ProductosAdmin />} />
        <Route path="/admin/multimedia" element={<AdminMedia />} />
        <Route path="/admin/cobertura" element={<CoverageAreas />} />
      </Route>
    </Routes>
  );
}
