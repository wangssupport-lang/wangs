import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import LiveSocialProof from './components/LiveSocialProof';

import HomePage from './pages/HomePage';
import BrandsPage from './pages/BrandsPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import AuthPage from './pages/AuthPages';
import MaintenancePage from './pages/MaintenancePage';

// Auto-recovery wrapper for lazy loaded routes when new deployments change bundle hashes
function lazyWithRetry(componentImport) {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const msg = String(error?.message || error || '');
      const isChunkError =
        msg.includes('dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch') ||
        msg.includes('error loading dynamically imported module');

      if (isChunkError && typeof window !== 'undefined') {
        const lastReload = window.sessionStorage.getItem('wangs_chunk_reload');
        const now = Date.now();
        // Reload once if we haven't reloaded in the last 10 seconds
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          window.sessionStorage.setItem('wangs_chunk_reload', String(now));
          window.location.reload();
          return new Promise(() => {}); // Hold until reload
        }
      }
      throw error;
    }
  });
}

// Global Vite preload error listener for seamless background refresh upon new version
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const lastReload = window.sessionStorage.getItem('wangs_preload_reload');
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      window.sessionStorage.setItem('wangs_preload_reload', String(now));
      window.location.reload();
    }
  });
}

const CheckoutPage = lazyWithRetry(() => import('./pages/CheckoutPage'));
const CustomerAccountPage = lazyWithRetry(() => import('./pages/CustomerAccountPage'));
const ManufacturerPortalPage = lazyWithRetry(() => import('./pages/ManufacturerPortalPage'));
const ManufacturerRegisterPage = lazyWithRetry(() => import('./pages/ManufacturerRegisterPage'));
const AdminDashboardPage = lazyWithRetry(() => import('./pages/AdminDashboardPage'));
const DeliveryPage = lazyWithRetry(() => import('./pages/DeliveryPage'));
const RewardsScanPage = lazyWithRetry(() => import('./pages/RewardsScanPage'));

import {
  AboutPage, TermsPage, PrivacyPage,
  ShippingPage, RefundsPage, ContactPage
} from './pages/StaticPages';

import MobileBottomNav from './components/MobileBottomNav';

function PageFallback() {
  return (
    <div className="min-h-[45vh] flex items-center justify-center p-8">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppLayout() {
  const { setIsDrawerOpen } = useCart();
  const { isAdmin, isMaintenanceMode, maintenanceMessage } = useAuth();
  const location = useLocation();

  // When website is in maintenance mode, regular visitors see the MaintenancePage.
  // Administrative management routes (/wangsadminspace or /wangadminspace), login (/login),
  // and authenticated administrators (who have Admin bypass) remain able to access and inspect the storefront.
  const isExcludedRoute =
    location.pathname.startsWith('/wangsadminspace') ||
    location.pathname.startsWith('/wangadminspace') ||
    location.pathname === '/login';
  const showMaintenance = isMaintenanceMode && !isAdmin && !isExcludedRoute;

  if (showMaintenance) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  const isAdminRoute =
    location.pathname.startsWith('/wangsadminspace') ||
    location.pathname.startsWith('/wangadminspace');
  const isDeliveryRoute = location.pathname.startsWith('/delivery') || location.pathname.startsWith('/courier');

  return (
    <div className={`min-h-screen flex flex-col bg-background text-on-surface selection:bg-primary selection:text-white ${isAdminRoute ? 'pb-0' : isDeliveryRoute ? 'pb-10' : 'pb-20 md:pb-0'}`}>
      <ScrollToTop />
      {!isAdminRoute && !isDeliveryRoute && <Navbar />}
      {!isAdminRoute && !isDeliveryRoute && <CartDrawer />}
      <AuthModal />

      <main className="flex-1">
        <ErrorBoundary>
          <React.Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/brands" element={<BrandsPage />} />
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
              <Route path="/account" element={<CustomerAccountPage />} />
              <Route path="/login" element={<AuthPage />} />

              {/* Wangs Rewards - QR-Based Delivery Confirmation */}
              <Route path="/rewards" element={<RewardsScanPage />} />
              <Route path="/rewards/scan" element={<RewardsScanPage />} />
              <Route path="/rewards/verify/:token" element={<RewardsScanPage />} />

              {/* Delivery Courier Portal - Accessible via /delivery and /courier */}
              <Route path="/delivery" element={<DeliveryPage />} />
              <Route path="/delivery/:orderNumber" element={<DeliveryPage />} />
              <Route path="/courier" element={<Navigate to="/delivery" replace />} />
              <Route path="/courier/:orderNumber" element={<DeliveryPage />} />

              {/* Manufacturer / Seller Portal */}
              <Route path="/manufacturer" element={<ManufacturerPortalPage />} />
              <Route path="/manufacturer/login" element={<ManufacturerPortalPage />} />
              <Route path="/manufacturer/register" element={<ManufacturerRegisterPage />} />

              {/* Admin Space - Accessible via /wangsadminspace and /wangadminspace */}
              <Route path="/wangsadminspace" element={<AdminDashboardPage />} />
              <Route path="/wangadminspace" element={<AdminDashboardPage />} />
              <Route path="/adminspace" element={<Navigate to="/wangsadminspace" replace />} />
              <Route path="/admin" element={<Navigate to="/wangsadminspace" replace />} />

              {/* Static & Legal */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/refunds" element={<RefundsPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Wildcard Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </main>

      {!isAdminRoute && !isDeliveryRoute && !location.pathname.startsWith('/product/') && <LiveSocialProof />}
      {!isAdminRoute && !isDeliveryRoute && <Footer />}
      {!isAdminRoute && !isDeliveryRoute && location.pathname !== '/checkout' && !location.pathname.startsWith('/product/') && (
        <MobileBottomNav onOpenCart={() => setIsDrawerOpen(true)} />
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled app error:', error, errorInfo);
    const msg = String(error?.message || error || '');
    const isChunkError =
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch') ||
      msg.includes('error loading dynamically imported module');

    // Automatic silent reload for chunk/cache mismatches after new deployments
    if (isChunkError && typeof window !== 'undefined') {
      const lastReload = window.sessionStorage.getItem('wangs_boundary_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        window.sessionStorage.setItem('wangs_boundary_reload', String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-cream-50 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-stone-200/90 shadow-xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-900">Please Reload to Continue</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Wangs has recently updated. Please refresh your browser window to load the latest marketplace view.
            </p>
            <div className="flex gap-2.5 justify-center pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer"
              >
                Reload View
              </button>
              <a
                href="/"
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 transition-colors cursor-pointer"
              >
                Storefront
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
