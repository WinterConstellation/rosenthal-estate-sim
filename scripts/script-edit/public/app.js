const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token") || "";
const initialItemId = urlParams.get("id") || "";
const state = {
  entries: [],
  selected: null,
  openFolders: new Set(),
  closedFolders: new Set(),
};

const entryList = document.querySelector("#entry-list");
const entryScrollbar = document.querySelector("#entry-scrollbar");
const entryScrollbarThumb = document.querySelector("#entry-scrollbar-thumb");
const searchInput = document.querySelector("#search-input");
const selectedKind = document.querySelector("#selected-kind");
const selectedLabel = document.querySelector("#selected-label");
const selectedFile = document.querySelector("#selected-file");
const valueEditor = document.querySelector("#value-editor");
const contextOutput = document.querySelector("#context-output");
const saveButton = document.querySelector("#save-button");
const discardButton = document.querySelector("#discard-button");
const itemActionPane = document.querySelector("#item-action-pane");
const deleteItemButton = document.querySelector("#delete-item-button");
const moveUpButton = document.querySelector("#move-up-button");
const moveDownButton = document.querySelector("#move-down-button");
const insertPane = document.querySelector("#insert-pane");
const insertSpeakerField = document.querySelector("#insert-speaker-field");
const insertSpeaker = document.querySelector("#insert-speaker");
const insertText = document.querySelector("#insert-text");
const insertBeforeButton = document.querySelector("#insert-before-button");
const insertAfterButton = document.querySelector("#insert-after-button");
const reindexButton = document.querySelector("#reindex-button");
const verifyButton = document.querySelector("#verify-button");
const entryCount = document.querySelector("#entry-count");
const kindFilter = document.querySelector("#kind-filter");
const fileFilter = document.querySelector("#file-filter");
const MIN_SCROLL_THUMB_HEIGHT = 34;
let entryScrollDrag = null;

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

function setInsertControls(item = {}) {
  const canInsert = Boolean(item.insert?.type);
  insertPane.hidden = !canInsert;
  const hasSpeaker = Boolean(item.insert?.fields?.some((field) => field.name === "speaker"));
  insertSpeaker.disabled = !canInsert || !hasSpeaker;
  insertText.disabled = !canInsert;
  insertBeforeButton.disabled = !canInsert;
  insertAfterButton.disabled = !canInsert;
  insertSpeakerField.hidden = !hasSpeaker;
  if (!canInsert) {
    insertSpeaker.value = "";
    insertText.value = "";
    return;
  }
  insertSpeaker.value = hasSpeaker ? (item.insert.defaults?.speaker || "narration") : "";
  insertText.value = "";
}

function setItemActionControls(item = {}) {
  const canActOnItem = Boolean(item.item?.range);
  itemActionPane.hidden = !canActOnItem;
  deleteItemButton.disabled = !canActOnItem;
  moveUpButton.disabled = !item.item?.previous;
  moveDownButton.disabled = !item.item?.next;
}

function formatEntryPreview(entry) {
  const value = entry.value;
  if (value == null) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  return raw.replace(/\s+/g, " ").trim();
}

function setSelectOptions(select, values, allLabel) {
  const current = select.value;
  const options = [
    new Option(allLabel, ""),
    ...values.map((value) => new Option(value, value)),
  ];
  select.replaceChildren(...options);
  select.value = values.includes(current) ? current : "";
}

function populateFilters() {
  const kinds = [...new Set(state.entries.map((entry) => entry.kind).filter(Boolean))].sort();
  const files = [...new Set(state.entries.map((entry) => entry.sourceFile).filter(Boolean))].sort();
  setSelectOptions(kindFilter, kinds, "All kinds");
  setSelectOptions(fileFilter, files, "All files");
}

function folderKeyFromSegments(segments) {
  return segments.join("\u001f");
}

function folderSegmentsForEntry(entry) {
  const sourceFile = entry.sourceFile || "Unknown source";
  const folderPath = Array.isArray(entry.folderPath) ? entry.folderPath.filter(Boolean) : [];
  return [sourceFile, ...folderPath];
}

function createFolderNode(label, key, depth) {
  return {
    label,
    key,
    depth,
    count: 0,
    entries: [],
    children: new Map(),
  };
}

function groupEntriesByFolder(entries) {
  const roots = new Map();
  for (const entry of entries) {
    const segments = folderSegmentsForEntry(entry);
    let children = roots;
    let node = null;
    for (let index = 0; index < segments.length; index += 1) {
      const key = folderKeyFromSegments(segments.slice(0, index + 1));
      if (!children.has(key)) {
        children.set(key, createFolderNode(segments[index], key, index));
      }
      node = children.get(key);
      node.count += 1;
      children = node.children;
    }
    if (node) node.entries.push(entry);
  }

  const materialize = (node) => ({
    ...node,
    children: [...node.children.values()].map(materialize),
  });
  return [...roots.values()].map(materialize);
}

function hasActiveListFilter() {
  return Boolean(searchInput.value.trim() || kindFilter.value || fileFilter.value);
}

function isFolderOpen(folderKey, depth, forceOpen) {
  if (forceOpen) return true;
  if (state.closedFolders.has(folderKey)) return false;
  if (state.openFolders.has(folderKey)) return true;
  return depth === 0;
}

function updateActiveEntry() {
  for (const button of entryList.querySelectorAll(".entry-button.is-active")) {
    button.classList.remove("is-active");
  }
  if (!state.selected) return;
  const selectedButton = [...entryList.querySelectorAll(".entry-button")]
    .find((button) => button.dataset.entryId === state.selected.id);
  if (!selectedButton) return;
  selectedButton.classList.add("is-active");
  let folder = selectedButton.closest(".entry-folder");
  while (folder instanceof HTMLDetailsElement) {
    folder.open = true;
    folder = folder.parentElement?.closest(".entry-folder");
  }
}

function scrollActiveEntryIntoView() {
  const activeButton = entryList.querySelector(".entry-button.is-active");
  if (!activeButton) return;
  activeButton.scrollIntoView({ block: "center" });
  queueEntryScrollbarUpdate();
}

function getEntryScrollbarMetrics() {
  const trackPadding = 2;
  const scrollHeight = entryList.scrollHeight;
  const clientHeight = entryList.clientHeight;
  const trackHeight = Math.max(0, entryScrollbar.clientHeight - trackPadding * 2);
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  const proportionalThumb = scrollHeight > 0 ? Math.round((clientHeight / scrollHeight) * trackHeight) : trackHeight;
  const thumbHeight = maxScroll > 0 ? Math.max(MIN_SCROLL_THUMB_HEIGHT, proportionalThumb) : trackHeight;
  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
  return { trackPadding, maxScroll, thumbHeight, maxThumbTop };
}

// Native scrollbars can disappear under OS overlay settings, so this rail stays visible beside the list.
function updateEntryScrollbar() {
  const metrics = getEntryScrollbarMetrics();
  const canScroll = metrics.maxScroll > 1;
  const thumbTop = canScroll && metrics.maxThumbTop > 0
    ? Math.round((entryList.scrollTop / metrics.maxScroll) * metrics.maxThumbTop)
    : 0;
  entryScrollbar.classList.toggle("is-disabled", !canScroll);
  entryScrollbar.style.setProperty("--entry-scroll-thumb-height", `${Math.max(0, metrics.thumbHeight)}px`);
  entryScrollbar.style.setProperty("--entry-scroll-thumb-top", `${thumbTop}px`);
}

function queueEntryScrollbarUpdate() {
  window.requestAnimationFrame(updateEntryScrollbar);
}

function setEntryScrollFromRailPointer(clientY, thumbOffset) {
  const metrics = getEntryScrollbarMetrics();
  if (metrics.maxScroll <= 0 || metrics.maxThumbTop <= 0) return;
  const railRect = entryScrollbar.getBoundingClientRect();
  const rawThumbTop = clientY - railRect.top - metrics.trackPadding - thumbOffset;
  const thumbTop = Math.max(0, Math.min(metrics.maxThumbTop, rawThumbTop));
  entryList.scrollTop = (thumbTop / metrics.maxThumbTop) * metrics.maxScroll;
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
  setInsertControls(item);
  setItemActionControls(item);
  showContext(item);
  // Do not rebuild the 1000+ item list on selection; replacing nodes resets the user's scroll position.
  updateActiveEntry();
}

async function selectEntryById(id, { scrollIntoView = false } = {}) {
  const item = await api(`/api/item?id=${encodeURIComponent(id)}`);
  setSelected(item);
  if (scrollIntoView) scrollActiveEntryIntoView();
  return item;
}

function clearSelected() {
  state.selected = null;
  selectedKind.textContent = "No item";
  selectedLabel.textContent = "Select an editable item";
  selectedFile.textContent = "";
  valueEditor.disabled = true;
  valueEditor.value = "";
  saveButton.disabled = true;
  discardButton.disabled = true;
  setInsertControls();
  setItemActionControls();
  updateActiveEntry();
}

function getFilteredEntries() {
  const query = searchInput.value.trim().toLowerCase();
  const kind = kindFilter.value;
  const sourceFile = fileFilter.value;
  return state.entries.filter((entry) => {
    if (kind && entry.kind !== kind) return false;
    if (sourceFile && entry.sourceFile !== sourceFile) return false;
    const haystack = [
      entry.id,
      entry.label,
      entry.sourceFile,
      entry.kind,
      entry.field,
      formatEntryPreview(entry),
    ].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });
}

function createEntryButton(entry) {
  const button = document.createElement("button");
  const preview = formatEntryPreview(entry);
  button.type = "button";
  button.dataset.entryId = entry.id;
  button.className = `entry-button${state.selected?.id === entry.id ? " is-active" : ""}`;
  button.innerHTML = `
    <div class="entry-kind">${entry.kind}</div>
    <div class="entry-label"></div>
    <div class="entry-value"></div>
    <div class="entry-file"></div>
  `;
  button.querySelector(".entry-label").textContent = entry.label;
  button.querySelector(".entry-value").textContent = preview;
  button.querySelector(".entry-value").hidden = !preview;
  button.querySelector(".entry-file").textContent = entry.field ? `${entry.field} · ${entry.id}` : entry.id;
  button.addEventListener("click", async () => {
    try {
      await selectEntryById(entry.id);
    } catch (error) {
      showContext(error.message);
    }
  });
  return button;
}

function createFolder(folderNode, forceOpen) {
  const folder = document.createElement("details");
  folder.className = "entry-folder";
  folder.dataset.depth = String(folderNode.depth);
  folder.open = isFolderOpen(folderNode.key, folderNode.depth, forceOpen);
  folder.addEventListener("toggle", () => {
    if (folder.open) {
      state.openFolders.add(folderNode.key);
      state.closedFolders.delete(folderNode.key);
    } else {
      state.closedFolders.add(folderNode.key);
      state.openFolders.delete(folderNode.key);
    }
    queueEntryScrollbarUpdate();
  });

  const summary = document.createElement("summary");
  summary.className = "folder-summary";
  summary.innerHTML = `
    <span class="folder-name"></span>
    <span class="folder-count"></span>
  `;
  summary.querySelector(".folder-name").textContent = folderNode.label;
  summary.querySelector(".folder-count").textContent = String(folderNode.count);

  const items = document.createElement("div");
  items.className = "folder-items";
  items.replaceChildren(
    ...folderNode.children.map((child) => createFolder(child, forceOpen)),
    ...folderNode.entries.map(createEntryButton),
  );

  folder.replaceChildren(summary, items);
  return folder;
}

function renderEntries({ preserveScroll = true, scrollTop } = {}) {
  const entries = getFilteredEntries();
  const nextScrollTop = scrollTop ?? (preserveScroll ? entryList.scrollTop : 0);
  entryCount.textContent = `${entries.length} / ${state.entries.length}`;
  // Filtering and reindexing rebuild folder nodes; restore scroll so the left pane does not jump.
  entryList.replaceChildren(...groupEntriesByFolder(entries).map((folder) => createFolder(folder, hasActiveListFilter())));
  entryList.scrollTop = nextScrollTop;
  updateActiveEntry();
  queueEntryScrollbarUpdate();
}

async function refreshIndex({ preserveScroll = true, scrollTop } = {}) {
  const index = await api("/api/index");
  state.entries = index.entries || [];
  populateFilters();
  renderEntries({ preserveScroll, scrollTop });
  return index;
}

async function loadIndex() {
  const index = await refreshIndex({ preserveScroll: false });
  if (initialItemId) {
    try {
      await selectEntryById(initialItemId, { scrollIntoView: true });
      return;
    } catch (error) {
      showContext(error.message);
    }
  }
  showContext({ entries: state.entries.length, generatedAt: index.generatedAt });
}

saveButton.addEventListener("click", async () => {
  if (!state.selected) return;
  try {
    const selectedId = state.selected.id;
    const scrollTop = entryList.scrollTop;
    const result = await api("/api/item", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: state.selected.id, value: valueEditor.value }),
    });
    await refreshIndex({ preserveScroll: true, scrollTop });
    const refreshed = await api(`/api/item?id=${encodeURIComponent(selectedId)}`);
    setSelected(refreshed);
    entryList.scrollTop = scrollTop;
    queueEntryScrollbarUpdate();
    showContext(result);
  } catch (error) {
    showContext(error.message);
  }
});

async function insertDialogueTurn(direction) {
  if (!state.selected?.insert) return;
  try {
    const selectedId = state.selected.id;
    const selectedSourceFile = state.selected.sourceFile;
    const insertedText = insertText.value;
    const scrollTop = entryList.scrollTop;
    const result = await api("/api/insert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: selectedId,
        direction,
        fields: {
          speaker: insertSpeaker.value,
          text: insertedText,
        },
      }),
    });
    await refreshIndex({ preserveScroll: true, scrollTop });
    const inserted = state.entries.find((entry) => (
      entry.sourceFile === selectedSourceFile
      && entry.field === "text"
      && entry.value === insertedText
    ));
    const nextSelectedId = inserted?.id ?? selectedId;
    setSelected(await api(`/api/item?id=${encodeURIComponent(nextSelectedId)}`));
    entryList.scrollTop = scrollTop;
    queueEntryScrollbarUpdate();
    showContext(result);
  } catch (error) {
    showContext(error.message);
  }
}

function findEntryLike(item) {
  // Move operations can change position-based ids, so keep the same visible item selected by content.
  return state.entries.find((entry) => (
    entry.sourceFile === item.sourceFile
    && entry.field === item.field
    && entry.kind === item.kind
    && entry.value === item.value
  )) ?? state.entries.find((entry) => entry.id === item.id);
}

async function moveSelectedItem(direction) {
  if (!state.selected?.item) return;
  try {
    const selectedBeforeMove = state.selected;
    const scrollTop = entryList.scrollTop;
    const result = await api("/api/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selectedBeforeMove.id, direction }),
    });
    await refreshIndex({ preserveScroll: true, scrollTop });
    const movedEntry = findEntryLike(selectedBeforeMove);
    if (movedEntry) {
      setSelected(await api(`/api/item?id=${encodeURIComponent(movedEntry.id)}`));
    }
    entryList.scrollTop = scrollTop;
    queueEntryScrollbarUpdate();
    showContext(result);
  } catch (error) {
    showContext(error.message);
  }
}

async function deleteSelectedItem() {
  if (!state.selected?.item) return;
  if (!window.confirm("선택한 대사/문단 항목 전체를 삭제할까요?")) return;
  try {
    const filteredEntries = getFilteredEntries();
    const selectedIndex = Math.max(0, filteredEntries.findIndex((entry) => entry.id === state.selected.id));
    const scrollTop = entryList.scrollTop;
    const result = await api("/api/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: state.selected.id }),
    });
    await refreshIndex({ preserveScroll: true, scrollTop });
    const nextEntries = getFilteredEntries();
    const nextEntry = nextEntries[Math.min(selectedIndex, nextEntries.length - 1)];
    if (nextEntry) {
      setSelected(await api(`/api/item?id=${encodeURIComponent(nextEntry.id)}`));
    } else {
      clearSelected();
    }
    entryList.scrollTop = scrollTop;
    queueEntryScrollbarUpdate();
    showContext(result);
  } catch (error) {
    showContext(error.message);
  }
}

insertBeforeButton.addEventListener("click", () => {
  void insertDialogueTurn("before");
});

insertAfterButton.addEventListener("click", () => {
  void insertDialogueTurn("after");
});

moveUpButton.addEventListener("click", () => {
  void moveSelectedItem("up");
});

moveDownButton.addEventListener("click", () => {
  void moveSelectedItem("down");
});

deleteItemButton.addEventListener("click", () => {
  void deleteSelectedItem();
});

discardButton.addEventListener("click", () => {
  if (state.selected) valueEditor.value = String(state.selected.value ?? "");
});

reindexButton.addEventListener("click", async () => {
  try {
    const scrollTop = entryList.scrollTop;
    const result = await api("/api/reindex", { method: "POST" });
    state.entries = result.entries || [];
    populateFilters();
    renderEntries({ preserveScroll: true, scrollTop });
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

entryList.addEventListener("scroll", updateEntryScrollbar);
entryScrollbar.addEventListener("pointerdown", (event) => {
  const metrics = getEntryScrollbarMetrics();
  if (metrics.maxScroll <= 0) return;
  const thumbRect = entryScrollbarThumb.getBoundingClientRect();
  const clickedThumb = event.target === entryScrollbarThumb;
  entryScrollDrag = {
    pointerId: event.pointerId,
    thumbOffset: clickedThumb ? event.clientY - thumbRect.top : metrics.thumbHeight / 2,
  };
  entryScrollbar.setPointerCapture(event.pointerId);
  entryScrollbar.classList.add("is-dragging");
  setEntryScrollFromRailPointer(event.clientY, entryScrollDrag.thumbOffset);
});
entryScrollbar.addEventListener("pointermove", (event) => {
  if (!entryScrollDrag || entryScrollDrag.pointerId !== event.pointerId) return;
  setEntryScrollFromRailPointer(event.clientY, entryScrollDrag.thumbOffset);
});
entryScrollbar.addEventListener("pointerup", (event) => {
  if (!entryScrollDrag || entryScrollDrag.pointerId !== event.pointerId) return;
  entryScrollDrag = null;
  entryScrollbar.classList.remove("is-dragging");
});
entryScrollbar.addEventListener("pointercancel", () => {
  entryScrollDrag = null;
  entryScrollbar.classList.remove("is-dragging");
});
window.addEventListener("resize", queueEntryScrollbarUpdate);
if ("ResizeObserver" in window) {
  new ResizeObserver(queueEntryScrollbarUpdate).observe(entryList);
}

searchInput.addEventListener("input", () => renderEntries({ preserveScroll: false }));
kindFilter.addEventListener("change", () => renderEntries({ preserveScroll: false }));
fileFilter.addEventListener("change", () => renderEntries({ preserveScroll: false }));

if (!token) {
  showContext("Missing token in URL.");
} else {
  loadIndex().catch((error) => showContext(error.message));
}
