/**
 * utils.js
 * Funciones de utilidad puras (sin acceso a BD ni DOM).
 */

import { BOOKING_CONFIG } from '../data/config.js';

/**
 * Formatea una fecha ISO en texto legible en español colombiano.
 * @param {string} dateString - 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatDateLabel(dateString) {
  if (!dateString) return 'Sin fecha seleccionada';
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric'
  });
}

/**
 * Convierte una hora entera (24 h) a texto de 12 h con sufijo.
 * Ej: 8 → "8:00 a. m."  |  13 → "1:00 p. m."
 * @param {number} hour24
 * @returns {string}
 */
export function formatHour(hour24) {
  const suffix = hour24 >= 12 ? 'p. m.' : 'a. m.';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:00 ${suffix}`;
}

/**
 * Genera los horarios disponibles como enteros (coincide con el campo `hora`
 * de la tabla `reservas` en Supabase).
 * Ej: [8, 9, 10, ..., 21]
 * @returns {number[]}
 */
export function generateTimeSlots() {
  const slots = [];
  const { businessStartHour, businessEndHour, serviceDurationHours } = BOOKING_CONFIG;
  for (let h = businessStartHour; h < businessEndHour; h += serviceDurationHours) {
    slots.push(h);
  }
  return slots;
}

/**
 * Indica si una fecha string ya pasó respecto al día de hoy.
 * @param {string} dateString - 'YYYY-MM-DD'
 * @returns {boolean}
 */
export function isPastDate(dateString) {
  if (!dateString) return false;
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${dateString}T00:00:00`);
  return selected < today;
}
