function renderPanelPage() {
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

document.addEventListener("DOMContentLoaded", () => {
  registerRefreshCallback(renderPanelPage);
  renderPanelPage();
  const clock = $("#clock");
  if (clock) clock.textContent = nowText();
  setInterval(() => {
    const clockEl = $("#clock");
    if (clockEl) clockEl.textContent = nowText();
  }, 1000);
});
