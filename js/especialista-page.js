/**
 * especialista-page.js
 * Punto de entrada del portal del especialista.
 */

import { loginEspecialista }    from './services/auth-service.js';
import { init as initCalendar } from './especialista/calendar-view.js';

const SESSION_KEY = 'especialistaSession';

const loginSection      = document.getElementById('loginSection');
const especialistaPanel = document.getElementById('especialistaPanel');

// ─── Sesión ───────────────────────────────────────────────────────────────────

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function showPanel(session) {
  loginSection.classList.add('hidden');
  especialistaPanel.classList.remove('hidden');

  document.getElementById('espPanelNombre').textContent      = session.nombre;
  document.getElementById('espPanelEspecialidad').textContent = session.especialidadNombre;

  await initCalendar(session.id);
}

function showLogin() {
  especialistaPanel.classList.add('hidden');
  loginSection.classList.remove('hidden');
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').textContent = '';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Restaurar sesión
  const session = getSession();
  if (session) await showPanel(session);

  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user  = document.getElementById('loginUser').value.trim();
    const pass  = document.getElementById('loginPass').value;
    const error = document.getElementById('loginError');
    const btn   = document.querySelector('#loginForm button[type="submit"]');

    btn.disabled = true;
    error.textContent = '';

    try {
      const session = await loginEspecialista(user, pass);
      if (session) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        await showPanel(session);
      } else {
        error.textContent = 'Usuario o contraseña incorrectos.';
        document.getElementById('loginPass').value = '';
      }
    } catch (err) {
      error.textContent = `Error de conexión: ${err.message}`;
    } finally {
      btn.disabled = false;
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    showLogin();
  });
}

main().catch(console.error);
