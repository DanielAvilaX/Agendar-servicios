const StorageService = {
  getReservations() {
    return DB.getReservations();
  },

  addReservation(reservation) {
    DB.addReservation(reservation);
  },

  getReservationsByDate(date) {
    return DB.getReservationsByDate(date);
  },

  removeReservationsByDate(date) {
    DB.removeReservationsByDate(date);
  },

  clearAll() {
    DB.clearAllReservations();
  }
};
