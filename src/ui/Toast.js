export class ToastManager {
  constructor(editor, container) {
    this.container = container;
    editor.events.on("toast", ({ message, type = "info", duration = 2200 }) => {
      this.show(message, type, duration);
    });
  }

  show(message, type = "info", duration = 2200) {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    this.container.appendChild(el);

    setTimeout(() => {
      el.classList.add("fade-out");
      setTimeout(() => el.remove(), 220);
    }, duration);
  }
}
