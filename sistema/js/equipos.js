/* Crear y buscar por grupo: equipos, predio, habitaciones y prevención. */
(function () {
  const GRUPOS = {
    equipos: {
      titulo: "Equipos",
      item: "equipo",
      itemC: "Equipo",
      plural: ["equipo", "equipos"],
      lugar: "Ubicación",
      cargar: "Cargando los equipos desde la base…",
      vacio: "No hay equipos con esa búsqueda.",
      elige: "Elige el equipo al que corresponde esta mantención.",
      falta: "Elige el equipo.",
      notaCrear: "Anota qué se hizo en una máquina, un radiador o un refrigerador. Queda en el historial de ese equipo y no borra lo anterior.",
      notaBuscar: "Escribe el nombre, la ubicación o quién hizo la última visita. Puedes dejarlo en un solo tipo: máquina, radiador o refrigerador.",
      placeholder: "Buscar equipo, zona o quién lo hizo",
      crear: "equipos-crear.html",
      buscar: "equipos-buscar.html",
      fuentes: [
        ["maquinas", "Máquina", "Máquinas"],
        ["radiadores", "Radiador", "Radiadores"],
        ["refrigeradores", "Refrigerador", "Refrigeradores"]
      ]
    },
    predio: {
      titulo: "Predio",
      item: "punto",
      itemC: "Punto",
      plural: ["punto", "puntos"],
      lugar: "Lugar",
      cargar: "Cargando fosas, bodegas y jardín desde la base…",
      vacio: "No hay puntos con esa búsqueda.",
      elige: "Elige la fosa, la bodega o la faena de esta mantención.",
      falta: "Elige el punto del predio.",
      notaCrear: "Anota una succión, una revisión de bodega o una faena de jardín. Queda en el historial de ese punto y no borra lo anterior.",
      notaBuscar: "Escribe el punto, el sector o quién lo hizo. Puedes dejarlo en fosas, bodegas o jardín.",
      placeholder: "Buscar fosa, bodega, faena o sector",
      crear: "predio-crear.html",
      buscar: "predio-buscar.html",
      fuentes: [
        ["fosas", "Fosa", "Fosas y agua"],
        ["bodegas", "Bodega", "Bodegas"],
        ["jardin", "Faena", "Jardinería"]
      ]
    },
    habitaciones: {
      titulo: "Habitaciones",
      item: "recinto",
      itemC: "Recinto",
      plural: ["recinto", "recintos"],
      lugar: "Dónde",
      cargar: "Cargando baños, televisores, pilas y puertas desde la base…",
      vacio: "No hay recintos con esa búsqueda.",
      elige: "Elige el baño, el televisor, las pilas o la puerta.",
      falta: "Elige el recinto.",
      notaCrear: "Anota qué se hizo en un baño, un televisor, las pilas o una puerta. Queda en el historial de ese recinto y no borra lo anterior.",
      notaBuscar: "Escribe la habitación, la puerta o quién lo hizo. Puedes dejarlo en baños, televisores, pilas o puertas.",
      placeholder: "Buscar habitación, puerta o quién lo hizo",
      crear: "habitaciones-crear.html",
      buscar: "habitaciones-buscar.html",
      fuentes: [
        ["banos", "Baño", "Baños"],
        ["tvs", "Televisor", "Televisores"],
        ["pilas", "Pilas", "Pilas"],
        ["puertas", "Puerta", "Puertas"]
      ]
    },
    prevencion: {
      titulo: "Prevención",
      item: "tarea",
      itemC: "Tarea",
      plural: ["tarea", "tareas"],
      lugar: "Estado",
      cargar: "Cargando las tareas desde la base…",
      vacio: "No hay tareas con esa búsqueda.",
      elige: "Elige el protocolo o la capacitación.",
      falta: "Elige la tarea.",
      notaCrear: "Anota qué se avanzó en un protocolo o una capacitación. Queda en el historial de esa tarea y no borra lo anterior.",
      notaBuscar: "Escribe el nombre de la tarea o quién la tiene a cargo.",
      placeholder: "Buscar protocolo, capacitación o responsable",
      crear: "prevencion-crear.html",
      buscar: "prevencion-buscar.html",
      fuentes: [
        ["prevencion", "Tarea", "Tareas"]
      ]
    }
  };

  function esc(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function nombreDe(item) {
    const r = item.row || {};
    if (item.fuente === "radiadores") return "Radiador " + (r.zona || r.ubicacion || "");
    if (item.fuente === "fosas") return r.punto || "Sin nombre";
    if (item.fuente === "bodegas") return r.nombre || "Sin nombre";
    if (item.fuente === "jardin") return r.faena || "Sin nombre";
    if (item.fuente === "banos") return "Baño " + (r.recinto || "");
    if (item.fuente === "tvs") return "TV " + (r.zona || "");
    if (item.fuente === "pilas") return "Pilas " + (r.zona || "");
    if (item.fuente === "puertas") return r.puerta || "Sin nombre";
    if (item.fuente === "prevencion") return r.tarea || "Sin nombre";
    return r.equipo || "Sin nombre";
  }

  function lugarDe(item) {
    const r = item.row || {};
    if (item.fuente === "prevencion") return r.estado || "";
    return r.ubicacion || r.sector || r.recinto || r.zona || "";
  }

  function fechaDe(row) {
    return row.ultima || row.fin || row.inicio || "";
  }

  function aCl(iso) {
    if (!iso) return "";
    const p = String(iso).split("-");
    return p.length === 3 ? p[2] + "-" + p[1] + "-" + p[0] : "";
  }

  function hoyISO() {
    const t = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  }

  async function cargarGrupo(cfg) {
    if (!window.cargarFichas || !window.db) throw new Error("No hay conexión a la base.");
    const listas = await Promise.all(cfg.fuentes.map(async ([fuente, tipo]) => {
      const rows = await window.cargarFichas(fuente);
      return rows.map((row) => ({ fuente, tipo, row }));
    }));
    return listas.flat().sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), "es"));
  }

  function opcionesTipo(cfg, todos) {
    if (cfg.fuentes.length < 2) return "";
    return '<option value="">' + esc(todos) + "</option>" + cfg.fuentes.map(([fuente, , plural]) =>
      '<option value="' + fuente + '">' + esc(plural) + "</option>"
    ).join("");
  }

  function iniciarFicha(grupo, modo) {
    const cfg = GRUPOS[grupo];
    const main = document.querySelector("#shell main");
    if (!cfg || !main) return;
    if (modo === "buscar") pintarBuscar(main, cfg);
    else pintarCrear(main, cfg);
  }

  function avisoCreado(nombre, extra) {
    if (window.cuadro) cuadro("Mantención creada", "Quedó registrada en el historial de " + nombre + "." + (extra || ""));
  }

  function pintarCrear(main, cfg) {
    const unTipo = cfg.fuentes.length < 2;
    main.innerHTML =
      '<p class="page-kicker">Mantención general · ' + esc(cfg.titulo) + "</p>" +
      '<h2 class="page-title">Crear mantención</h2>' +
      '<p class="note">' + esc(cfg.notaCrear) + "</p>" +
      '<section class="panel" style="max-width:760px;margin:0 auto">' +
      '<p class="muted-mini" id="carga">' + esc(cfg.cargar) + "</p>" +
      '<form id="f" hidden><div class="form-grid">' +
      (unTipo ? "" :
        '<div><label for="tipo">Tipo *</label><select id="tipo">' + opcionesTipo(cfg, "Todos") + "</select></div>") +
      '<div class="' + (unTipo ? "full" : "") + '"><label for="item">' + esc(cfg.itemC) + ' *</label>' +
      '<select id="item"><option value="">— Elige ' + esc(cfg.item === "equipo" ? "el equipo" : "el ítem") + " —</option></select></div>" +
      '<div class="full"><p class="muted-mini" id="ficha">' + esc(cfg.elige) + "</p></div>" +
      '<div><label for="fecha">Fecha *</label><input id="fecha" type="date" /></div>' +
      '<div><label for="estado">Estado *</label><select id="estado">' +
      '<option value="por_hacer">Por hacerse</option><option value="terminada">Terminada</option></select></div>' +
      '<div class="full"><p class="muted-mini">Por hacerse avisa en el calendario el día de la fecha. Terminada queda hecha y el calendario usa la próxima visita.</p></div>' +
      '<div><label for="trabajo">Tipo de trabajo *</label><select id="trabajo">' +
      ["Revisión", "Limpieza", "Reparación", "Recambio", "Succión / tratamiento", "Preventiva", "Otro"].map((t) =>
        "<option>" + esc(t) + "</option>").join("") +
      "</select></div>" +
      '<div><label for="quien">Quién lo hizo *</label><input id="quien" type="text" placeholder="Nombre (ej. Palito-Jorge)" /></div>' +
      '<div><label for="empresa">Empresa / proveedor</label><input id="empresa" type="text" placeholder="Cosmoplas, interno, camión…" /></div>' +
      '<div class="full"><label for="detalle">Trabajo realizado *</label><textarea id="detalle" rows="3" placeholder="Qué se hizo, piezas, observaciones"></textarea></div>' +
      '<div><label for="costo">Costo (CLP)</label><input id="costo" type="text" inputmode="numeric" placeholder="Opcional" /></div>' +
      '<div><label for="proxima">Próxima visita</label><input id="proxima" type="date" /></div>' +
      '<div class="full"><p class="muted-mini">Si usaste pilas u otro insumo, anótalo y se descuenta de la bodega. Si lo dejas vacío, el stock no cambia y hay que corregirlo en Bodega.</p></div>' +
      '<div><label for="insumo">Insumo usado</label><select id="insumo"><option value="">No descontar</option></select></div>' +
      '<div><label for="ins-cant">Cantidad</label><input id="ins-cant" type="number" min="0" step="1" placeholder="Opcional" /></div>' +
      '</div><p class="muted-mini" id="msg"></p>' +
      '<button class="btn btn-full btn-green" type="submit">Guardar mantención</button></form></section>';

    const $ = (id) => document.getElementById(id);
    $("fecha").value = hoyISO();
    let items = [];

    function pintarItems() {
      const tipo = $("tipo") ? $("tipo").value : "";
      const lista = items.filter((it) => !tipo || it.fuente === tipo);
      $("item").innerHTML = '<option value="">— Elige ' + (cfg.item === "equipo" ? "el equipo" : "el ítem") + " —</option>" +
        lista.map((it) => {
          const lugar = lugarDe(it);
          return '<option value="' + items.indexOf(it) + '">' + esc(nombreDe(it)) + (lugar ? " · " + esc(lugar) : "") + "</option>";
        }).join("");
      pintarFicha();
    }

    function pintarFicha() {
      const it = items[$("item").value];
      if (!it) {
        $("ficha").textContent = cfg.elige;
        return;
      }
      const row = it.row;
      const fecha = fechaDe(row);
      $("ficha").innerHTML = "<b>" + esc(nombreDe(it)) + "</b> · " + esc(it.tipo) +
        (lugarDe(it) ? " · " + esc(lugarDe(it)) : "") +
        (row.proveedor ? " · Proveedor: " + esc(row.proveedor) : "") +
        (fecha ? " · Última: " + esc(fecha) : "");
      if (!$("empresa").value.trim() && row.proveedor) $("empresa").value = row.proveedor;
    }

    if ($("tipo")) $("tipo").addEventListener("change", pintarItems);
    $("item").addEventListener("change", pintarFicha);

    $("f").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const msg = $("msg");
      msg.textContent = "";
      const it = items[$("item").value];
      if (!it) { msg.textContent = cfg.falta; if (window.cuadro) cuadro("Falta un dato", cfg.falta); return; }
      const fecha = aCl($("fecha").value);
      const quien = $("quien").value.trim();
      const detalle = $("detalle").value.trim();
      if (!fecha || !quien || !detalle) {
        msg.textContent = "Faltan la fecha, quién lo hizo o el trabajo realizado.";
        if (window.cuadro) cuadro("Falta un dato", msg.textContent);
        return;
      }
      const visita = {
        fecha,
        tipo: $("trabajo").value,
        quien,
        empresa: $("empresa").value.trim(),
        detalle,
        costo: $("costo").value.trim(),
        proxima: aCl($("proxima").value),
        estado: document.querySelector("#f select#estado").value
      };
      const row = it.row;
      const antes = { ultima: row.ultima, quien: row.quien, detalle: row.detalle };
      row.ultima = fecha;
      row.quien = quien;
      row.detalle = detalle;
      const btn = $("f").querySelector("button");
      btn.disabled = true;
      btn.textContent = "Guardando…";
      try {
        if (!window.guardarVisita || !row._bd) throw new Error("Este ítem no está conectado a la base.");
        const visitaId = await window.guardarVisita(row, visita);
        const insumoId = Number($("insumo") && $("insumo").value);
        const cant = Number($("ins-cant") && $("ins-cant").value);
        visita._stock = " No se descontó stock. Si se gastó algo, corrígelo en Bodega.";
        if (insumoId && cant > 0 && window.moverStock) {
          try {
            await window.moverStock(insumoId, "salida", cant, {
              visitaId,
              nota: "Uso en " + nombreDe(it)
            });
            visita._stock = " Se descontó " + cant + " de la bodega.";
          } catch (stockErr) {
            visita._stock = " La visita quedó, pero el stock no se movió: " + (stockErr.message || "revisa la bodega") + ".";
          }
        }
      } catch (err) {
        row.ultima = antes.ultima;
        row.quien = antes.quien;
        row.detalle = antes.detalle;
        msg.textContent = err.message || "No se pudo guardar.";
        if (window.cuadro) cuadro("No se guardó", msg.textContent);
        btn.disabled = false;
        btn.textContent = "Guardar mantención";
        return;
      }
      if (!Array.isArray(row.visitas)) row.visitas = [];
      row.visitas.push(visita);
      if ($("tipo")) $("tipo").value = "";
      $("fecha").value = hoyISO();
      $("trabajo").selectedIndex = 0;
      $("estado").value = "por_hacer";
      $("quien").value = "";
      $("empresa").value = "";
      $("detalle").value = "";
      $("costo").value = "";
      $("proxima").value = "";
      if ($("insumo")) $("insumo").value = "";
      if ($("ins-cant")) $("ins-cant").value = "";
      msg.textContent = "";
      pintarItems();
      avisoCreado(nombreDe(it), visita._stock || "");
      btn.disabled = false;
      btn.textContent = "Guardar mantención";
    });

    cargarGrupo(cfg).then(async (rows) => {
      items = rows;
      $("carga").hidden = true;
      $("f").hidden = false;
      pintarItems();
      if (window.cargarStock && $("insumo")) {
        try {
          const stock = await window.cargarStock();
          $("insumo").innerHTML = '<option value="">No descontar</option>' + stock.map((it) =>
            '<option value="' + it.id + '">' + esc(it.nombre) + " · " + it.stock + " " + esc(it.unidad) + "</option>"
          ).join("");
        } catch (e) { /* sin bodega el formulario igual guarda la visita */ }
      }
    }).catch((err) => {
      $("carga").textContent = err.message || "No se pudo cargar la lista.";
    });
  }

  function pintarBuscar(main, cfg) {
    const unTipo = cfg.fuentes.length < 2;
    main.innerHTML =
      '<p class="page-kicker">Mantención general · ' + esc(cfg.titulo) + "</p>" +
      '<h2 class="page-title">Buscar</h2>' +
      '<p class="note">' + esc(cfg.notaBuscar) + "</p>" +
      '<p class="muted-mini" id="estado" style="text-align:center">' + esc(cfg.cargar) + "</p>" +
      '<div id="busqueda" hidden><div class="cat-toolbar"><div class="filters" style="justify-content:flex-start;margin:0;flex:1">' +
      '<input id="q" type="search" placeholder="' + esc(cfg.placeholder) + '" />' +
      (unTipo ? "" : '<select id="tipo">' + opcionesTipo(cfg, "Todos") + "</select>") +
      '<span class="cat-count" id="cnt"></span></div>' +
      '<a class="btn btn-green" href="' + cfg.crear + '">Crear mantención</a></div>' +
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      (unTipo ? "" : "<th>Tipo</th>") +
      "<th class=\"col-nom\">" + esc(cfg.itemC) + "</th><th>" + esc(cfg.lugar) + "</th>" +
      '<th class="col-fecha">Última</th><th>Quién</th><th class="col-act">Acciones</th></tr></thead>' +
      '<tbody id="cuerpo"></tbody></table></div></div>';

    if (!document.getElementById("modal")) {
      const modal = document.createElement("div");
      modal.className = "modal-bg";
      modal.id = "modal";
      modal.hidden = true;
      modal.innerHTML =
        '<div class="modal-card" role="dialog" aria-modal="true"><div class="modal-head">' +
        '<h3 id="modal-title">Historial</h3><button class="btn btn-ghost" type="button" id="modal-x">Cerrar</button></div>' +
        '<div id="modal-body"></div></div>';
      document.body.appendChild(modal);
    }

    const $ = (id) => document.getElementById(id);
    let items = [];
    const cols = unTipo ? 5 : 6;

    function texto(item) {
      const row = item.row;
      const visitas = (row.visitas || []).map((v) => [v.quien, v.detalle, v.tipo, v.fecha].join(" ")).join(" ");
      return [nombreDe(item), item.tipo, lugarDe(item), row.proveedor, row.quien, row.detalle, row.estado, fechaDe(row), visitas].join(" ").toLowerCase();
    }

    function pintar() {
      const q = $("q").value.trim().toLowerCase();
      const tipo = $("tipo") ? $("tipo").value : "";
      const lista = items.filter((it) => (!tipo || it.fuente === tipo) && (!q || texto(it).includes(q)));
      const n = lista.length;
      $("cnt").textContent = n + " " + cfg.plural[n === 1 ? 0 : 1];
      $("cuerpo").innerHTML = lista.length ? lista.map((it) => {
        const i = items.indexOf(it);
        const ultima = fechaDe(it.row);
        return "<tr>" +
          (unTipo ? "" : "<td>" + esc(it.tipo) + "</td>") +
          "<td>" + esc(nombreDe(it)) + "</td><td>" + esc(lugarDe(it)) + "</td><td>" +
          (ultima ? esc(ultima) : '<span class="chip warn">Sin fecha</span>') +
          "</td><td>" + esc(it.row.quien || "") + '</td><td class="acciones">' +
          '<button type="button" class="btn-mini btn-mini-green" data-i="' + i + '">Ver historial</button></td></tr>';
      }).join("") : '<tr><td colspan="' + cols + '">' + esc(cfg.vacio) + "</td></tr>";
    }

    function abrir(i) {
      const it = items[i];
      if (!it) return;
      const visitas = (it.row.visitas || []).slice().sort((a, b) =>
        String(b.fecha || "").split("-").reverse().join("").localeCompare(
          String(a.fecha || "").split("-").reverse().join("")
        )
      );
      $("modal-title").textContent = nombreDe(it);
      $("modal-body").innerHTML =
        '<p class="muted-mini">' + esc(it.tipo) +
        (lugarDe(it) ? " · " + esc(lugarDe(it)) : "") +
        (it.row.proveedor ? " · " + esc(it.row.proveedor) : "") + "</p>" +
        (visitas.length
          ? '<table class="data hist"><thead><tr><th>Fecha</th><th>Tipo</th><th>Quién</th><th>Trabajo</th></tr></thead><tbody>' +
            visitas.map((v) => "<tr><td>" + esc(v.fecha) + "</td><td>" + esc(v.tipo || "—") + "</td><td>" +
              esc(v.quien || "—") + "</td><td>" + esc(v.detalle || "—") + "</td></tr>").join("") +
            "</tbody></table>"
          : '<p class="muted-mini">Aún no hay visitas registradas.</p>') +
        '<a class="btn btn-green" href="' + cfg.crear + '" style="margin-top:14px">Crear mantención</a>';
      $("modal").hidden = false;
    }

    $("q").addEventListener("input", pintar);
    if ($("tipo")) $("tipo").addEventListener("change", pintar);
    $("cuerpo").addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-i]");
      if (btn) abrir(Number(btn.getAttribute("data-i")));
    });
    $("modal-x").addEventListener("click", () => { $("modal").hidden = true; });
    $("modal").addEventListener("click", (ev) => { if (ev.target === $("modal")) $("modal").hidden = true; });

    cargarGrupo(cfg).then((rows) => {
      items = rows;
      $("estado").hidden = true;
      $("busqueda").hidden = false;
      pintar();
    }).catch((err) => {
      $("estado").textContent = err.message || "No se pudo cargar la lista.";
    });
  }

  window.iniciarFicha = iniciarFicha;
})();
