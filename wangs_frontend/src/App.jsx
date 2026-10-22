import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';

import HomePage from './pages/HomePage';
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

import {
  AboutPage, TermsPage, PrivacyPage,
  ShippingPage, RefundsPage, ContactPage
} from './pages/StaticPages';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-cream-50 text-stone-900 selection:bg-forest-800 selection:text-white">
            <Navbar />
            <CartDrawer />

            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductListPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
                <Route path="/account" element={<CustomerAccountPage />} />
                <Route path="/login" element={<AuthPage />} />

                {/* Manufacturer */}
                <Route path="/manufacturer" element={<ManufacturerPortalPage />} />
                <Route path="/manufacturer/register" element={<ManufacturerRegisterPage />} />

                {/* Admin */}
                <Route path="/admin" element={<AdminDashboardPage />} />

                {/* Static & Legal */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/shipping" element={<ShippingPage />} />
                <Route path="/refunds" element={<RefundsPage />} />
                <Route path="/contact" element={<ContactPage />} />
              </Routes>
            </main>

            <Footer />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
