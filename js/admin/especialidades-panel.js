/**
 * especialidades-panel.js
 * CRUD de especialidades en el panel de administración.
 */

import {
  getEspecialidades,
  createEspecialidad,
  updateEspecialidad,
  deleteEspecialidad
} from '../services/especialidades-service.js';
import { showConfirmModal } from './confirm.js';

let _editingId = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function init() {
  document.getElementById('espFormSubmit').addEventListener('click', handleSubmit);
  document.getElementById('espFormCancel').addEventListener('click', resetForm);
  await renderList();
}

// ─── Render de lista ─────────────────────────────────────────────────────────

export async function renderList() {
  const container = document.getElementById('espList');
  container.innerHTML = '<div style="padding:24px;text-align:center;"><div class="loader-dots"><span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot"></span><span class="loader-dot-shadow"></span><span class="loader-dot-shadow"></span><span class="loader-dot-shadow"></span></div></div>';

  try {
    const items = await getEspecialidades();
    if (!items.length) {
      container.innerHTML = '<p style="color:var(--text-muted); padding: 16px 0;">No hay especialidades registradas.</p>';
      return;
    }
    container.innerHTML = items.map(esp => `
      <div class="specialty-card" data-id="${esp.id}">
        <div class="specialty-info">
          <span class="specialty-name">${esp.nombre}</span>
          ${esp.descripcion ? `<span class="specialty-desc">${esp.descripcion}</span>` : ''}
        </div>
        <div class="specialty-badge ${esp.activa ? 'active' : 'inactive'}">
          ${esp.activa ? 'Activa' : 'Inactiva'}
        </div>
        <div class="specialty-actions">
          <button class="btn btn-secondary btn-sm esp-edit-btn" data-id="${esp.id}">Editar</button>
          <button class="btn btn-danger btn-sm esp-delete-btn" data-id="${esp.id}">Eliminar</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.esp-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = items.find(e => e.id === parseInt(btn.dataset.id));
        if (item) loadForm(item);
      });
    });

    container.querySelectorAll('.esp-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDelete(parseInt(btn.dataset.id), items));
    });
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

// ─── Formulario ───────────────────────────────────────────────────────────────

function loadForm(especialidad) {
  _editingId = especialidad.id;
  document.getElementById('espNombreInput').value   = especialidad.nombre;
  document.getElementById('espDescInput').value     = especialidad.descripcion ?? '';
  document.getElementById('espFormSubmit').textContent = 'Guardar cambios';
  document.getElementById('espFormCancel').classList.remove('hidden');
  document.getElementById('espFormTitle').textContent  = 'Editar especialidad';
  document.getElementById('espFormError').textContent  = '';
  document.getElementById('espNombreInput').focus();
}

function resetForm() {
  _editingId = null;
  document.getElementById('espNombreInput').value      = '';
  document.getElementById('espDescInput').value        = '';
  document.getElementById('espFormSubmit').textContent = 'Agregar especialidad';
  document.getElementById('espFormCancel').classList.add('hidden');
  document.getElementById('espFormTitle').textContent  = 'Nueva especialidad';
  document.getElementById('espFormError').textContent  = '';
}

async function handleSubmit() {
  const nombre = document.getElementById('espNombreInput').value.trim();
  const desc   = document.getElementById('espDescInput').value.trim();
  const errEl  = document.getElementById('espFormError');

  if (!nombre) {
    errEl.textContent = 'El nombre es obligatorio.';
    return;
  }

  const btn = document.getElementById('espFormSubmit');
  btn.disabled = true;
  errEl.textContent = '';

  try {
    if (_editingId) {
      await updateEspecialidad(_editingId, { nombre, descripcion: desc });
    } else {
      await createEspecialidad(nombre, desc);
    }
    resetForm();
    await renderList();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────

function confirmDelete(id, items) {
  const item = items.find(e => e.id === id);
  if (!item) return;
  showConfirmModal({
    title:     '¿Eliminar especialidad?',
    message:   `Se eliminará "${item.nombre}". Los especialistas de esta categoría quedarán sin especialidad asignada.`,
    icon:      '🗑️',
    okLabel:   'Sí, eliminar',
    okClass:   'btn btn-danger',
    onConfirm: async () => {
      await deleteEspecialidad(id);
      if (_editingId === id) resetForm();
      await renderList();
    }
  });
}
