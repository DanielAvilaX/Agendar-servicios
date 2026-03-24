/**
 * auth-service.js
 * Autenticación del administrador y especialistas contra Supabase.
 */

import { supabase } from '../api/supabase-client.js';

/**
 * Verifica las credenciales del administrador.
 * @returns {Promise<boolean>}
 */
export async function loginAdmin(username, password) {
  const { data, error } = await supabase
    .from('admin_credenciales')
    .select('id')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/**
 * Verifica las credenciales de un especialista.
 * @returns {Promise<{id, nombre, especialidadNombre}|null>}
 */
export async function loginEspecialista(username, password) {
  const { data, error } = await supabase
    .from('especialista_credenciales')
    .select(`
      especialista_id,
      especialistas (
        id,
        nombre,
        especialidades ( nombre )
      )
    `)
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const esp = data.especialistas;
  return {
    id:                 esp.id,
    nombre:             esp.nombre,
    especialidadNombre: esp.especialidades?.nombre ?? ''
  };
}
