const API_BASE = '/api';

// crypto.randomUUID only exists in secure contexts (HTTPS/localhost) and recent browsers.
// Fall back so plain-HTTP or older WebViews don't throw and break checkout / every API call.
export function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': randomId(),
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Error ${res.status}`);
  }

  return res.json();
}

// Multipart upload helper: attaches the admin token and surfaces backend errors
// (413/500/401) instead of silently resolving with a non-OK response.
async function uploadForm<T>(url: string, formData: FormData): Promise<T> {
  const token = sessionStorage.getItem('admin_token');
  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  getBrands: () => request<any[]>('/brands'),
  getCombos: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/combos${qs}`);
  },
  getCombo: (id: number) => request<any>(`/combos/${id}`),
  getComboPrice: (id: number, storage?: string) => {
    const qs = storage ? `?storage=${encodeURIComponent(storage)}` : '';
    return request<any>(`/combos/${id}/price${qs}`);
  },
  getCoverageAreas: () => request<any[]>('/coverage-areas'),
  getSocialLinks: () => request<any[]>('/social-links'),
  getPublicSettings: () => request<any>('/settings/public'),
  getBanners: () => request<any[]>('/banners'),
  getProducts: () => request<any[]>('/products'),

  createOrder: (data: unknown, idempotencyKey: string) =>
    request<any>('/orders', { method: 'POST', body: JSON.stringify(data), headers: { 'Idempotency-Key': idempotencyKey } }),
  getOrder: (ref: string, orderAccessToken: string) => request<any>(`/orders/${ref}`, { headers: { 'X-Order-Access-Token': orderAccessToken } }),
  downloadOrderPdf: async (ref: string, orderAccessToken: string) => {
    const response = await fetch(`/api/orders/${ref}/pdf`, { headers: { 'X-Order-Access-Token': orderAccessToken } });
    if (!response.ok) throw new Error('No fue posible descargar el documento');
    return response.blob();
  },

  getCustomPrice: (data: { brand_slug: string; mode: string; cameras_count: number; resolution: string }) =>
    request<any>('/custom-combo/price', { method: 'POST', body: JSON.stringify(data) }),

  adminLogin: (email: string, password: string) =>
    request<{ access_token: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminGetMe: () => request<any>('/admin/me'),
  adminGetDashboard: () => request<any>('/admin/dashboard'),
  adminGetBrands: () => request<any[]>('/admin/prices/brands'),
  adminUpdateBrand: (id: number, data: any) =>
    request<any>(`/admin/prices/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminGetCombos: () => request<any[]>('/admin/prices/combos'),
  adminUpdateCombo: (id: number, data: any) =>
    request<any>(`/admin/prices/combos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminGetSettings: () => request<any[]>('/admin/prices/settings'),
  adminUpdateSetting: (key: string, value: string) =>
    request<any>(`/admin/prices/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
  adminGetChangeLog: () => request<any[]>('/admin/prices/changelog'),
  adminGetOrders: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/admin/orders${qs}`);
  },
  adminGetOrder: (id: number) => request<any>(`/admin/orders/${id}`),
  adminUpdateOrderStatus: (id: number, status: string) =>
    request<any>(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  adminGetNotifications: () => request<any>('/admin/notifications'),
  adminMarkNotificationRead: (id: number) =>
    request<any>(`/admin/notifications/${id}/read`, { method: 'PUT' }),
  adminMarkAllRead: () =>
    request<any>('/admin/notifications/read-all', { method: 'PUT' }),
  adminGetSocialLinks: () => request<any[]>('/admin/social-links'),
  adminCreateSocialLink: (data: any) =>
    request<any>('/admin/social-links', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  adminUpdateSocialLink: (id: number, data: any) =>
    request<any>(`/admin/social-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  adminDeleteSocialLink: (id: number) =>
    request<any>(`/admin/social-links/${id}`, { method: 'DELETE' }),
  adminGetCoverage: () => request<any[]>('/admin/coverage-areas'),
  adminCreateCoverage: (name: string) =>
    request<any>('/admin/coverage-areas', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  adminToggleCoverage: (id: number) =>
    request<any>(`/admin/coverage-areas/${id}`, { method: 'PUT' }),
  adminDeleteCoverage: (id: number) =>
    request<any>(`/admin/coverage-areas/${id}`, { method: 'DELETE' }),

  adminGetCombosAdmin: () => request<any[]>('/admin/combos-admin'),
  adminCreateCombo: (data: URLSearchParams) =>
    request<any>('/admin/combos-admin', { method: 'POST', body: data.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  adminUpdateComboAdmin: (id: number, data: any) =>
    request<any>(`/admin/combos-admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCombo: (id: number) =>
    request<any>(`/admin/combos-admin/${id}`, { method: 'DELETE' }),
  adminUploadComboImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadForm<any>(`/api/admin/combos-admin/${id}/upload-image`, formData);
  },

  adminGetProductsAdmin: () => request<any[]>('/admin/products-admin'),
  adminCreateProduct: (data: URLSearchParams) =>
    request<any>('/admin/products-admin', { method: 'POST', body: data.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  adminUpdateProductAdmin: (id: number, data: any) =>
    request<any>(`/admin/products-admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteProduct: (id: number) =>
    request<any>(`/admin/products-admin/${id}`, { method: 'DELETE' }),
  adminUploadProductImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadForm<any>(`/api/admin/products-admin/${id}/upload-image`, formData);
  },

  adminGetBanners: () => request<any[]>('/admin/banners'),
  adminCreateBanner: (data: { title: string; subtitle?: string; video_url?: string; link_url?: string; position: number }) =>
    request<any>('/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
  adminCreateBannerWithImage: (data: { title: string; subtitle?: string; video_url?: string; link_url?: string; position: number }, file: File) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('position', String(data.position));
    if (data.subtitle) formData.append('subtitle', data.subtitle);
    if (data.video_url) formData.append('video_url', data.video_url);
    if (data.link_url) formData.append('link_url', data.link_url);
    formData.append('file', file);
    return uploadForm<any>('/api/admin/banners/with-image', formData);
  },
  adminUpdateBanner: (id: number, data: any) =>
    request<any>(`/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteBanner: (id: number) =>
    request<any>(`/admin/banners/${id}`, { method: 'DELETE' }),
  adminUploadBannerImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadForm<any>(`/api/admin/banners/${id}/upload`, formData);
  },
  adminUploadBrandLogo: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadForm<any>(`/api/admin/prices/brands/${id}/upload-logo`, formData);
  },
};
