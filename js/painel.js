function renderPanelPage() {
  const panelTicket = $("#panel-ticket");
  const panelSector = $("#panel-sector");
  const panelCounter = $("#panel-counter");
  const historyList = $("#history-list");
  if (!panelTicket || !panelSector || !panelCounter || !historyList) return;

  const current = getCurrentTicket();
  const last = state.lastCalled ? state.tickets.find((ticket) => ticket.id === state.lastCalled) : null;
  const displayTicket = current || last;
  panelTicket.textContent = displayTicket ? ticketLabel(displayTicket) : "--";
  panelSector.textContent = displayTicket ? serviceById(displayTicket.serviceId).name : "Aguardando chamada";
  panelCounter.textContent = displayTicket ? counterLabel(displayTicket.counter) : "--";

  const history = state.tickets
    .filter((ticket) => ticket.calledAt && ticket.id !== (current ? current.id : last ? last.id : null))
    .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt))
    .slice(0, 5);
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

// Escuta senha de outra janela (totem) via BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("fila-mercado");
      bc.addEventListener("message", (ev) => {
        const msg = ev.data || {};
        if (msg.type === "ticket-created" || msg.type === "state-changed") {
          if (typeof loadState === "function") state = loadState();
          if (window.filaApp) window.filaApp.state = state;
          renderPanelPage();
        }
      });
    }
  } catch (e) {
    // ignore
  }

// Fallback 'storage' p/ navegadores mais antigos ||  BroadcastChannel não disponível
  window.addEventListener("storage", (ev) => {
    if (!ev.key) return;
    if (ev.key !== "fila-mercado-broadcast") return;
    try {
      const payload = JSON.parse(ev.newValue);
      if (payload && (payload.type === "ticket-created" || payload.type === "state-changed")) {
        if (typeof loadState === "function") state = loadState();
        if (window.filaApp) window.filaApp.state = state;
        renderPanelPage();
      }
    } catch (e) {
      // ignore
    }
  });

  setInterval(() => {
    if (typeof loadState === "function") {
      state = loadState();
      if (window.filaApp) window.filaApp.state = state;
      renderPanelPage();
    }
  }, 2000);
});

function showTemporaryIssued(ticket) {
  const panelTicket = $("#panel-ticket");
  const panelSector = $("#panel-sector");
  const panelCounter = $("#panel-counter");
  if (!panelTicket || !panelSector || !panelCounter) return;
  panelTicket.textContent = ticket ? ticketLabel(ticket) : "--";
  panelSector.textContent = ticket ? serviceById(ticket.serviceId)?.name || "" : "";
  panelCounter.textContent = ticket ? "Emitida" : "";
  const el = document.querySelector(".panel-main");
  if (el) el.classList.add("issued-flash");
  setTimeout(() => {
    if (el) el.classList.remove("issued-flash");
    renderPanelPage();
  }, 5000);
}
