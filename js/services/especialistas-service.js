/**
 * especialistas-service.js
 * CRUD para especialistas, sus credenciales y horarios de trabajo.
 */

import { supabase } from '../api/supabase-client.js';

// ─── Consultas ───────────────────────────────────────────────────────────────

export async function getEspecialistas() {
  const { data, error } = await supabase
    .from('especialistas')
    .select(`
      *,
      especialidades ( nombre ),
      especialista_credenciales ( username )
    `)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data.map(row => ({
    ...row,
    especialidadNombre: row.especialidades?.nombre ?? '—',
    username:           row.especialista_credenciales?.username ?? ''
  }));
}

export async function getEspecialistasByEspecialidad(especialidadId) {
  const { data, error } = await supabase
    .from('especialistas')
    .select('id, nombre')
    .eq('especialidad_id', especialidadId)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getHorarios(especialistaId) {
  const { data, error } = await supabase
    .from('horarios_especialista')
    .select('*')
    .eq('especialista_id', especialistaId)
    .order('dia_semana', { ascending: true });

  if (error) throw error;
  return data;
}

// ─── Escritura ───────────────────────────────────────────────────────────────

export async function createEspecialista({ nombre, especialidadId, username, password, horarios = [] }) {
  // 1. Crear registro en especialistas
  const { data: esp, error: errEsp } = await supabase
    .from('especialistas')
    .insert([{ nombre: nombre.trim(), especialidad_id: especialidadId }])
    .select()
    .single();

  if (errEsp) throw errEsp;

  // 2. Crear credenciales
  const { error: errCred } = await supabase
    .from('especialista_credenciales')
    .insert([{ especialista_id: esp.id, username: username.trim(), password }]);

  if (errCred) {
    // Limpiar el especialista recién creado si falla la credencial
    await supabase.from('especialistas').delete().eq('id', esp.id);
    if (errCred.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
    throw errCred;
  }

  // 3. Guardar horarios
  if (horarios.length > 0) {
    await setHorarios(esp.id, horarios);
  }

  return esp;
}

export async function updateEspecialista(id, { nombre, especialidadId, activo }) {
  const patch = {};
  if (nombre         !== undefined) patch.nombre          = nombre.trim();
  if (especialidadId !== undefined) patch.especialidad_id = especialidadId;
  if (activo         !== undefined) patch.activo          = activo;

  const { error } = await supabase
    .from('especialistas')
    .update(patch)
    .eq('id', id);

  if (error) throw error;
}

export async function updateEspecialistaCredentials(especialistaId, { username, password }) {
  const patch = {};
  if (username) patch.username = username.trim();
  if (password) patch.password = password;

  const { error } = await supabase
    .from('especialista_credenciales')
    .update(patch)
    .eq('especialista_id', especialistaId);

  if (error) {
    if (error.code === '23505') throw new Error('Ese nombre de usuario ya está en uso.');
    throw error;
  }
}

export async function deleteEspecialista(id) {
  // Las credenciales y horarios se eliminan por CASCADE
  const { error } = await supabase
    .from('especialistas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setHorarios(especialistaId, horarios) {
  // Eliminar todos los horarios actuales del especialista
  await supabase
    .from('horarios_especialista')
    .delete()
    .eq('especialista_id', especialistaId);

  if (!horarios.length) return;

  const rows = horarios.map(h => ({
    especialista_id: especialistaId,
    dia_semana:  h.dia_semana,
    hora_inicio: h.hora_inicio,
    hora_fin:    h.hora_fin
  }));

  const { error } = await supabase
    .from('horarios_especialista')
    .insert(rows);

  if (error) throw error;
}
