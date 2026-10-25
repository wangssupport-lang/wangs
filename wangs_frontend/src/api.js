const API_BASE = '/api';
const BACKEND_URL = 'http://127.0.0.1:8000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('wangs_token');
  const sessionKey = localStorage.getItem('wangs_session_key') || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(sessionKey ? { 'X-Session-Key': sessionKey } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    try {
      response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (fallbackErr) {
      throw new Error('Could not connect to backend server. Please verify the backend is running at http://127.0.0.1:8000.');
    }
  }

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || (data ? JSON.stringify(data) : response.statusText);
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

  // Manufacturer
  registerManufacturer: (payload) => apiRequest('/manufacturer/register/', { method: 'POST', body: JSON.stringify(payload) }),
  getManufacturerProfile: () => apiRequest('/manufacturer/profile/'),
  updateManufacturerProfile: (payload) => apiRequest('/manufacturer/profile/', { method: 'PATCH', body: JSON.stringify(payload) }),
  getManufacturerProducts: () => apiRequest('/manufacturer/products/'),
  createManufacturerProduct: (payload) => apiRequest('/manufacturer/products/', { method: 'POST', body: JSON.stringify(payload) }),
  updateManufacturerProduct: (id, payload) => apiRequest(`/manufacturer/products/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getManufacturerOrders: () => apiRequest('/manufacturer/orders/'),
  updateFulfillmentStatus: (orderItemId, status) => apiRequest('/manufacturer/orders/', { method: 'PATCH', body: JSON.stringify({ order_item_id: orderItemId, fulfillment_status: status }) }),
  getManufacturerFinancials: () => apiRequest('/manufacturer/financials/'),

  // Platform Public Configuration
  getPlatformSettings: () => apiRequest('/platform-settings/'),
  subscribeMaintenanceNotify: (email) => apiRequest('/maintenance/notify/', { method: 'POST', body: JSON.stringify({ email }) }),

  // Admin & Monitoring Console
  getAdminMetrics: () => apiRequest('/admin/metrics/'),
  getAdminUsers: () => apiRequest('/admin/users/'),
  toggleAdminUserSeller: (id) => apiRequest(`/admin/users/${id}/toggle_can_sell/`, { method: 'POST' }),
  toggleAdminUserBan: (id, payload = {}) => apiRequest(`/admin/users/${id}/toggle_ban/`, { method: 'POST', body: JSON.stringify(payload) }),
  updateAdminUserRole: (id, role) => apiRequest(`/admin/users/${id}/update_role/`, { method: 'POST', body: JSON.stringify({ role }) }),
  getMaintenanceSubscribers: () => apiRequest('/admin/maintenance-subscribers/'),
  deleteMaintenanceSubscriber: (id) => apiRequest('/admin/maintenance-subscribers/', { method: 'DELETE', body: JSON.stringify({ id }) }),
  toggleAdminSellerRegistration: () => apiRequest('/admin/toggle-seller-registration/', { method: 'POST' }),
  toggleAdminMaintenanceMode: (payload = {}) => apiRequest('/admin/toggle-maintenance-mode/', { method: 'POST', body: JSON.stringify(payload) }),
  getAdminSellerRequests: () => apiRequest('/admin/seller-requests/'),
  approveAdminSellerRequest: (email) => apiRequest('/admin/seller-requests/', { method: 'POST', body: JSON.stringify({ email }) }),
  deleteAdminSellerRequest: (id) => apiRequest('/admin/seller-requests/', { method: 'DELETE', body: JSON.stringify({ id }) }),
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
