export function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ"
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">${message}</div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  container.appendChild(toast);

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => removeToast(toast));

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  
  toast.classList.add("toast-exit");
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

export function showSuccess(message, duration) {
  return showToast(message, "success", duration);
}

export function showError(message, duration) {
  return showToast(message, "error", duration);
}

export function showWarning(message, duration) {
  return showToast(message, "warning", duration);
}

export function showInfo(message, duration) {
  return showToast(message, "info", duration);
}