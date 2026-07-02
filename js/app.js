const STORAGE_KEY = "fila-mercado-state-v1";
const defaultState = {
  services: [
    { id: "peixaria", name: "Peixaria", prefix: "p", description: "Peixe fresco, limpeza, cortes e pesagem.", nextNumber: 1, priorityNextNumber: 1 },
    { id: "acougue", name: "Açougue", prefix: "a", description: "Carnes, cortes especiais e embalagens.", nextNumber: 1, priorityNextNumber: 1 }
  ],
  tickets: [],
  current: null,
  lastCalled: null
};

let state = loadState();
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
window.__filaRefreshCallbacks = window.__filaRefreshCallbacks || [];

function registerRefreshCallback(callback) {
  if (typeof callback === "function" && !window.__filaRefreshCallbacks.includes(callback)) {
    window.__filaRefreshCallbacks.push(callback);
  }
}

function notifyRefresh() {
  window.__filaRefreshCallbacks.forEach((callback) => callback && callback());
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return normalizeState(structuredClone(defaultState));
  try {
    const parsed = JSON.parse(stored);
    const parsedServices = Array.isArray(parsed.services) ? parsed.services : [];
    const parsedTickets = Array.isArray(parsed.tickets) ? parsed.tickets : [];
    return normalizeState({
      ...structuredClone(defaultState),
      ...parsed,
      services: normalizeServices(parsedServices),
      tickets: normalizeTickets(parsedTickets)
    });
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

function normalizeServices(services) {
  return defaultState.services.map((base) => {
    const parsed = services.find((service) => service.id === base.id) || {};
    return {
      ...base,
      ...parsed,
      nextNumber: parsed.nextNumber || base.nextNumber,
      priorityNextNumber: parsed.priorityNextNumber || base.priorityNextNumber
    };
  });
}

function normalizeTickets(tickets) {
  const validIds = defaultState.services.map((service) => service.id);
  return tickets
    .filter((ticket) => validIds.includes(ticket.serviceId))
    .map((ticket) => ({
      ...ticket,
      priority: Boolean(ticket.priority),
      status: ticket.status || "waiting"
    }));
}

function normalizeState(nextState) {
  nextState.services = nextState.services.map((service) => ({
    ...service,
    nextNumber: service.nextNumber || 1,
    priorityNextNumber: service.priorityNextNumber || 1
  }));
  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTicket(service, number, priority = false) {
  let prefix = service.prefix.toLowerCase();
  if (priority) prefix += "p";
  return `${prefix.toUpperCase()}${String(number).padStart(3, "0")}`;
}

function serviceById(id) {
  return state.services.find((service) => service.id === id);
}

function ticketLabel(ticket) {
  const service = serviceById(ticket.serviceId);
  if (!service) return "--";
  if (ticket.code) return ticket.code;
  return formatTicket(service, ticket.number, ticket.priority);
}

function spokenTicket(ticket) {
  const service = serviceById(ticket.serviceId);
  const prefix = service?.prefix || ticketLabel(ticket).slice(0, 1);
  const spokenPrefix = prefix.split("").join(" ");
  const number = String(ticket.number).padStart(3, "0").split("").join(" ");
  return `${spokenPrefix}, ${number}`;
}

function counterLabel(value) {
  const counter = (value || "").trim();
  if (!counter || /^balc[aã]o( 1)?$/i.test(counter)) return "Balcão do açougue";
  return counter;
}

function createId() {
  return `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowText(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function dateText(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function waitingTickets(serviceId = "todos") {
  return state.tickets
    .filter((ticket) => ticket.status === "waiting")
    .filter((ticket) => serviceId === "todos" || ticket.serviceId === serviceId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function createTicket(serviceId, priority = false) {
  const service = serviceById(serviceId);
  if (!service) return;

  const number = priority ? service.priorityNextNumber : service.nextNumber;
  if (priority) service.priorityNextNumber += 1;
  else service.nextNumber += 1;

  const ticket = {
    id: createId(),
    serviceId,
    number,
    code: formatTicket(service, number, priority),
    status: "waiting",
    createdAt: new Date().toISOString(),
    calledAt: null,
    finishedAt: null,
    counter: null,
    priority
  };

  state.tickets.push(ticket);
  saveState();
  notifyRefresh();
  showLastTicket(ticket);
  showConfirmation(ticket);
  return ticket;
}

function callNext() {
  const sectorFilter = $("#sector-filter");
  if (!sectorFilter) return;

  const next = waitingTickets(sectorFilter.value)[0];
  if (!next) {
    alert("Nao ha senhas aguardando para este filtro.");
    return;
  }

  if (state.current) {
    const currentTicket = state.tickets.find((ticket) => ticket.id === state.current);
    if (currentTicket && currentTicket.status === "called") {
      currentTicket.status = "waiting";
      currentTicket.calledAt = null;
      currentTicket.counter = null;
    }
  }

  next.status = "called";
  next.calledAt = new Date().toISOString();
  next.counter = counterLabel($("#counter-name").value);
  state.current = next.id;
  state.lastCalled = next.id;

  saveState();
  notifyRefresh();
  announceTicket(next);
}

function recallCurrent() {
  const current = getCurrentTicket();
  if (!current) {
    alert("Nenhuma senha em atendimento.");
    return;
  }
  current.calledAt = new Date().toISOString();
  current.counter = counterLabel($("#counter-name").value || current.counter);
  state.lastCalled = current.id;
  saveState();
  notifyRefresh();
  announceTicket(current);
}

function finishCurrent() {
  const current = getCurrentTicket();
  if (!current) {
    alert("Nenhuma senha em atendimento.");
    return;
  }
  current.status = "finished";
  current.finishedAt = new Date().toISOString();
  state.current = null;
  saveState();
  notifyRefresh();
}

function skipCurrent() {
  const current = getCurrentTicket();
  if (!current) {
    alert("Nenhuma senha em atendimento.");
    return;
  }
  current.status = "skipped";
  current.finishedAt = new Date().toISOString();
  state.current = null;
  saveState();
  notifyRefresh();
}

function getCurrentTicket() {
  if (!state.current) return null;
  return state.tickets.find((ticket) => ticket.id === state.current && ticket.status === "called");
}

function announceTicket(ticket) {
  const service = serviceById(ticket.serviceId);
  if ("speechSynthesis" in window) {
    const message = `Atenção. Senha ${spokenTicket(ticket)}. Setor ${service.name}. Dirija-se ao ${counterLabel(ticket.counter)}.`;
    const utterance = new SpeechSynthesisUtterance(message);
    const voices = window.speechSynthesis.getVoices();
    const portugueseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("pt"));
    const preferredVoice =
      portugueseVoices.find((voice) => /microsoft|google|brasil|brazil|maria|francisca|daniel/i.test(voice.name)) ||
      portugueseVoices[0];

    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.lang = "pt-BR";
    utterance.volume = 1;
    utterance.rate = 0.86;
    utterance.pitch = 0.88;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

function showLastTicket(ticket) {
  const lastTicket = $("#last-ticket");
  const lastDetail = $("#last-ticket-detail");
  if (!lastTicket || !lastDetail) return;

  const service = serviceById(ticket.serviceId);
  lastTicket.textContent = ticketLabel(ticket);
  lastDetail.textContent = `${service.name} - emitida em ${nowText(ticket.createdAt)}`;
}

function showConfirmation(ticket) {
  const confirmationView = $("#view-confirmation");
  const confirmationTicket = $("#confirmation-ticket");
  const confirmationSector = $("#confirmation-sector");
  if (!confirmationView || !confirmationTicket || !confirmationSector) return;

  $("#view-totem").classList.remove("active");
  confirmationView.classList.add("active");
  confirmationTicket.textContent = ticketLabel(ticket);
  confirmationSector.textContent = serviceById(ticket.serviceId)?.name || "Setor";

  clearTimeout(window.confirmationResetTimer);
  window.confirmationResetTimer = setTimeout(showSelectionScreen, 5000);
}

function showSelectionScreen() {
  const confirmationView = $("#view-confirmation");
  const selectionView = $("#view-totem");
  if (!confirmationView || !selectionView) return;

  confirmationView.classList.remove("active");
  selectionView.classList.add("active");
}

function printLastTicket() {
  const lastIssued = [...state.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (!lastIssued) {
    alert("Nenhuma senha emitida.");
    return;
  }
  const service = serviceById(lastIssued.serviceId);
  const ticketWindow = window.open("", "ticket", "width=320,height=420");
  ticketWindow.document.write(`
    <html>
      <head>
        <title>Senha ${ticketLabel(lastIssued)}</title>
        <style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}h1{font-size:72px;margin:16px 0}p{margin:8px 0}</style>
      </head>
      <body>
        <p>VITORIA SUPERMERCADO</p>
        <h1>${ticketLabel(lastIssued)}</h1>
        <h2>${service.name}</h2>
        <p>${dateText(lastIssued.createdAt)}</p>
        <script>window.print();<\/script>
      </body>
    </html>
  `);
}

function saveConfig() {
  $$(".config-row").forEach((row) => {
    const service = serviceById(row.dataset.serviceId);
    if (!service) return;
    service.name = row.querySelector('[data-field="name"]').value.trim() || service.name;
    service.prefix = row.querySelector('[data-field="prefix"]').value.trim().toUpperCase() || service.prefix;
    service.description = row.querySelector('[data-field="description"]').value.trim() || service.description;
  });
  saveState();
  notifyRefresh();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fila-mercado-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resetDay() {
  const confirmed = confirm("Zerar todas as senhas e reiniciar a numeracao do dia?");
  if (!confirmed) return;
  state.tickets = [];
  state.current = null;
  state.lastCalled = null;
  state.services.forEach((service) => {
    service.nextNumber = 1;
  });
  saveState();
  notifyRefresh();
}

window.filaApp = {
  state,
  createTicket,
  saveState,
  serviceById,
  ticketLabel,
  formatTicket,
  waitingTickets,
  callNext,
  recallCurrent,
  finishCurrent,
  skipCurrent,
  showConfirmation,
  showSelectionScreen,
  registerRefreshCallback,
  notifyRefresh,
  nowText,
  dateText,
  counterLabel,
  printLastTicket,
  saveConfig,
  exportJson,
  resetDay
};
