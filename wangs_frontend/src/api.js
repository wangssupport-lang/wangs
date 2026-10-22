const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('wangs_token');
  const sessionKey = localStorage.getItem('wangs_session_key') || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(sessionKey ? { 'X-Session-Key': sessionKey } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

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
  // Auth
  login: (credentials) => apiRequest('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => apiRequest('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => apiRequest('/auth/me/'),
  getAddresses: () => apiRequest('/addresses/'),
  createAddress: (addr) => apiRequest('/addresses/', { method: 'POST', body: JSON.stringify(addr) }),

  // Catalog
  getCategories: () => apiRequest('/categories/'),
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/products/${query ? `?${query}` : ''}`);
  },
  getProductBySlug: (slug) => apiRequest(`/products/${slug}/`),
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

  // Admin
  getAdminMetrics: () => apiRequest('/admin/metrics/'),
  getAdminManufacturers: () => apiRequest('/admin/manufacturers/'),
  updateManufacturerStatus: (id, status, notes = '') => apiRequest(`/admin/manufacturers/${id}/update_status/`, { method: 'POST', body: JSON.stringify({ status, admin_review_notes: notes }) }),
  setCommissionOverride: (id, rate) => apiRequest(`/admin/manufacturers/${id}/set_commission_override/`, { method: 'POST', body: JSON.stringify({ commission_rate_override: rate }) }),
  getAdminProducts: () => apiRequest('/admin/products/'),
  updateProductStatus: (id, status) => apiRequest(`/admin/products/${id}/update_status/`, { method: 'POST', body: JSON.stringify({ status }) }),
  toggleFeaturedProduct: (id) => apiRequest(`/admin/products/${id}/toggle_featured/`, { method: 'POST' }),
  getAdminOrders: () => apiRequest('/admin/orders/'),
  updateOrderStatus: (id, status, notes = '') => apiRequest(`/admin/orders/${id}/update_order_status/`, { method: 'POST', body: JSON.stringify({ status, dispatch_notes: notes }) }),
  getCommissionSettings: () => apiRequest('/admin/commission/'),
  updateCommissionSettings: (payload) => apiRequest('/admin/commission/', { method: 'POST', body: JSON.stringify(payload) }),
  getSettlements: () => apiRequest('/admin/settlements/'),
  generateSettlement: (mfgId, notes = '') => apiRequest('/admin/settlements/', { method: 'POST', body: JSON.stringify({ manufacturer_id: mfgId, notes }) }),
  getAuditLogs: () => apiRequest('/admin/audit-logs/'),
};
