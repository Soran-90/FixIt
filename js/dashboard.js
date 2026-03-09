import { auth, db } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

const periodButtons = document.querySelectorAll('.filter-button');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const updatedAtEl = document.getElementById('updatedAt');
const logoutButton = document.getElementById('logoutButton');

const statTotal = document.getElementById('stat-total');
const statDone = document.getElementById('stat-done');
const statPending = document.getElementById('stat-pending');
const statRating = document.getElementById('stat-rating');

let allOrders = [];
let currentPeriod = 'daily';
let trendChart;
let servicesChart;

async function loadDashboard() {
  try {
    const snap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
    allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDashboard();
    renderUpdatedAt();
  } catch (err) {
    console.error('فشل تحميل البيانات:', err);
    if (resultsContainer) resultsContainer.innerHTML = '<p>تعذر تحميل البيانات حالياً.</p>';
  }
}

function filterByPeriod(orders, period) {
  const now = new Date();
  return orders.filter(o => {
    if (!o.createdAt) return false;
    const date = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const diff = (now - date) / (1000 * 60 * 60 * 24);
    if (period === 'daily') return diff <= 1;
    if (period === 'weekly') return diff <= 7;
    if (period === 'monthly') return diff <= 30;
    return true;
  });
}

function renderDashboard() {
  const filtered = filterByPeriod(allOrders, currentPeriod);
  const completed = filtered.filter(o => o.status === 'completed');
  const pending = filtered.filter(o => o.status === 'pending');
  const ratings = filtered.filter(o => o.rated && o.rating);
  const avgRating = ratings.length
    ? (ratings.reduce((s, o) => s + o.rating, 0) / ratings.length).toFixed(1)
    : null;

  if (statTotal) statTotal.textContent = filtered.length;
  if (statDone) statDone.textContent = completed.length;
  if (statPending) statPending.textContent = pending.length;
  if (statRating) statRating.textContent = avgRating ? `${avgRating} ⭐` : '—';

  renderCharts(filtered);
  renderSearch();
}

function renderCharts(orders) {
  const trendMap = {};
  orders.forEach(o => {
    if (!o.createdAt) return;
    const date = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const key = date.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
    trendMap[key] = (trendMap[key] || 0) + 1;
  });

  const trendLabels = Object.keys(trendMap).slice(-7);
  const trendValues = trendLabels.map(k => trendMap[k]);

  const serviceMap = {};
  orders.forEach(o => {
    if (!o.serviceType) return;
    serviceMap[o.serviceType] = (serviceMap[o.serviceType] || 0) + 1;
  });

  const serviceEntries = Object.entries(serviceMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const serviceLabels = serviceEntries.map(e => e[0]);
  const serviceValues = serviceEntries.map(e => e[1]);

  const trendCtx = document.getElementById('trendChart');
  const servicesCtx = document.getElementById('servicesChart');

  if (trendChart) trendChart.destroy();
  if (servicesChart) servicesChart.destroy();

  if (trendCtx) {
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: trendLabels.length ? trendLabels : ['لا توجد بيانات'],
        datasets: [{
          label: 'عدد الطلبات',
          data: trendValues,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13,110,253,0.1)',
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#0d6efd'
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  if (servicesCtx) {
    servicesChart = new Chart(servicesCtx, {
      type: 'bar',
      data: {
        labels: serviceLabels.length ? serviceLabels : ['لا توجد بيانات'],
        datasets: [{
          label: 'عدد الطلبات',
          data: serviceValues,
          backgroundColor: '#f2b705',
          borderRadius: 10,
          maxBarThickness: 32
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

function renderSearch() {
  if (!resultsContainer) return;
  const filtered = filterByPeriod(allOrders, currentPeriod);
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const matches = filtered.filter(o =>
    [o.id, o.serviceType, o.address, o.description]
      .some(f => String(f || '').toLowerCase().includes(q))
  );

  if (!matches.length) {
    resultsContainer.innerHTML = '<p class="muted">لا توجد نتائج مطابقة.</p>';
    return;
  }

  resultsContainer.innerHTML = matches.map(o => `
    <div class="result-row">
      <div><strong>${escapeHTML(o.id.slice(0, 8))}</strong><div class="chart-caption">${escapeHTML(o.serviceType || '')}</div></div>
      <div>${escapeHTML(o.address || '—')}</div>
      <div><span class="badge ${badgeClass(o.status)}">${translateStatus(o.status)}</span></div>
      <div class="hide-mobile">${o.createdAt ? formatDate(o.createdAt) : '—'}</div>
    </div>
  `).join('');
}

function translateStatus(s) {
  switch (s) {
    case 'pending': return 'قيد الانتظار';
    case 'assigned': return 'تم الإسناد';
    case 'accepted': return 'قيد التنفيذ';
    case 'completed': return 'مكتمل';
    default: return s || '—';
  }
}

function badgeClass(status) {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  return 'info';
}

function formatDate(ts) {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function escapeHTML(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderUpdatedAt() {
  if (updatedAtEl) {
    updatedAtEl.textContent = `آخر تحديث: ${new Date().toLocaleString('ar-IQ')}`;
  }
}

periodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    currentPeriod = btn.dataset.period;
    periodButtons.forEach(b => b.classList.toggle('active', b === btn));
    renderDashboard();
  });
});

if (searchInput) searchInput.addEventListener('input', renderSearch);

logoutButton?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.replace('/login.html');
  } catch {
    alert('تعذر تسجيل الخروج، حاول مرة أخرى');
  }
});

loadDashboard();
