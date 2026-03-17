import api from './api.js';
import { renderNavAuth, initMobileNav, renderStars, formatPrice, avatarInitials } from './auth.js';

const API_IMG = 'http://localhost:8000';
let skip = 0;
const LIMIT = 12;
let currentSearch = '', currentCat = '', currentMin = '', currentMax = '';
let allServices = [];

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
        <div class="service-card-freelancer">${avatar}<span class="service-card-fname">${s.owner?.name || 'Freelancer'}</span></div>
        <div class="service-card-title">${s.title}</div>
        <div class="service-card-desc">${(s.description || '').slice(0,80)}${s.description?.length > 80 ? '…':''}</div>
        <div class="service-card-footer">
          <div class="star-rating">${renderStars(s.rating)}<span style="color:#6c757d;margin-left:4px">${s.rating?.toFixed(1)} (${s.review_count})</span></div>
          <div class="service-card-price">${formatPrice(s.price)}</div>
        </div>
      </div>
    </a>`;
}

async function loadCategories() {
  const bar = document.getElementById('categories-bar');
  try {
    const cats = await api.get('/services/categories');
    cats.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'cat-filter-btn';
      btn.dataset.id = c.id;
      btn.textContent = `${c.icon} ${c.name}`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = c.id;
        skip = 0;
        loadServices(false);
      });
      bar.appendChild(btn);
    });
  } catch {}
}

async function loadServices(append = false) {
  const grid = document.getElementById('services-grid');
  const countEl = document.getElementById('results-count');
  const loadMoreBtn = document.getElementById('load-more-btn');

  if (!append) {
    grid.innerHTML = '<div class="loader-wrapper" style="grid-column:1/-1"><div class="loader"></div></div>';
    skip = 0;
  }

  let url = `/services?skip=${skip}&limit=${LIMIT}`;
  if (currentSearch) url += `&search=${encodeURIComponent(currentSearch)}`;
  if (currentCat)    url += `&category_id=${currentCat}`;
  if (currentMin)    url += `&min_price=${currentMin}`;
  if (currentMax)    url += `&max_price=${currentMax}`;

  try {
    const services = await api.get(url);

    // Client-side sort
    const sort = document.getElementById('sort-select').value;
    if (sort === 'price-low')  services.sort((a,b) => a.price - b.price);
    if (sort === 'price-high') services.sort((a,b) => b.price - a.price);
    if (sort === 'rating')     services.sort((a,b) => b.rating - a.rating);

    if (!append) {
      if (!services.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>No services found</h3><p>Try a different search term</p></div>`;
        countEl.textContent = '0 services found';
        loadMoreBtn.classList.add('hidden');
        return;
      }
      grid.innerHTML = services.map(serviceCardHTML).join('');
    } else {
      grid.insertAdjacentHTML('beforeend', services.map(serviceCardHTML).join(''));
    }

    skip += services.length;
    countEl.textContent = `Showing ${skip} services`;
    loadMoreBtn.classList.toggle('hidden', services.length < LIMIT);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⚠️</div><h3>${err.message}</h3></div>`;
  }
}

// ── Init ──────────────────────────────────────────────────
renderNavAuth();
initMobileNav();
loadCategories();

// Pre-fill search from URL param
const urlParams = new URLSearchParams(window.location.search);
const searchParam = urlParams.get('search');
if (searchParam) {
  document.getElementById('search-input').value = searchParam;
  currentSearch = searchParam;
}
loadServices();

// Events
document.getElementById('search-btn').addEventListener('click', () => {
  currentSearch = document.getElementById('search-input').value.trim();
  loadServices(false);
});
document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { currentSearch = e.target.value.trim(); loadServices(false); }
});
document.getElementById('apply-filter').addEventListener('click', () => {
  currentMin = document.getElementById('min-price').value;
  currentMax = document.getElementById('max-price').value;
  loadServices(false);
});
document.getElementById('load-more-btn').addEventListener('click', () => loadServices(true));
document.querySelector('.cat-filter-btn[data-id=""]')?.addEventListener('click', () => {
  document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-filter-btn[data-id=""]').classList.add('active');
  currentCat = ''; loadServices(false);
});
