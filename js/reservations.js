/**
 * reservations.js
 * Módulo de UI para el modal de horarios y el formulario de reserva.
 * Toda escritura/lectura de datos pasa por reservations-service.js.
 */

import { ModalService }       from './modal.js';
import { formatDateLabel, formatHour, generateTimeSlots } from './utils.js';
import {
  getReservationsByDate,
  isSlotAvailable,
  createReservation
} from './services/reservations-service.js';

// Hora entera seleccionada por el usuario en el modal (estado interno)
let _selectedHora      = null;
// Función que devuelve la fecha actualmente seleccionada en el calendario
let _getSelectedDate   = null;
// Función que devuelve la lista de servicios disponibles
let _getServices       = null;

export const ReservationsModule = {

  /**
   * @param {function(): string}   getSelectedDate - retorna la fecha del calendario
   * @param {function(): string[]} getServices     - retorna la lista de servicios
   */
  init(getSelectedDate, getServices) {
    _getSelectedDate = getSelectedDate;
    _getServices     = getServices;

    this._populateServiceSelect();
    this._bindFormSubmit();
  },

  // ─── Privados ───────────────────────────────────────────────────────────────

  _populateServiceSelect() {
    const select = document.getElementById('serviceName');
    if (!select) return;
    const services = _getServices();
    select.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value       = s;
      opt.textContent = s;
      select.appendChild(opt);
    });
  },

  _bindFormSubmit() {
    const form = document.getElementById('reservationForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._handleSubmit();
    });
  },

  async _handleSubmit() {
    const customerName = document.getElementById('customerName').value.trim();
    const serviceName  = document.getElementById('serviceName').value;
    const feedback     = document.getElementById('reservationFeedback');
    const submitBtn    = document.querySelector('#reservationForm button[type="submit"]');
    const date         = _getSelectedDate();

    if (!customerName || !serviceName || _selectedHora === null) {
      if (feedback) feedback.textContent = 'Por favor completa todos los campos.';
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (feedback) feedback.textContent = 'Verificando disponibilidad…';

    try {
      // Comprobación previa antes de insertar (evita round-trip doble en la
      // mayoría de los casos; el constraint en BD es la defensa final)
      const disponible = await isSlotAvailable(date, _selectedHora);
      if (!disponible) {
        if (feedback) feedback.textContent = 'Ese horario ya no está disponible.';
        return;
      }

      await createReservation({
        date,
        hora:         _selectedHora,
        customerName,
        serviceName
      });

      if (feedback) feedback.textContent = '¡Reserva registrada exitosamente!';

      // Limpiar formulario y volver a pintar los slots actualizados
      document.getElementById('reservationForm').reset();
      document.getElementById('serviceName').selectedIndex = 0;
      _selectedHora = null;

      setTimeout(() => {
        ModalService.close();
      }, 1400);

    } catch (err) {
      if (feedback) feedback.textContent = err.message || 'Error al registrar la reserva.';
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  // ─── Públicos ───────────────────────────────────────────────────────────────

  /**
   * Abre el modal, consulta Supabase y renderiza los slots disponibles/ocupados.
   * @param {string} date - 'YYYY-MM-DD'
   */
  async openSlotsModal(date) {
    const modalTitle     = document.getElementById('modalTitle');
    const slotsContainer = document.getElementById('slotsContainer');
    const form           = document.getElementById('reservationForm');
    const feedback       = document.getElementById('reservationFeedback');

    // Resetear estado
    _selectedHora = null;
    if (modalTitle)     modalTitle.textContent     = `Disponibilidad — ${formatDateLabel(date)}`;
    if (form)           form.classList.add('hidden');
    if (feedback)       feedback.textContent        = '';
    if (slotsContainer) slotsContainer.innerHTML    =
      '<p class="slots-loading">Cargando horarios…</p>';

    ModalService.open();

    try {
      const reservations  = await getReservationsByDate(date);
      const reservedHours = new Set(reservations.map(r => r.hora));
      const slots         = generateTimeSlots(); // [8, 9, ..., 21]

      if (!slotsContainer) return;
      slotsContainer.innerHTML = '';

      slots.forEach(hora => {
        const btn        = document.createElement('button');
        const isReserved = reservedHours.has(hora);

        btn.type        = 'button';
        btn.className   = `slot-btn ${isReserved ? 'unavailable' : 'available'}`;
        btn.textContent = formatHour(hora);
        btn.disabled    = isReserved;

        if (!isReserved) {
          btn.addEventListener('click', () => {
            _selectedHora = hora;
            const slotInput = document.getElementById('selectedSlot');
            if (slotInput) slotInput.value = formatHour(hora);
            if (form) form.classList.remove('hidden');
          });
        }

        slotsContainer.appendChild(btn);
      });

    } catch (err) {
      if (slotsContainer) {
        slotsContainer.innerHTML =
          `<p class="slots-error">Error al cargar horarios: ${err.message}</p>`;
      }
    }
  }
};
