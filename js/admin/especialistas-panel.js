/**
 * especialistas-panel.js
 * CRUD de especialistas con gestión de credenciales y horarios.
 */

import {
  getEspecialistas,
  createEspecialista,
  updateEspecialista,
  updateEspecialistaCredentials,
  deleteEspecialista,
  getHorarios,
  setHorarios
} from '../services/especialistas-service.js';
import { getEspecialidades } from '../services/especialidades-service.js';
import { showConfirmModal }   from './confirm.js';

const DIAS = [
  { label: 'Domingo',   value: 0 },
  { label: 'Lunes',     value: 1 },
  { label: 'Martes',    value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves',    value: 4 },
  { label: 'Viernes',   value: 5 },
  { label: 'Sábado',    value: 6 }
];

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6..23

let _editingId    = null;
let _specialists  = [];

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function init() {
  document.getElementById('newEspecialistaBtn').addEventListener('click', () => openModal(null));
  document.getElementById('espModalClose').addEventListener('click', closeModal);
  document.getElementById('espModalBackdrop').addEventListener('click', closeModal);
  document.getElementById('espModalSave').addEventListener('click', handleSave);

  renderScheduleForm([]);
  await renderList();
}

// ─── Render de lista ─────────────────────────────────────────────────────────

export async function renderList() {
  const container = document.getElementById('espList2');
  container.innerHTML = '<p style="color:var(--text-muted);">Cargando…</p>';

  try {
    _specialists = await getEspecialistas();
    if (!_specialists.length) {
      container.innerHTML = '<p style="color:var(--text-muted); padding: 16px 0;">No hay especialistas registrados.</p>';
      return;
    }
    container.innerHTML = _specialists.map(esp => `
      <div class="specialist-card">
        <div class="specialist-info">
          <span class="specialist-name">${esp.nombre}</span>
          <span class="specialist-specialty">${esp.especialidadNombre}</span>
        </div>
        <span class="specialist-user">@${esp.username}</span>
        <div class="specialist-badge ${esp.activo ? 'active' : 'inactive'}">
          ${esp.activo ? 'Activo' : 'Inactivo'}
        </div>
        <div class="specialist-actions">
          <button class="btn btn-secondary btn-sm sp-edit-btn" data-id="${esp.id}">Editar</button>
          <button class="btn btn-danger btn-sm sp-delete-btn"  data-id="${esp.id}">Eliminar</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.sp-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openModal(parseInt(btn.dataset.id)));
    });
    container.querySelectorAll('.sp-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDelete(parseInt(btn.dataset.id)));
    });
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

async function openModal(especialistaId) {
  _editingId = especialistaId;
  const modal = document.getElementById('especialistaModal');
  const title = document.getElementById('espModalTitle');
  const errEl = document.getElementById('espModalError');

  errEl.textContent = '';
  document.getElementById('espNombre').value    = '';
  document.getElementById('espUsername').value  = '';
  document.getElementById('espPassword').value  = '';
  document.getElementById('espPassword').placeholder = especialistaId ? '(dejar vacío para no cambiar)' : '••••••';
  renderScheduleForm([]);

  await populateEspecialidadesSelect();

  if (especialistaId) {
    title.textContent = 'Editar especialista';
    const esp = _specialists.find(e => e.id === especialistaId);
    if (esp) {
      document.getElementById('espNombre').value   = esp.nombre;
      document.getElementById('espUsername').value = esp.username;
      const espSel = document.getElementById('espEspecialidad');
      if (esp.especialidad_id) espSel.value = esp.especialidad_id;
    }
    try {
      const horarios = await getHorarios(especialistaId);
      renderScheduleForm(horarios);
    } catch { /* ignore */ }
  } else {
    title.textContent = 'Nuevo especialista';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('especialistaModal').classList.add('hidden');
  _editingId = null;
}

async function populateEspecialidadesSelect() {
  const sel = document.getElementById('espEspecialidad');
  sel.innerHTML = '<option value="" disabled selected>Selecciona una especialidad</option>';
  try {
    const especialidades = await getEspecialidades();
    especialidades.forEach(esp => {
      const opt = document.createElement('option');
      opt.value = esp.id;
      opt.textContent = esp.nombre;
      sel.appendChild(opt);
    });
  } catch { /* ignore */ }
}

// ─── Formulario de horario ────────────────────────────────────────────────────

function renderScheduleForm(existingHorarios) {
  const container = document.getElementById('scheduleForm');
  container.innerHTML = DIAS.map(dia => {
    const existing = existingHorarios.find(h => h.dia_semana === dia.value);
    const checked  = !!existing;
    const inicio   = existing?.hora_inicio ?? 8;
    const fin      = existing?.hora_fin    ?? 17;
    const hoursHtml = (selected) => HOURS.map(h =>
      `<option value="${h}" ${h === selected ? 'selected' : ''}>${h}:00</option>`
    ).join('');

    return `
      <div class="schedule-row">
        <label class="schedule-check-label">
          <input type="checkbox" class="schedule-day-check admin-checkbox"
            data-dia="${dia.value}" ${checked ? 'checked' : ''} />
          <span class="schedule-day-name">${dia.label}</span>
        </label>
        <div class="schedule-hours ${checked ? '' : 'hidden'}" data-dia="${dia.value}">
          <select class="sch-inicio" data-dia="${dia.value}" aria-label="Hora inicio">${hoursHtml(inicio)}</select>
          <span class="schedule-to">hasta</span>
          <select class="sch-fin"   data-dia="${dia.value}" aria-label="Hora fin">${hoursHtml(fin)}</select>
        </div>
      </div>
    `;
  }).join('');

  // Toggle visibilidad de horas al marcar/desmarcar día
  container.querySelectorAll('.schedule-day-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const hours = container.querySelector(`.schedule-hours[data-dia="${chk.dataset.dia}"]`);
      hours.classList.toggle('hidden', !chk.checked);
    });
  });
}

function getScheduleFromForm() {
  const horarios = [];
  document.querySelectorAll('.schedule-day-check:checked').forEach(chk => {
    const dia    = parseInt(chk.dataset.dia);
    const inicio = parseInt(document.querySelector(`.sch-inicio[data-dia="${dia}"]`).value);
    const fin    = parseInt(document.querySelector(`.sch-fin[data-dia="${dia}"]`).value);
    if (fin > inicio) {
      horarios.push({ dia_semana: dia, hora_inicio: inicio, hora_fin: fin });
    }
  });
  return horarios;
}

// ─── Guardar ──────────────────────────────────────────────────────────────────

async function handleSave() {
  const nombre        = document.getElementById('espNombre').value.trim();
  const especialidadId = parseInt(document.getElementById('espEspecialidad').value);
  const username      = document.getElementById('espUsername').value.trim();
  const password      = document.getElementById('espPassword').value;
  const errEl         = document.getElementById('espModalError');
  const btn           = document.getElementById('espModalSave');

  errEl.textContent = '';

  if (!nombre)        { errEl.textContent = 'El nombre es obligatorio.';        return; }
  if (!especialidadId){ errEl.textContent = 'Selecciona una especialidad.';     return; }
  if (!username)      { errEl.textContent = 'El usuario es obligatorio.';       return; }
  if (!_editingId && !password) { errEl.textContent = 'La contraseña es obligatoria.'; return; }

  const horarios = getScheduleFromForm();
  btn.disabled = true;

  try {
    if (_editingId) {
      await updateEspecialista(_editingId, { nombre, especialidadId });
      if (username || password) {
        await updateEspecialistaCredentials(_editingId, { username, password: password || undefined });
      }
      await setHorarios(_editingId, horarios);
    } else {
      await createEspecialista({ nombre, especialidadId, username, password, horarios });
    }
    closeModal();
    await renderList();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────

function confirmDelete(id) {
  const esp = _specialists.find(e => e.id === id);
  if (!esp) return;
  showConfirmModal({
    title:     '¿Eliminar especialista?',
    message:   `Se eliminará a "${esp.nombre}" junto con sus credenciales, horarios y citas quedarán sin especialista asignado.`,
    icon:      '🗑️',
    okLabel:   'Sí, eliminar',
    okClass:   'btn btn-danger',
    onConfirm: async () => {
      await deleteEspecialista(id);
      await renderList();
    }
  });
}
