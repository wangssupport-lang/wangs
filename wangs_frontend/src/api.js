const isProduction = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

const PROD_BACKEND_URL = 'https://wangs.onrender.com/api';
const DEV_BACKEND_URL = 'http://127.0.0.1:8000/api';

// Prioritize environment variable if set at build time (e.g. VITE_API_URL or VITE_API_BASE_URL)
// Defaults to relative '/api' which is proxied by Vercel rewrite to https://wangs.onrender.com/api
const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const DIRECT_BACKEND = isProduction ? PROD_BACKEND_URL : DEV_BACKEND_URL;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('wangs_token');
  const sessionKey = localStorage.getItem('wangs_session_key') || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(sessionKey ? { 'X-Session-Key': sessionKey } : {}),
    ...options.headers,
  };

  const primaryUrl = `${API_BASE}${endpoint}`;
  let response = null;
  let networkError = null;

  try {
    response = await fetch(primaryUrl, {
      ...options,
      headers,
    });
  } catch (err) {
    networkError = err;
  }

  // If primaryUrl failed or returned 502/503/504 (e.g. proxy rewrite failure),
  // immediately fallback to direct backend connection
  if (!response || (response.status >= 502 && response.status <= 504)) {
    const fallbackUrl = `${DIRECT_BACKEND}${endpoint}`;
    if (primaryUrl !== fallbackUrl) {
      try {
        response = await fetch(fallbackUrl, {
          ...options,
          headers,
        });
      } catch (fallbackErr) {
        throw new Error(
          isProduction
            ? 'Could not connect to Wangs backend at https://wangs.onrender.com. Please try again.'
            : 'Could not connect to backend server. Please verify the backend is running at http://127.0.0.1:8000.'
        );
      }
    } else if (networkError) {
      throw networkError;
    }
  }

  const contentType = response?.headers?.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response || !response.ok) {
    const errorMsg = data?.detail || data?.message || (data ? JSON.stringify(data) : response?.statusText || 'Request failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth & Resend Email OTP
  login: (credentials) => apiRequest('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => apiRequest('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/auth/me/'),
  sendOtp: (email, purpose = 'LOGIN') => apiRequest('/auth/send-otp/', { method: 'POST', body: JSON.stringify({ email, purpose }) }),
  verifyOtp: (email, otp_code, purpose = 'LOGIN') => apiRequest('/auth/verify-otp/', { method: 'POST', body: JSON.stringify({ email, otp_code, purpose }) }),
  resetPassword: (payload) => apiRequest('/auth/reset-password/', { method: 'POST', body: JSON.stringify(payload) }),
  requestSellerAccess: (payload) => apiRequest('/auth/request-seller-access/', { method: 'POST', body: JSON.stringify(payload) }),

  // Brands (Amazon-style Brand Spotlight)
  getBrands: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/brands/${query ? `?${query}` : ''}`);
  },
  getBrandBySlug: (slug) => apiRequest(`/brands/${slug}/`),

  // Addresses
  getAddresses: () => apiRequest('/addresses/'),
  createAddress: (addr) => apiRequest('/addresses/', { method: 'POST', body: JSON.stringify(addr) }),
  updateAddress: (id, addr) => apiRequest(`/addresses/${id}/`, { method: 'PATCH', body: JSON.stringify(addr) }),
  deleteAddress: (id) => apiRequest(`/addresses/${id}/`, { method: 'DELETE' }),

  // Catalog
  getCategories: () => apiRequest('/categories/'),
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products/${query ? `?${query}` : ''}`);
  },
  getProductBySlug: (slug) => apiRequest(`/products/${slug}/`),
  addProductReview: (slug, payload) => apiRequest(`/products/${slug}/add_review/`, { method: 'POST', body: JSON.stringify(payload) }),
  getFeaturedProducts: () => apiRequest('/products/featured/'),
  getBestsellerProducts: () => apiRequest('/products/bestsellers/'),
  checkPincode: (pincode) => apiRequest(`/pincode/check/?pincode=${pincode}`),

  // Cart & Checkout
  getCart: () => apiRequest('/cart/'),
  addToCart: (productId, quantity = 1) => apiRequest('/cart/', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }) }),
  updateCartItem: (productId, quantity) => apiRequest('/cart/', { method: 'PUT', body: JSON.stringify({ product_id: productId, quantity }) }),
  removeFromCart: (productId) => apiRequest(`/cart/?product_id=${productId}`, { method: 'DELETE' }),
  clearCart: () => apiRequest('/cart/', { method: 'DELETE' }),
  getCheckoutQuote: (couponCode = '') => apiRequest('/checkout/quote/', { method: 'POST', body: JSON.stringify({ coupon_code: couponCode }) }),
  createOrder: (orderPayload) => apiRequest('/checkout/create-order/', { method: 'POST', body: JSON.stringify(orderPayload) }),
  verifyPayment: (payload) => apiRequest('/payments/verify/', { method: 'POST', body: JSON.stringify(payload) }),
  lookupOrder: (orderNumber, verify = '') => apiRequest(`/orders/lookup/${orderNumber}/${verify ? `?verify=${verify}` : ''}`),
  getMyOrders: () => apiRequest('/orders/my-orders/'),

  // Delivery Portal (Direct link /delivery & QR scan)
  getDeliveryOrder: (identifier) => apiRequest(`/delivery/order/${encodeURIComponent(identifier)}/`),
  markDeliveryOrderDelivered: (identifier, notes = '') => apiRequest(`/delivery/order/${encodeURIComponent(identifier)}/mark-delivered/`, { method: 'POST', body: JSON.stringify({ notes }) }),
  getActiveDeliveryOrders: () => apiRequest('/delivery/active/'),

  // Manufacturer
  registerManufacturer: (payload) => apiRequest('/manufacturer/register/', { method: 'POST', body: JSON.stringify(payload) }),
  getManufacturerProfile: () => apiRequest('/manufacturer/profile/'),
  updateManufacturerProfile: (payload) => apiRequest('/manufacturer/profile/', { method: 'PATCH', body: JSON.stringify(payload) }),
  getManufacturerProducts: () => apiRequest('/manufacturer/products/'),
  createManufacturerProduct: (payload) => apiRequest('/manufacturer/products/', { method: 'POST', body: JSON.stringify(payload) }),
  updateManufacturerProduct: (id, payload) => apiRequest(`/manufacturer/products/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteManufacturerProduct: (id) => apiRequest(`/manufacturer/products/${id}/`, { method: 'DELETE' }),
  getManufacturerOrders: () => apiRequest('/manufacturer/orders/'),
  updateFulfillmentStatus: (orderItemId, status, extra = {}) => apiRequest('/manufacturer/orders/', { method: 'PATCH', body: JSON.stringify({ order_item_id: orderItemId, fulfillment_status: status, ...extra }) }),
  getManufacturerFinancials: () => apiRequest('/manufacturer/financials/'),

  // Platform Public Configuration
  getPlatformSettings: () => apiRequest('/platform-settings/'),
  subscribeMaintenanceNotify: (email) => apiRequest('/maintenance/notify/', { method: 'POST', body: JSON.stringify({ email }) }),

  // Admin & Monitoring Console
  getAdminMetrics: () => apiRequest('/admin/metrics/'),
  getAdminResearchMetadata: () => apiRequest('/admin/research-reports/?format=json'),
  downloadResearchFile: async (format = 'csv', type = 'all') => {
    const token = localStorage.getItem('wangs_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let res;
    try {
      res = await fetch(`/api/admin/research-reports/?format=${format}&type=${type}`, { headers });
    } catch (e) {
      res = await fetch(`http://127.0.0.1:8000/api/admin/research-reports/?format=${format}&type=${type}`, { headers });
    }
    if (!res.ok) {
      throw new Error(`Failed to download report: ${res.statusText}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = format === 'pdf'
      ? `wangs_research_report_${new Date().toISOString().slice(0, 10)}.pdf`
      : `wangs_${type}_research_${new Date().toISOString().slice(0, 10)}.csv`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  getAdminUsers: () => apiRequest('/admin/users/'),
  deleteAdminUser: (id) => apiRequest(`/admin/users/${id}/`, { method: 'DELETE' }),
  toggleAdminUserSeller: (id) => apiRequest(`/admin/users/${id}/toggle_can_sell/`, { method: 'POST' }),
  toggleAdminUserBan: (id, payload = {}) => apiRequest(`/admin/users/${id}/toggle_ban/`, { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminUserRole: (id, role) => apiRequest(`/admin/users/${id}/update_role/`, { method: 'POST', body: JSON.stringify({ role }) }),
  getMaintenanceSubscribers: () => apiRequest('/admin/maintenance-subscribers/'),
  deleteMaintenanceSubscriber: (id) => apiRequest('/admin/maintenance-subscribers/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  toggleAdminSellerRegistration: () => apiRequest('/admin/toggle-seller-registration/', { method: 'POST' }),
  toggleAdminMaintenanceMode: (payload = {}) => apiRequest('/admin/toggle-maintenance-mode/', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminSellerRequests: () => apiRequest('/admin/seller-requests/'),
  approveAdminSellerRequest: (email) => apiRequest('/admin/seller-requests/', { method: 'POST', body: JSON.stringify({ email }) }),
  deleteAdminSellerRequest: (payload) => apiRequest('/admin/seller-requests/', { method: 'DELETE', body: JSON.stringify(typeof payload === 'object' && payload !== null ? payload : { id: payload }) }),
  getAdminManufacturers: () => apiRequest('/admin/manufacturers/'),
  updateManufacturerStatus: (id, status, notes = '') => apiRequest(`/admin/manufacturers/${id}/update_status/`, { method: 'POST', body: JSON.stringify({ status, admin_review_notes: notes }) }),
  toggleManufacturerFeatured: (id, payload = {}) => apiRequest(`/admin/manufacturers/${id}/toggle_featured/`, { method: 'POST', body: JSON.stringify(payload) }),
  setManufacturerPriority: (id, priority) => apiRequest(`/admin/manufacturers/${id}/set_priority/`, { method: 'POST', body: JSON.stringify({ display_priority: priority }) }),
  setCommissionOverride: (id, rate) => apiRequest(`/admin/manufacturers/${id}/set_commission_override/`, { method: 'POST', body: JSON.stringify({ commission_rate_override: rate }) }),
  getAdminProducts: () => apiRequest('/admin/products/'),
  updateProductStatus: (id, status) => apiRequest(`/admin/products/${id}/update_status/`, { method: 'POST', body: JSON.stringify({ status }) }),
  toggleFeaturedProduct: (id) => apiRequest(`/admin/products/${id}/toggle_featured/`, { method: 'POST' }),
  toggleProductBestseller: (id) => apiRequest(`/admin/products/${id}/toggle_bestseller/`, { method: 'POST' }),
  updateProductStockPrice: (id, payload) => apiRequest(`/admin/products/${id}/update_stock_and_price/`, { method: 'POST', body: JSON.stringify(payload) }),
  getAdminOrders: () => apiRequest('/admin/orders/'),
  updateOrderStatus: (id, status, notes = '') => apiRequest(`/admin/orders/${id}/update_order_status/`, { method: 'POST', body: JSON.stringify({ status, dispatch_notes: notes }) }),
  updateOrderTracking: (id, payload) => apiRequest(`/admin/orders/${id}/update_dispatch_tracking/`, { method: 'POST', body: JSON.stringify(payload) }),
  getCommissionSettings: () => apiRequest('/admin/commission/'),
  updateCommissionSettings: (payload) => apiRequest('/admin/commission/', { method: 'POST', body: JSON.stringify(payload) }),
  getSettlements: () => apiRequest('/admin/settlements/'),
  generateSettlement: (mfgId, notes = '') => apiRequest('/admin/settlements/', { method: 'POST', body: JSON.stringify({ manufacturer_id: mfgId, notes }) }),
  getAuditLogs: () => apiRequest('/admin/audit-logs/'),
};
