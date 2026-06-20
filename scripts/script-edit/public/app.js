const token = new URLSearchParams(window.location.search).get("token") || "";
const state = {
  entries: [],
  selected: null,
};

const entryList = document.querySelector("#entry-list");
const searchInput = document.querySelector("#search-input");
const selectedKind = document.querySelector("#selected-kind");
const selectedLabel = document.querySelector("#selected-label");
const selectedFile = document.querySelector("#selected-file");
const valueEditor = document.querySelector("#value-editor");
const contextOutput = document.querySelector("#context-output");
const saveButton = document.querySelector("#save-button");
const discardButton = document.querySelector("#discard-button");
const reindexButton = document.querySelector("#reindex-button");
const verifyButton = document.querySelector("#verify-button");

async function api(path, options = {}) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("token", token);
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

function showContext(value) {
  contextOutput.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setSelected(item) {
  state.selected = item;
  selectedKind.textContent = item.kind;
  selectedLabel.textContent = item.label;
  selectedFile.textContent = item.sourceFile;
  valueEditor.disabled = false;
  valueEditor.value = String(item.value ?? "");
  saveButton.disabled = false;
  discardButton.disabled = false;
  showContext(item);
  renderEntries();
}

function renderEntries() {
  const query = searchInput.value.trim().toLowerCase();
  const entries = state.entries.filter((entry) => {
    const haystack = `${entry.id} ${entry.label} ${entry.sourceFile} ${entry.kind}`.toLowerCase();
    return haystack.includes(query);
  });
  entryList.replaceChildren(...entries.map((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `entry-button${state.selected?.id === entry.id ? " is-active" : ""}`;
    button.innerHTML = `
      <div class="entry-kind">${entry.kind}</div>
      <div class="entry-label"></div>
      <div class="entry-file"></div>
    `;
    button.querySelector(".entry-label").textContent = entry.label;
    button.querySelector(".entry-file").textContent = entry.sourceFile;
    button.addEventListener("click", async () => {
      try {
        setSelected(await api(`/api/item?id=${encodeURIComponent(entry.id)}`));
      } catch (error) {
        showContext(error.message);
      }
    });
    return button;
  }));
}

async function loadIndex() {
  const index = await api("/api/index");
  state.entries = index.entries || [];
  renderEntries();
  showContext({ entries: state.entries.length, generatedAt: index.generatedAt });
}

saveButton.addEventListener("click", async () => {
  if (!state.selected) return;
  try {
    const result = await api("/api/item", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: state.selected.id, value: valueEditor.value }),
    });
    await loadIndex();
    const refreshed = await api(`/api/item?id=${encodeURIComponent(state.selected.id)}`);
    setSelected(refreshed);
    showContext(result);
  } catch (error) {
    showContext(error.message);
  }
});

discardButton.addEventListener("click", () => {
  if (state.selected) valueEditor.value = String(state.selected.value ?? "");
});

reindexButton.addEventListener("click", async () => {
  try {
    const result = await api("/api/reindex", { method: "POST" });
    state.entries = result.entries || [];
    renderEntries();
    showContext({ reindexed: true, entries: state.entries.length });
  } catch (error) {
    showContext(error.message);
  }
});

verifyButton.addEventListener("click", async () => {
  try {
    showContext(await api("/api/verify", { method: "POST" }));
  } catch (error) {
    showContext(error.message);
  }
});

searchInput.addEventListener("input", renderEntries);

if (!token) {
  showContext("Missing token in URL.");
} else {
  loadIndex().catch((error) => showContext(error.message));
}
