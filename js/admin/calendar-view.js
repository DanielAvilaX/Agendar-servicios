/**
 * calendar-view.js
 * Vista de calendario para el panel de administración.
 * Admin puede ver, confirmar, revertir y eliminar citas.
 */

import { getReservationsByMonth, updateReservationStatus, deleteReservationsByIds } from '../services/reservations-service.js';
import { getEspecialistas }  from '../services/especialistas-service.js';
import { showConfirmModal }   from './confirm.js';
import { formatDateLabel }    from '../utils.js';

// ─── Estado ───────────────────────────────────────────────────────────────────

const state = {
  year:               new Date().getFullYear(),
  month:              new Date().getMonth() + 1,
  filterEspecialista: null,
  reservations:       [],
  specialists:        [],
  selectedDate:       null
};

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function init() {
  document.getElementById('calPrevBtn').addEventListener('click', () => navigate(-1));
  document.getElementById('calNextBtn').addEventListener('click', () => navigate(1));
  document.getElementById('calFilterEspecialista').addEventListener('change', onFilterChange);
  document.getElementById('calDayDetailClose').addEventListener('click', closeDayDetail);

  document.getElementById('dayDeleteSelectedBtn').addEventListener('click', handleDeleteSelected);
  document.getElementById('daySelectAllCheck').addEventListener('change', (e) => {
    document.querySelectorAll('.day-row-check').forEach(cb => { cb.checked = e.target.checked; });
    updateDaySelectState();
  });

  await populateFilter();
  await loadAndRender();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function populateFilter() {
  try { state.specialists = await getEspecialistas(); }
  catch { state.specialists = []; }

  const sel = document.getElementById('calFilterEspecialista');
  sel.innerHTML = '<option value="">Todos los especialistas</option>';
  state.specialists.forEach(esp => {
    const opt = document.createElement('option');
    opt.value       = esp.id;
    opt.textContent = `${esp.nombre} — ${esp.especialidadNombre}`;
    sel.appendChild(opt);
  });
}

async function loadAndRender() {
  document.getElementById('calMonthLabel').textContent =
    `${MONTHS_ES[state.month - 1]} ${state.year}`;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '<div class="cal-loading"><div class="loader-dots"><span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot-shadow"></span><span class="loader-dot-shadow"></span><span class="loader-dot-shadow"></span></div></div>';

  try {
    state.reservations = await getReservationsByMonth(
      state.year, state.month, state.filterEspecialista
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

async function onFilterChange() {
  const val = document.getElementById('calFilterEspecialista').value;
  state.filterEspecialista = val ? parseInt(val) : null;
  state.selectedDate = null;
  await loadAndRender();
}

// ─── Render del grid ──────────────────────────────────────────────────────────

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
  const panel     = document.getElementById('calDayDetail');
  const title     = document.getElementById('calDayDetailTitle');
  const tbody     = document.getElementById('calDayDetailList');
  const deleteBtn = document.getElementById('dayDeleteSelectedBtn');
  const selectAll = document.getElementById('daySelectAllCheck');

  title.textContent           = formatDateLabel(dateStr);
  selectAll.checked           = false;
  selectAll.indeterminate     = false;
  deleteBtn.disabled          = true;

  const dayReservations = state.reservations
    .filter(r => r.date === dateStr)
    .sort((a, b) => a.hora - b.hora);

  if (!dayReservations.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No hay citas para este día.</td></tr>`;
    panel.classList.remove('hidden');
    return;
  }

  tbody.innerHTML = dayReservations.map(r => {
    const esp        = state.specialists.find(e => e.id === r.especialistaId);
    const espNombre  = esp ? esp.nombre : 'Sin especialista';
    const isPending  = r.status === 'Pendiente';
    const badgeClass = isPending ? 'status-badge status-pending' : 'status-badge status-confirmed';
    const actionBtn  = isPending
      ? `<button class="btn btn-primary btn-sm day-confirm-btn" data-id="${r.id}">Confirmar</button>`
      : `<button class="btn btn-secondary btn-sm day-revert-btn" data-id="${r.id}">Revertir</button>`;

    return `
      <tr>
        <td class="col-check">
          <input type="checkbox" class="day-row-check admin-checkbox" data-id="${r.id}" />
        </td>
        <td style="color:var(--text-primary)">${r.customerName}</td>
        <td>${espNombre}</td>
        <td>${r.serviceName}</td>
        <td style="color:var(--text-primary); font-weight:600;">${r.time}</td>
        <td><span class="${badgeClass}">${r.status}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.day-row-check').forEach(cb => {
    cb.addEventListener('change', updateDaySelectState);
  });
  tbody.querySelectorAll('.day-confirm-btn').forEach(btn => {
    btn.addEventListener('click', () => handleStatusChange(parseInt(btn.dataset.id), 'Confirmada'));
  });
  tbody.querySelectorAll('.day-revert-btn').forEach(btn => {
    btn.addEventListener('click', () => handleStatusChange(parseInt(btn.dataset.id), 'Pendiente'));
  });

  panel.classList.remove('hidden');
}

function updateDaySelectState() {
  const all     = document.querySelectorAll('.day-row-check');
  const checked = document.querySelectorAll('.day-row-check:checked');
  const sel     = document.getElementById('daySelectAllCheck');
  const delBtn  = document.getElementById('dayDeleteSelectedBtn');

  delBtn.disabled = checked.length === 0;

  if (checked.length === 0) {
    sel.checked = false; sel.indeterminate = false;
  } else if (checked.length === all.length) {
    sel.checked = true;  sel.indeterminate = false;
  } else {
    sel.checked = false; sel.indeterminate = true;
  }
}

async function handleStatusChange(id, newStatus) {
  try {
    await updateReservationStatus(id, newStatus);
    const r = state.reservations.find(r => r.id === id);
    if (r) r.status = newStatus;
    renderCalendar();
    renderDayDetail(state.selectedDate);
  } catch (err) {
    showAdminMsg(`Error: ${err.message}`);
  }
}

function handleDeleteSelected() {
  const ids = [...document.querySelectorAll('.day-row-check:checked')]
    .map(cb => parseInt(cb.dataset.id));
  if (!ids.length) return;

  showConfirmModal({
    title:     '¿Eliminar citas seleccionadas?',
    message:   `Se eliminarán permanentemente ${ids.length} cita(s). Esta acción no se puede deshacer.`,
    icon:      '🗑️',
    okLabel:   'Sí, eliminar',
    okClass:   'btn btn-danger',
    onConfirm: async () => {
      await deleteReservationsByIds(ids);
      state.reservations = state.reservations.filter(r => !ids.includes(r.id));
      renderCalendar();
      renderDayDetail(state.selectedDate);
    }
  });
}

function closeDayDetail() {
  state.selectedDate = null;
  document.getElementById('calDayDetail').classList.add('hidden');
  renderCalendar();
}

function showAdminMsg(text) {
  const msg = document.getElementById('adminMessage');
  if (!msg) return;
  msg.textContent = text;
  setTimeout(() => { msg.textContent = ''; }, 5000);
}

export async function refresh() {
  await loadAndRender();
}
