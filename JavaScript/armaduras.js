(() => {
  "use strict";

  const DATA_URL = "DATA/armaduras.json";

  const tabsEl = document.getElementById("category-tabs");
  const searchEl = document.getElementById("armor-search");
  const listEl = document.getElementById("armor-list");
  const introEl = document.getElementById("category-intro");
  const notesEl = document.getElementById("general-notes");
  const countEl = document.getElementById("results-count");
  const clearBtn = document.getElementById("clear-search");

  if (!tabsEl || !searchEl || !listEl || !introEl || !notesEl || !countEl || !clearBtn) {
    console.error("armaduras.js: no se han encontrado todos los elementos necesarios en armaduras.html.");
    return;
  }

  let categories = [];
  let activeCategory = "all";
  let query = "";
  let dataLoaded = false;

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const normalize = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const fieldLabels = {
    physical_defense: "Defensa física",
    magic_defense: "Defensa mágica",
    block_rate: "Probabilidad de bloqueo",
    physical_defense_effect: "Efecto de defensa física",
    encumbrance: "Carga",
    movement_speed: "Velocidad de movimiento",
    reforged: "Reforjado",
    reforged_effects: "Efectos al reforjar",
    effects: "Efectos",
    hidden_attributes: "Atributos ocultos",
    hidden_properties: "Propiedades ocultas",
    unique_techniques: "Técnicas únicas",
    location: "Localización",
    notes: "Notas",
    source_note: "Nota de la fuente"
  };

  function prettyLabel(key) {
    return fieldLabels[key] || String(key).replaceAll("_", " ");
  }

  function displayValue(value) {
    if (Array.isArray(value)) {
      return `<ul>${value
        .map((item) => `<li>${displayValue(item)}</li>`)
        .join("")}</ul>`;
    }

    if (value && typeof value === "object") {
      return `<ul>${Object.entries(value)
        .map(([key, item]) => `
          <li>
            <b>${escapeHTML(prettyLabel(key))}:</b>
            ${displayValue(item)}
          </li>
        `)
        .join("")}</ul>`;
    }

    return escapeHTML(value);
  }

  function statChip(label, value, suffix = "") {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    return `
      <span class="stat-chip">
        ${escapeHTML(label)}
        <b>${escapeHTML(value)}${escapeHTML(suffix)}</b>
      </span>
    `;
  }

  function renderGeneralNotes(notes) {
    if (!Array.isArray(notes) || !notes.length) {
      notesEl.innerHTML = "";
      return;
    }

    notesEl.innerHTML = notes.map((note, index) => `
      <details class="note-card" ${index === 0 ? "open" : ""}>
        <summary>${escapeHTML(note.title)}</summary>
        <p>${escapeHTML(note.text)}</p>
      </details>
    `).join("");
  }

  function renderTabs() {
    const allCount = categories.reduce(
      (total, category) => total + (category.items?.length || 0),
      0
    );

    const buttons = [
      `
        <button
          class="category-tab"
          type="button"
          data-category="all"
          aria-pressed="${activeCategory === "all" ? "true" : "false"}"
        >
          Todas
          <span aria-hidden="true">(${allCount})</span>
        </button>
      `
    ];

    categories.forEach((category) => {
      buttons.push(`
        <button
          class="category-tab"
          type="button"
          data-category="${escapeHTML(category.id)}"
          aria-pressed="${activeCategory === category.id ? "true" : "false"}"
        >
          ${escapeHTML(category.name)}
          <span aria-hidden="true">(${category.items?.length || 0})</span>
        </button>
      `);
    });

    tabsEl.innerHTML = buttons.join("");

    tabsEl.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        render();

        const selectedTab = tabsEl.querySelector(
          `[data-category="${CSS.escape(activeCategory)}"]`
        );

        if (selectedTab) {
          selectedTab.focus();
        }
      });
    });
  }

  function searchableText(item, category) {
    const values = [];

    const collect = (value) => {
      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }

      if (typeof value === "object") {
        Object.entries(value).forEach(([key, nestedValue]) => {
          values.push(prettyLabel(key));
          collect(nestedValue);
        });
        return;
      }

      values.push(value);
    };

    Object.entries(item).forEach(([key, value]) => {
      values.push(prettyLabel(key));
      collect(value);
    });

    values.push(category.name);

    return normalize(values.filter(Boolean).join(" "));
  }

  function renderItem(item) {
    const quick = [
      statChip("DEF FÍS", item.physical_defense),
      statChip("DEF MÁG", item.magic_defense),
      statChip("BLOQUEO", item.block_rate, "%"),
      statChip("CARGA", item.encumbrance),
      statChip(
        "VEL.",
        item.movement_speed > 0 ? `+${item.movement_speed}` : item.movement_speed
      )
    ].filter(Boolean).join("");

    const excludedFields = [
      "name",
      "physical_defense",
      "magic_defense",
      "block_rate",
      "encumbrance",
      "movement_speed"
    ];

    const fields = Object.entries(item)
      .filter(([key]) => !excludedFields.includes(key));

    const details = fields.map(([key, value]) => `
      <div class="detail-group">
        <h3>${escapeHTML(prettyLabel(key))}</h3>
        ${
          Array.isArray(value) || (value && typeof value === "object")
            ? displayValue(value)
            : `<p>${escapeHTML(value)}</p>`
        }
      </div>
    `).join("");

    const statDetails = [
      item.physical_defense != null
        ? `
          <div class="detail-group">
            <h3>Defensa física</h3>
            <p>${escapeHTML(item.physical_defense)}</p>
          </div>
        `
        : "",

      item.magic_defense != null
        ? `
          <div class="detail-group">
            <h3>Defensa mágica</h3>
            <p>${escapeHTML(item.magic_defense)}</p>
          </div>
        `
        : "",

      item.block_rate != null
        ? `
          <div class="detail-group">
            <h3>Probabilidad de bloqueo</h3>
            <p>${escapeHTML(item.block_rate)}%</p>
          </div>
        `
        : ""
    ].filter(Boolean).join("");

    return `
      <details class="armor-card">
        <summary>
          <span class="armor-name">${escapeHTML(item.name)}</span>
          <span class="armor-quick">${quick}</span>
        </summary>

        <div class="armor-details">
          ${statDetails}
          ${details}
        </div>
      </details>
    `;
  }

  function render() {
    if (!dataLoaded) return;

    renderTabs();

    const selectedCategories = activeCategory === "all"
      ? categories
      : categories.filter((category) => category.id === activeCategory);

    const filtered = [];

    selectedCategories.forEach((category) => {
      (category.items || []).forEach((item) => {
        if (!query || searchableText(item, category).includes(query)) {
          filtered.push({ item, category });
        }
      });
    });

    const currentCategory = categories.find(
      (category) => category.id === activeCategory
    );

    if (activeCategory === "all") {
      introEl.innerHTML = `
        <h2>Todo el equipo</h2>
        <p>Explora las categorías de armaduras y accesorios.</p>
      `;
    } else if (currentCategory) {
      introEl.innerHTML = `
        <h2>${escapeHTML(currentCategory.name)}</h2>
        <p>${escapeHTML(currentCategory.description || "Equipo de esta categoría.")}</p>
      `;
    } else {
      introEl.innerHTML = "";
    }

    countEl.textContent = `${filtered.length} ${
      filtered.length === 1 ? "pieza encontrada" : "piezas encontradas"
    }`;

    clearBtn.hidden = !query;

    listEl.innerHTML = filtered.length
      ? filtered
          .map(({ item }) => renderItem(item))
          .join("")
      : `
          <div class="empty-state">
            No se han encontrado piezas con esa búsqueda.
          </div>
        `;
  }

  searchEl.addEventListener("input", () => {
    query = normalize(searchEl.value.trim());
    render();
  });

  clearBtn.addEventListener("click", () => {
    searchEl.value = "";
    query = "";
    render();
    searchEl.focus();
  });

  fetch(DATA_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    })
    .then((data) => {
      if (!data || !Array.isArray(data.categories)) {
        throw new Error("El JSON no contiene categorías válidas.");
      }

      categories = data.categories;
      dataLoaded = true;

      renderGeneralNotes(data.general_notes);
      render();
    })
    .catch((error) => {
      console.error("No se pudo cargar armaduras.json:", error);

      tabsEl.innerHTML = "";
      notesEl.innerHTML = "";
      countEl.textContent = "Error al cargar los datos";

      listEl.innerHTML = `
        <div class="empty-state">
          <strong>No se pudo cargar DATA/armaduras.json.</strong>
          <p>
            Comprueba que la carpeta DATA está junto a armaduras.html y abre la
            guía mediante un servidor local, por ejemplo Live Server.
          </p>
        </div>
      `;
    });
})();