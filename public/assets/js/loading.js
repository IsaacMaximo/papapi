const LoadingOverlay = {
  overlay: null,
  isVisible: false,

  createOverlay() {
    if (this.overlay) return this.overlay;

    const overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 9999;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    `;

    // Container do spinner
    const spinnerContainer = document.createElement("div");
    spinnerContainer.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      padding: 2rem 2.5rem;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.2rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: loadingFadeIn 0.3s ease;
    `;

    // Spinner animado
    const spinner = document.createElement("div");
    spinner.style.cssText = `
      width: 50px;
      height: 50px;
      border: 4px solid #e9f1f8;
      border-top: 4px solid #2b3a67;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    `;

    // Texto do loading
    const text = document.createElement("p");
    text.id = "loading-text";
    text.style.cssText = `
      color: #1d2b4a;
      font-family: "Inter", Arial, sans-serif;
      font-weight: 500;
      font-size: 1rem;
      margin: 0;
      letter-spacing: 0.3px;
    `;
    text.textContent = "Carregando...";

    // Ícone opcional
    const icon = document.createElement("i");
    icon.className = "fas fa-spinner";
    icon.style.cssText = `
      font-size: 2rem;
      color: #2b3a67;
      animation: spin 0.8s linear infinite;
    `;

    // Monta o container
    spinnerContainer.appendChild(icon);
    spinnerContainer.appendChild(text);
    overlay.appendChild(spinnerContainer);

    // Adiciona os estilos de animação
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes loadingFadeIn {
        0% { opacity: 0; transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);
    this.overlay = overlay;
    return overlay;
  },

  show(message = "Carregando...") {
    if (!this.overlay) this.createOverlay();

    const text = this.overlay.querySelector("#loading-text");
    if (text) text.textContent = message;

    this.overlay.style.display = "flex";
    this.isVisible = true;
  },

  hide() {
    if (this.overlay) {
      this.overlay.style.display = "none";
      this.isVisible = false;
    }
  },

  toggle(message = "Carregando...") {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(message);
    }
  },

  updateMessage(message) {
    if (this.overlay && this.isVisible) {
      const text = this.overlay.querySelector("#loading-text");
      if (text) text.textContent = message;
    }
  },
};


if (typeof module !== "undefined" && module.exports) {
  module.exports = LoadingOverlay;
}
