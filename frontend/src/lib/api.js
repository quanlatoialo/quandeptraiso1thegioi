'use strict';

let csrfTokenCache = null;

export async function getCsrfToken() {
  if (csrfTokenCache) return csrfTokenCache;
  try {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      csrfTokenCache = data.csrfToken;
      return csrfTokenCache;
    }
  } catch (err) {
    console.error('Failed to fetch CSRF token:', err);
  }
  return '';
}

export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await getCsrfToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    // If CSRF token is expired/invalid, clear cache so next request retries fresh token
    if (res.status === 403 && data?.error?.code === 'CSRF_INVALID') {
      csrfTokenCache = null;
    }
    const err = new Error(data?.error?.message || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.code = data?.error?.code || 'ERROR';
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}

function normalizePath(endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  if (endpoint.startsWith('/api/')) return endpoint;
  if (endpoint.startsWith('/')) return `/api${endpoint}`;
  return `/api/${endpoint}`;
}

export const api = {
  get: (endpoint, options) => apiRequest(normalizePath(endpoint), { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    apiRequest(normalizePath(endpoint), {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (endpoint, body, options) =>
    apiRequest(normalizePath(endpoint), {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (endpoint, body, options) =>
    apiRequest(normalizePath(endpoint), {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: (endpoint, options) => apiRequest(normalizePath(endpoint), { ...options, method: 'DELETE' }),
};

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/api/uploads/image', {
    method: 'POST',
    body: formData,
  });
}
