/**
 * calendar.js
 * Maneja la selección de fecha y el botón para abrir el modal de horarios.
 *
 * Usa un callback `onSlotsRequest` para evitar dependencias circulares con
 * reservations.js. La conexión entre módulos se hace en main.js.
 */

import { formatDateLabel, isPastDate } from './utils.js';

export const CalendarModule = {
  selectedDate: '',
  _onSlotsRequest: null,

  /**
   * Inicializa los event listeners del calendario.
   * @param {function(string): void} onSlotsRequest - Se llama con la fecha
   *   cuando el usuario hace clic en "Ver horarios disponibles".
   */
  init(onSlotsRequest) {
    this._onSlotsRequest = onSlotsRequest;

    const dateInput    = document.getElementById('bookingDate');
    const openSlotsBtn = document.getElementById('openSlotsBtn');

    if (dateInput) {
      dateInput.min = new Date().toISOString().split('T')[0];
      dateInput.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this._renderSelectedDateInfo();
      });
    }

    if (openSlotsBtn) {
      openSlotsBtn.addEventListener('click', () => {
        if (!this.selectedDate) {
          alert('Debes seleccionar una fecha antes de ver horarios.');
          return;
        }
        if (isPastDate(this.selectedDate)) {
          alert('No puedes agendar servicios en fechas pasadas.');
          return;
        }
        if (this._onSlotsRequest) this._onSlotsRequest(this.selectedDate);
      });
    }
  },

  _renderSelectedDateInfo() {
    const el    = document.getElementById('selectedDateText');
    const label = formatDateLabel(this.selectedDate);
    if (el) {
      el.textContent = this.selectedDate
        ? `Fecha seleccionada: ${label}`
        : 'Aún no has seleccionado una fecha.';
    }
  }
};
