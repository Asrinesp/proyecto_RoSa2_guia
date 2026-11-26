(() => {
  "use strict";

  const DATA_URL = "DATA/armas.json";

  const tabsEl = document.getElementById("category-tabs");
  const listEl = document.getElementById("weapon-list");
  const introEl = document.getElementById("category-intro");
  const searchEl = document.getElementById("weapon-search");
  const countEl = document.getElementById("results-count");
  const clearEl = document.getElementById("clear-search");

  if (!tabsEl || !listEl || !introEl || !searchEl || !countEl || !clearEl) {
    console.error("armas.js: no se han encontrado todos los elementos necesarios en armas.html.");
    return;
  }

  let categories = [];
  let activeCategory = "all";
  let searchTerm = "";
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

  const categoryWeapons = (category) => category.weapons || [];

  function renderTabs() {
    const total = categories.reduce(
      (sum, category) => sum + categoryWeapons(category).length,
      0
    );

    const buttons = [
      { id: "all", name: "Todas", count: total },
      ...categories.map((category) => ({
        id: category.id,
        name: category.name,
        count: categoryWeapons(category).length
      }))
    ];

    tabsEl.innerHTML = buttons.map((button) => `
      <button
        class="category-tab"
        type="button"
        data-category="${escapeHTML(button.id)}"
        aria-pressed="${activeCategory === button.id ? "true" : "false"}"
      >
        ${escapeHTML(button.name)}
        <span aria-hidden="true">(${button.count})</span>
      </button>
    `).join("");

    tabsEl.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        render();

        // Devuelve el foco a la pestaña seleccionada
        const selectedTab = tabsEl.querySelector(
          `[data-category="${CSS.escape(activeCategory)}"]`
        );

        if (selectedTab) {
          selectedTab.focus();
        }
      });
    });
  }

  function detailBlock(title, content, full = false) {
    if (!content) return "";

    return `
      <section class="detail-block${full ? " full" : ""}">
        <h3>${escapeHTML(title)}</h3>
        ${content}
      </section>
    `;
  }

  function paragraph(value) {
    return `<p>${escapeHTML(value)}</p>`;
  }

  function pills(values, unique = false) {
    if (!Array.isArray(values) || !values.length) return "";

    return values.map((value) => `
      <span class="tech-pill${unique ? " unique-pill" : ""}">
        ${escapeHTML(value)}
      </span>
    `).join("");
  }

  function techniqueList(items) {
    if (!Array.isArray(items) || !items.length) return "";

    return `<ul>${items.map((item) => {
      const title = item.name
        ? `<strong>${escapeHTML(item.name)}</strong>`
        : "";

      const potency = item.potency != null
        ? ` <span class="tech-potency">(Potency ${escapeHTML(item.potency)})</span>`
        : "";

      const details = item.details
        ? `<div>${escapeHTML(item.details)}</div>`
        : "";

      return `<li>${title}${potency}${details}</li>`;
    }).join("")}</ul>`;
  }

  function renderWeapon(weapon, categoryName) {
    const attack = weapon.attack ?? "—";
    const reforged = weapon.reforged_attack ?? "—";
    const details = [];

    if (weapon.unique_tech) {
      details.push(detailBlock(
        "Técnica única",
        `
          <span class="tech-pill unique-pill">${escapeHTML(weapon.unique_tech)}</span>
          ${weapon.tech_details ? paragraph(weapon.tech_details) : ""}
        `,
        true
      ));
    }

    if (weapon.techniques) {
      details.push(detailBlock("Técnicas", techniqueList(weapon.techniques), true));
    }

    if (weapon.other_techs) {
      details.push(detailBlock("Otras técnicas", techniqueList(weapon.other_techs), true));
    }

    if (weapon.usable_techs) {
      details.push(detailBlock(
        "Técnicas que puede usar",
        `<div>${pills(weapon.usable_techs)}</div>`
      ));
    }

    if (weapon.grants_spells) {
      details.push(detailBlock(
        "Hechizos",
        `<div>${pills(weapon.grants_spells)}</div>`
      ));
    }

    if (weapon.sparks_from) {
      details.push(detailBlock(
        "Se aprende a partir de",
        `<div>${pills(weapon.sparks_from)}</div>`,
        true
      ));
    }

    if (weapon.location) {
      details.push(detailBlock("Localización", paragraph(weapon.location), true));
    }

    if (weapon.notes) {
      details.push(detailBlock("Notas", paragraph(weapon.notes), true));
    }

    if (!details.length) {
      details.push(detailBlock(
        "Información",
        paragraph("La fuente no incluye detalles adicionales para esta arma."),
        true
      ));
    }

    return `
      <details class="weapon-card">
        <summary class="weapon-summary">
          <span class="weapon-name">${escapeHTML(weapon.name)}</span>
          <span class="weapon-attack">
            Ataque
            <strong>${escapeHTML(attack)}</strong>
          </span>
          <span class="weapon-reforge">
            Reforjada
            <strong>${escapeHTML(reforged)}</strong>
          </span>
          <span class="weapon-chevron" aria-hidden="true">⌄</span>
        </summary>

        <div class="weapon-detail">
          <div class="weapon-context">
            <span class="tech-pill">${escapeHTML(categoryName)}</span>
          </div>

          <div class="detail-grid">
            ${details.join("")}
          </div>
        </div>
      </details>
    `;
  }

  function render() {
    if (!dataLoaded) return;

    renderTabs();

    const visibleCategories = activeCategory === "all"
      ? categories
      : categories.filter((category) => category.id === activeCategory);

    const filtered = [];

    for (const category of visibleCategories) {
      for (const weapon of categoryWeapons(category)) {
        const haystack = normalize([
          weapon.name,
          category.name,
          weapon.unique_tech,
          weapon.tech_details,
          weapon.location,
          weapon.notes,
          ...(weapon.sparks_from || []),
          ...(weapon.usable_techs || []),
          ...(weapon.grants_spells || []),
          ...(weapon.techniques || []).flatMap((technique) => [
            technique.name,
            technique.details
          ]),
          ...(weapon.other_techs || []).flatMap((technique) => [
            technique.name,
            technique.details
          ])
        ].filter(Boolean).join(" "));

        if (!searchTerm || haystack.includes(normalize(searchTerm))) {
          filtered.push({ weapon, category });
        }
      }
    }

    const selected = categories.find(
      (category) => category.id === activeCategory
    );

    if (activeCategory === "all") {
      introEl.innerHTML = `
        <h2>Todas las categorías</h2>
        <p>
          Explora las ${categories.length} clases de armas.
          Selecciona una ficha para consultar sus técnicas, localización y notas.
        </p>
      `;
    } else if (selected) {
      introEl.innerHTML = `
        <h2>${escapeHTML(selected.name)}</h2>
        ${selected.description ? `<p>${escapeHTML(selected.description)}</p>` : ""}
      `;
    } else {
      introEl.innerHTML = "";
    }

    countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "arma" : "armas"}`;
    clearEl.hidden = !searchTerm;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="empty-panel">
          No se han encontrado armas con esa búsqueda.
        </div>
      `;

      return;
    }

    listEl.innerHTML = filtered
      .map(({ weapon, category }) => renderWeapon(weapon, category.name))
      .join("");
  }

  searchEl.addEventListener("input", () => {
    searchTerm = searchEl.value.trim();
    render();
  });

  clearEl.addEventListener("click", () => {
    searchEl.value = "";
    searchTerm = "";
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
      render();
    })
    .catch((error) => {
      console.error("No se pudo cargar DATA/armas.json:", error);

      tabsEl.innerHTML = "";
      countEl.textContent = "No se pudieron cargar los datos";

      listEl.innerHTML = `
        <div class="error-panel">
          <strong>No se ha podido cargar DATA/armas.json.</strong>
          <p>
            Comprueba que el archivo está en la carpeta DATA y abre la guía
            desde un servidor local, por ejemplo Live Server, no directamente
            como archivo file://.
          </p>
        </div>
      `;
    });
})();