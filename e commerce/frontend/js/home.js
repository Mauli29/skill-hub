import api from './api.js';
import { renderNavAuth, initMobileNav, renderStars, formatPrice, avatarInitials } from './auth.js';

const API_IMG = 'http://localhost:8000';

function serviceCardHTML(s) {
  const img = s.image
    ? `<img src="${API_IMG}${s.image}" alt="${s.title}" class="service-card-img">`
    : `<div class="service-card-img-placeholder">${s.category?.icon || '🔧'}</div>`;
  const avatar = s.owner?.avatar
    ? `<img src="${API_IMG}${s.owner.avatar}" class="service-card-avatar" alt="">`
    : `<div class="service-card-avatar" style="background:#1e4fc2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700">${avatarInitials(s.owner?.name)}</div>`;
  return `
    <a href="service-detail.html?id=${s.id}" class="service-card" style="text-decoration:none;color:inherit">
      ${img}
      <div class="service-card-body">
        <div class="service-card-freelancer">
          ${avatar}
          <span class="service-card-fname">${s.owner?.name || 'Freelancer'}</span>
        </div>
        <div class="service-card-title">${s.title}</div>
        <div class="service-card-desc">${(s.description || '').slice(0, 80)}${s.description?.length > 80 ? '…' : ''}</div>
        <div class="service-card-footer">
          <div class="star-rating">${renderStars(s.rating)} <span style="color:#6c757d;margin-left:4px">${s.rating?.toFixed(1)} (${s.review_count})</span></div>
          <div class="service-card-price">${formatPrice(s.price)}</div>
        </div>
      </div>
    </a>
  `;
}

function freelancerCardHTML(u, minPrice) {
  const avatar = u.avatar
    ? `<img src="${API_IMG}${u.avatar}" alt="${u.name}" class="freelancer-card-img">`
    : `<div class="freelancer-card-img-placeholder">${avatarInitials(u.name)}</div>`;
  return `
    <div class="freelancer-card">
      ${avatar}
      <div class="freelancer-card-body">
        <div class="freelancer-card-name">${u.name}</div>
        <div class="freelancer-card-role">${u.bio ? u.bio.slice(0, 60) : 'Freelancer'}</div>
        <div class="freelancer-card-meta">
          <div class="star-rating">${renderStars(4.8)} <strong>4.8</strong></div>
          <div class="starting-at">Starting at <strong>${minPrice ? formatPrice(minPrice) : '₹500'}</strong></div>
        </div>
        <a href="profile.html?id=${u.id}" class="btn btn-outline btn-sm btn-block">View Profile</a>
      </div>
    </div>
  `;
}

async function loadFeaturedServices() {
  const grid = document.getElementById('services-grid');
  try {
    const services = await api.get('/services?limit=8');
    if (!services.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No services yet</h3><p>Be the first to <a href="register.html">add a service</a></p></div>`;
      return;
    }
    grid.innerHTML = services.map(serviceCardHTML).join('');
  } catch {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>Could not load services</h3><p>Make sure the backend is running</p></div>`;
  }
}

async function loadFeaturedFreelancers() {
  const grid = document.getElementById('freelancer-grid');
  try {
    const services = await api.get('/services?limit=20');
    // Group by owner and pick one per freelancer
    const seen = new Set();
    const freelancers = [];
    for (const s of services) {
      if (s.owner && !seen.has(s.owner.id)) {
        seen.add(s.owner.id);
        freelancers.push({ user: s.owner, minPrice: s.price });
      }
      if (freelancers.length >= 4) break;
    }
    if (!freelancers.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><h3>No freelancers yet</h3></div>`;
      return;
    }
    grid.innerHTML = freelancers.map(f => freelancerCardHTML(f.user, f.minPrice)).join('');
  } catch {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>Could not load freelancers</h3></div>`;
  }
}

function initSearch() {
  const btn = document.getElementById('hero-search-btn');
  const inp = document.getElementById('hero-search-input');
  const go = () => {
    const q = inp.value.trim();
    if (q) window.location.href = `services.html?search=${encodeURIComponent(q)}`;
  };
  btn?.addEventListener('click', go);
  inp?.addEventListener('keydown', e => e.key === 'Enter' && go());

  document.querySelectorAll('.hero-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `services.html?search=${encodeURIComponent(btn.querySelector('.cat-icon').nextSibling.textContent.trim())}`;
    });
  });
}

// ── Init ──────────────────────────────────────────────────
renderNavAuth();
initMobileNav();
initSearch();
loadFeaturedFreelancers();
loadFeaturedServices();
