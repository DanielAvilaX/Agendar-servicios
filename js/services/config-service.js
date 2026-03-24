/**
 * config-service.js
 * Carga la configuración estática desde data/db.json:
 * - Lista de servicios disponibles
 * - Credenciales del panel admin
 *
 * Esta información NO va a Supabase; vive en el archivo JSON local.
 */

let _credentials = { username: 'admin', password: 'admin123' };
let _services    = [];
let _loaded      = false;

/**
 * Carga el archivo db.json. Debe llamarse una vez al iniciar la app.
 */
export async function loadConfig() {
  if (_loaded) return;
  try {
    const res  = await fetch('data/db.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    _credentials = json.credentials ?? _credentials;
    _services    = json.services    ?? [];
    _loaded = true;
  } catch (err) {
    console.warn('No se pudo cargar data/db.json, usando valores por defecto.', err);
  }
}

/** Devuelve la lista de servicios disponibles. */
export function getServices() {
  return _services;
}

/**
 * Verifica credenciales del admin.
 * @param {string} username
 * @param {string} password
 * @returns {boolean}
 */
export function checkCredentials(username, password) {
  return _credentials.username === username && _credentials.password === password;
}
