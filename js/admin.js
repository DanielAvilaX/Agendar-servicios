const AdminModule = {
  init() {
    const clearSelectedDateBtn = document.getElementById('clearSelectedDateBtn');
    const clearAllReservationsBtn = document.getElementById('clearAllReservationsBtn');

    if (clearSelectedDateBtn) {
      clearSelectedDateBtn.addEventListener('click', () => {
        const adminMessage = document.getElementById('adminMessage');
        const selectedDate = CalendarModule.selectedDate;

        if (!selectedDate) {
          adminMessage.textContent = 'Debes seleccionar una fecha primero.';
          return;
        }

        StorageService.removeReservationsByDate(selectedDate);
        ReservationsModule.renderDaySummary(selectedDate);
        ReservationsModule.renderReservationsTable(selectedDate);
        adminMessage.textContent = 'Reservas de la fecha eliminadas correctamente.';
      });
    }

    if (clearAllReservationsBtn) {
      clearAllReservationsBtn.addEventListener('click', () => {
        const confirmed = confirm('¿Seguro que deseas eliminar todas las reservas?');
        const adminMessage = document.getElementById('adminMessage');

        if (!confirmed) return;

        StorageService.clearAll();
        ReservationsModule.renderDaySummary(CalendarModule.selectedDate);
        ReservationsModule.renderReservationsTable(CalendarModule.selectedDate);
        adminMessage.textContent = 'Todas las reservas fueron eliminadas.';
      });
    }
  }
};