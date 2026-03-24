/**
 * reservations-service.js
 * Capa de datos: todas las operaciones sobre la tabla `reservas` en Supabase.
 */

import { supabase } from '../api/supabase-client.js';
import { formatHour } from '../utils.js';

// ─── Mapeo BD → UI ────────────────────────────────────────────────────────────

function mapReservation(row) {
  return {
    id:             row.id,
    date:           row.fecha,
    hora:           parseInt(row.hora, 10),
    time:           formatHour(parseInt(row.hora, 10)),
    customerName:   row.nombre_cliente,
    serviceName:    row.servicio,
    status:         row.estado,
    especialistaId: row.especialista_id ?? null,
    motivoConsulta: row.motivo_consulta ?? '',
    createdAt:      row.created_at
  };
}

function assertRowsAffected(data, operation) {
  if (!data || data.length === 0) {
    throw new Error(
      `La operación "${operation}" no afectó ninguna fila. ` +
      'Revisa que RLS esté desactivado en Supabase.'
    );
  }
}

// ─── Consultas ────────────────────────────────────────────────────────────────

/**
 * Obtiene reservas por fecha, con filtro opcional por especialista.
 */
export async function getReservationsByDate(fecha, especialistaId = null) {
  let query = supabase
    .from('reservas')
    .select('*')
    .eq('fecha', fecha)
    .order('hora', { ascending: true });

  if (especialistaId !== null) {
    query = query.eq('especialista_id', especialistaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapReservation);
}

export async function getAllReservations() {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .order('fecha', { ascending: true })
    .order('hora',  { ascending: true });

  if (error) throw error;
  return data.map(mapReservation);
}

/**
 * Obtiene todas las reservas de un mes para el calendario del admin.
 * @param {number} year
 * @param {number} month - 1-indexado (1=enero … 12=diciembre)
 * @param {number|null} especialistaId - filtro opcional
 */
export async function getReservationsByMonth(year, month, especialistaId = null) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear  = month === 12 ? year + 1 : year;
  const endDate   = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  let query = supabase
    .from('reservas')
    .select('id, fecha, hora, nombre_cliente, servicio, estado, especialista_id')
    .gte('fecha', startDate)
    .lt('fecha', endDate)
    .order('fecha', { ascending: true })
    .order('hora',  { ascending: true });

  if (especialistaId !== null) {
    query = query.eq('especialista_id', especialistaId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapReservation);
}

export async function isSlotAvailable(fecha, hora, especialistaId) {
  const { data, error } = await supabase
    .from('reservas')
    .select('id')
    .eq('fecha', fecha)
    .eq('hora', hora)
    .eq('especialista_id', especialistaId)
    .maybeSingle();

  if (error) throw error;
  return data === null;
}

// ─── Escritura ────────────────────────────────────────────────────────────────

export async function createReservation({ date, hora, customerName, serviceName, especialistaId, motivoConsulta = '' }) {
  const { data, error } = await supabase
    .from('reservas')
    .insert([{
      fecha:           date,
      hora,
      nombre_cliente:  customerName,
      servicio:        serviceName,
      estado:          'Pendiente',
      especialista_id: especialistaId,
      motivo_consulta: motivoConsulta
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Ese horario ya no está disponible para este especialista.');
    if (error.code === '42501') throw new Error('Sin permisos de escritura. Revisa RLS en Supabase.');
    throw error;
  }

  return mapReservation(data);
}

// ─── Actualización de estado ──────────────────────────────────────────────────

export async function updateReservationStatus(id, estado) {
  const { data, error } = await supabase
    .from('reservas')
    .update({ estado })
    .eq('id', id)
    .select('id');

  if (error) throw error;
  assertRowsAffected(data, 'updateReservationStatus');
}

export async function updateReservationsStatusByIds(ids, estado) {
  if (!ids.length) return;

  const { data, error } = await supabase
    .from('reservas')
    .update({ estado })
    .in('id', ids)
    .select('id');

  if (error) throw error;
  assertRowsAffected(data, 'updateReservationsStatusByIds');
}

export async function confirmAllPendingReservations() {
  const { error } = await supabase
    .from('reservas')
    .update({ estado: 'Confirmada' })
    .eq('estado', 'Pendiente');

  if (error) throw error;
}

// ─── Eliminación ──────────────────────────────────────────────────────────────

export async function deleteReservationsByIds(ids) {
  if (!ids.length) return;

  const { data, error } = await supabase
    .from('reservas')
    .delete()
    .in('id', ids)
    .select('id');

  if (error) throw error;
  assertRowsAffected(data, 'deleteReservationsByIds');
}

export async function deleteReservationsByDate(fecha) {
  const { error } = await supabase
    .from('reservas')
    .delete()
    .eq('fecha', fecha);

  if (error) throw error;
}

export async function deleteAllReservations() {
  const { error } = await supabase
    .from('reservas')
    .delete()
    .gte('id', 1);

  if (error) throw error;
}
