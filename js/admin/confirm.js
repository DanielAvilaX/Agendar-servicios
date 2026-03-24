/**
 * confirm.js
 * Modal de confirmación reutilizable para el panel de administración.
 */

export function showConfirmModal({ title, message, icon = '⚠️', okLabel = 'Confirmar', okClass = 'btn btn-primary', onConfirm }) {
  document.getElementById('confirmModalTitle').textContent   = title;
  document.getElementById('confirmModalMessage').textContent = message;
  document.getElementById('confirmModalIcon').textContent    = icon;

  const okBtn = document.getElementById('confirmModalOk');
  okBtn.className   = okClass;
  okBtn.textContent = okLabel;

  document.getElementById('confirmModal').classList.remove('hidden');

  const close = () => document.getElementById('confirmModal').classList.add('hidden');

  okBtn.onclick = async () => {
    close();
    try {
      await onConfirm();
    } catch (err) {
      const msg = document.getElementById('adminMessage');
      if (msg) {
        msg.textContent = `Error: ${err.message}`;
        setTimeout(() => { msg.textContent = ''; }, 5000);
      }
    }
  };
  document.getElementById('confirmModalCancel').onclick   = close;
  document.getElementById('confirmModalBackdrop').onclick = close;
}
