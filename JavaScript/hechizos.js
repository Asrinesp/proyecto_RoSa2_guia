(() => {
  "use strict";

  const DATA_URL = "DATA/hechizos.json";

  const tabsEl = document.getElementById("category-tabs");
  const searchEl = document.getElementById("spell-search");
  const listEl = document.getElementById("spell-list");
  const introEl = document.getElementById("category-intro");
  const notesEl = document.getElementById("general-notes");
  const countEl = document.getElementById("results-count");
  const clearBtn = document.getElementById("clear-search");

  if (!tabsEl || !searchEl || !listEl || !introEl || !notesEl || !countEl || !clearBtn) {
    console.error("hechizos.js: no se han encontrado todos los elementos necesarios en hechizos.html.");
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
    name: "Nombre",
    potency: "Potencia",
    target: "Objetivo",
    bp_cost: "Coste de BP",
    lp_cost: "Coste de LP",
    requirements: "Requisitos",
    effects: "Efectos",
    fusion_of: "Fusión de",
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

  function statChip(label, value, suffix = "", extraClass = "") {
    if (value === undefined || value === null || value === "") {
      return "";
    }

    return `
      <span class="stat-chip${extraClass ? ` ${extraClass}` : ""}">
        ${escapeHTML(label)}
        <b>${escapeHTML(value)}${escapeHTML(suffix)}</b>
      </span>
    `;
  }

  function pills(values, extraClass = "") {
    if (!Array.isArray(values) || !values.length) {
      return "";
    }

    return values.map((value) => `
      <span class="tech-pill${extraClass ? ` ${extraClass}` : ""}">
        ${escapeHTML(value)}
      </span>
    `).join("");
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
      (total, category) => total + (category.spells?.length || 0),
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
          <span aria-hidden="true">(${category.spells?.length || 0})</span>
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

  function searchableText(spell, category) {
    const values = [];

    const collect = (value) => {
      if (value === null || value === undefined) {
        return;
      }

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

    Object.entries(spell).forEach(([key, value]) => {
      values.push(prettyLabel(key));
      collect(value);
    });

    values.push(category.name);

    if (Array.isArray(category.fusion_of)) {
      values.push(...category.fusion_of);
    }

    return normalize(values.filter(Boolean).join(" "));
  }

  function renderSpell(spell, category) {
    const potency = spell.potency ?? "N/A";
    const bpCost = spell.bp_cost ?? "N/A";

    const quick = [
      statChip("Potencia", potency),
      statChip("BP", bpCost),
      statChip("Objetivo", spell.target),
      statChip("LP", spell.lp_cost, "", "lp-chip")
    ].filter(Boolean).join("");

    const details = [];
    const excludedFields = [
      "name",
      "potency",
      "target",
      "bp_cost",
      "lp_cost",
      "requirements",
      "effects",
      "location",
      "notes",
      "source_note"
    ];

    if (spell.effects) {
      details.push(`
        <div class="detail-group full">
          <h3>Efectos</h3>
          ${displayValue(spell.effects)}
        </div>
      `);
    }

    if (spell.requirements) {
      details.push(`
        <div class="detail-group">
          <h3>Requisitos</h3>
          <div>${pills(spell.requirements)}</div>
        </div>
      `);
    }

    if (Array.isArray(category.fusion_of) && category.fusion_of.length) {
      details.push(`
        <div class="detail-group">
          <h3>Fusión de</h3>
          <div>${pills(category.fusion_of, "fusion-pill")}</div>
        </div>
      `);
    }

    if (spell.location) {
      details.push(`
        <div class="detail-group full">
          <h3>Localización</h3>
          <p>${escapeHTML(spell.location)}</p>
        </div>
      `);
    }

    if (spell.notes) {
      details.push(`
        <div class="detail-group full">
          <h3>Notas</h3>
          <p>${escapeHTML(spell.notes)}</p>
        </div>
      `);
    }

    if (spell.source_note) {
      details.push(`
        <div class="detail-group full">
          <h3>Nota de la fuente</h3>
          <p>${escapeHTML(spell.source_note)}</p>
        </div>
      `);
    }

    const remainingFields = Object.entries(spell)
      .filter(([key]) => !excludedFields.includes(key))
      .map(([key, value]) => `
        <div class="detail-group">
          <h3>${escapeHTML(prettyLabel(key))}</h3>
          ${
            Array.isArray(value) || (value && typeof value === "object")
              ? displayValue(value)
              : `<p>${escapeHTML(value)}</p>`
          }
        </div>
      `)
      .join("");

    return `
      <details class="spell-card">
        <summary>
          <span class="spell-name">${escapeHTML(spell.name)}</span>
          <span class="spell-quick">${quick}</span>
        </summary>

        <div class="spell-details">
          ${details.join("")}
          ${remainingFields}
        </div>
      </details>
    `;
  }

  function render() {
    if (!dataLoaded) {
      return;
    }

    renderTabs();

    const selectedCategories = activeCategory === "all"
      ? categories
      : categories.filter((category) => category.id === activeCategory);

    const filtered = [];

    selectedCategories.forEach((category) => {
      (category.spells || []).forEach((spell) => {
        if (!query || searchableText(spell, category).includes(query)) {
          filtered.push({ spell, category });
        }
      });
    });

    const currentCategory = categories.find(
      (category) => category.id === activeCategory
    );

    if (activeCategory === "all") {
      introEl.innerHTML = `
        <h2>Todas las escuelas</h2>
        <p>Explora los hechizos por escuela mágica, fusiones, efectos y requisitos.</p>
      `;
    } else if (currentCategory) {
      introEl.innerHTML = `
        <h2>${escapeHTML(currentCategory.name)}</h2>
        <p>${escapeHTML(currentCategory.description || "Hechizos de esta categoría.")}</p>
      `;
    } else {
      introEl.innerHTML = "";
    }

    countEl.textContent = `${filtered.length} ${
      filtered.length === 1 ? "hechizo encontrado" : "hechizos encontrados"
    }`;

    clearBtn.hidden = !query;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          No se han encontrado hechizos con esa búsqueda.
        </div>
      `;

      return;
    }

    listEl.innerHTML = filtered
      .map(({ spell, category }) => renderSpell(spell, category))
      .join("");
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
      console.error("No se pudo cargar DATA/hechizos.json:", error);

      tabsEl.innerHTML = "";
      notesEl.innerHTML = "";
      countEl.textContent = "Error al cargar los datos";

      listEl.innerHTML = `
        <div class="empty-state">
          <strong>No se pudo cargar DATA/hechizos.json.</strong>
          <p>
            Comprueba que el archivo está en la carpeta DATA y abre la guía
            mediante un servidor local, por ejemplo Live Server, no directamente
            como archivo file://.
          </p>
        </div>
      `;
    });
})();