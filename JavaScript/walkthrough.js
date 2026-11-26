(() => {
  "use strict";

  const GENERATION_FILES = [
    "DATA/walkthrough/gen1.json",
    "DATA/walkthrough/gen2.json",
    "DATA/walkthrough/gen3.json",
    "DATA/walkthrough/gen4.json",
    "DATA/walkthrough/gen5.json",
    "DATA/walkthrough/gen6.json",
    "DATA/walkthrough/gen7.json",
    "DATA/walkthrough/gen8.json",
    "DATA/walkthrough/gen9.json",
    "DATA/walkthrough/gen10.json"
  ];

  const contentEl = document.getElementById("walkthrough-content");
  const progressLabelEl = document.getElementById("global-progress-label");
  const progressValueEl = document.getElementById("global-progress-value");
  const progressFillEl = document.getElementById("global-progress-fill");
  const filterButtons = Array.from(
    document.querySelectorAll(".status-filter")
  );

  if (!contentEl || !progressLabelEl || !progressValueEl || !progressFillEl) {
    console.error("walkthrough.js: no se han encontrado todos los elementos necesarios en walkthrough.html.");
    return;
  }

  let generations = [];
  let activeFilter = "all";
  const storageAvailable = checkStorageAvailability("localStorage");

  const STATUS_LABELS = {
    pending: "Pendiente",
    in_progress: "En curso",
    completed: "Completada"
  };

  function checkStorageAvailability(type) {
    try {
      const storage = window[type];
      const testKey = "__walkthrough_storage_test__";

      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);

      return true;
    } catch (error) {
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function getStorageKey(generationId, missionId, objectiveIndex) {
    return `rs2-walkthrough:${generationId}:${missionId}:${objectiveIndex}`;
  }

  function isObjectiveCompleted(generationId, missionId, objectiveIndex) {
    if (!storageAvailable) {
      return false;
    }

    return localStorage.getItem(
      getStorageKey(generationId, missionId, objectiveIndex)
    ) === "true";
  }

  function setObjectiveCompleted(generationId, missionId, objectiveIndex, completed) {
    if (!storageAvailable) {
      return;
    }

    const key = getStorageKey(generationId, missionId, objectiveIndex);

    if (completed) {
      localStorage.setItem(key, "true");
    } else {
      localStorage.removeItem(key);
    }
  }

  function getCompletedObjectiveCount(mission, generationId) {
    return mission.objectives.reduce(
      (total, _objective, index) =>
        total + (isObjectiveCompleted(generationId, mission.id, index) ? 1 : 0),
      0
    );
  }

  function getMissionStatus(mission, generationId) {
    const completed = getCompletedObjectiveCount(mission, generationId);
    const total = mission.objectives.length;

    if (total === 0) {
      return mission.status || "pending";
    }

    if (completed === 0) {
      return "pending";
    }

    if (completed === total) {
      return "completed";
    }

    return "in_progress";
  }

  function updateMissionStatus(missionCard, mission, generationId) {
    const status = getMissionStatus(mission, generationId);

    missionCard.dataset.status = status;

    const statusElement = missionCard.querySelector(".mission-status");

    if (statusElement) {
      statusElement.textContent = STATUS_LABELS[status] || status;
    }
  }

  function updateGenerationProgress(generationElement, generation) {
    const totalObjectives = generation.missions.reduce(
      (total, mission) => total + mission.objectives.length,
      0
    );

    const completedObjectives = generation.missions.reduce(
      (total, mission) =>
        total + getCompletedObjectiveCount(mission, generation.id),
      0
    );

    const percentage = totalObjectives === 0
      ? 0
      : Math.round((completedObjectives / totalObjectives) * 100);

    const progressElement = generationElement.querySelector(".generation-progress");

    if (progressElement) {
      progressElement.textContent = `${completedObjectives}/${totalObjectives} · ${percentage}%`;
    }
  }

  function updateGlobalProgress() {
    const totalObjectives = generations.reduce(
      (total, generation) =>
        total + generation.missions.reduce(
          (missionTotal, mission) => missionTotal + mission.objectives.length,
          0
        ),
      0
    );

    const completedObjectives = generations.reduce(
      (total, generation) =>
        total + generation.missions.reduce(
          (missionTotal, mission) =>
            missionTotal + getCompletedObjectiveCount(mission, generation.id),
          0
        ),
      0
    );

    const percentage = totalObjectives === 0
      ? 0
      : Math.round((completedObjectives / totalObjectives) * 100);

    progressValueEl.textContent = `${percentage}%`;
    progressFillEl.style.width = `${percentage}%`;

    progressLabelEl.textContent = `Progreso total: ${completedObjectives}/${totalObjectives} objetivos`;
  }

  function renderObjectives(mission, generationId) {
    return mission.objectives.map((objective, index) => {
      const completed = isObjectiveCompleted(generationId, mission.id, index);
      const inputId = `objective-${generationId}-${mission.id}-${index}`;

      return `
        <li class="objective">
          <input
            type="checkbox"
            id="${escapeHTML(inputId)}"
            data-generation="${escapeHTML(generationId)}"
            data-mission="${escapeHTML(mission.id)}"
            data-objective="${index}"
            ${completed ? "checked" : ""}
          >
          <label class="objective-text" for="${escapeHTML(inputId)}">
            ${escapeHTML(objective)}
          </label>
        </li>
      `;
    }).join("");
  }

  function renderInfoBlock(title, className, content) {
    if (!content || !content.length) {
      return "";
    }

    const items = Array.isArray(content)
      ? content.map((item) => `<p>${escapeHTML(item)}</p>`).join("")
      : `<p>${escapeHTML(content)}</p>`;

    return `
      <details class="info-block ${className}">
        <summary>${escapeHTML(title)}</summary>
        <div class="info-block-content">${items}</div>
      </details>
    `;
  }

  function renderBoss(boss) {
    if (!boss) {
      return "";
    }

    const weaknesses = Array.isArray(boss.weaknesses)
      ? `<p><strong>Débil a:</strong> ${escapeHTML(boss.weaknesses.join(", "))}</p>`
      : "";

    const resistances = Array.isArray(boss.resistances)
      ? `<p><strong>Resiste:</strong> ${escapeHTML(boss.resistances.join(", "))}</p>`
      : "";

    const attacks = Array.isArray(boss.attacks)
      ? `<p><strong>Ataques destacados:</strong> ${escapeHTML(boss.attacks.join(", "))}</p>`
      : "";

    return `
      <details class="info-block boss-block">
        <summary>Jefe: ${escapeHTML(boss.name)}</summary>
        <div class="info-block-content">
          ${weaknesses}
          ${resistances}
          ${attacks}
        </div>
      </details>
    `;
  }

  function renderLoot(loot) {
    if (!Array.isArray(loot) || !loot.length) {
      return "";
    }

    return `
      <details class="info-block loot-block">
        <summary>Botín</summary>
        <div class="info-block-content">
          <ul>
            ${loot.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
          </ul>
        </div>
      </details>
    `;
  }

  function renderMission(mission, generation) {
  const status = getMissionStatus(mission, generation.id);

  return `
    <details
      class="mission-card"
      data-status="${escapeHTML(status)}"
      data-mission-id="${escapeHTML(mission.id)}"
    >
      <summary>
        <span>
          <span class="mission-title">${escapeHTML(mission.title)}</span>
          ${
            mission.location
              ? `<span class="mission-location">${escapeHTML(mission.location)}</span>`
              : ""
          }
        </span>

        <span class="mission-status">${escapeHTML(STATUS_LABELS[status] || status)}</span>
      </summary>

      <div class="mission-body">
        <ul class="mission-objectives">
          ${renderObjectives(mission, generation.id)}
        </ul>

        ${
          mission.warnings?.length
            ? `
              <div class="warning-box">
                <strong>Avisos importantes</strong>
                ${mission.warnings
                  .map((warning) => `<p>${escapeHTML(warning)}</p>`)
                  .join("")}
              </div>
            `
            : ""
        }

        ${renderBoss(mission.boss)}
        ${renderLoot(mission.loot)}
        ${renderInfoBlock("Notas", "notes-block", mission.notes)}
      </div>
    </details>
  `;
}

  function renderGeneration(generation) {
  const missions = generation.missions
    .map((mission) => renderMission(mission, generation))
    .join("");

  return `
    <details class="generation" data-generation-id="${escapeHTML(generation.id)}">
      <summary class="generation-header">
        <span>
          <span class="generation-title">${escapeHTML(generation.title)}</span>
          ${
            generation.subtitle
              ? `<span class="generation-subtitle">${escapeHTML(generation.subtitle)}</span>`
              : ""
          }
        </span>

        <span class="generation-progress">0/0 · 0%</span>
      </summary>

      <div class="generation-body">
        ${
          generation.intro?.length
            ? `
              <div class="generation-intro">
                ${generation.intro
                  .map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`)
                  .join("")}
              </div>
            `
            : ""
        }

        <div class="generation-controls top">
          <button
            class="control-button"
            type="button"
            data-action="open-all-missions"
          >
            Abrir todas las misiones
          </button>

          <button
            class="control-button"
            type="button"
            data-action="close-all-missions"
          >
            Cerrar todas las misiones
          </button>

          <button
            class="control-button primary"
            type="button"
            data-action="close-generation"
          >
            Cerrar generación
          </button>
        </div>

        <ul class="missions">${missions}</ul>

        <div class="generation-controls bottom">
          <button
            class="control-button"
            type="button"
            data-action="open-all-missions"
          >
            Abrir todas las misiones
          </button>

          <button
            class="control-button"
            type="button"
            data-action="close-all-missions"
          >
            Cerrar todas las misiones
          </button>

          <button
            class="control-button primary"
            type="button"
            data-action="close-generation"
          >
            Cerrar generación
          </button>
        </div>
      </div>
    </details>
  `;
}

  function applyFilter() {
    const missionCards = Array.from(
      contentEl.querySelectorAll(".mission-card")
    );

    missionCards.forEach((missionCard) => {
      const status = missionCard.dataset.status;

      missionCard.hidden =
        activeFilter !== "all" && status !== activeFilter;
    });

    const generationElements = Array.from(
      contentEl.querySelectorAll(".generation")
    );

    generationElements.forEach((generationElement) => {
      const visibleMissions = Array.from(
        generationElement.querySelectorAll(".mission-card")
      ).filter((missionCard) => !missionCard.hidden);

      generationElement.hidden = visibleMissions.length === 0;
    });
  }

  contentEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const generationElement = button.closest(".generation");

  if (!generationElement) {
    return;
  }

  const action = button.dataset.action;
  const missionCards = generationElement.querySelectorAll(".mission-card");

  if (action === "open-all-missions") {
    missionCards.forEach((missionCard) => {
      missionCard.open = true;
    });
  }

  if (action === "close-all-missions") {
    missionCards.forEach((missionCard) => {
      missionCard.open = false;
    });
  }

  if (action === "close-generation") {
    generationElement.open = false;

    generationElement.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
});

  function render() {
    contentEl.innerHTML = generations
        .map((generation) => renderGeneration(generation))
        .join("");

    const generationElements = Array.from(
      contentEl.querySelectorAll(".generation")
    );

    generationElements.forEach((generationElement) => {
      const generation = generations.find(
        (item) => item.id === generationElement.dataset.generationId
      );

      if (!generation) {
        return;
      }

      updateGenerationProgress(generationElement, generation);

      generationElement
        .querySelectorAll(".objective input")
        .forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            const generationId = checkbox.dataset.generation;
            const missionId = checkbox.dataset.mission;
            const objectiveIndex = Number(checkbox.dataset.objective);

            setObjectiveCompleted(
              generationId,
              missionId,
              objectiveIndex,
              checkbox.checked
            );

            const missionCard = checkbox.closest(".mission-card");
            const mission = generation.missions.find(
              (item) => item.id === missionId
            );

            if (missionCard && mission) {
              updateMissionStatus(missionCard, mission, generationId);
            }

            updateGenerationProgress(generationElement, generation);
            updateGlobalProgress();
            applyFilter();
          });
        });
    });

    updateGlobalProgress();
    applyFilter();
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.status;

      filterButtons.forEach((filterButton) => {
        filterButton.setAttribute(
          "aria-pressed",
          filterButton === button ? "true" : "false"
        );
      });

      applyFilter();
    });
  });

  async function loadGeneration(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} en ${url}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.missions)) {
      throw new Error(`El archivo ${url} no contiene misiones válidas.`);
    }

    return {
      id: data.id,
      title: data.title,
      subtitle: data.subtitle,
      intro: data.intro || [],
      missions: data.missions
    };
  }

  async function loadGenerations() {
    const results = await Promise.allSettled(
      GENERATION_FILES.map((url) => loadGeneration(url))
    );

    generations = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const failedFiles = results
      .map((result, index) => ({
        result,
        url: GENERATION_FILES[index]
      }))
      .filter((item) => item.result.status === "rejected");

    if (failedFiles.length) {
      console.warn(
        "No se pudieron cargar algunas generaciones:",
        failedFiles.map((item) => item.url)
      );
    }

    if (!generations.length) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <strong>No se pudo cargar ningún archivo de generación.</strong>
          <p>
            Comprueba que existen archivos como
            <code>DATA/walkthrough/gen1.json</code> y
            <code>DATA/walkthrough/gen2.json</code>.
          </p>
          <p>
            Abre la guía mediante un servidor local, por ejemplo Live Server,
            no directamente como archivo file://.
          </p>
        </div>
      `;

      return;
    }

    render();
  }

  

  loadGenerations();
})();