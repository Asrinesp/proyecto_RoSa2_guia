// =========================================================
// Bestiario — Romancing SaGa 2: Revenge of the Seven
// Pestaña Bestiario (consulta) + pestaña Editor
// Estructura JSON: lista directa de objetos.
// =========================================================
(() => {
  "use strict";

  const RUTA_JSON = "DATA/bestiario.json";
  const CLAVE_GUARDADO = "rs2-bestiario-datos";

  const CAMPOS_LISTA = [
    { clave: "debilidades", etiqueta: "DEBILIDADES" },
    { clave: "resistencias_inmunidades", etiqueta: "RESISTENCIAS E INMUNIDADES" },
    { clave: "inmunidades_estado", etiqueta: "INMUNIDADES DE ESTADO" },
    { clave: "drop_comun", etiqueta: "DROPS COMUNES" },
    { clave: "drop_raro_especial", etiqueta: "DROPS RAROS / ESPECIALES" }
  ];

  const $ = (id) => document.getElementById(id);

  const el = {
    pestanaBestiario: $("pestana-bestiario"),
    pestanaEditor: $("pestana-editor"),
    panelBestiario: $("panel-bestiario"),
    panelEditor: $("panel-editor"),
    busqueda: $("bestiario-busqueda"),
    categoria: $("bestiario-categoria"),
    lista: $("bestiario-lista"),
    estado: $("bestiario-estado"),
    editorBusqueda: $("editor-busqueda"),
    editorCategoria: $("editor-categoria"),
    editorLista: $("editor-lista"),
    editorFicha: $("editor-ficha"),
    editorEstado: $("editor-estado"),
    anadir: $("bestiario-anadir"),
    exportar: $("bestiario-exportar"),
    importar: $("bestiario-importar"),
    restablecer: $("bestiario-restablecer")
  };

  let monstruos = [];
  let seleccionado = null;

  // ---------- Utilidades ----------

  function normalizarTexto(valor) {
    return String(valor ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function aLista(valor) {
    if (Array.isArray(valor)) return valor.map(String).filter(Boolean);
    if (typeof valor === "string" && valor.trim()) {
      return valor.split(",").map((t) => t.trim()).filter(Boolean);
    }
    return [];
  }

  function textoHabitat(valor) {
    return Array.isArray(valor) ? valor.join(", ") : String(valor ?? "");
  }

  function normalizar(datos) {
    if (!Array.isArray(datos)) {
      throw new Error("El JSON debe ser una lista de monstruos, empezando por [.");
    }

    return datos.map((m) => {
      const copia = { ...m };
      CAMPOS_LISTA.forEach(({ clave }) => {
        copia[clave] = aLista(copia[clave]);
      });
      copia.registrado = copia.registrado === true;
      return copia;
    });
  }

  function mostrarEstado(nodo, mensaje, tipo) {
    nodo.textContent = mensaje || "";
    nodo.className = "bestiario-estado" + (mensaje ? " visible" : "") + (tipo ? " " + tipo : "");
  }

  function crear(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(monstruos));
    } catch (error) {
      mostrarEstado(el.editorEstado, "No se pudo guardar en este navegador.", "error");
    }
  }

  function siguienteReferencia() {
    const numeros = monstruos
      .map((m) => Number(m.referencia))
      .filter((n) => Number.isFinite(n));
    return numeros.length ? Math.max(...numeros) + 1 : 1;
  }

  function siguienteId(categoria) {
    const base = normalizarTexto(categoria || "monstruo").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "monstruo";
    const existentes = new Set(monstruos.map((m) => normalizarTexto(m.id)));
    let indice = monstruos.length + 1;
    let candidato = `${base}_${String(indice).padStart(3, "0")}`;
    while (existentes.has(normalizarTexto(candidato))) {
      indice++;
      candidato = `${base}_${String(indice).padStart(3, "0")}`;
    }
    return candidato;
  }

  // ---------- Carga ----------

  async function cargarDesdeArchivo() {
    const respuesta = await fetch(RUTA_JSON, { cache: "no-store" });
    if (!respuesta.ok) throw new Error("No se pudo leer " + RUTA_JSON + " (estado " + respuesta.status + ")");
    return respuesta.json();
  }

  async function cargar() {
    try {
      const guardado = localStorage.getItem(CLAVE_GUARDADO);
      if (guardado) {
        monstruos = normalizar(JSON.parse(guardado));
      } else {
        monstruos = normalizar(await cargarDesdeArchivo());
      }
    } catch (error) {
      try {
        monstruos = normalizar(await cargarDesdeArchivo());
      } catch (error2) {
        monstruos = [];
        mostrarEstado(el.estado, "No se pudieron cargar los datos: " + error2.message, "error");
        mostrarEstado(el.editorEstado, "No se pudieron cargar los datos: " + error2.message, "error");
      }
    }
    rellenarCategorias();
    renderTodo();
  }

  // ---------- Categorías ----------

  function rellenarCategorias() {
    const categorias = [...new Set(monstruos.map((m) => m.categoria).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b), "es"));

    [el.categoria, el.editorCategoria].forEach((select) => {
      const actual = select.value;
      select.length = 1;
      categorias.forEach((c) => {
        const opcion = document.createElement("option");
        opcion.value = c;
        opcion.textContent = c;
        select.appendChild(opcion);
      });
      select.value = categorias.includes(actual) ? actual : "";
    });
  }

  // ---------- Filtros ----------

  function filtrar(busqueda, categoria, soloRegistrados) {
    const q = normalizarTexto(busqueda);
    return monstruos.filter((m) => {
      if (soloRegistrados && !m.registrado) return false;
      if (categoria && m.categoria !== categoria) return false;
      return !q || normalizarTexto(m.nombre).includes(q);
    });
  }

  // ---------- Vista de consulta ----------

  function crearCampoConsulta(etiqueta, valores) {
    const campo = crear("div", "monstruo-campo");
    campo.appendChild(crear("span", "monstruo-campo-label", etiqueta));
    const caja = crear("div", "monstruo-etiquetas");
    if (valores.length === 0) {
      caja.appendChild(crear("span", "monstruo-etiqueta monstruo-etiqueta-vacia", "—"));
    } else {
      valores.forEach((v) => caja.appendChild(crear("span", "monstruo-etiqueta", v)));
    }
    campo.appendChild(caja);
    return campo;
  }

  function crearTarjeta(m) {
    const tarjeta = crear("article", "monstruo-card");

    const cabecera = crear("div", "monstruo-cabecera");
    cabecera.appendChild(crear("h3", "monstruo-nombre", m.nombre || "Sin nombre"));
    if (m.categoria) cabecera.appendChild(crear("span", "monstruo-categoria", m.categoria));
    if (m.referencia !== undefined && m.referencia !== null) {
      cabecera.appendChild(crear("span", "monstruo-id", "#" + m.referencia));
    }
    tarjeta.appendChild(cabecera);

    const fila = crear("div", "monstruo-fila-doble");
    fila.appendChild(crearCampoConsulta("DEBILIDADES", m.debilidades));
    fila.appendChild(crearCampoConsulta("RESISTENCIAS E INMUNIDADES", m.resistencias_inmunidades));
    tarjeta.appendChild(fila);

    const resto = crear("div", "monstruo-fila-simple");
    resto.appendChild(crearCampoConsulta("INMUNIDADES DE ESTADO", m.inmunidades_estado));
    resto.appendChild(crearCampoConsulta("DROPS COMUNES", m.drop_comun));
    resto.appendChild(crearCampoConsulta("DROPS RAROS / ESPECIALES", m.drop_raro_especial));

    const habitat = crear("div", "monstruo-campo");
    habitat.appendChild(crear("span", "monstruo-campo-label", "HÁBITAT"));
    habitat.appendChild(crear("p", "monstruo-habitat", textoHabitat(m.habitat) || "—"));
    resto.appendChild(habitat);
    tarjeta.appendChild(resto);

    const editar = crear("button", "bestiario-button bestiario-button-secondary", "Editar");
    editar.type = "button";
    editar.addEventListener("click", () => {
      seleccionado = m;
      activarPestana("editor");
      renderEditor();
    });
    tarjeta.appendChild(editar);

    return tarjeta;
  }

  function renderConsulta() {
    const visibles = filtrar(el.busqueda.value, el.categoria.value, true);
    el.lista.replaceChildren(...visibles.map(crearTarjeta));

    const registrados = monstruos.filter((m) => m.registrado).length;
    if (monstruos.length === 0) return;

    if (registrados === 0) {
      mostrarEstado(el.estado, "Todavía no hay monstruos registrados. Márcalos desde la pestaña Editor.");
    } else if (visibles.length === 0) {
      mostrarEstado(el.estado, "Ningún monstruo registrado coincide con la búsqueda.");
    } else {
      mostrarEstado(el.estado, visibles.length + " de " + registrados + " monstruos registrados.");
    }
  }

  // ---------- Editor ----------

  function renderListaEditor() {
    const visibles = filtrar(el.editorBusqueda.value, el.editorCategoria.value, false);
    const botones = visibles.map((m) => {
      const boton = crear("button", "editor-elemento");
      boton.type = "button";
      if (m === seleccionado) boton.setAttribute("aria-current", "true");
      boton.appendChild(crear("span", "editor-elemento-nombre", m.nombre || "Sin nombre"));
      boton.appendChild(
        crear(
          "span",
          "editor-elemento-estado" + (m.registrado ? " registrado" : ""),
          m.registrado ? "registrado" : "pendiente"
        )
      );
      boton.addEventListener("click", () => {
        seleccionado = m;
        renderEditor();
      });
      return boton;
    });
    el.editorLista.replaceChildren(...botones);

    const registrados = monstruos.filter((m) => m.registrado).length;
    mostrarEstado(
      el.editorEstado,
      monstruos.length ? registrados + " registrados de " + monstruos.length + " monstruos." : ""
    );
  }

  function crearCampoEditorLista(m, { clave, etiqueta }) {
    const campo = crear("div", "editor-campo");
    campo.appendChild(crear("span", "editor-campo-label", etiqueta));

    const etiquetas = crear("div", "editor-etiquetas");
    if (m[clave].length === 0) {
      etiquetas.appendChild(crear("span", "editor-etiqueta editor-etiqueta-vacia", "—"));
    }
    m[clave].forEach((valor, indice) => {
      const chip = crear("span", "editor-etiqueta");
      chip.appendChild(crear("span", "", valor));
      const quitar = crear("button", "editor-etiqueta-boton", "×");
      quitar.type = "button";
      quitar.setAttribute("aria-label", "Quitar " + valor);
      quitar.addEventListener("click", () => {
        m[clave].splice(indice, 1);
        guardar();
        renderEditor();
      });
      chip.appendChild(quitar);
      etiquetas.appendChild(chip);
    });
    campo.appendChild(etiquetas);

    const anadir = crear("div", "editor-campo-anadir");
    const input = crear("input", "editor-campo-input");
    input.type = "text";
    input.placeholder = "Añadir…";
    input.setAttribute("aria-label", "Añadir a " + etiqueta.toLowerCase());

    const boton = crear("button", "editor-campo-boton", "+");
    boton.type = "button";
    boton.setAttribute("aria-label", "Añadir a " + etiqueta.toLowerCase());

    const agregar = () => {
      const nuevos = aLista(input.value);
      if (nuevos.length === 0) return;
      nuevos.forEach((v) => {
        if (!m[clave].includes(v)) m[clave].push(v);
      });
      guardar();
      renderEditor();
      renderConsulta();
    };
    boton.addEventListener("click", agregar);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        agregar();
      }
    });

    anadir.append(input, boton);
    campo.appendChild(anadir);
    return campo;
  }

  function crearCampoTexto(etiqueta, valor, alCambiar) {
    const campo = crear("div", "editor-campo");
    campo.appendChild(crear("span", "editor-campo-label", etiqueta));
    const input = crear("input", "editor-campo-texto");
    input.type = "text";
    input.value = valor;
    input.setAttribute("aria-label", etiqueta);
    input.addEventListener("input", () => alCambiar(input.value));
    campo.appendChild(input);
    return campo;
  }

  function renderEditor() {
    renderListaEditor();

    if (!seleccionado) {
      el.editorFicha.replaceChildren(
        crear("p", "editor-ficha-vacia", "Selecciona un monstruo de la lista para editarlo.")
      );
      return;
    }

    const m = seleccionado;
    const ficha = crear("div", "monstruo-fila-simple");

    ficha.appendChild(
      crearCampoTexto("NOMBRE", m.nombre || "", (v) => {
        m.nombre = v;
        guardar();
        actualizarNombreEnLista();
      })
    );

    ficha.appendChild(
      crearCampoTexto("CATEGORÍA", m.categoria || "", (v) => {
        m.categoria = v;
        guardar();
      })
    );

    const etiquetaRegistrado = crear("label", "editor-registrado");
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.checked = m.registrado;
    casilla.addEventListener("change", () => {
      m.registrado = casilla.checked;
      guardar();
      renderListaEditor();
      renderConsulta();
    });
    etiquetaRegistrado.append(casilla, document.createTextNode("Mostrar en el bestiario"));
    ficha.appendChild(etiquetaRegistrado);

    const fila = crear("div", "monstruo-fila-doble");
    fila.appendChild(crearCampoEditorLista(m, CAMPOS_LISTA[0]));
    fila.appendChild(crearCampoEditorLista(m, CAMPOS_LISTA[1]));
    ficha.appendChild(fila);

    ficha.appendChild(crearCampoEditorLista(m, CAMPOS_LISTA[2]));
    ficha.appendChild(crearCampoEditorLista(m, CAMPOS_LISTA[3]));
    ficha.appendChild(crearCampoEditorLista(m, CAMPOS_LISTA[4]));

    ficha.appendChild(
      crearCampoTexto("HÁBITAT", textoHabitat(m.habitat), (v) => {
        m.habitat = v;
        guardar();
      })
    );

    el.editorFicha.replaceChildren(ficha);
  }

  function actualizarNombreEnLista() {
    const botones = el.editorLista.querySelectorAll(".editor-elemento");
    botones.forEach((b) => {
      if (b.getAttribute("aria-current") === "true") {
        b.querySelector(".editor-elemento-nombre").textContent = seleccionado.nombre || "Sin nombre";
      }
    });
    renderConsulta();
  }

  function renderTodo() {
    renderConsulta();
    renderEditor();
  }

  // ---------- Añadir monstruo ----------

  function anadirMonstruo() {
    const categoria = el.editorCategoria.value || "monstruo";
    const nuevo = {
      id: siguienteId(categoria),
      categoria,
      referencia: siguienteReferencia(),
      nombre: "Nuevo monstruo",
      registrado: false,
      debilidades: [],
      resistencias_inmunidades: [],
      inmunidades_estado: [],
      drop_comun: [],
      drop_raro_especial: [],
      habitat: ""
    };

    monstruos.push(nuevo);
    seleccionado = nuevo;
    guardar();
    rellenarCategorias();
    renderTodo();
    mostrarEstado(el.editorEstado, "Monstruo añadido. Edita su nombre y datos.", "success");
  }

  // ---------- Pestañas ----------

  function activarPestana(nombre, enfocar) {
    const esEditor = nombre === "editor";
    el.pestanaBestiario.setAttribute("aria-selected", String(!esEditor));
    el.pestanaEditor.setAttribute("aria-selected", String(esEditor));
    el.pestanaBestiario.tabIndex = esEditor ? -1 : 0;
    el.pestanaEditor.tabIndex = esEditor ? 0 : -1;
    el.panelBestiario.hidden = esEditor;
    el.panelEditor.hidden = !esEditor;
    if (enfocar) (esEditor ? el.pestanaEditor : el.pestanaBestiario).focus();
  }

  el.pestanaBestiario.addEventListener("click", () => activarPestana("bestiario"));
  el.pestanaEditor.addEventListener("click", () => activarPestana("editor"));

  [el.pestanaBestiario, el.pestanaEditor].forEach((pestana) => {
    pestana.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
        e.preventDefault();
        const haciaEditor =
          e.key === "End" ||
          ((e.key === "ArrowRight" || e.key === "ArrowLeft") && pestana === el.pestanaBestiario);
        activarPestana(haciaEditor ? "editor" : "bestiario", true);
      }
    });
  });

  // ---------- Filtros: eventos ----------

  el.busqueda.addEventListener("input", renderConsulta);
  el.categoria.addEventListener("change", renderConsulta);
  el.editorBusqueda.addEventListener("input", renderListaEditor);
  el.editorCategoria.addEventListener("change", renderListaEditor);

  // ---------- Añadir / exportar / importar / restablecer ----------

  el.anadir.addEventListener("click", anadirMonstruo);

  el.exportar.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(monstruos, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "bestiario.json";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    mostrarEstado(el.editorEstado, "JSON exportado.", "success");
  });

  el.importar.addEventListener("change", async () => {
    const archivo = el.importar.files[0];
    if (!archivo) return;
    try {
      const datos = JSON.parse(await archivo.text());
      monstruos = normalizar(datos);
      seleccionado = null;
      guardar();
      rellenarCategorias();
      renderTodo();
      mostrarEstado(el.editorEstado, "JSON importado: " + monstruos.length + " monstruos.", "success");
    } catch (error) {
      mostrarEstado(el.editorEstado, "No se pudo importar: " + error.message, "error");
    }
    el.importar.value = "";
  });

  el.restablecer.addEventListener("click", async () => {
    if (!window.confirm("¿Descartar los cambios guardados y volver al JSON original?")) return;
    try {
      localStorage.removeItem(CLAVE_GUARDADO);
      monstruos = normalizar(await cargarDesdeArchivo());
      seleccionado = null;
      rellenarCategorias();
      renderTodo();
      mostrarEstado(el.editorEstado, "Cambios restablecidos.", "success");
    } catch (error) {
      mostrarEstado(el.editorEstado, "No se pudo restablecer: " + error.message, "error");
    }
  });

  cargar();
})();
