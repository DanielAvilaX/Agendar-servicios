/**
 * modal.js
 * Controla el modal de selección de horarios.
 */

export const ModalService = {
  modal: null,

  init() {
    this.modal = document.getElementById('slotsModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const backdrop = document.getElementById('modalBackdrop');

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (backdrop) backdrop.addEventListener('click', () => this.close());
  },

  open() {
    if (!this.modal) return;
    this.modal.classList.remove('hidden');
  },

  close() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
    const form     = document.getElementById('reservationForm');
    const feedback = document.getElementById('reservationFeedback');
    if (form)     form.classList.add('hidden');
    if (feedback) feedback.textContent = '';
  }
};
