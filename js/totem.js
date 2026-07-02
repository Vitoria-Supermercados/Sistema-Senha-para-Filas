// Bloco: criar os botoes do totem
function createServiceButton(service, priority) {
  const button = document.createElement("button");
  button.className = `service-card${priority ? " priority-card" : ""}`;
  button.dataset.serviceId = service.id;
  button.dataset.priority = String(priority);

  const label = priority ? `Prioridade ${service.name}` : service.name;
  const icon = priority ? "★" : service.id === "peixaria" ? "🐟" : "🥩";
  const description = priority ? "Idosos, gestantes e PCD." : service.description;

  button.innerHTML = `
    <span class="service-icon">${icon}</span>
    <strong class="service-name">${label}</strong>
    <small class="service-description">${description}</small>
  `;

  button.addEventListener("click", () => createTicket(service.id, priority));
  return button;
}

// Bloco: renderizar a tela do totem
function renderTotemPage() {
  const commonGrid = $("#service-grid-common");
  const priorityGrid = $("#service-grid-priority");

  if (!commonGrid || !priorityGrid) return;

  const totemOptions = [
    { serviceId: "peixaria", priority: false },
    { serviceId: "acougue", priority: false },
    { serviceId: "peixaria", priority: true },
    { serviceId: "acougue", priority: true }
  ];

  commonGrid.innerHTML = "";
  priorityGrid.innerHTML = "";

  totemOptions.forEach((option) => {
    const service = serviceById(option.serviceId);
    if (!service) return;

    const button = createServiceButton(service, option.priority);
    if (option.priority) {
      priorityGrid.appendChild(button);
    } else {
      commonGrid.appendChild(button);
    }
  });
}

// Bloco: iniciar os eventos da tela
document.addEventListener("DOMContentLoaded", () => {
  registerRefreshCallback(renderTotemPage);
  renderTotemPage();

  const newButton = $("#new-ticket");
  if (newButton) {
    newButton.addEventListener("click", () => {
      clearTimeout(window.confirmationResetTimer);
      showSelectionScreen();
    });
  }
});
