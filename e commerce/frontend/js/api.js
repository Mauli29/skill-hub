/* ============================================================
   api.js – Central fetch wrapper for SkillHub
   ============================================================ */

const API_BASE = 'http://localhost:8000/api';

/**
 * Core request helper
 * @param {string} path  - API path (e.g. '/services')
 * @param {object} opts  - fetch options override
 */
async function request(path, opts = {}) {
  const token = localStorage.getItem('sh_token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (let browser set boundary)
  if (opts.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 204) return null;          // No Content
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.detail || `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.map(e => e.msg).join(', ') : msg);
  }
  return data;
}

const api = {
  get:    (path)         => request(path, { method: 'GET' }),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
  upload: (path, form)   => request(path, { method: 'POST',   body: form }),
  uploadPut:(path, form) => request(path, { method: 'PUT',    body: form }),
};

export default api;
