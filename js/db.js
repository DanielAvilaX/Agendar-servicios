const DB = {
  _storageKey: 'agendarReservations',
  _credentials: null,
  _services: [],

  async init() {
    try {
      const res = await fetch('data/db.json');
      if (!res.ok) throw new Error('No se pudo cargar db.json');
      const json = await res.json();
      this._credentials = json.credentials;
      this._services = json.services || [];
    } catch (e) {
      console.warn('db.json no disponible, usando valores por defecto.', e);
      this._credentials = { username: 'admin', password: 'admin123' };
      this._services = [];
    }
  },

  getServices() {
    return this._services;
  },

  checkCredentials(username, password) {
    return (
      this._credentials?.username === username &&
      this._credentials?.password === password
    );
  },

  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  getReservations() {
    const stored = localStorage.getItem(this._storageKey);
    const reservations = stored ? JSON.parse(stored) : [];
    // Migración: asegurar que todas tengan id y estado
    let changed = false;
    reservations.forEach(r => {
      if (!r.id) { r.id = this._generateId(); changed = true; }
      if (!r.status) { r.status = 'Pendiente'; changed = true; }
    });
    if (changed) this._saveReservations(reservations);
    return reservations;
  },

  _saveReservations(reservations) {
    localStorage.setItem(this._storageKey, JSON.stringify(reservations));
  },

  getReservationsByDate(date) {
    return this.getReservations().filter(r => r.date === date);
  },

  addReservation(reservation) {
    const reservations = this.getReservations();
    reservations.push({ ...reservation, id: this._generateId() });
    this._saveReservations(reservations);
  },

  updateReservationStatus(id, status) {
    const reservations = this.getReservations();
    const target = reservations.find(r => r.id === id);
    if (target) {
      target.status = status;
      this._saveReservations(reservations);
    }
  },

  updateReservationsStatusByIds(ids, status) {
    const reservations = this.getReservations();
    reservations.forEach(r => {
      if (ids.includes(r.id)) r.status = status;
    });
    this._saveReservations(reservations);
  },

  updateAllReservationsStatus(status) {
    const reservations = this.getReservations();
    reservations.forEach(r => { r.status = status; });
    this._saveReservations(reservations);
  },

  removeReservationsByIds(ids) {
    const filtered = this.getReservations().filter(r => !ids.includes(r.id));
    this._saveReservations(filtered);
  },

  removeReservationsByDate(date) {
    const filtered = this.getReservations().filter(r => r.date !== date);
    this._saveReservations(filtered);
  },

  clearAllReservations() {
    localStorage.removeItem(this._storageKey);
  }
};
