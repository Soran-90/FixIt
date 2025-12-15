import { format } from 'https://cdn.jsdelivr.net/npm/date-fns@2.30.0/esm/index.js';

const API_URL = '../api/dashboard-summary.json';
const periodButtons = document.querySelectorAll('.filter-button');
const searchInput = document.getElementById('searchInput');
const resultsContainer = document.getElementById('resultsContainer');
const updatedAtEl = document.getElementById('updatedAt');

const statTotal = document.getElementById('stat-total');
const statDone = document.getElementById('stat-done');
const statRevenue = document.getElementById('stat-revenue');
const statResponse = document.getElementById('stat-response');
const statTrend = document.getElementById('stat-trend');

let dashboardData = null;
let currentPeriod = 'weekly';
let trendChart;
let servicesChart;

async function loadDashboard() {
  try {
    const res = await fetch(API_URL);
    dashboardData = await res.json();
    setPeriod(currentPeriod);
    attachEvents();
  } catch (error) {
    console.error('فشل تحميل البيانات', error);
    resultsContainer.innerHTML = '<p>تعذر تحميل البيانات حالياً.</p>';
  }
}

function attachEvents() {
  periodButtons.forEach(btn => {
    btn.addEventListener('click', () => setPeriod(btn.dataset.period));
  });

  searchInput.addEventListener('input', () => renderSearch());
}

function setPeriod(period) {
  if (!dashboardData?.timeframes?.[period]) return;
  currentPeriod = period;

  periodButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });

  const frame = dashboardData.timeframes[period];
  renderStats(frame.stats);
  renderCharts(frame);
  renderSearch();
  renderUpdatedAt();
}

function renderStats(stats) {
  statTotal.textContent = stats.totalOrders;
  statDone.textContent = stats.completedOrders;
  statRevenue.textContent = `${stats.revenue.toLocaleString()} ريال`;
  statResponse.textContent = stats.avgResponse.toFixed(1);
  statTrend.textContent = `${stats.trend > 0 ? '⬆︎' : '⬇︎'} ${Math.abs(stats.trend)}%`;
}

function renderCharts(frame) {
  const trendCtx = document.getElementById('trendChart');
  const servicesCtx = document.getElementById('servicesChart');

  const trendLabels = frame.trend.map(t => t.label);
  const trendValues = frame.trend.map(t => t.value);

  const serviceLabels = frame.services.map(s => s.label);
  const serviceValues = frame.services.map(s => s.value);

  if (trendChart) trendChart.destroy();
  if (servicesChart) servicesChart.destroy();

  trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: trendLabels,
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

  servicesChart = new Chart(servicesCtx, {
    type: 'bar',
    data: {
      labels: serviceLabels,
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

function renderSearch() {
  const query = searchInput.value.trim().toLowerCase();
  const orders = dashboardData.timeframes[currentPeriod].orders || [];

  const matches = orders.filter(order => {
    return [order.id, order.customer, order.service]
      .some(field => String(field).toLowerCase().includes(query));
  });

  if (!matches.length) {
    resultsContainer.innerHTML = '<p>لا توجد نتائج مطابقة.</p>';
    return;
  }

  const rows = matches.map(order => `
    <div class="result-row">
      <div><strong>${order.id}</strong><div class="chart-caption">${order.customer}</div></div>
      <div>${order.service}</div>
      <div class="hide-mobile"><span class="badge ${badgeClass(order.status)}">${order.status}</span></div>
      <div class="hide-mobile">${order.total.toLocaleString()} ر.س</div>
    </div>
  `).join('');

  resultsContainer.innerHTML = rows;
}

function badgeClass(status) {
  if (status === 'مكتمل') return 'success';
  if (status === 'ملغي') return 'warning';
  return 'info';
}

function renderUpdatedAt() {
  if (!dashboardData?.updatedAt) return;
  try {
    const formatted = format(new Date(dashboardData.updatedAt), 'dd MMM yyyy, HH:mm');
    updatedAtEl.textContent = `آخر تحديث: ${formatted}`;
  } catch (e) {
    updatedAtEl.textContent = `آخر تحديث: ${dashboardData.updatedAt}`;
  }
}

loadDashboard();
