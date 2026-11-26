const JSON_URL = "JSON/bestiario_bestias.json";

const searchInput = document.getElementById("monster-search");
const rankFilter = document.getElementById("filter-rank");
const weaknessFilter = document.getElementById("filter-weakness");
const resistanceFilter = document.getElementById("filter-resistance");
const statusFilter = document.getElementById("filter-status");
const habitatFilter = document.getElementById("filter-habitat");
const dropFilter = document.getElementById("filter-drop");
const clearButton = document.getElementById("clear-filters");

const totalMonsters = document.getElementById("total-monsters");
const visibleMonsters = document.getElementById("visible-monsters");
const resultsMessage = document.getElementById("results-message");
const resultsContainer = document.getElementById("monster-results");

let monsters = [];

function normalizeText(value) {
  return (value ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function arrayToText(value) {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

function fillSelect(select, values) {
  const uniqueValues = [...new Set(values)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));

  uniqueValues.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function createTag(text, className) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function createInfoBlock(title, content) {
  const block = document.createElement("div");
  block.className = "info-block";

  const heading = document.createElement("h4");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = content || "—";

  block.append(heading, paragraph);
  return block;
}

function createMonsterCard(monster) {
  const card = document.createElement("article");
  card.className = "monster-card";

  const header = document.createElement("div");
  header.className = "monster-header";

  const titleWrapper = document.createElement("div");

  const name = document.createElement("h3");
  name.className = "monster-name";
  name.textContent = monster.nombre;

  const rank = document.createElement("p");
  rank.className = "monster-rank";
  rank.textContent = `Rango / nivel: ${monster.rango || "—"}`;

  titleWrapper.append(name, rank);

  const badges = document.createElement("div");
  badges.className = "monster-badges";

  if (monster.anti_bestia) {
    badges.appendChild(createTag("Anti-bestia", "badge badge-pink"));
  }

  header.append(titleWrapper, badges);

  const info = document.createElement("div");
  info.className = "monster-info";

  info.append(
    createInfoBlock("Debilidades", arrayToText(monster.debilidades)),
    createInfoBlock("Resistencias / inmunidades", arrayToText(monster.resistencias_inmunidades)),
    createInfoBlock("Inmunidades de estado", arrayToText(monster.inmunidades_estado)),
    createInfoBlock("Drop común", arrayToText(monster.drop_comun)),
    createInfoBlock("Drop raro / especial", arrayToText(monster.drop_raro_especial)),
    createInfoBlock("Hábitat", monster.habitat)
  );

  const notes = document.createElement("div");
  notes.className = "monster-notes";

  const notesTitle = document.createElement("h4");
  notesTitle.textContent = "Notas de combate";

  const notesText = document.createElement("p");
  notesText.textContent = monster.notas_combate || "—";

  notes.append(notesTitle, notesText);

  card.append(header, info, notes);
  return card;
}

function getFilters() {
  return {
    search: normalizeText(searchInput.value.trim()),
    rank: rankFilter.value,
    weakness: weaknessFilter.value,
    resistance: resistanceFilter.value,
    status: statusFilter.value,
    habitat: normalizeText(habitatFilter.value.trim()),
    drop: normalizeText(dropFilter.value.trim())
  };
}

function matchesMonster(monster, filters) {
  const searchableText = normalizeText([
    monster.nombre,
    monster.rango,
    arrayToText(monster.debilidades),
    arrayToText(monster.resistencias_inmunidades),
    arrayToText(monster.inmunidades_estado),
    arrayToText(monster.drop_comun),
    arrayToText(monster.drop_raro_especial),
    monster.habitat,
    monster.notas_combate
  ].join(" "));

  if (filters.search && !searchableText.includes(filters.search)) {
    return false;
  }

  if (filters.rank && monster.rango !== filters.rank) {
    return false;
  }

  if (
    filters.weakness &&
    !monster.debilidades?.some(
      value => normalizeText(value) === normalizeText(filters.weakness)
    )
  ) {
    return false;
  }

  if (
    filters.resistance &&
    !monster.resistencias_inmunidades?.some(
      value => normalizeText(value) === normalizeText(filters.resistance)
    )
  ) {
    return false;
  }

  if (
    filters.status &&
    !monster.inmunidades_estado?.some(
      value => normalizeText(value) === normalizeText(filters.status)
    ) &&
    !monster.resistencias_inmunidades?.some(
      value => normalizeText(value) === normalizeText(filters.status)
    )
  ) {
    return false;
  }

  if (
    filters.habitat &&
    !normalizeText(monster.habitat).includes(filters.habitat)
  ) {
    return false;
  }

  if (filters.drop) {
    const drops = [
      ...monster.drop_comun,
      ...monster.drop_raro_especial
    ];

    if (!drops.some(drop => normalizeText(drop).includes(filters.drop))) {
      return false;
    }
  }

  return true;
}

function renderMonsters() {
  const filters = getFilters();
  const filtered = monsters.filter(monster => matchesMonster(monster, filters));

  resultsContainer.innerHTML = "";
  visibleMonsters.textContent = filtered.length;

  if (filtered.length === 0) {
    resultsMessage.textContent = "No se ha encontrado ningún monstruo con los filtros actuales.";
    return;
  }

  resultsMessage.textContent = `Mostrando ${filtered.length} de ${monsters.length} monstruos.`;

  filtered.forEach(monster => {
    resultsContainer.appendChild(createMonsterCard(monster));
  });
}

function clearFilters() {
  searchInput.value = "";
  rankFilter.value = "";
  weaknessFilter.value = "";
  resistanceFilter.value = "";
  statusFilter.value = "";
  habitatFilter.value = "";
  dropFilter.value = "";

  renderMonsters();
}

async function loadMonsters() {
  try {
    const response = await fetch(JSON_URL);

    if (!response.ok) {
      throw new Error(`No se pudo cargar el JSON: ${response.status}`);
    }

    const data = await response.json();
    monsters = data.monstruos || [];

    totalMonsters.textContent = `${monsters.length} / ${data.meta?.total ?? monsters.length}`;

    fillSelect(rankFilter, monsters.map(monster => monster.rango));
    fillSelect(weaknessFilter, monsters.flatMap(monster => monster.debilidades));
    fillSelect(
      resistanceFilter,
      monsters.flatMap(monster => monster.resistencias_inmunidades)
    );
    fillSelect(
      statusFilter,
      monsters.flatMap(monster => [
        ...monster.inmunidades_estado,
        ...monster.resistencias_inmunidades
      ])
    );

    renderMonsters();
  } catch (error) {
    resultsMessage.textContent =
      "No se pudo cargar el bestiario. Comprueba que el archivo JSON esté en la carpeta JSON y que estés abriendo la web mediante un servidor local.";
    console.error(error);
  }
}

searchInput.addEventListener("input", renderMonsters);
rankFilter.addEventListener("change", renderMonsters);
weaknessFilter.addEventListener("change", renderMonsters);
resistanceFilter.addEventListener("change", renderMonsters);
statusFilter.addEventListener("change", renderMonsters);
habitatFilter.addEventListener("input", renderMonsters);
dropFilter.addEventListener("input", renderMonsters);
clearButton.addEventListener("click", clearFilters);

loadMonsters();