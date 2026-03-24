/**
 * admin-page.js
 * Punto de entrada del panel de administración.
 */

import { loginAdmin }              from './services/auth-service.js';
import { init as initCalendar }    from './admin/calendar-view.js';
import { init as initEsp }         from './admin/especialidades-panel.js';
import { init as initEspecialistas } from './admin/especialistas-panel.js';

const SESSION_KEY = 'adminSession';

// ─── Elementos del DOM ────────────────────────────────────────────────────────

const loginSection = document.getElementById('loginSection');
const adminPanel   = document.getElementById('adminPanel');

// ─── Sesión ───────────────────────────────────────────────────────────────────

async function showAdminPanel() {
  loginSection.classList.add('hidden');
  adminPanel.classList.remove('hidden');

  await Promise.all([
    initCalendar(),
    initEsp(),
    initEspecialistas()
  ]);
}

function showLogin() {
  adminPanel.classList.add('hidden');
  loginSection.classList.remove('hidden');
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').textContent = '';
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`tab-${tab}`).classList.remove('hidden');
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  initTabs();

  // Restaurar sesión
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    await showAdminPanel();
  }

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
      const ok = await loginAdmin(user, pass);
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        await showAdminPanel();
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

main().catch((err) => {
  console.error('Error al inicializar el panel de administración:', err);
});
