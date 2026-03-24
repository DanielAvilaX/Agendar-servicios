/**
 * especialidades-service.js
 * CRUD para la tabla `especialidades` en Supabase.
 */

import { supabase } from '../api/supabase-client.js';

export async function getEspecialidades() {
  const { data, error } = await supabase
    .from('especialidades')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createEspecialidad(nombre, descripcion = '') {
  const { data, error } = await supabase
    .from('especialidades')
    .insert([{ nombre: nombre.trim(), descripcion: descripcion.trim() }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una especialidad con ese nombre.');
    throw error;
  }
  return data;
}

export async function updateEspecialidad(id, { nombre, descripcion, activa }) {
  const patch = {};
  if (nombre     !== undefined) patch.nombre      = nombre.trim();
  if (descripcion !== undefined) patch.descripcion = descripcion.trim();
  if (activa      !== undefined) patch.activa      = activa;

  const { data, error } = await supabase
    .from('especialidades')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una especialidad con ese nombre.');
    throw error;
  }
  return data;
}

export async function deleteEspecialidad(id) {
  const { error } = await supabase
    .from('especialidades')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
