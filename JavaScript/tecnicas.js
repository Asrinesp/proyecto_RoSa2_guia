(() => {
  "use strict";

  const DATA_URL = "DATA/tecnicas.json";

  const tabsEl = document.getElementById("category-tabs");
  const searchEl = document.getElementById("technique-search");
  const listEl = document.getElementById("technique-list");
  const introEl = document.getElementById("category-intro");
  const notesEl = document.getElementById("general-notes");
  const countEl = document.getElementById("results-count");
  const clearBtn = document.getElementById("clear-search");

  if (!tabsEl || !searchEl || !listEl || !introEl || !notesEl || !countEl || !clearBtn) {
    console.error("tecnicas.js: no se han encontrado todos los elementos necesarios en tecnicas.html.");
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
    alternate_name: "Nombre alternativo",
    japanese_name: "Nombre japonés",
    romanized_name: "Romanización",
    potency: "Potencia",
    target: "Objetivo",
    bp_cost: "Coste de BP",
    element: "Elemento",
    effects: "Efectos",
    sparked_from: "Se aprende desde",
    can_spark: "Puede provocar",
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
      (total, category) => total + (category.techniques?.length || 0),
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
          <span aria-hidden="true">(${category.techniques?.length || 0})</span>
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

  function searchableText(technique, category) {
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

    Object.entries(technique).forEach(([key, value]) => {
      values.push(prettyLabel(key));
      collect(value);
    });

    values.push(category.name);

    return normalize(values.filter(Boolean).join(" "));
  }

  function renderTechnique(technique, categoryName) {
    const potency = technique.potency ?? "N/A";
    const bpCost = technique.bp_cost ?? "N/A";

    const quick = [
      statChip("Potencia", potency),
      statChip("BP", bpCost),
      statChip("Objetivo", technique.target),
      statChip("Elemento", technique.element)
    ].filter(Boolean).join("");

    const details = [];
    const excludedFields = [
      "name",
      "alternate_name",
      "japanese_name",
      "romanized_name",
      "potency",
      "target",
      "bp_cost",
      "element"
    ];

    if (technique.effects) {
      details.push(`
        <div class="detail-group full">
          <h3>Efectos</h3>
          ${displayValue(technique.effects)}
        </div>
      `);
    }

    if (technique.sparked_from) {
      details.push(`
        <div class="detail-group">
          <h3>Se aprende desde</h3>
          <div>${pills(technique.sparked_from)}</div>
        </div>
      `);
    }

    if (technique.can_spark) {
      details.push(`
        <div class="detail-group">
          <h3>Puede provocar</h3>
          <div>${pills(technique.can_spark)}</div>
        </div>
      `);
    }

    if (technique.location) {
      details.push(`
        <div class="detail-group full">
          <h3>Localización</h3>
          <p>${escapeHTML(technique.location)}</p>
        </div>
      `);
    }

    if (technique.notes) {
      details.push(`
        <div class="detail-group full">
          <h3>Notas</h3>
          <p>${escapeHTML(technique.notes)}</p>
        </div>
      `);
    }

    if (technique.source_note) {
      details.push(`
        <div class="detail-group full">
          <h3>Nota de la fuente</h3>
          <p>${escapeHTML(technique.source_note)}</p>
        </div>
      `);
    }

    const japaneseInfo = technique.japanese_name || technique.romanized_name
      ? `
        <div class="detail-group">
          <h3>Nombre original</h3>
          <div>
            ${
              technique.japanese_name
                ? `<span class="tech-pill japanese-pill">${escapeHTML(technique.japanese_name)}</span>`
                : ""
            }
            ${
              technique.romanized_name
                ? `<span class="tech-pill japanese-pill">${escapeHTML(technique.romanized_name)}</span>`
                : ""
            }
          </div>
        </div>
      `
      : "";

    const remainingFields = Object.entries(technique)
      .filter(([key]) => !excludedFields.includes(key))
      .filter(([key]) => !["effects", "sparked_from", "can_spark", "location", "notes", "source_note"].includes(key))
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
      <details class="technique-card">
        <summary>
          <span class="technique-name">
            ${escapeHTML(technique.name)}
            ${
              technique.alternate_name
                ? `<span class="technique-alt-name">${escapeHTML(technique.alternate_name)}</span>`
                : ""
            }
          </span>

          <span class="technique-quick">${quick}</span>
        </summary>

        <div class="technique-details">
          ${details.join("")}
          ${japaneseInfo}
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
      (category.techniques || []).forEach((technique) => {
        if (!query || searchableText(technique, category).includes(query)) {
          filtered.push({ technique, category });
        }
      });
    });

    const currentCategory = categories.find(
      (category) => category.id === activeCategory
    );

    if (activeCategory === "all") {
      introEl.innerHTML = `
        <h2>Todas las categorías</h2>
        <p>Explora las técnicas de combate por tipo de arma, efectos y forma de aprenderlas.</p>
      `;
    } else if (currentCategory) {
      introEl.innerHTML = `
        <h2>${escapeHTML(currentCategory.name)}</h2>
        <p>${escapeHTML(currentCategory.description || "Técnicas de esta categoría.")}</p>
      `;
    } else {
      introEl.innerHTML = "";
    }

    countEl.textContent = `${filtered.length} ${
      filtered.length === 1 ? "técnica encontrada" : "técnicas encontradas"
    }`;

    clearBtn.hidden = !query;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="empty-state">
          No se han encontrado técnicas con esa búsqueda.
        </div>
      `;

      return;
    }

    listEl.innerHTML = filtered
      .map(({ technique }) => renderTechnique(technique))
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
      console.error("No se pudo cargar DATA/tecnicas.json:", error);

      tabsEl.innerHTML = "";
      notesEl.innerHTML = "";
      countEl.textContent = "Error al cargar los datos";

      listEl.innerHTML = `
        <div class="empty-state">
          <strong>No se pudo cargar DATA/tecnicas.json.</strong>
          <p>
            Comprueba que el archivo está en la carpeta DATA y abre la guía
            mediante un servidor local, por ejemplo Live Server, no directamente
            como archivo file://.
          </p>
        </div>
      `;
    });
})();