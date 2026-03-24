(async function initApp() {
  await DB.init();

  ModalService.init();
  CalendarModule.init();
  ReservationsModule.init();

  console.log('Sistema de reservas inicializado correctamente.');
})();
