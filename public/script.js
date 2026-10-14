const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function showMessage(element, message, kind = "success") {
  if (!element) return;
  element.textContent = message;
  element.className = `notice ${kind}`;
}
function hideMessage(element) {
  if (element) element.className = "notice hidden";
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function eventCard(e) {
  const date = new Date(`${e.event_date}T00:00:00`);
  const dateLabel = Number.isNaN(date.getTime()) ? e.event_date : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return `<article class="event-card"><div class="event-card-top"><span class="event-type">${escapeHTML(e.event_type)}</span><span class="event-id">#${escapeHTML(e.event_id)}</span></div><h3>${escapeHTML(e.event_name)}</h3><p class="event-description">${escapeHTML(e.description || "No description provided.")}</p><div class="event-meta"><span>▦ ${escapeHTML(dateLabel)}</span><span>⌖ ${escapeHTML(e.venue)}</span></div><div class="card-links"><a href="update.html?id=${encodeURIComponent(e.event_id)}">Edit ↗</a><a href="delete.html?id=${encodeURIComponent(e.event_id)}">Delete ↗</a></div></article>`;
}
async function loadHome() {
  const container = $("#eventCards");
  if (!container) return;
  try {
    const events = await api("/api/events");
    $("#eventCount").textContent = events.length;
    container.innerHTML = events.length ? events.map(eventCard).join("") : '<div class="empty">No events yet. <a href="insert.html">Add the first event.</a></div>';
  } catch (err) {
    container.innerHTML = `<div class="notice error">${escapeHTML(err.message)}<br>Check that MySQL is running and server.js has the correct password.</div>`;
  }
}
function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}
async function loadInsertedEvents() {
  const table = $("#insertedEventsTable");
  if (!table) return;
  const summary = $("#insertedEventsSummary");
  try {
    const events = await api("/api/events");
    // Keep the table ordered by Event ID, smallest to largest.
    events.sort((a, b) => Number(a.event_id) - Number(b.event_id));
    summary.textContent = `${events.length} event record${events.length === 1 ? "" : "s"} in database`;
    table.innerHTML = renderTable(events);
  } catch (err) {
    summary.textContent = "Could not load event records";
    table.innerHTML = `<div class="notice error">${escapeHTML(err.message)}</div>`;
  }
}

function setupInsert() {
  const form = $("#eventForm");
  if (!form || location.pathname.split("/").pop() !== "insert.html") return;
  loadInsertedEvents();
  const refreshButton = $("#refreshInsertedEvents");
  if (refreshButton) refreshButton.addEventListener("click", loadInsertedEvents);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("#formMessage");
    hideMessage(message);
    try {
      const result = await api("/api/events", { method: "POST", body: JSON.stringify(formObject(form)) });
      showMessage(message, `${result.message} New event ID: ${result.event_id}`);
      form.reset();
      await loadInsertedEvents();
    } catch (err) { showMessage(message, err.message, "error"); }
  });
}
function setupUpdate() {
  const form = $("#eventForm");
  if (!form || !location.pathname.endsWith("update.html")) return;
  const message = $("#formMessage");
  const idInput = $("#updateId");
  const picker = idInput;
  const populatePicker = async () => {
    try {
      const events = await api("/api/events");
      picker.innerHTML = '<option value="">Choose an event ID…</option>' + events.map(e =>
        `<option value="${escapeHTML(e.event_id)}">${escapeHTML(e.event_id)}</option>`
      ).join("");
      const currentId = new URLSearchParams(location.search).get("id");
      if (currentId) picker.value = currentId;
    } catch (err) {
      picker.innerHTML = '<option value="">Could not load event IDs</option>';
    }
  };
  const load = async () => {
    hideMessage(message);
    const id = idInput.value.trim();
    if (!id) return showMessage(message, "Enter an event ID first.", "error");
    try {
      const e = await api(`/api/events/${encodeURIComponent(id)}`);
      for (const key of ["event_name", "event_type", "event_date", "venue", "description"]) {
        const field = form.elements.namedItem(key);
        if (field) field.value = e[key] || "";
      }
      form.classList.remove("hidden");
      showMessage(message, `Loaded event #${e.event_id}. Edit the fields and save.`);
    } catch (err) { form.classList.add("hidden"); showMessage(message, err.message, "error"); }
  };
  $("#loadEvent").addEventListener("click", load);
  if (picker) picker.addEventListener("change", () => { idInput.value = picker.value; if (idInput.value) load(); });
  populatePicker();
  const idFromUrl = new URLSearchParams(location.search).get("id");
  if (idFromUrl) { idInput.value = idFromUrl; load(); }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const id = idInput.value.trim();
      const result = await api(`/api/events/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(formObject(form)) });
      showMessage(message, result.message);
    } catch (err) { showMessage(message, err.message, "error"); }
  });
}
function setupDelete() {
  const idInput = $("#deleteId");
  if (!idInput) return;
  const message = $("#formMessage"), preview = $("#deletePreview"), button = $("#deleteButton");
  const picker = idInput;
  let loadedId = "";
  const populatePicker = async () => {
    try {
      const events = await api("/api/events");
      picker.innerHTML = '<option value="">Choose an event ID…</option>' + events.map(e =>
        `<option value="${escapeHTML(e.event_id)}">${escapeHTML(e.event_id)}</option>`
      ).join("");
      const currentId = new URLSearchParams(location.search).get("id");
      if (currentId) picker.value = currentId;
    } catch (err) {
      picker.innerHTML = '<option value="">Could not load event IDs</option>';
    }
  };
  const find = async () => {
    hideMessage(message); preview.classList.add("hidden"); button.classList.add("hidden");
    const id = idInput.value.trim();
    if (!id) return showMessage(message, "Enter an event ID first.", "error");
    try {
      const e = await api(`/api/events/${encodeURIComponent(id)}`);
      loadedId = String(e.event_id);
      preview.innerHTML = `<span class="event-type">${escapeHTML(e.event_type)}</span><h3>${escapeHTML(e.event_name)}</h3><p><b>Date:</b> ${escapeHTML(e.event_date)}</p><p><b>Venue:</b> ${escapeHTML(e.venue)}</p><p>${escapeHTML(e.description || "No description provided.")}</p>`;
      preview.classList.remove("hidden"); button.classList.remove("hidden");
    } catch (err) { showMessage(message, err.message, "error"); }
  };
  $("#findDelete").addEventListener("click", find);
  if (picker) picker.addEventListener("change", () => { idInput.value = picker.value; if (idInput.value) find(); });
  populatePicker();
  const idFromUrl = new URLSearchParams(location.search).get("id");
  if (idFromUrl) { idInput.value = idFromUrl; find(); }
  button.addEventListener("click", async () => {
    if (!loadedId || !confirm(`Delete event #${loadedId}? This cannot be undone.`)) return;
    try {
      const result = await api(`/api/events/${encodeURIComponent(loadedId)}`, { method: "DELETE" });
      showMessage(message, result.message); preview.classList.add("hidden"); button.classList.add("hidden"); idInput.value = ""; loadedId = ""; if (picker) { const removed = picker.value; const option = picker.querySelector(`option[value="${removed}"]`); if (option) option.remove(); picker.value = ""; }
    } catch (err) { showMessage(message, err.message, "error"); }
  });
}
function renderTable(events) {
  if (!events.length) return '<div class="empty">No matching events found.</div>';
  return `<table><thead><tr><th>ID</th><th>Event</th><th>Type</th><th>Date</th><th>Venue</th><th>Description</th><th>Actions</th></tr></thead><tbody>${events.map(e => `<tr><td>${escapeHTML(e.event_id)}</td><td><b>${escapeHTML(e.event_name)}</b></td><td><span class="event-type">${escapeHTML(e.event_type)}</span></td><td>${escapeHTML(e.event_date)}</td><td>${escapeHTML(e.venue)}</td><td>${escapeHTML(e.description || "—")}</td><td class="table-actions"><a href="update.html?id=${encodeURIComponent(e.event_id)}">Edit</a><a href="delete.html?id=${encodeURIComponent(e.event_id)}">Delete</a></td></tr>`).join("")}</tbody></table>`;
}
function setupSearch() {
  const form = $("#searchForm");
  if (!form) return;
  const input = $("#searchQuery"), results = $("#searchResults"), summary = $("#searchSummary");
  const run = async () => {
    results.innerHTML = '<div class="loading">Searching…</div>';
    try {
      const events = await api(`/api/events?q=${encodeURIComponent(input.value.trim())}`);
      summary.textContent = `${events.length} event${events.length === 1 ? "" : "s"} found`;
      results.innerHTML = renderTable(events);
    } catch (err) { results.innerHTML = `<div class="notice error">${escapeHTML(err.message)}</div>`; }
  };
  form.addEventListener("submit", (event) => { event.preventDefault(); run(); });
  $("#clearSearch").addEventListener("click", () => { input.value = ""; run(); });
  run();
}

function setupAllEvents() {
  const table = $("#allEventsTable");
  if (!table) return;
  const summary = $("#allEventsSummary");
  const loadAll = async () => {
    table.innerHTML = '<div class="loading">Loading all events from database…</div>';
    try {
      const events = await api("/api/events");
      summary.textContent = `${events.length} event record${events.length === 1 ? "" : "s"} in database`;
      table.innerHTML = renderTable(events);
    } catch (err) {
      summary.textContent = "Could not load database records";
      table.innerHTML = `<div class="notice error">${escapeHTML(err.message)}. Check that MySQL is running and the server is configured.</div>`;
    }
  };
  const refresh = $("#refreshEvents");
  if (refresh) refresh.addEventListener("click", loadAll);
  loadAll();
}

document.addEventListener("DOMContentLoaded", () => {
  loadHome(); setupInsert(); setupUpdate(); setupDelete(); setupSearch(); setupAllEvents();
});
