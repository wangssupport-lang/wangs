import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';

import HomePage from './pages/HomePage';
import BrandsPage from './pages/BrandsPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import CustomerAccountPage from './pages/CustomerAccountPage';
import ManufacturerPortalPage from './pages/ManufacturerPortalPage';
import ManufacturerRegisterPage from './pages/ManufacturerRegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AuthPage from './pages/AuthPages';
import MaintenancePage from './pages/MaintenancePage';

import {
  AboutPage, TermsPage, PrivacyPage,
  ShippingPage, RefundsPage, ContactPage
} from './pages/StaticPages';

import MobileBottomNav from './components/MobileBottomNav';

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

  // When website is in maintenance mode, NO items or storefront pages are ever displayed.
  // The storefront strictly displays the MaintenancePage to everyone.
  // Administrative management routes (/wangadminspace) and login (/login) remain accessible for administrators.
  const isExcludedRoute = location.pathname.startsWith('/wangadminspace') || location.pathname === '/login';
  const showMaintenance = isMaintenanceMode && !isExcludedRoute;

  if (showMaintenance) {
    return <MaintenancePage message={maintenanceMessage} />;
  }

  const isAdminRoute = location.pathname.startsWith('/wangadminspace');

  return (
    <div className={`min-h-screen flex flex-col bg-cream-50 text-stone-900 selection:bg-forest-800 selection:text-white ${isAdminRoute ? 'pb-10' : 'pb-20 md:pb-0'}`}>
      <ScrollToTop />
      {!isAdminRoute && <Navbar />}
      {!isAdminRoute && <CartDrawer />}

      <main className="flex-1">
        <ErrorBoundary>
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

            {/* Manufacturer / Seller Portal */}
            <Route path="/manufacturer" element={<ManufacturerPortalPage />} />
            <Route path="/manufacturer/login" element={<ManufacturerPortalPage />} />
            <Route path="/manufacturer/register" element={<ManufacturerRegisterPage />} />

            {/* Admin Space - Accessible EXCLUSIVELY via /wangadminspace */}
            <Route path="/wangadminspace" element={<AdminDashboardPage />} />
            <Route path="/adminspace" element={<Navigate to="/" replace />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />

            {/* Static & Legal */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/refunds" element={<RefundsPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      {!isAdminRoute && <Footer />}
      {!isAdminRoute && location.pathname !== '/checkout' && (
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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-cream-50 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-stone-200 shadow-xl space-y-4">
            <h2 className="font-serif text-xl font-bold text-stone-900">Something went wrong</h2>
            <p className="text-xs text-stone-500">
              An unexpected error occurred while loading this view. You can refresh or return to the storefront.
            </p>
            {this.state.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left overflow-auto max-h-48">
                <p className="text-[11px] font-mono font-bold text-red-700 break-words">
                  {this.state.error?.message || String(this.state.error)}
                </p>
                {this.state.error?.stack && (
                  <pre className="text-[9px] font-mono text-red-600/80 mt-1 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                className="px-4 py-2 bg-forest-900 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
              >
                Reload View
              </button>
              <a
                href="/"
                className="px-4 py-2 bg-stone-100 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 cursor-pointer"
              >
                Home
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
