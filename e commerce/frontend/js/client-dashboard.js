import api from './api.js';
import { requireAuth, getUser, logout, renderNavAuth, toast, formatPrice, formatDate, avatarInitials } from './auth.js';
import { initiatePayment } from './payment.js';

requireAuth();
const user = getUser();
renderNavAuth();

document.getElementById('sb-name').textContent = user?.name || '';
document.getElementById('welcome-msg').textContent = `Welcome back, ${user?.name?.split(' ')[0]}!`;
if (user?.avatar) {
  document.getElementById('sb-avatar').innerHTML = `<img src="http://localhost:8000${user.avatar}" alt="">`;
} else {
  document.getElementById('sb-avatar').textContent = avatarInitials(user?.name);
}
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('sidebar-toggle').addEventListener('click', () =>
  document.getElementById('sidebar').classList.toggle('open'));

// ── Tab switching ──────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.sidebar-nav li').forEach(li => {
    li.classList.toggle('active', li.querySelector(`[data-tab="${tab}"]`) !== null);
  });
  if (tab === 'projects')    loadProjects();
  if (tab === 'freelancers') loadHiredFreelancers();
  if (tab === 'payments')    loadPayments();
}
document.querySelectorAll('.sidebar-nav [data-tab]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); });
});

// ── Load Stats ────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await api.get('/orders/stats/client');
    document.getElementById('stat-open').textContent  = stats.open_projects;
    document.getElementById('stat-hired').textContent = stats.hired_freelancers;
    document.getElementById('stat-spent').textContent = formatPrice(stats.total_spent);
    document.getElementById('open-badge').textContent = stats.open_projects;
    document.getElementById('pay-total').textContent  = formatPrice(stats.total_spent);
  } catch {}
}

// ── Load Overview Orders ──────────────────────────────────
async function loadOverviewOrders() {
  const openEl    = document.getElementById('open-projects-list');
  const currentEl = document.getElementById('current-projects-list');
  try {
    const orders = await api.get('/orders/my');
    const open    = orders.filter(o => o.status === 'pending');
    const current = orders.filter(o => o.status === 'active');

    openEl.innerHTML = open.length
      ? open.map(o => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0">
          <div>
            <div style="font-weight:600;font-size:.88rem">Order #${o.id}</div>
            <div style="font-size:.78rem;color:#6c757d">${formatDate(o.created_at)}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="payOrder(${o.id})">Pay Now</button>
        </div>`).join('')
      : '<p style="color:#6c757d;font-size:.87rem">No open projects. <a href="services.html" style="color:#1e4fc2">Browse services</a></p>';

    currentEl.innerHTML = current.length
      ? current.map(o => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0">
          <div>
            <div style="font-weight:600;font-size:.88rem">Order #${o.id}</div>
            <div style="font-size:.78rem;color:#6c757d">${formatPrice(o.amount)}</div>
          </div>
          <span class="badge badge-active">Active</span>
        </div>`).join('')
      : '<p style="color:#6c757d;font-size:.87rem">No active projects</p>';
  } catch (e) {
    openEl.innerHTML = `<p style="color:#dc3545">${e.message}</p>`;
  }
}

// ── Pay pending order ─────────────────────────────────────
window.payOrder = async function(orderId) {
  try {
    await initiatePayment(orderId, () => { loadStats(); loadOverviewOrders(); });
  } catch (e) { toast(e.message, 'error'); }
};

// ── Load All Projects ─────────────────────────────────────
async function loadProjects() {
  const tbody = document.getElementById('projects-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><div class="loader" style="margin:auto"></div></td></tr>';
  try {
    const orders = await api.get('/orders/my');
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6c757d">No projects yet. <a href="services.html">Find a freelancer!</a></td></tr>'; return; }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>Order #${o.id}</td>
        <td>Freelancer #${o.freelancer_id}</td>
        <td>${formatPrice(o.amount)}</td>
        <td><span class="badge badge-${o.status}">${o.status}</span></td>
        <td>${formatDate(o.created_at)}</td>
        <td>
          ${o.status === 'pending' ? `<button class="btn btn-primary btn-sm" onclick="payOrder(${o.id})">Pay</button>` : '—'}
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc3545">${e.message}</td></tr>`;
  }
}

// ── Load Hired Freelancers ────────────────────────────────
async function loadHiredFreelancers() {
  const grid = document.getElementById('hired-grid');
  try {
    const orders = await api.get('/orders/my');
    const seen = new Set();
    const freelancers = [];
    for (const o of orders) {
      if (!seen.has(o.freelancer_id)) {
        seen.add(o.freelancer_id);
        freelancers.push(o);
      }
    }
    if (!freelancers.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><h3>No hired freelancers yet</h3><p><a href="services.html">Browse services</a> to get started</p></div>';
      return;
    }
    grid.innerHTML = freelancers.map(o => `
      <div style="background:#fff;border-radius:14px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,.07);text-align:center">
        <div style="width:60px;height:60px;border-radius:50%;background:#1e4fc2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700;margin:0 auto 12px">F</div>
        <div style="font-weight:700;margin-bottom:4px">Freelancer #${o.freelancer_id}</div>
        <div style="font-size:.8rem;color:#6c757d;margin-bottom:12px">${formatPrice(o.amount)} paid</div>
        <a href="messages.html?to=${o.freelancer_id}" class="btn btn-outline btn-sm btn-block">Message</a>
      </div>`).join('');
  } catch (e) { grid.innerHTML = `<div style="color:#dc3545">${e.message}</div>`; }
}

// ── Load Payments ─────────────────────────────────────────
async function loadPayments() {
  const tbody = document.getElementById('payments-body');
  try {
    const orders = await api.get('/orders/my');
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6c757d">No payments yet</td></tr>'; return; }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>Service #${o.service_id}</td>
        <td>${formatPrice(o.amount)}</td>
        <td><span class="badge badge-${o.status}">${o.status}</span></td>
        <td>${formatDate(o.created_at)}</td>
      </tr>`).join('');
  } catch {}
}

// ── Init ──────────────────────────────────────────────────
loadStats();
loadOverviewOrders();
