function renderServices() {
  const grid = $("#service-grid");
  if (!grid) return;
  grid.innerHTML = "";
  state.services.forEach((service) => {
    const button = document.createElement("button");
    button.className = "service-card";
    button.innerHTML = `<span class="service-prefix">${service.id === "peixaria" ? "🐟" : "🥩"}</span><strong class="service-name">${service.name}</strong><small class="service-description">${service.description}</small>`;
    button.addEventListener("click", () => createTicket(service.id, false));
    grid.appendChild(button);
  });
}

function renderFilters() {
  const select = $("#sector-filter");
  if (!select) return;
  const currentValue = select.value || "todos";
  select.innerHTML = `<option value="todos">Todos os setores</option>`;
  state.services.forEach((service) => {
    const option = document.createElement("option");
    option.value = service.id;
    option.textContent = service.name;
    select.appendChild(option);
  });
  select.value = state.services.some((service) => service.id === currentValue) ? currentValue : "todos";
}

function renderQueue() {
  const select = $("#sector-filter");
  if (!select) return;
  const selected = select.value || "todos";
  const tickets = waitingTickets(selected);
  const waitingCount = $("#waiting-count");
  const waitingList = $("#waiting-list");
  const currentTicket = $("#current-ticket");
  const currentDetail = $("#current-detail");
  if (!waitingCount || !waitingList || !currentTicket || !currentDetail) return;

  waitingCount.textContent = tickets.length;
  waitingList.innerHTML = tickets.length
    ? tickets.map((ticket) => `<div class="ticket-item"><strong>${ticketLabel(ticket)}</strong><span>${serviceById(ticket.serviceId).name}</span><small>${nowText(ticket.createdAt)}</small></div>`).join("")
    : '<div class="empty">Nenhuma senha aguardando.</div>';

  const current = getCurrentTicket();
  currentTicket.textContent = current ? ticketLabel(current) : "--";
  currentDetail.textContent = current ? `${serviceById(current.serviceId).name} - ${counterLabel(current.counter)} - chamada em ${nowText(current.calledAt)}` : "Nenhuma senha chamada.";
}

function renderPanel() {
  const panelTicket = $("#panel-ticket");
  const panelSector = $("#panel-sector");
  const panelCounter = $("#panel-counter");
  const historyList = $("#history-list");
  if (!panelTicket || !panelSector || !panelCounter || !historyList) return;

  const last = state.lastCalled ? state.tickets.find((ticket) => ticket.id === state.lastCalled) : null;
  panelTicket.textContent = last ? ticketLabel(last) : "--";
  panelSector.textContent = last ? serviceById(last.serviceId).name : "Aguardando chamada";
  panelCounter.textContent = last ? counterLabel(last.counter) : "--";

  const history = state.tickets.filter((ticket) => ticket.calledAt).sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt)).slice(0, 8);
  historyList.innerHTML = history.length
    ? history.map((ticket) => `<div class="ticket-item"><strong>${ticketLabel(ticket)}</strong><span>${serviceById(ticket.serviceId).name}</span><small>${nowText(ticket.calledAt)}</small></div>`).join("")
    : '<div class="empty">Sem chamadas recentes.</div>';
}

function renderMetrics() {
  const metricsContainer = $("#metrics");
  if (!metricsContainer) return;
  const total = state.tickets.length;
  const waiting = state.tickets.filter((ticket) => ticket.status === "waiting").length;
  const finished = state.tickets.filter((ticket) => ticket.status === "finished").length;
  const skipped = state.tickets.filter((ticket) => ticket.status === "skipped").length;
  const priority = state.tickets.filter((ticket) => ticket.priority === true).length;
  const byService = state.services.map((service) => `${service.name}: ${state.tickets.filter((ticket) => ticket.serviceId === service.id).length}`).join(" | ");
  metricsContainer.innerHTML = [["Emitidas", total], ["Aguardando", waiting], ["Finalizadas", finished], ["Puladas", skipped], ["Prioridade", priority], ["Por setor", byService || "0"]]
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderConfig() {
  const configList = $("#config-list");
  if (!configList) return;
  configList.innerHTML = state.services.map((service) => `<div class="config-row" data-service-id="${service.id}"><label>Nome<input data-field="name" value="${service.name}" maxlength="28"></label><label>Prefixo<input data-field="prefix" value="${service.prefix}" maxlength="2"></label><label>Descricao<input data-field="description" value="${service.description}" maxlength="90"></label></div>`).join("");
}

function renderLastIssued() {
  const lastIssued = [...state.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (lastIssued) showLastTicket(lastIssued);
}

function renderIndexPage() {
  renderServices();
  renderFilters();
  renderQueue();
  renderPanel();
  renderMetrics();
  renderConfig();
  renderLastIssued();
}

function activateView(viewName) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  if (viewName === "atendimento") activateSubview("operacao");
  renderIndexPage();
}

function activateSubview(subviewName) {
  $$(".subtab").forEach((tab) => tab.classList.toggle("active", tab.dataset.subview === subviewName));
  $$(".subview").forEach((view) => view.classList.toggle("active", view.id === `subview-${subviewName}`));
}

function bindIndexEvents() {
  $$(".tab").forEach((tab) => tab.addEventListener("click", () => activateView(tab.dataset.view)));
  $$(".subtab").forEach((tab) => tab.addEventListener("click", () => activateSubview(tab.dataset.subview)));

  const sectorFilter = $("#sector-filter");
  if (sectorFilter) sectorFilter.addEventListener("change", renderQueue);

  const callNextButton = $("#call-next");
  if (callNextButton) callNextButton.addEventListener("click", callNext);

  const recallCurrentButton = $("#recall-current");
  if (recallCurrentButton) recallCurrentButton.addEventListener("click", recallCurrent);

  const finishCurrentButton = $("#finish-current");
  if (finishCurrentButton) finishCurrentButton.addEventListener("click", finishCurrent);

  const skipCurrentButton = $("#skip-current");
  if (skipCurrentButton) skipCurrentButton.addEventListener("click", skipCurrent);

  const resetDayButton = $("#reset-day");
  if (resetDayButton) resetDayButton.addEventListener("click", resetDay);

  const printLastButton = $("#print-last");
  if (printLastButton) printLastButton.addEventListener("click", printLastTicket);

  const saveConfigButton = $("#save-config");
  if (saveConfigButton) saveConfigButton.addEventListener("click", saveConfig);

  const exportJsonButton = $("#export-json");
  if (exportJsonButton) exportJsonButton.addEventListener("click", exportJson);
}

document.addEventListener("DOMContentLoaded", () => {
  registerRefreshCallback(renderIndexPage);
  bindIndexEvents();
  renderIndexPage();
  showSelectionScreen();
  const clock = $("#clock");
  if (clock) clock.textContent = nowText();
  setInterval(() => {
    const clockEl = $("#clock");
    if (clockEl) clockEl.textContent = nowText();
  }, 1000);
});
