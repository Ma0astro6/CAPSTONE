/* Calendario de mantenciones de equipos y predio. */
(function () {
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  function esc(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function hoyISO() {
    const t = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  }

  function diffDias(iso, hoy) {
    const a = new Date(iso + "T12:00:00");
    const b = new Date(hoy + "T12:00:00");
    return Math.round((a - b) / 86400000);
  }

  function etiqueta(iso, hoy) {
    const n = diffDias(iso, hoy);
    if (n < 0) return "Atrasada";
    if (n === 0) return "Hoy";
    if (n === 1) return "Mañana";
    if (n < 8) return "En " + n + " días";
    const d = new Date(iso + "T12:00:00");
    const h = new Date(hoy + "T12:00:00");
    if (d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth()) return "Este mes";
    const sig = new Date(h.getFullYear(), h.getMonth() + 1, 1);
    if (d.getFullYear() === sig.getFullYear() && d.getMonth() === sig.getMonth()) return "El próximo mes";
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  }

  function fechaCorta(iso) {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  }

  function citasDe(row, hoy) {
    const fechas = new Map();
    (row.visita || []).forEach((v) => {
      if (v.estado === "por_hacer" && v.fecha) fechas.set(String(v.fecha), "por_hacer");
      if (v.proxima_fecha && String(v.proxima_fecha) >= hoy) {
        const dia = String(v.proxima_fecha);
        if (!fechas.has(dia)) fechas.set(dia, "proxima");
      }
    });
    if (row.proxima_programada && String(row.proxima_programada) >= hoy) {
      const dia = String(row.proxima_programada);
      if (!fechas.has(dia)) fechas.set(dia, "proxima");
    }
    return [...fechas.entries()]
      .map(([fecha, motivo]) => ({ fecha, motivo }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  function armar(row) {
    const cat = row.categoria_activo || {};
    const grupo = String(cat.grupo || "");
    if (grupo !== "Equipos" && grupo !== "Predio") return null;
    const hoy = hoyISO();
    const citas = citasDe(row, hoy);
    const zona = (row.zona && row.zona.nombre) || row.ubicacion_det || "";
    const visitas = (row.visita || []).map((v) => ({
      fecha: v.fecha || "",
      tipo: (v.tipo_trabajo && v.tipo_trabajo.nombre) || "",
      quien: (v.trabajador && v.trabajador.nombre) || "",
      detalle: v.detalle || "",
      proxima: v.proxima_fecha || "",
      estado: v.estado || ""
    })).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    return {
      id: row.id,
      nombre: row.nombre,
      grupo,
      tipo: cat.nombre || grupo,
      lugar: zona,
      fecha: citas[0] ? citas[0].fecha : "",
      motivo: citas[0] ? citas[0].motivo : "",
      citas,
      visitas
    };
  }

  function expandir(rows) {
    const out = [];
    rows.forEach((it) => {
      (it.citas || []).forEach((c) => {
        out.push(Object.assign({}, it, { fecha: c.fecha, motivo: c.motivo }));
      });
    });
    return out;
  }

  function marcarDetalle(it) {
      window.DETALLE_TAREA = window.DETALLE_TAREA || {};
      const clave = "a" + it.id + "-" + (it.fecha || "");
      window.DETALLE_TAREA[clave] = it;
      return clave;
    }

  async function cargarAgenda() {
    if (!window.db) throw new Error("No hay conexión a la base.");
    const { data, error } = await window.db.from("activo").select(
      "id, nombre, ubicacion_det, proxima_programada, categoria_activo!inner(codigo, nombre, grupo), zona(nombre), visita(fecha, detalle, costo, proxima_fecha, estado, tipo_trabajo(nombre), trabajador(nombre), proveedor(nombre))"
    ).eq("activo", true);
    if (error) throw new Error(error.message);
    return (data || []).map(armar).filter(Boolean);
  }

  function seAcerca(it, hoy) {
    if (!it.fecha) return false;
    return diffDias(it.fecha, hoy) <= 35;
  }

  function htmlAviso(items, hoy, conLink) {
    const lista = items.filter((it) => seAcerca(it, hoy))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, "es"));
    if (!lista.length) return "";
    return `<section class="aviso-mant" aria-label="Mantenciones que se acercan">
      <div class="agenda-head">
        <p class="pizarra-titulo">Se acerca</p>
        <span class="agenda-rango">Equipos y predio${conLink ? ' · <a href="calendario.html">Ver calendario</a>' : ""}</span>
      </div>
      <div class="aviso-mant-grid">
        ${lista.map((it) => {
          const n = diffDias(it.fecha, hoy);
          const tono = n < 0 ? "atrasada" : (it.grupo === "Predio" ? "predio" : "equipo");
          return `<button type="button" class="aviso-mant-card ${tono}" data-agenda="${marcarDetalle(it)}">
            <span>${esc(etiqueta(it.fecha, hoy))}</span>
            <b>${esc(it.nombre)}</b>
            <small>${esc(it.grupo)} · ${esc(fechaCorta(it.fecha))}${it.lugar ? " · " + esc(it.lugar) : ""}</small>
          </button>`;
        }).join("")}
      </div>
    </section>`;
  }

  let avisoToken = 0;

  function limpiarSemana(host) {
    host.querySelectorAll(".semana-dia").forEach((celda) => {
      celda.classList.remove("con-predio", "con-equipo");
      celda.querySelectorAll(".semana-item").forEach((n) => n.remove());
      if (!celda.querySelector(".semana-vacio")) {
        const vacio = document.createElement("p");
        vacio.className = "semana-vacio";
        vacio.textContent = "Libre";
        celda.appendChild(vacio);
      }
    });
  }

  function diaSiguiente(iso) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function listaDia(lista) {
    if (!lista.length) return '<p class="dia-vacio">Nada programado.</p>';
    return '<ul class="dia-lista">' + lista.map((it) =>
      "<li><b>" + esc(it.nombre) + "</b><small>" + esc(it.grupo) +
      (it.motivo === "por_hacer" ? " · por hacer" : " · próxima visita") +
      (it.lugar ? " · " + esc(it.lugar) : "") + "</small></li>"
    ).join("") + "</ul>";
  }

  function mostrarAvisoEntrada(items, hoy) {
    if (sessionStorage.getItem("AVISO_ENTRADA") !== "1") return;
    sessionStorage.removeItem("AVISO_ENTRADA");
    const manana = diaSiguiente(hoy);
    const de = (iso) => items
      .filter((it) => it.fecha === iso)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const tituloHoy = new Date(hoy + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
    let modal = document.getElementById("aviso-entrada-dia");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal-bg";
      modal.id = "aviso-entrada-dia";
      modal.innerHTML =
        '<div class="modal-card modal-angosta" role="dialog" aria-modal="true" aria-labelledby="aviso-dia-tit">' +
        '<div class="modal-head"><h3 id="aviso-dia-tit">Hoy y mañana</h3>' +
        '<button class="btn btn-ghost" type="button" id="aviso-dia-x">Cerrar</button></div>' +
        '<p class="note" id="aviso-dia-fecha"></p>' +
        '<div class="dia-cols">' +
        '<section><h4>Hoy</h4><div id="aviso-dia-hoy"></div></section>' +
        '<section><h4>Mañana</h4><div id="aviso-dia-manana"></div></section>' +
        "</div>" +
        '<button class="btn btn-full" type="button" id="aviso-dia-ok">Entendido</button></div>';
      document.body.appendChild(modal);
      const cerrar = () => { modal.hidden = true; };
      modal.querySelector("#aviso-dia-x").onclick = cerrar;
      modal.querySelector("#aviso-dia-ok").onclick = cerrar;
      modal.addEventListener("click", (ev) => { if (ev.target === modal) cerrar(); });
    }
    modal.querySelector("#aviso-dia-fecha").textContent = tituloHoy;
    modal.querySelector("#aviso-dia-hoy").innerHTML = listaDia(de(hoy));
    modal.querySelector("#aviso-dia-manana").innerHTML = listaDia(de(manana));
    modal.hidden = false;
  }

  async function pintarAvisosEnInicio() {
    const host = document.getElementById("agenda-host");
    if (!host || !window.db) return;
    const quiereAviso = sessionStorage.getItem("AVISO_ENTRADA") === "1";
    if (typeof opcionVisible === "function" && !opcionVisible("mg")) {
      if (quiereAviso) mostrarAvisoEntrada([], hoyISO());
      return;
    }
    const token = ++avisoToken;
    try {
      const items = expandir(await cargarAgenda());
      if (token !== avisoToken) return;
      const hoy = hoyISO();
      limpiarSemana(host);
      items
        .filter((it) => it.fecha && diffDias(it.fecha, hoy) >= 0 && diffDias(it.fecha, hoy) <= 6)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        .forEach((it) => {
          const celda = host.querySelector('[data-dia="' + it.fecha + '"]');
          if (!celda) return;
          const vacio = celda.querySelector(".semana-vacio");
          if (vacio) vacio.remove();
          celda.classList.add(it.grupo === "Predio" ? "con-predio" : "con-equipo");
          const a = document.createElement("button");
          a.type = "button";
          a.className = "semana-item";
          a.setAttribute("data-agenda", marcarDetalle(it));
          a.textContent = it.motivo === "por_hacer" ? it.nombre + " · por hacer" : it.nombre;
          celda.appendChild(a);
        });
      if (quiereAviso) mostrarAvisoEntrada(items, hoy);
    } catch (e) {
      console.error(e);
    }
  }

  window.addEventListener("pageshow", () => {
    if (document.getElementById("agenda-host")) pintarAvisosEnInicio();
  });

  function celdas(anio, mes) {
    const primero = new Date(anio, mes, 1);
    const huecos = (primero.getDay() + 6) % 7;
    const dias = new Date(anio, mes + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < huecos; i++) out.push(0);
    for (let d = 1; d <= dias; d++) out.push(d);
    while (out.length % 7) out.push(0);
    return out;
  }

  function montarCalendario() {
    const root = document.getElementById("cal-root");
    if (!root) return;
    const hoy = hoyISO();
    const ahora = new Date(hoy + "T12:00:00");
    let anio = ahora.getFullYear();
    let mes = ahora.getMonth();
    let filtro = "Todos";
    let items = [];
    let activos = [];

    root.innerHTML =
      '<p class="muted-mini" id="cal-estado">Cargando el calendario…</p>' +
      '<div id="cal-aviso"></div>' +
      '<section class="cal-board" id="cal-board" hidden>' +
      '<div class="cal-tools">' +
      '<div class="cal-nav"><button type="button" class="btn btn-ghost" id="cal-prev">←</button>' +
      '<b id="cal-titulo"></b>' +
      '<button type="button" class="btn btn-ghost" id="cal-next">→</button>' +
      '<button type="button" class="btn" id="cal-hoy">Este mes</button></div>' +
      '<div class="cal-filtros" id="cal-filtros">' +
      '<button type="button" data-f="Todos" class="on">Todo</button>' +
      '<button type="button" data-f="Equipos">Equipos</button>' +
      '<button type="button" data-f="Predio">Predio</button></div></div>' +
      '<div class="cal-dow">' + DOW.map((d) => "<span>" + d + "</span>").join("") + "</div>" +
      '<div class="cal-grid" id="cal-grid"></div>' +
      '<p class="muted-mini" id="cal-vacio" hidden>Este mes no hay mantenciones programadas en este grupo.</p>' +
      "</section>" +
      '<section class="panel cal-programar" id="cal-programar" hidden>' +
      "<h3>Programar una próxima</h3>" +
      '<p class="muted-mini">Elige el equipo o el punto del predio y el día en que toca revisarlo. Queda en el calendario y en el aviso.</p>' +
      '<div class="form-grid">' +
      '<div class="full"><label for="cal-item">Equipo o predio</label><select id="cal-item"></select></div>' +
      '<div><label for="cal-fecha">Día</label><input id="cal-fecha" type="date" /></div>' +
      "</div>" +
      '<p class="muted-mini" id="cal-msg"></p>' +
      '<button class="btn" type="button" id="cal-guardar">Guardar en el calendario</button>' +
      "</section>";

    const $ = (id) => document.getElementById(id);

    function visibles() {
      return items.filter((it) => filtro === "Todos" || it.grupo === filtro);
    }

    function pintar() {
      $("cal-titulo").textContent = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + " " + anio;
      const lista = visibles();
      const delMes = lista.filter((it) => {
        if (!it.fecha) return false;
        const d = new Date(it.fecha + "T12:00:00");
        return d.getFullYear() === anio && d.getMonth() === mes;
      });
      const porDia = {};
      delMes.forEach((it) => {
        const dia = Number(it.fecha.slice(8, 10));
        (porDia[dia] || (porDia[dia] = [])).push(it);
      });
      const hoyDia = ahora.getFullYear() === anio && ahora.getMonth() === mes ? ahora.getDate() : 0;
      $("cal-grid").innerHTML = celdas(anio, mes).map((dia) => {
        if (!dia) return '<div class="cal-dia vacio"></div>';
        const evs = porDia[dia] || [];
        const iso = anio + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
        const tarde = evs.some((it) => it.fecha < hoy);
        return `<div class="cal-dia${dia === hoyDia ? " hoy" : ""}${tarde ? " tarde" : ""}">
          <b>${dia}</b>
          ${evs.slice(0, 2).map((it) => `<button type="button" class="cal-chip ${it.grupo === "Predio" ? "predio" : "equipo"}" data-agenda="${marcarDetalle(it)}" title="${esc(it.nombre)}">${esc(it.nombre)}</button>`).join("")}
          ${evs.length > 2 ? `<small>+${evs.length - 2}</small>` : ""}
        </div>`;
      }).join("");
      $("cal-vacio").hidden = delMes.length > 0;
      $("cal-aviso").innerHTML = htmlAviso(lista, hoy, false);
    }

    function pintarSelect() {
      const grupos = ["Equipos", "Predio"];
      $("cal-item").innerHTML = grupos.map((g) => {
        const ops = activos.filter((a) => a.grupo === g)
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
          .map((a) => `<option value="${a.id}">${esc(a.nombre)}${a.lugar ? " · " + esc(a.lugar) : ""}</option>`)
          .join("");
        return `<optgroup label="${g}">${ops}</optgroup>`;
      }).join("");
    }

    $("cal-prev").onclick = () => {
      mes -= 1;
      if (mes < 0) { mes = 11; anio -= 1; }
      pintar();
    };
    $("cal-next").onclick = () => {
      mes += 1;
      if (mes > 11) { mes = 0; anio += 1; }
      pintar();
    };
    $("cal-hoy").onclick = () => {
      anio = ahora.getFullYear();
      mes = ahora.getMonth();
      pintar();
    };
    $("cal-filtros").onclick = (ev) => {
      const btn = ev.target.closest("[data-f]");
      if (!btn) return;
      filtro = btn.getAttribute("data-f");
      $("cal-filtros").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === btn));
      pintar();
    };
    $("cal-fecha").value = hoy;
    $("cal-guardar").onclick = async () => {
      const msg = $("cal-msg");
      const id = Number($("cal-item").value);
      const fecha = $("cal-fecha").value;
      if (!id || !fecha) {
        msg.textContent = "Elige el equipo y el día.";
        if (window.cuadro) cuadro("Falta un dato", msg.textContent);
        return;
      }
      msg.textContent = "Guardando…";
      const { error } = await window.db.from("activo").update({ proxima_programada: fecha }).eq("id", id);
      if (error) {
        msg.textContent = error.message;
        if (window.cuadro) cuadro("No se guardó", error.message);
        return;
      }
      const base = activos.find((x) => x.id === id);
      if (base) {
        base.citas = base.citas || [];
        if (!base.citas.some((c) => c.fecha === fecha)) base.citas.push({ fecha, motivo: "proxima" });
        base.citas.sort((a, b) => a.fecha.localeCompare(b.fecha));
        base.fecha = base.citas[0] ? base.citas[0].fecha : fecha;
      }
      items = expandir(activos);
      const nombre = base ? base.nombre : "El equipo";
      $("cal-fecha").value = hoy;
      msg.textContent = "";
      if (window.cuadro) cuadro("Quedó en el calendario", nombre + " tiene próxima visita el " + fecha + ".");
      pintar();
    };

    cargarAgenda().then((rows) => {
      activos = rows;
      items = expandir(rows);
      $("cal-estado").hidden = true;
      $("cal-board").hidden = false;
      $("cal-programar").hidden = false;
      pintarSelect();
      pintar();
    }).catch((err) => {
      $("cal-estado").textContent = err.message || "No se pudo cargar el calendario.";
    });
  }

  window.pintarAvisosEnInicio = pintarAvisosEnInicio;
  window.montarCalendario = montarCalendario;
})();
