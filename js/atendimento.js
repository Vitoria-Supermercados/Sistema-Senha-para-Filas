function renderAttendancePage() {
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

  const tickets = waitingTickets(select.value || "todos");
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

function bindAttendanceEvents() {
  $$(".subtab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".subtab").forEach((item) => item.classList.toggle("active", item.dataset.subview === tab.dataset.subview));
    $$(".subview").forEach((view) => view.classList.toggle("active", view.id === `subview-${tab.dataset.subview}`));
  }));

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

  const saveConfigButton = $("#save-config");
  if (saveConfigButton) saveConfigButton.addEventListener("click", saveConfig);

  const exportJsonButton = $("#export-json");
  if (exportJsonButton) exportJsonButton.addEventListener("click", exportJson);

  const sectorFilter = $("#sector-filter");
  if (sectorFilter) sectorFilter.addEventListener("change", renderAttendancePage);
}

document.addEventListener("DOMContentLoaded", () => {
  registerRefreshCallback(() => {
    renderAttendancePage();
    renderMetrics();
    renderConfig();
  });
  bindAttendanceEvents();
  renderAttendancePage();
  renderMetrics();
  renderConfig();
  const clock = $("#clock");
  if (clock) clock.textContent = nowText();
  setInterval(() => {
    const clockEl = $("#clock");
    if (clockEl) clockEl.textContent = nowText();
  }, 1000);
});
