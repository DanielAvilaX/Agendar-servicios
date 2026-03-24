/**
 * main.js
 * Flujo de reserva pública: especialidad → especialista → fecha → horarios → confirmación.
 */

import { getEspecialidades }                          from './services/especialidades-service.js';
import { getEspecialistasByEspecialidad, getHorarios } from './services/especialistas-service.js';
import {
  getReservationsByDate,
  isSlotAvailable,
  createReservation
} from './services/reservations-service.js';
import { ModalService }                               from './modal.js';
import { formatDateLabel, formatHour, isPastDate }    from './utils.js';

// ─── Estado ───────────────────────────────────────────────────────────────────

let _especialistaId     = null;
let _especialistaNombre = '';
let _especialidadNombre = '';
let _selectedHora       = null;
let _specialists        = [];

// ─── Init ─────────────────────────────────────────────────────────────────────

async function main() {
  ModalService.init();
  await populateEspecialidades();

  document.getElementById('bookingEspecialidad').addEventListener('change', onEspecialidadChange);
  document.getElementById('bookingEspecialista').addEventListener('change', onEspecialistaChange);
  document.getElementById('bookingDate').addEventListener('change', onDateChange);
  document.getElementById('openSlotsBtn').addEventListener('click', openSlotsModal);
  document.getElementById('reservationForm').addEventListener('submit', handleSubmit);
}

// ─── Especialidades ───────────────────────────────────────────────────────────

async function populateEspecialidades() {
  const select = document.getElementById('bookingEspecialidad');
  try {
    const items = await getEspecialidades();
    if (!items.length) {
      select.innerHTML = '<option value="" disabled selected>No hay especialidades disponibles</option>';
      return;
    }
    items.forEach(esp => {
      const opt = document.createElement('option');
      opt.value       = esp.id;
      opt.textContent = esp.nombre;
      select.appendChild(opt);
    });
  } catch (err) {
    setDateText(`Error al cargar especialidades: ${err.message}`);
  }
}

async function onEspecialidadChange() {
  const select = document.getElementById('bookingEspecialidad');
  const espId  = parseInt(select.value);
  _especialidadNombre = select.options[select.selectedIndex]?.text ?? '';

  _especialistaId = null;
  _selectedHora   = null;
  document.getElementById('bookingEspecialista').innerHTML =
    '<option value="" disabled selected>Selecciona un especialista</option>';
  document.getElementById('bookingDate').value = '';
  document.getElementById('especialistaGroup').classList.remove('hidden');
  document.getElementById('fechaGroup').classList.add('hidden');
  document.getElementById('openSlotsBtn').disabled = true;
  setDateText('Cargando especialistas…');

  try {
    _specialists = await getEspecialistasByEspecialidad(espId);
    const espSel = document.getElementById('bookingEspecialista');
    espSel.innerHTML = '<option value="" disabled selected>Selecciona un especialista</option>';

    if (!_specialists.length) {
      setDateText('No hay especialistas disponibles para esta especialidad.');
      return;
    }
    _specialists.forEach(esp => {
      const opt = document.createElement('option');
      opt.value       = esp.id;
      opt.textContent = esp.nombre;
      espSel.appendChild(opt);
    });
    setDateText('Selecciona un especialista.');
  } catch (err) {
    setDateText(`Error: ${err.message}`);
  }
}

function onEspecialistaChange() {
  const sel = document.getElementById('bookingEspecialista');
  _especialistaId     = parseInt(sel.value);
  _especialistaNombre = sel.options[sel.selectedIndex]?.text ?? '';
  _selectedHora       = null;

  document.getElementById('fechaGroup').classList.remove('hidden');
  document.getElementById('bookingDate').value = '';
  document.getElementById('openSlotsBtn').disabled = true;
  setDateText('Selecciona una fecha para ver los horarios disponibles.');
}

function onDateChange() {
  const val = document.getElementById('bookingDate').value;
  const btn = document.getElementById('openSlotsBtn');

  if (!val) { btn.disabled = true; return; }

  if (isPastDate(val)) {
    setDateText('La fecha seleccionada ya pasó. Por favor elige otra fecha.');
    btn.disabled = true;
    return;
  }

  setDateText(formatDateLabel(val));
  btn.disabled = !_especialistaId;
}

// ─── Modal de horarios ────────────────────────────────────────────────────────

async function openSlotsModal() {
  const date = document.getElementById('bookingDate').value;
  if (!date || !_especialistaId) return;

  const slotsContainer  = document.getElementById('slotsContainer');
  const reservationForm = document.getElementById('reservationForm');

  document.getElementById('modalTitle').textContent =
    `${_especialistaNombre} — ${formatDateLabel(date)}`;
  slotsContainer.innerHTML = '<p class="slots-loading">Cargando horarios…</p>';
  reservationForm.classList.add('hidden');
  ModalService.open();

  try {
    const dayOfWeek  = new Date(`${date}T00:00:00`).getDay();
    const horarios   = await getHorarios(_especialistaId);
    const horarioDia = horarios.find(h => h.dia_semana === dayOfWeek);

    if (!horarioDia) {
      slotsContainer.innerHTML =
        '<p class="slots-error">El especialista no atiende este día de la semana.</p>';
      return;
    }

    const reservations  = await getReservationsByDate(date, _especialistaId);
    const reservedHours = new Set(reservations.map(r => r.hora));

    const slots = [];
    for (let h = horarioDia.hora_inicio; h < horarioDia.hora_fin; h++) slots.push(h);

    if (!slots.length) {
      slotsContainer.innerHTML =
        '<p class="slots-error">No hay horarios configurados para este día.</p>';
      return;
    }

    slotsContainer.innerHTML = '';
    _selectedHora = null;

    slots.forEach(hora => {
      const available = !reservedHours.has(hora);
      const btn       = document.createElement('button');
      btn.type        = 'button';
      btn.className   = `slot-btn ${available ? 'available' : 'unavailable'}`;
      btn.textContent = formatHour(hora);
      btn.disabled    = !available;

      if (available) {
        btn.addEventListener('click', () => {
          slotsContainer.querySelectorAll('.slot-btn.selected')
            .forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          _selectedHora = hora;
          document.getElementById('selectedSlot').value = formatHour(hora);
          document.getElementById('reservationFeedback').textContent = '';
          document.getElementById('reservationFeedback').style.color = '';
          reservationForm.classList.remove('hidden');
        });
      }
      slotsContainer.appendChild(btn);
    });

  } catch (err) {
    slotsContainer.innerHTML =
      `<p class="slots-error">Error al cargar horarios: ${err.message}</p>`;
  }
}

// ─── Confirmar reserva ────────────────────────────────────────────────────────

async function handleSubmit(e) {
  e.preventDefault();

  const date         = document.getElementById('bookingDate').value;
  const customerName = document.getElementById('customerName').value.trim();
  const motivo       = document.getElementById('motivoConsulta').value.trim();
  const feedback     = document.getElementById('reservationFeedback');
  const submitBtn    = document.querySelector('#reservationForm button[type="submit"]');

  if (!_selectedHora || !_especialistaId) {
    feedback.textContent = 'Por favor selecciona un horario.';
    return;
  }

  submitBtn.disabled   = true;
  feedback.style.color = '';
  feedback.textContent = 'Procesando…';

  try {
    const available = await isSlotAvailable(date, _selectedHora, _especialistaId);
    if (!available) {
      feedback.textContent   = 'Ese horario ya no está disponible. Por favor elige otro.';
      submitBtn.disabled = false;
      return;
    }

    await createReservation({
      date,
      hora:           _selectedHora,
      customerName,
      serviceName:    _especialidadNombre,
      especialistaId: _especialistaId,
      motivoConsulta: motivo
    });

    feedback.style.color = 'var(--success)';
    feedback.textContent = '¡Cita agendada exitosamente!';
    document.getElementById('reservationForm').reset();
    _selectedHora = null;
    setTimeout(() => openSlotsModal(), 1500);

  } catch (err) {
    feedback.textContent   = err.message;
    submitBtn.disabled = false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setDateText(text) {
  document.getElementById('selectedDateText').textContent = text;
}

main().catch(console.error);
