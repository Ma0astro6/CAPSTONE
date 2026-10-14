/* Tablas MG: visita nueva (no edita la fila), historial, modificar en modal, ordenar. */

(function loadMGSession() {
  try {
    const raw = sessionStorage.getItem("MG_PATCH");
    if (!raw || typeof MG === "undefined") return;
    const patch = JSON.parse(raw);
    Object.keys(patch).forEach((k) => {
      if (Array.isArray(MG[k]) && Array.isArray(patch[k])) MG[k] = patch[k];
    });
  } catch (e) { /* prototipo */ }
})();

function saveMG() {
  try {
    sessionStorage.setItem("MG_PATCH", JSON.stringify(MG));
  } catch (e) { /* prototipo */ }
}

function uniqueVals(rows, key) {
  return [...new Set(rows.map((r) => (r[key] || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

function esc(val) {
  return String(val == null ? "" : val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function cellHTML(val) {
  const s = val == null || val === "" ? "" : String(val);
  if (!s) return '<span class="chip warn">Sin fecha</span>';
  return esc(s);
}

function hoyISO() {
  const t = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function isoToCl(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function clToSort(s) {
  const p = String(s || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!p) return 0;
  return Number(p[3] + p[2] + p[1]);
}

function seedVisitas(row, dateKey) {
  if (!Array.isArray(row.visitas)) row.visitas = [];
  if (row.visitas.length) return;
  const fecha = dateKey ? row[dateKey] : row.ultima;
  if (fecha || row.quien || row.detalle) {
    row.visitas.push({
      fecha: fecha || "",
      quien: row.quien || "",
      detalle: row.detalle || ""
    });
  }
}

function applyUltima(row, dateKey) {
  const list = (row.visitas || []).slice().sort((a, b) => clToSort(b.fecha) - clToSort(a.fecha));
  const last = list[0];
  if (!last) return;
  if (dateKey) row[dateKey] = last.fecha;
  else row.ultima = last.fecha;
  if ("quien" in row) row.quien = last.quien || "";
  if ("detalle" in row) row.detalle = last.detalle || "";
}

function tabsGrupo(actual, items) {
  return `<div class="tabs">${items.map(([h, l]) =>
    `<a class="${actual === h ? "on" : ""}" href="${h}">${l}</a>`
  ).join("")}</div>`;
}

function tabsEquipos(actual) {
  return tabsGrupo(actual, [
    ["maquinas.html", "Máquinas"],
    ["radiadores.html", "Radiadores"],
    ["refrigeradores.html", "Refrigeradores"]
  ]);
}

function tabsPredio(actual) {
  return tabsGrupo(actual, [
    ["fosas.html", "Fosas y agua"],
    ["bodegas.html", "Bodegas"],
    ["jardin.html", "Jardinería"]
  ]);
}

function tabsHab(actual) {
  return tabsGrupo(actual, [
    ["banos.html", "Baños"],
    ["tvs.html", "Televisores"],
    ["pilas.html", "Pilas"],
    ["puertas.html", "Puertas"]
  ]);
}

function tabsUrg(actual) {
  return tabsGrupo(actual, [
    ["reactivas.html", "Reactivas"],
    ["prevencion.html", "Prevención"]
  ]);
}

function catalogo(cfg) {
  const main = document.querySelector("#shell main");
  if (!main) return;
  const cols = cfg.cols;
  const filterKey = cfg.filterKey;
  const searchKeys = cfg.searchKeys || cols.map((c) => c.key);
  const dateKey = cfg.dateKey || "ultima";
  const nameKey = cfg.nameKey || cols[0].key;
  const editKeys = cfg.editKeys || cols.map((c) => c.key).filter((k) => k !== dateKey);
  let selected = -1;
  let sortMode = "fecha-desc";

  cfg.rows.forEach((r) => seedVisitas(r, cfg.dateKey));

  main.innerHTML = `
    <p class="page-kicker">Mantención general</p>
    <h2 class="page-title">${cfg.title}</h2>
    <p class="note">${cfg.note || ""}</p>
    ${cfg.extra || ""}
    <div class="work-wrap">
      <div>
        <div class="filters" style="justify-content:flex-start">
          <input id="q" type="search" placeholder="${cfg.searchPlaceholder || "Buscar…"}" />
          ${filterKey ? `<select id="f"><option value="">${cfg.filterAll || "Todos"}</option></select>` : ""}
          <select id="ord">
            <option value="fecha-desc">Última visita: más reciente</option>
            <option value="fecha-asc">Última visita: más antigua</option>
            <option value="nombre">Nombre A–Z</option>
            ${filterKey ? `<option value="filtro">${cfg.filterAll ? cfg.filterAll.replace("Todas", "Por").replace("Todos", "Por") : "Por categoría"}</option>` : ""}
          </select>
          <span class="cat-count" id="cnt"></span>
        </div>
        <div class="table-scroll">
          <table class="data" id="tbl">
            <thead><tr>${cols.map((c, i) => `<th class="${i === 0 ? "col-nom" : ""} ${c.chip ? "col-fecha" : ""}">${c.label}</th>`).join("")}<th class="col-act">Acciones</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
      <aside class="panel visita">
        <h3>Registrar visita</h3>
        <p class="muted-mini" id="sel-label">Elige una fila. Se abre una visita <b>nueva</b> (no edita la ficha).</p>
        <div class="ficha-pick" id="v-ficha">Sin ítem elegido.</div>
        <label>Fecha *</label>
        <input id="v-fecha" type="date" />
        <label>Tipo de trabajo *</label>
        <select id="v-tipo">
          <option value="Revisión">Revisión</option>
          <option value="Limpieza">Limpieza</option>
          <option value="Reparación">Reparación</option>
          <option value="Recambio">Recambio</option>
          <option value="Succión / tratamiento">Succión / tratamiento</option>
          <option value="Preventiva">Preventiva</option>
          <option value="Otro">Otro</option>
        </select>
        <label>Quién lo hizo *</label>
        <input id="v-quien" type="text" placeholder="Nombre (ej. Palito-Jorge)" />
        <label>Empresa / proveedor</label>
        <input id="v-emp" type="text" placeholder="Cosmoplas, interno, camión…" />
        <label>Trabajo realizado *</label>
        <textarea id="v-det" rows="3" placeholder="Qué se hizo, piezas, observaciones"></textarea>
        <label>Costo (CLP)</label>
        <input id="v-costo" type="text" inputmode="numeric" placeholder="Opcional" />
        <label>Próxima visita</label>
        <input id="v-prox" type="date" />
        <button class="btn btn-full" type="button" id="v-ok">Agregar visita</button>
        <p class="muted-mini">Nombre, zona o proveedor fijos: <b>Modificar</b>. Historial: <b>Ver detalle</b>.</p>
      </aside>
    </div>
    <div class="modal-bg" id="modal" hidden>
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3 id="modal-title">Detalle</h3>
          <button class="btn btn-ghost" type="button" id="modal-x">Cerrar</button>
        </div>
        <div id="modal-body"></div>
      </div>
    </div>`;

  const q = main.querySelector("#q");
  const f = main.querySelector("#f");
  const ord = main.querySelector("#ord");
  const tbody = main.querySelector("#tbl tbody");
  const cnt = main.querySelector("#cnt");
  const modal = main.querySelector("#modal");
  const modalBody = main.querySelector("#modal-body");
  const modalTitle = main.querySelector("#modal-title");

  if (f && filterKey) {
    uniqueVals(cfg.rows, filterKey).forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      f.appendChild(o);
    });
  }

  function labelOf(row) {
    return cfg.pickLabel ? cfg.pickLabel(row) : (row[nameKey] || "Ítem");
  }

  function fechaOf(row) {
    return cfg.dateKey ? row[cfg.dateKey] : row.ultima;
  }

  function filtered() {
    const term = (q.value || "").toLowerCase().trim();
    const fv = f ? f.value : "";
    let list = cfg.rows.map((row, i) => ({ row, i })).filter(({ row }) => {
      if (fv && String(row[filterKey] || "") !== fv) return false;
      if (!term) return true;
      return searchKeys.some((k) => String(row[k] || "").toLowerCase().includes(term));
    });
    sortMode = ord.value;
    list.sort((a, b) => {
      if (sortMode === "nombre") return String(a.row[nameKey] || "").localeCompare(String(b.row[nameKey] || ""), "es");
      if (sortMode === "filtro" && filterKey) {
        return String(a.row[filterKey] || "").localeCompare(String(b.row[filterKey] || ""), "es");
      }
      const da = clToSort(fechaOf(a.row));
      const db = clToSort(fechaOf(b.row));
      if (sortMode === "fecha-asc") {
        if (!da && !db) return 0;
        if (!da) return -1;
        if (!db) return 1;
        return da - db;
      }
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db - da;
    });
    return list;
  }

  function paint() {
    const list = filtered();
    cnt.textContent = list.length + " de " + cfg.rows.length;
    tbody.innerHTML = list.map(({ row, i }) => {
      const on = i === selected ? " class=\"on\"" : "";
      const cells = cols.map((c) => {
        const raw = row[c.key];
        if (c.chip && (!raw)) return `<td>${cellHTML(raw)}</td>`;
        if (c.chip && c.warnEmpty) return `<td>${raw ? esc(raw) : cellHTML("")}</td>`;
        return `<td>${raw ? esc(raw) : "—"}</td>`;
      }).join("");
      return `<tr data-i="${i}"${on}>${cells}<td class="acciones">
        <button type="button" class="btn-mini" data-act="detalle">Ver detalle</button>
        <button type="button" class="btn-mini btn-mini-gold" data-act="edit">Modificar</button>
      </td></tr>`;
    }).join("") || `<tr><td colspan="${cols.length + 1}">No hay filas con ese filtro.</td></tr>`;
  }

  function closeModal() {
    modal.hidden = true;
    modalBody.innerHTML = "";
  }

  function openDetalle(row) {
    seedVisitas(row, cfg.dateKey);
    const hist = (row.visitas || []).slice().sort((a, b) => clToSort(b.fecha) - clToSort(a.fecha));
    modalTitle.textContent = "Detalle · " + labelOf(row);
    modalBody.innerHTML = `
      <dl class="ficha-dl">${cols.map((c) =>
        `<div><dt>${c.label}</dt><dd>${row[c.key] ? esc(row[c.key]) : "—"}</dd></div>`
      ).join("")}</dl>
      <h4 class="mini-h">Historial de visitas</h4>
      ${hist.length ? `<table class="data hist"><thead><tr><th>Fecha</th><th>Tipo</th><th>Quién</th><th>Empresa</th><th>Trabajo</th><th>Costo</th><th>Próxima</th></tr></thead>
        <tbody>${hist.map((v) => `<tr>
          <td>${v.fecha ? esc(v.fecha) : "—"}</td>
          <td>${esc(v.tipo) || "—"}</td>
          <td>${esc(v.quien) || "—"}</td>
          <td>${esc(v.empresa) || "—"}</td>
          <td>${esc(v.detalle) || "—"}</td>
          <td>${esc(v.costo) || "—"}</td>
          <td>${esc(v.proxima) || "—"}</td>
        </tr>`).join("")}</tbody></table>`
        : "<p class=\"muted-mini\">Aún no hay visitas registradas.</p>"}
      <p class="muted-mini" style="margin-top:12px">Cierra y usa Registrar visita para agregar una línea nueva. No se borra lo anterior.</p>`;
    modal.hidden = false;
  }

  function openEditar(i) {
    const row = cfg.rows[i];
    modalTitle.textContent = "Modificar · " + labelOf(row);
    modalBody.innerHTML = `
      ${editKeys.map((k) => {
        const col = cols.find((c) => c.key === k);
        const lab = col ? col.label : k;
        return `<label>${esc(lab)}</label><input data-ek="${k}" type="text" value="${esc(row[k] || "")}" />`;
      }).join("")}
      <button class="btn btn-full" type="button" id="edit-ok" style="margin-top:14px">Guardar cambios de la ficha</button>
      <p class="muted-mini">Esto no registra una visita. Solo corrige los datos de la fila (como en el Excel).</p>`;
    modal.hidden = false;
    modalBody.querySelector("#edit-ok").onclick = () => {
      modalBody.querySelectorAll("[data-ek]").forEach((inp) => {
        row[inp.getAttribute("data-ek")] = inp.value.trim();
      });
      saveMG();
      closeModal();
      paint();
    };
  }

  tbody.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-act]");
    const tr = ev.target.closest("tr[data-i]");
    if (!tr) return;
    const i = Number(tr.getAttribute("data-i"));
    if (btn) {
      ev.stopPropagation();
      if (btn.getAttribute("data-act") === "detalle") openDetalle(cfg.rows[i]);
      if (btn.getAttribute("data-act") === "edit") openEditar(i);
      return;
    }
    selected = i;
    const row = cfg.rows[i];
    resetVisit();
    main.querySelector("#sel-label").innerHTML = "Visita nueva. Completa lo marcado con *.";
    main.querySelector("#v-ficha").innerHTML =
      "<b>" + esc(labelOf(row)) + "</b>" +
      (row.ubicacion ? "<small>" + esc(row.ubicacion) + "</small>" : "") +
      (row.proveedor ? "<small>Proveedor ficha: " + esc(row.proveedor) + "</small>" : "");
    main.querySelector("#v-emp").value = row.proveedor || "";
    paint();
  });

  main.querySelector("#modal-x").addEventListener("click", closeModal);
  modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });

  function resetVisit() {
    main.querySelector("#v-fecha").value = hoyISO();
    main.querySelector("#v-tipo").value = "Revisión";
    main.querySelector("#v-quien").value = "";
    main.querySelector("#v-emp").value = "";
    main.querySelector("#v-det").value = "";
    main.querySelector("#v-costo").value = "";
    main.querySelector("#v-prox").value = "";
  }

  main.querySelector("#v-ok").addEventListener("click", () => {
    if (selected < 0) {
      main.querySelector("#sel-label").textContent = "Primero elige una fila (sin usar Modificar).";
      return;
    }
    const row = cfg.rows[selected];
    seedVisitas(row, cfg.dateKey);
    const fecha = isoToCl(main.querySelector("#v-fecha").value);
    const tipo = main.querySelector("#v-tipo").value;
    const quien = main.querySelector("#v-quien").value.trim();
    const empresa = main.querySelector("#v-emp").value.trim();
    const detalle = main.querySelector("#v-det").value.trim();
    const costo = main.querySelector("#v-costo").value.trim();
    const proxima = isoToCl(main.querySelector("#v-prox").value);
    if (!fecha || !quien || !detalle) {
      main.querySelector("#sel-label").textContent = "Faltan fecha, quién o el trabajo realizado.";
      return;
    }
    row.visitas.push({ fecha, tipo, quien, empresa, detalle, costo, proxima });
    applyUltima(row, cfg.dateKey);
    saveMG();
    const keepFicha = main.querySelector("#v-ficha").innerHTML;
    resetVisit();
    main.querySelector("#v-ficha").innerHTML = keepFicha;
    main.querySelector("#v-emp").value = row.proveedor || "";
    main.querySelector("#sel-label").innerHTML =
      "Visita agregada a <b>" + esc(labelOf(row)) + "</b>. Quedó en Ver detalle.";
    paint();
  });

  q.addEventListener("input", paint);
  if (f) f.addEventListener("change", paint);
  ord.addEventListener("change", paint);
  resetVisit();
  paint();
}
