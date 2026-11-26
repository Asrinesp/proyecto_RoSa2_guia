(() => {
  const DATA_URL = "DATA/armaduras.json";
  const tabsEl = document.getElementById("category-tabs");
  const searchEl = document.getElementById("armor-search");
  const listEl = document.getElementById("armor-list");
  const introEl = document.getElementById("category-intro");
  const notesEl = document.getElementById("general-notes");
  const countEl = document.getElementById("results-count");
  const clearBtn = document.getElementById("clear-search");

  let categories = [];
  let activeCategory = "all";
  let query = "";

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);

  function prettyLabel(key) {
    const labels = {
      physical_defense:"Defensa física", magic_defense:"Defensa mágica",
      block_rate:"Probabilidad de bloqueo", physical_defense_effect:"Efecto de defensa física",
      encumbrance:"Carga", movement_speed:"Velocidad de movimiento",
      reforged:"Reforjado", reforged_effects:"Efectos al reforjar",
      effects:"Efectos", hidden_attributes:"Atributos ocultos",
      hidden_properties:"Propiedades ocultas", unique_techniques:"Técnicas únicas",
      location:"Localización", notes:"Notas", source_note:"Nota de la fuente"
    };
    return labels[key] || key.replaceAll("_", " ");
  }

  function displayValue(value) {
    if (Array.isArray(value)) return `<ul>${value.map(v => `<li>${esc(displayValue(v))}</li>`).join("")}</ul>`;
    if (value && typeof value === "object") {
      return `<ul>${Object.entries(value).map(([k,v]) => `<li><b>${esc(prettyLabel(k))}:</b> ${esc(v)}</li>`).join("")}</ul>`;
    }
    if (typeof value === "number" && ["block_rate"].includes("")) return `${value}%`;
    return esc(value);
  }

  function statChip(label, value, suffix = "") {
    if (value === undefined || value === null || value === "") return "";
    return `<span class="stat-chip">${esc(label)} <b>${esc(value)}${suffix}</b></span>`;
  }

  function renderGeneralNotes(notes) {
    notesEl.innerHTML = (notes || []).map((note, i) => `
      <details class="note-card" ${i === 0 ? "open" : ""}>
        <summary>${esc(note.title)}</summary><p>${esc(note.text)}</p>
      </details>`).join("");
  }

  function renderTabs() {
    const allCount = categories.reduce((n, c) => n + c.items.length, 0);
    const buttons = [`<button class="category-tab ${activeCategory === "all" ? "active" : ""}" data-category="all">Todas (${allCount})</button>`];
    categories.forEach(cat => {
      buttons.push(`<button class="category-tab ${activeCategory === cat.id ? "active" : ""}" data-category="${esc(cat.id)}">${esc(cat.name)} (${cat.items.length})</button>`);
    });
    tabsEl.innerHTML = buttons.join("");
    tabsEl.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      render();
    }));
  }

  function searchable(item, category) {
    return JSON.stringify({item, category: category.name}).toLocaleLowerCase();
  }

  function renderItem(item) {
    const quick = [
      statChip("DEF FÍS", item.physical_defense),
      statChip("DEF MÁG", item.magic_defense),
      statChip("BLOQUEO", item.block_rate, "%"),
      statChip("CARGA", item.encumbrance),
      statChip("VEL.", item.movement_speed > 0 ? `+${item.movement_speed}` : item.movement_speed)
    ].filter(Boolean).join("");

    const fields = Object.entries(item).filter(([key]) => key !== "name" &&
      !["physical_defense","magic_defense","block_rate","encumbrance","movement_speed"].includes(key));
    const details = fields.map(([key, value]) => `
      <div class="detail-group"><h3>${esc(prettyLabel(key))}</h3>
      ${Array.isArray(value) || (value && typeof value === "object")
        ? displayValue(value)
        : `<p>${esc(value)}</p>`}</div>`).join("");

    return `<details class="armor-card">
      <summary><span class="armor-name">${esc(item.name)}</span><span class="armor-quick">${quick}</span></summary>
      <div class="armor-details">
        ${item.physical_defense !== undefined ? `<div class="detail-group"><h3>Defensa física</h3><p>${esc(item.physical_defense)}</p></div>` : ""}
        ${item.magic_defense !== undefined ? `<div class="detail-group"><h3>Defensa mágica</h3><p>${esc(item.magic_defense)}</p></div>` : ""}
        ${item.block_rate !== undefined ? `<div class="detail-group"><h3>Probabilidad de bloqueo</h3><p>${esc(item.block_rate)}%</p></div>` : ""}
        ${details}
      </div>
    </details>`;
  }

  function render() {
    renderTabs();
    const selected = activeCategory === "all" ? categories : categories.filter(c => c.id === activeCategory);
    const filtered = [];
    selected.forEach(category => category.items.forEach(item => {
      if (!query || searchable(item, category).includes(query)) filtered.push({item, category});
    }));

    const currentCategory = categories.find(c => c.id === activeCategory);
    if (activeCategory === "all") {
      introEl.innerHTML = `<h2>Todo el equipo</h2><p>Explora las siete categorías de armaduras y accesorios.</p>`;
    } else {
      introEl.innerHTML = `<h2>${esc(currentCategory.name)}</h2><p>${esc(currentCategory.description || "Equipo de esta categoría.")}</p>`;
    }
    countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "pieza encontrada" : "piezas encontradas"}`;
    clearBtn.hidden = !query;
    listEl.innerHTML = filtered.length
      ? filtered.map(({item, category}) => renderItem(item)).join("")
      : `<div class="empty-state">No se han encontrado piezas con esa búsqueda.</div>`;
  }

  searchEl.addEventListener("input", () => {
    query = searchEl.value.trim().toLocaleLowerCase();
    render();
  });
  clearBtn.addEventListener("click", () => {
    searchEl.value = "";
    query = "";
    render();
    searchEl.focus();
  });

  fetch(DATA_URL)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      categories = data.categories || [];
      renderGeneralNotes(data.general_notes);
      render();
    })
    .catch(error => {
      console.error("No se pudo cargar armaduras.json:", error);
      listEl.innerHTML = `<div class="empty-state">No se pudo cargar <b>DATA/armaduras.json</b>.<br>Comprueba que la carpeta DATA está junto a armaduras.html y abre la guía mediante un servidor local (por ejemplo, Live Server).</div>`;
      countEl.textContent = "Error al cargar los datos";
      tabsEl.innerHTML = "";
      notesEl.innerHTML = "";
    });
})();
