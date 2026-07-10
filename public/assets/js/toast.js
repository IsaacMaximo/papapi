const ToastNotification = {
  container: null,

  createContainer() {
    if (this.container) return this.container;

    const container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 380px;
      width: 100%;
      pointer-events: none;
    `;

    document.body.appendChild(container);
    this.container = container;
    return container;
  },

  show(message, type = "info", duration = 4000) {
    const container = this.createContainer();

    const toast = document.createElement("div");
    toast.className = `toast-notification toast-${type}`;
    toast.style.cssText = `
      pointer-events: auto;
      background: white;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideInRight 0.4s ease;
      border-left: 4px solid #2b3a67;
      font-family: "Inter", Arial, sans-serif;
      transition: all 0.3s ease;
    `;

    // Ícone baseado no tipo
    const iconMap = {
      success: { icon: "fa-check-circle", color: "#10b981" },
      error: { icon: "fa-exclamation-circle", color: "#ef4444" },
      warning: { icon: "fa-exclamation-triangle", color: "#f59e0b" },
      info: { icon: "fa-info-circle", color: "#3b82f6" },
    };

    const iconData = iconMap[type] || iconMap.info;

    // Ícone
    const icon = document.createElement("i");
    icon.className = `fas ${iconData.icon}`;
    icon.style.cssText = `
      font-size: 1.4rem;
      color: ${iconData.color};
      flex-shrink: 0;
    `;

    // Mensagem
    const messageText = document.createElement("span");
    messageText.style.cssText = `
      color: #1d2b4a;
      font-size: 0.95rem;
      font-weight: 500;
      flex: 1;
      line-height: 1.4;
    `;
    messageText.textContent = message;

    // Botão de fechar
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      transition: color 0.2s;
      flex-shrink: 0;
    `;
    closeBtn.onmouseover = () => (closeBtn.style.color = "#1d2b4a");
    closeBtn.onmouseout = () => (closeBtn.style.color = "#94a3b8");
    closeBtn.onclick = () => this.remove(toast);

    // Monta o toast
    toast.appendChild(icon);
    toast.appendChild(messageText);
    toast.appendChild(closeBtn);

    // Cor da borda baseada no tipo
    toast.style.borderLeftColor = iconData.color;

    container.appendChild(toast);

    // Auto-remove após o tempo
    const timeoutId = setTimeout(() => {
      this.remove(toast);
    }, duration);

    // Armazena o timeout para cancelar se necessário
    toast.dataset.timeoutId = timeoutId;

    // Pausa o auto-remove ao passar o mouse
    toast.onmouseenter = () => {
      clearTimeout(toast.dataset.timeoutId);
    };

    toast.onmouseleave = () => {
      const newTimeout = setTimeout(() => {
        this.remove(toast);
      }, 2000);
      toast.dataset.timeoutId = newTimeout;
    };

    return toast;
  },

  // Remove um toast específico
  remove(toast) {
    if (!toast || !toast.parentNode) return;

    clearTimeout(toast.dataset.timeoutId);
    toast.style.animation = "slideOutRight 0.3s ease forwards";

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  // Limpa todas as notificações
  clearAll() {
    if (this.container) {
      this.container.innerHTML = "";
    }
  },

  // Métodos específicos para cada tipo
  success(message, duration = 4000) {
    return this.show(message, "success", duration);
  },

  error(message, duration = 5000) {
    return this.show(message, "error", duration);
  },

  warning(message, duration = 4000) {
    return this.show(message, "warning", duration);
  },

  info(message, duration = 4000) {
    return this.show(message, "info", duration);
  },
};

// Adiciona os estilos de animação
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    0% {
      opacity: 0;
      transform: translateX(100px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOutRight {
    0% {
      opacity: 1;
      transform: translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateX(100px);
    }
  }

  .toast-notification {
    position: relative;
  }

  .toast-notification:hover {
    transform: scale(1.02);
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  }

  /* Scrollbar personalizada */
  #toast-container::-webkit-scrollbar {
    width: 4px;
  }

  #toast-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
`;

document.head.appendChild(style);

if (typeof module !== "undefined" && module.exports) {
  module.exports = ToastNotification;
}
