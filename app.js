const STORAGE_KEY = "fila-mercado-state-v1";

const defaultState = {
  services: [
    {
      id: "peixaria",
      name: "Peixaria",
      prefix: "P",
      description: "Atendimento para peixe fresco, limpeza, cortes e pesagem.",
      nextNumber: 1
    },
    {
      id: "acougue",
      name: "Açougue",
      prefix: "A",
      description: "Atendimento para carnes, cortes especiais e embalagens.",
      nextNumber: 1
    }
  ],
  tickets: [],
  current: null,
  lastCalled: null
};

let state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return normalizeState(structuredClone(defaultState));

  try {
    const parsed = JSON.parse(stored);
    return normalizeState({
      ...structuredClone(defaultState),
      ...parsed,
      services: parsed.services?.length ? parsed.services : structuredClone(defaultState.services),
      tickets: parsed.tickets || []
    });
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

function normalizeState(nextState) {
  const defaultPriorityService = {
    id: "prioridade",
    name: "Prioridade",
    prefix: "PR",
    description: "Atendimento preferencial para idosos, gestantes, PCD e demais prioridades.",
    nextNumber: 1
  };

  const services = nextState.services.map((service) => {
    if (service.id !== "acougue") return service;
    return {
      ...service,
      name: "Açougue"
    };
  });
  if (!services.some((service) => service.id === "prioridade")) {
    services.push(defaultPriorityService);
  }
  nextState.services = services;
  return nextState;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTicket(service, number) {
  return `${service.prefix}${String(number).padStart(3, "0")}`;
}

function serviceById(id) {
  return state.services.find((service) => service.id === id);
}

function ticketLabel(ticket) {
  const service = serviceById(ticket.serviceId);
  return ticket.code || (service ? formatTicket(service, ticket.number) : "--");
}

function spokenTicket(ticket) {
  const service = serviceById(ticket.serviceId);
  const code = ticketLabel(ticket);
  const prefix = service?.prefix || code.slice(0, 1);
  const spokenPrefix = prefix.split("").join(" ");
  const number = String(ticket.number).padStart(3, "0").split("").join(" ");
  return `${spokenPrefix}, ${number}`;
}

function counterLabel(value) {
  const counter = (value || "").trim();
  if (!counter || /^balc[aã]o( 1)?$/i.test(counter)) {
    return "Balcão do açougue";
  }
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
    .sort((a, b) => {
      if (serviceId === "todos" && a.serviceId !== b.serviceId) {
        if (a.serviceId === "prioridade") return -1;
        if (b.serviceId === "prioridade") return 1;
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
}

function createTicket(serviceId) {
  const service = serviceById(serviceId);
  if (!service) return;

  const number = service.nextNumber;
  service.nextNumber += 1;

  const ticket = {
    id: createId(),
    serviceId,
    number,
    code: formatTicket(service, number),
    status: "waiting",
    createdAt: new Date().toISOString(),
    calledAt: null,
    finishedAt: null,
    counter: null
  };

  state.tickets.push(ticket);
  saveState();
  render();
  showLastTicket(ticket);
}

function callNext() {
  const serviceId = $("#sector-filter").value;
  const next = waitingTickets(serviceId)[0];
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
  render();
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
  render();
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
  render();
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
  render();
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
  const service = serviceById(ticket.serviceId);
  $("#last-ticket").textContent = ticketLabel(ticket);
  $("#last-ticket-detail").textContent = `${service.name} - emitida em ${nowText(ticket.createdAt)}`;
}

function renderServices() {
  const grid = $("#service-grid");
  const template = $("#service-template");
  grid.innerHTML = "";

  state.services.forEach((service) => {
    const node = template.content.cloneNode(true);
    const button = node.querySelector(".service-card");
    button.dataset.serviceId = service.id;
    if (service.id === "prioridade") button.classList.add("priority-service");
    node.querySelector(".service-prefix").textContent = service.prefix;
    node.querySelector(".service-name").textContent = service.name;
    node.querySelector(".service-description").textContent = service.description;
    button.addEventListener("click", () => createTicket(service.id));
    grid.appendChild(node);
  });
}

function renderFilters() {
  const select = $("#sector-filter");
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
  const selected = $("#sector-filter").value || "todos";
  const tickets = waitingTickets(selected);
  $("#waiting-count").textContent = tickets.length;
  $("#waiting-list").innerHTML = tickets.length
    ? tickets.map((ticket) => ticketItemHtml(ticket)).join("")
    : `<div class="empty">Nenhuma senha aguardando.</div>`;

  const current = getCurrentTicket();
  $("#current-ticket").textContent = current ? ticketLabel(current) : "--";
  $("#current-detail").textContent = current
    ? `${serviceById(current.serviceId).name} - ${counterLabel(current.counter)} - chamada em ${nowText(current.calledAt)}`
    : "Nenhuma senha chamada.";
}

function ticketItemHtml(ticket) {
  const service = serviceById(ticket.serviceId);
  return `
    <div class="ticket-item ${ticket.serviceId === "prioridade" ? "priority-ticket" : ""}">
      <strong>${ticketLabel(ticket)}</strong>
      <span>${service.name}</span>
      <small>${nowText(ticket.createdAt)}</small>
    </div>
  `;
}

function renderPanel() {
  const last = state.lastCalled ? state.tickets.find((ticket) => ticket.id === state.lastCalled) : null;
  $("#panel-ticket").textContent = last ? ticketLabel(last) : "--";
  $("#panel-sector").textContent = last ? serviceById(last.serviceId).name : "Aguardando chamada";
  $("#panel-counter").textContent = last ? counterLabel(last.counter) : "--";

  const history = state.tickets
    .filter((ticket) => ticket.calledAt)
    .sort((a, b) => new Date(b.calledAt) - new Date(a.calledAt))
    .slice(0, 8);

  $("#history-list").innerHTML = history.length
    ? history.map((ticket) => ticketItemHtml(ticket)).join("")
    : `<div class="empty">Sem chamadas recentes.</div>`;
}

function renderMetrics() {
  const total = state.tickets.length;
  const waiting = state.tickets.filter((ticket) => ticket.status === "waiting").length;
  const finished = state.tickets.filter((ticket) => ticket.status === "finished").length;
  const skipped = state.tickets.filter((ticket) => ticket.status === "skipped").length;
  const priority = state.tickets.filter((ticket) => ticket.serviceId === "prioridade").length;

  const byService = state.services.map((service) => {
    const count = state.tickets.filter((ticket) => ticket.serviceId === service.id).length;
    return `${service.name}: ${count}`;
  });

  const metrics = [
    ["Emitidas", total],
    ["Aguardando", waiting],
    ["Finalizadas", finished],
    ["Puladas", skipped],
    ["Prioridade", priority],
    ["Por setor", byService.join(" | ") || "0"]
  ];

  $("#metrics").innerHTML = metrics
    .map(([label, value]) => `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`)
    .join("");
}

function renderConfig() {
  $("#config-list").innerHTML = state.services
    .map((service) => `
      <div class="config-row" data-service-id="${service.id}">
        <label>Nome
          <input data-field="name" value="${service.name}" maxlength="28">
        </label>
        <label>Prefixo
          <input data-field="prefix" value="${service.prefix}" maxlength="2">
        </label>
        <label>Descricao
          <input data-field="description" value="${service.description}" maxlength="90">
        </label>
      </div>
    `)
    .join("");
}

function renderLastIssued() {
  const lastIssued = [...state.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (lastIssued) showLastTicket(lastIssued);
}

function render() {
  renderServices();
  renderFilters();
  renderQueue();
  renderPanel();
  renderMetrics();
  renderConfig();
  renderLastIssued();
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
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 24px; }
          h1 { font-size: 72px; margin: 16px 0; }
          p { margin: 8px 0; }
        </style>
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
  render();
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
  render();
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((item) => item.classList.remove("active"));
      $$(".view").forEach((view) => view.classList.remove("active"));
      tab.classList.add("active");
      $(`#view-${tab.dataset.view}`).classList.add("active");
      render();
    });
  });

  $("#sector-filter").addEventListener("change", renderQueue);
  $("#call-next").addEventListener("click", callNext);
  $("#recall-current").addEventListener("click", recallCurrent);
  $("#finish-current").addEventListener("click", finishCurrent);
  $("#skip-current").addEventListener("click", skipCurrent);
  $("#reset-day").addEventListener("click", resetDay);
  $("#print-last").addEventListener("click", printLastTicket);
  $("#save-config").addEventListener("click", saveConfig);
  $("#export-json").addEventListener("click", exportJson);
}

setInterval(() => {
  $("#clock").textContent = nowText();
}, 1000);

bindEvents();
render();
$("#clock").textContent = nowText();
