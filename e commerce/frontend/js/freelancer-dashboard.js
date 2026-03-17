import api from './api.js';
import { requireAuth, requireRole, getUser, logout, renderNavAuth, toast, formatPrice, formatDate, avatarInitials } from './auth.js';

requireAuth();

const user = getUser();
if (user && user.role !== 'freelancer') window.location.href = 'client-dashboard.html';

renderNavAuth();
document.getElementById('sb-name').textContent  = user?.name || '';
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
window.switchTab = function(tab) {
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('.sidebar-nav li').forEach(li => {
    li.classList.toggle('active', li.querySelector(`[data-tab="${tab}"]`) !== null);
  });
  if (tab === 'orders') loadAllOrders();
  if (tab === 'earnings') loadEarnings();
  if (tab === 'services') { loadMyServices(); loadCategories(); }
};

document.querySelectorAll('.sidebar-nav [data-tab]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.tab); });
});

// ── Load Stats ────────────────────────────────────────────
async function loadStats() {
  try {
    const stats = await api.get('/orders/stats/freelancer');
    document.getElementById('stat-earnings').textContent  = formatPrice(stats.total_earnings);
    document.getElementById('stat-active').textContent    = stats.active_orders;
    document.getElementById('stat-completed').textContent = stats.completed_projects;
    document.getElementById('earn-total').textContent     = formatPrice(stats.total_earnings);
    document.getElementById('earn-orders').textContent    = stats.completed_projects;
  } catch {}
}

// ── Load Recent Orders ────────────────────────────────────
async function loadRecentOrders() {
  const tbody = document.getElementById('recent-orders-body');
  try {
    const orders = await api.get('/orders/my');
    if (!orders.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6c757d">No orders yet</td></tr>';
      return;
    }
    tbody.innerHTML = orders.slice(0, 5).map(o => `
      <tr>
        <td>${o.client_id}</td>
        <td>Order #${o.id}</td>
        <td>${formatPrice(o.amount)}</td>
        <td><span class="badge badge-${o.status}">${o.status}</span></td>
        <td>${formatDate(o.created_at)}</td>
        <td>
          <select onchange="updateStatus(${o.id}, this.value)" style="padding:4px 8px;border:1px solid #dee2e6;border-radius:6px;font-size:.8rem">
            ${['pending','active','completed','cancelled'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc3545">${e.message}</td></tr>`;
  }
}

// ── Load All Orders ───────────────────────────────────────
async function loadAllOrders() {
  const tbody = document.getElementById('all-orders-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><div class="loader" style="margin:auto"></div></td></tr>';
  try {
    const orders = await api.get('/orders/my');
    if (!orders.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6c757d">No orders yet</td></tr>'; return; }
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>Client #${o.client_id}</td>
        <td>Order #${o.id}</td>
        <td>${formatPrice(o.amount)}</td>
        <td><span class="badge badge-${o.status}">${o.status}</span></td>
        <td>${formatDate(o.created_at)}</td>
        <td>
          <select onchange="updateStatus(${o.id}, this.value)" style="padding:4px 8px;border:1px solid #dee2e6;border-radius:6px;font-size:.8rem">
            ${['pending','active','completed','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc3545">${e.message}</td></tr>`;
  }
}

// ── Update order status ───────────────────────────────────
window.updateStatus = async function(orderId, status) {
  try {
    await api.put(`/orders/${orderId}/status?status=${status}`);
    toast(`Order #${orderId} updated to ${status}`, 'success');
    loadStats();
  } catch (e) { toast(e.message, 'error'); }
};

// ── Load Categories ───────────────────────────────────────
async function loadCategories() {
  const sel = document.getElementById('svc-category');
  if (sel.options.length > 1) return;
  try {
    const cats = await api.get('/services/categories');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = `${c.icon} ${c.name}`;
      sel.appendChild(opt);
    });
  } catch {}
}

// ── Load My Services ──────────────────────────────────────
async function loadMyServices() {
  const tbody = document.getElementById('my-services-body');
  const statEl = document.getElementById('stat-services');
  try {
    const svcs = await api.get('/services/my/listings');
    statEl.textContent = svcs.length;
    if (!svcs.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6c757d">No services yet. Add one above!</td></tr>';
      return;
    }
    tbody.innerHTML = svcs.map(s => `
      <tr>
        <td><strong>${s.title}</strong></td>
        <td>${s.category?.name || '—'}</td>
        <td>${formatPrice(s.price)}</td>
        <td>⭐ ${s.rating?.toFixed(1)} (${s.review_count})</td>
        <td><span class="badge badge-${s.is_active ? 'active' : 'cancelled'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-icon-edit" onclick="editService(${s.id})" title="Edit">✏️</button>
            <button class="btn-icon btn-icon-delete" onclick="deleteService(${s.id})" title="Delete">🗑</button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc3545">${e.message}</td></tr>`;
  }
}

// ── Image preview ─────────────────────────────────────────
document.getElementById('svc-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('img-preview');
    preview.src = ev.target.result;
    preview.classList.remove('hidden');
    document.getElementById('img-box-text').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

// ── Add / Edit Service form ───────────────────────────────
document.getElementById('service-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('svc-submit-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const editId = document.getElementById('edit-service-id').value;
  const payload = {
    title:       document.getElementById('svc-title').value,
    price:       parseFloat(document.getElementById('svc-price').value),
    description: document.getElementById('svc-desc').value,
    category_id: document.getElementById('svc-category').value || null,
  };
  try {
    let svc;
    if (editId) {
      svc = await api.put(`/services/${editId}`, payload);
    } else {
      svc = await api.post('/services', payload);
    }
    // Upload image if selected
    const imgFile = document.getElementById('svc-image').files[0];
    if (imgFile) {
      const form = new FormData();
      form.append('file', imgFile);
      await api.upload(`/services/${svc.id}/image`, form);
    }
    toast(editId ? 'Service updated!' : 'Service added!', 'success');
    resetServiceForm();
    loadMyServices();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = editId ? 'Update Service' : 'Add Service';
  }
});

function resetServiceForm() {
  document.getElementById('service-form').reset();
  document.getElementById('edit-service-id').value = '';
  document.getElementById('service-form-title').textContent = 'Add New Service';
  document.getElementById('svc-submit-btn').textContent = 'Add Service';
  document.getElementById('svc-cancel-btn').classList.add('hidden');
  document.getElementById('img-preview').classList.add('hidden');
  document.getElementById('img-box-text').style.display = '';
}

document.getElementById('svc-cancel-btn').addEventListener('click', resetServiceForm);

window.editService = async function(id) {
  try {
    const s = await api.get(`/services/${id}`);
    document.getElementById('edit-service-id').value = s.id;
    document.getElementById('svc-title').value = s.title;
    document.getElementById('svc-price').value = s.price;
    document.getElementById('svc-desc').value = s.description || '';
    document.getElementById('svc-category').value = s.category?.id || '';
    document.getElementById('service-form-title').textContent = 'Edit Service';
    document.getElementById('svc-submit-btn').textContent = 'Update Service';
    document.getElementById('svc-cancel-btn').classList.remove('hidden');
    document.getElementById('service-form').scrollIntoView({ behavior: 'smooth' });
  } catch (e) { toast(e.message, 'error'); }
};

window.deleteService = async function(id) {
  if (!confirm('Delete this service? This cannot be undone.')) return;
  try {
    await api.delete(`/services/${id}`);
    toast('Service deleted', 'success');
    loadMyServices();
  } catch (e) { toast(e.message, 'error'); }
};

// ── Load Earnings ─────────────────────────────────────────
async function loadEarnings() {
  const tbody = document.getElementById('earnings-body');
  try {
    const orders = await api.get('/orders/my');
    const completed = orders.filter(o => o.status === 'completed');
    tbody.innerHTML = completed.length
      ? completed.map(o => `<tr><td>Order #${o.id}</td><td>Client #${o.client_id}</td><td>${formatPrice(o.amount)}</td><td>${formatDate(o.created_at)}</td></tr>`).join('')
      : '<tr><td colspan="4" style="text-align:center;color:#6c757d">No completed orders yet</td></tr>';
  } catch {}
}

// ── Init ──────────────────────────────────────────────────
loadStats();
loadRecentOrders();
loadCategories();
