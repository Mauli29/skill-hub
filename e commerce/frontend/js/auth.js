/* ============================================================
   auth.js – JWT auth management for SkillHub
   ============================================================ */
import api from './api.js';

// ── Storage helpers ───────────────────────────────────────
export function getToken()    { return localStorage.getItem('sh_token'); }
export function getUser()     { const u = localStorage.getItem('sh_user'); return u ? JSON.parse(u) : null; }
export function isLoggedIn()  { return !!getToken(); }

export function setSession(token, user) {
  localStorage.setItem('sh_token', token);
  localStorage.setItem('sh_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('sh_token');
  localStorage.removeItem('sh_user');
}

export function requireAuth(redirectTo = 'login.html') {
  if (!isLoggedIn()) { window.location.href = redirectTo; return false; }
  return true;
}

export function requireRole(role, redirectTo = 'index.html') {
  const user = getUser();
  if (!user || user.role !== role) { window.location.href = redirectTo; return false; }
  return true;
}

// ── API calls ─────────────────────────────────────────────
export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });
  setSession(data.access_token, data.user);
  return data.user;
}

export async function register(name, email, password, role) {
  const data = await api.post('/auth/register', { name, email, password, role });
  setSession(data.access_token, data.user);
  return data.user;
}

export function logout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── Navbar rendering ──────────────────────────────────────
export function renderNavAuth() {
  const actionsEl = document.getElementById('nav-actions');
  if (!actionsEl) return;
  const user = getUser();
  if (user) {
    const dashHref = user.role === 'freelancer' ? 'freelancer-dashboard.html'
                   : user.role === 'admin'       ? 'admin.html'
                                                  : 'client-dashboard.html';
    actionsEl.innerHTML = `
      <a href="${dashHref}" class="btn btn-outline">Dashboard</a>
      <button onclick="import('./auth.js').then(m=>m.logout())" class="btn btn-primary">Logout</button>
    `;
  } else {
    actionsEl.innerHTML = `
      <a href="login.html"    class="btn btn-outline">Sign In</a>
      <a href="register.html" class="btn btn-primary">Join</a>
    `;
  }
}

// ── Toast notifications ───────────────────────────────────
export function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(120%)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 320); }, duration);
}

// ── Stars renderer ────────────────────────────────────────
export function renderStars(rating, max = 5) {
  let html = '';
  for (let i = 1; i <= max; i++) {
    html += `<span style="color:${i <= Math.round(rating) ? '#ffc107' : '#dee2e6'}">★</span>`;
  }
  return `<span class="stars">${html}</span>`;
}

// ── Format currency ───────────────────────────────────────
export function formatPrice(amount) { return `₹${Number(amount).toLocaleString('en-IN')}`; }

// ── Format date ───────────────────────────────────────────
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Avatar initials ───────────────────────────────────────
export function avatarInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Mobile nav toggle ─────────────────────────────────────
export function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }
}
