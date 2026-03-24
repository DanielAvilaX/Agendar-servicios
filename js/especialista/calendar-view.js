/**
 * especialista/calendar-view.js
 * Vista de calendario para el portal del especialista.
 * Solo lectura + puede confirmar/revertir sus propias citas.
 */

import { getReservationsByMonth, updateReservationStatus } from '../services/reservations-service.js';
import { formatDateLabel } from '../utils.js';

const state = {
  year:           new Date().getFullYear(),
  month:          new Date().getMonth() + 1,
  especialistaId: null,
  reservations:   [],
  selectedDate:   null
};

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function init(especialistaId) {
  state.especialistaId = especialistaId;

  document.getElementById('calPrevBtn').addEventListener('click', () => navigate(-1));
  document.getElementById('calNextBtn').addEventListener('click', () => navigate(1));
  document.getElementById('calDayDetailClose').addEventListener('click', closeDayDetail);

  await loadAndRender();
}

// ─── Carga y render ───────────────────────────────────────────────────────────

async function loadAndRender() {
  document.getElementById('calMonthLabel').textContent =
    `${MONTHS_ES[state.month - 1]} ${state.year}`;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '<div class="cal-loading">Cargando…</div>';

  try {
    state.reservations = await getReservationsByMonth(
      state.year, state.month, state.especialistaId
    );
  } catch (err) {
    grid.innerHTML = `<div class="cal-loading" style="color:var(--danger)">Error: ${err.message}</div>`;
    return;
  }

  renderCalendar();
  closeDayDetail();
}

function navigate(delta) {
  state.month += delta;
  if (state.month > 12) { state.month = 1;  state.year++; }
  if (state.month < 1)  { state.month = 12; state.year--; }
  state.selectedDate = null;
  loadAndRender();
}

// ─── Grid mensual ─────────────────────────────────────────────────────────────

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const countsByDate = {};
  state.reservations.forEach(r => {
    countsByDate[r.date] = (countsByDate[r.date] ?? 0) + 1;
  });

  const firstDay  = new Date(state.year, state.month - 1, 1).getDay();
  const totalDays = new Date(state.year, state.month, 0).getDate();
  const today     = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day cal-day--empty';
    grid.appendChild(cell);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${state.year}-${String(state.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count   = countsByDate[dateStr] ?? 0;
    const isToday = dateStr === today;
    const isSel   = dateStr === state.selectedDate;

    const cell = document.createElement('div');
    cell.className = 'cal-day' +
      (isToday ? ' cal-day--today' : '') +
      (isSel   ? ' cal-day--selected' : '');
    cell.dataset.date = dateStr;
    cell.innerHTML = `
      <span class="cal-day-num">${d}</span>
      ${count > 0 ? `<span class="cal-event-count">${count}</span>` : ''}
    `;
    cell.addEventListener('click', () => selectDay(dateStr));
    grid.appendChild(cell);
  }
}

// ─── Detalle de día ───────────────────────────────────────────────────────────

function selectDay(dateStr) {
  state.selectedDate = dateStr;
  renderCalendar();
  renderDayDetail(dateStr);
}

function renderDayDetail(dateStr) {
  const panel = document.getElementById('calDayDetail');
  const title = document.getElementById('calDayDetailTitle');
  const tbody = document.getElementById('calDayDetailList');

  title.textContent = formatDateLabel(dateStr);

  const dayReservations = state.reservations
    .filter(r => r.date === dateStr)
    .sort((a, b) => a.hora - b.hora);

  if (!dayReservations.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No tienes citas para este día.</td></tr>`;
    panel.classList.remove('hidden');
    return;
  }

  tbody.innerHTML = dayReservations.map(r => {
    const isPending  = r.status === 'Pendiente';
    const badgeClass = isPending ? 'status-badge status-pending' : 'status-badge status-confirmed';
    const actionBtn  = isPending
      ? `<button class="btn btn-primary btn-sm esp-confirm-btn" data-id="${r.id}">Confirmar</button>`
      : `<button class="btn btn-secondary btn-sm esp-revert-btn" data-id="${r.id}">Revertir</button>`;

    return `
      <tr>
        <td style="color:var(--text-primary); font-weight:600;">${r.time}</td>
        <td style="color:var(--text-primary)">${r.customerName}</td>
        <td>${r.serviceName}</td>
        <td>${r.motivoConsulta || '—'}</td>
        <td><span class="${badgeClass}">${r.status}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.esp-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => handleStatusChange(parseInt(btn.dataset.id), 'Confirmada'));
  });
  tbody.querySelectorAll('.esp-revert-btn').forEach(btn => {
    btn.addEventListener('click', () => handleStatusChange(parseInt(btn.dataset.id), 'Pendiente'));
  });

  panel.classList.remove('hidden');
}

async function handleStatusChange(id, newStatus) {
  try {
    await updateReservationStatus(id, newStatus);
    const r = state.reservations.find(r => r.id === id);
    if (r) r.status = newStatus;
    renderCalendar();
    renderDayDetail(state.selectedDate);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function closeDayDetail() {
  state.selectedDate = null;
  document.getElementById('calDayDetail').classList.add('hidden');
  renderCalendar();
}
