/* Calendario: equipos, predio, habitaciones, jardín y prevención. */
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

  function claseGrupo(grupo) {
    if (grupo === "Predio") return "predio";
    if (grupo === "Habitaciones") return "hab";
    if (grupo === "Jardín") return "jardin";
    if (grupo === "Prevención") return "prev";
    return "equipo";
  }

  function puedeGrupo(grupo) {
    if (typeof opcionVisible !== "function") return true;
    if (grupo === "Prevención") return opcionVisible("prevencion");
    if (grupo === "Habitaciones") return opcionVisible("mg") && opcionVisible("habitaciones");
    if (grupo === "Jardín" || grupo === "Predio") return opcionVisible("mg") && opcionVisible("predio");
    if (grupo === "Equipos") return opcionVisible("mg") && opcionVisible("equipos");
    return opcionVisible("mg");
  }

  function armar(row) {
    const cat = row.categoria_activo || {};
    const grupo = String(cat.grupo || "");
    if (grupo !== "Equipos" && grupo !== "Predio" && grupo !== "Habitaciones") return null;
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

  function armarTarea(row) {
    const grupo = row.tipo === "prevencion" ? "Prevención" : "Jardín";
    const hoy = hoyISO();
    const citas = citasDe(row, hoy);
    ["fecha_inicio", "fecha_fin"].forEach((campo) => {
      const dia = row[campo] ? String(row[campo]).slice(0, 10) : "";
      if (!dia || citas.some((c) => c.fecha === dia)) return;
      citas.push({ fecha: dia, motivo: "proxima" });
    });
    citas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (!citas.length) return null;
    const zona = (row.zona && row.zona.nombre) || "";
    const visitas = (row.visita || []).map((v) => ({
      fecha: v.fecha || "",
      tipo: (v.tipo_trabajo && v.tipo_trabajo.nombre) || "",
      quien: (v.trabajador && v.trabajador.nombre) || "",
      detalle: v.detalle || "",
      proxima: v.proxima_fecha || "",
      estado: v.estado || ""
    })).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    return {
      id: "t" + row.id,
      nombre: row.nombre,
      grupo,
      tipo: grupo,
      lugar: zona,
      fecha: citas[0].fecha,
      motivo: citas[0].motivo,
      citas,
      visitas,
      tarea: true
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
    const activos = window.db.from("activo").select(
      "id, nombre, ubicacion_det, proxima_programada, categoria_activo!inner(codigo, nombre, grupo), zona(nombre), visita(fecha, detalle, costo, proxima_fecha, estado, tipo_trabajo(nombre), trabajador(nombre), proveedor(nombre))"
    ).eq("activo", true);
    const qTareas = window.db.from("tarea").select(
      "id, nombre, tipo, fecha_inicio, fecha_fin, estado, notas, zona(nombre), visita(fecha, detalle, proxima_fecha, estado, tipo_trabajo(nombre), trabajador(nombre))"
    ).in("tipo", ["faena_jardin", "riego", "prevencion"]).not("estado", "in", "(hecha,cancelada)");
    const [a, t] = await Promise.all([activos, qTareas]);
    if (a.error) throw new Error(a.error.message);
    if (t.error) throw new Error(t.error.message);
    const tareas = t.data || [];
    const lista = (a.data || []).map(armar).filter(Boolean).concat(tareas.map(armarTarea).filter(Boolean));
    const jardin = resumenJardin(tareas, hoyISO());
    if (jardin) lista.push(jardin);
    return lista;
  }

  function resumenJardin(rows, hoy) {
    const mes = Number(String(hoy).slice(5, 7));
    const calido = mes >= 9 || mes <= 3;
    const n = rows.filter((row) => {
      if (row.tipo !== "faena_jardin" || row.estado === "hecha" || row.estado === "cancelada") return false;
      let temporada = "";
      try { temporada = String((JSON.parse(row.notas || "{}").temporada) || ""); } catch (e) { temporada = ""; }
      const t = temporada.toLowerCase();
      if (!t) return true;
      const deCalor = t.indexOf("verano") >= 0 || t.indexOf("primavera") >= 0;
      const deFrio = t.indexOf("invierno") >= 0 || t.indexOf("oto") >= 0;
      return calido ? deCalor : deFrio;
    }).length;
    if (!n) return null;
    return {
      id: "jardin-temp",
      nombre: "Jardín en temporada",
      grupo: "Jardín",
      tipo: "Temporada",
      lugar: n + (n === 1 ? " faena" : " faenas") + " · " + (calido ? "primavera / verano" : "otoño / invierno"),
      fecha: hoy,
      motivo: "proxima",
      citas: [{ fecha: hoy, motivo: "proxima" }],
      visitas: []
    };
  }

  function seAcerca(it, hoy) {
    if (!it.fecha) return false;
    const n = diffDias(it.fecha, hoy);
    return n >= -14 && n <= 35;
  }

  function htmlAviso(items, hoy, conLink) {
    const lista = items.filter((it) => seAcerca(it, hoy))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, "es"));
    if (!lista.length) return "";
    return `<section class="aviso-mant" aria-label="Mantenciones que se acercan">
      <div class="agenda-head">
        <p class="pizarra-titulo">Se acerca</p>
        <span class="agenda-rango">Lo que viene en el mes${conLink ? ' · <a href="calendario.html">Ver calendario</a>' : ""}</span>
      </div>
      <div class="aviso-mant-grid">
        ${lista.map((it) => {
          const n = diffDias(it.fecha, hoy);
          const tono = n < 0 ? "u-atras" : (n <= 7 ? "u-cerca" : (n <= 31 ? "u-media" : "u-lejos"));
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
    const token = ++avisoToken;
    try {
      const items = expandir(await cargarAgenda()).filter((it) => puedeGrupo(it.grupo));
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
          const n = diffDias(it.fecha, hoy);
          celda.classList.add("ocupado");
          celda.classList.add(n < 0 ? "atras" : n <= 7 ? "cerca" : "media");
          const a = document.createElement("button");
          a.type = "button";
          const urg = n < 0 ? "u-atras" : (n === 0 ? "u-hoy" : (n <= 7 ? "u-cerca" : (n <= 31 ? "u-media" : "u-lejos")));
          a.className = "semana-item " + urg;
          a.setAttribute("data-agenda", marcarDetalle(it));
          a.textContent = it.motivo === "por_hacer" ? it.nombre + " · por hacer" : it.nombre;
          celda.appendChild(a);
        });
      let caja = document.getElementById("se-acerca");
      if (!caja) {
        caja = document.createElement("div");
        caja.id = "se-acerca";
        const pizarra = host.querySelector(".pizarra");
        if (pizarra) pizarra.insertAdjacentElement("afterend", caja);
        else host.appendChild(caja);
      }
      const fuera = items.filter((it) => {
        const n = diffDias(it.fecha, hoy);
        return n < 0 || n > 6;
      });
      caja.innerHTML = htmlAviso(fuera, hoy, true);
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
      '<button type="button" data-f="Predio">Predio</button>' +
      '<button type="button" data-f="Habitaciones">Piezas</button>' +
      '<button type="button" data-f="Jardín">Jardín</button>' +
      '<button type="button" data-f="Prevención">Prevención</button></div></div>' +
      '<div class="cal-dow" id="cal-dow">' + DOW.map((d) => "<span>" + d + "</span>").join("") + "</div>" +
      '<div class="cal-grid" id="cal-grid"></div>' +
      '<p class="muted-mini" id="cal-vacio" hidden>Este mes no hay mantenciones programadas en este grupo.</p>' +
      "</section>" +
      '<section class="panel cal-programar" id="cal-programar" hidden>' +
      "<h3>Programar el día</h3>" +
      '<p class="muted-mini">Esto solo deja el día en el calendario. No es la mantención: aquí no queda quién la hizo ni el detalle. Para registrar el trabajo, entra a <a href="mantencion.html">Mantención</a> y usa Crear. El domingo también se puede agendar.</p>' +
      '<div class="form-grid">' +
      '<div class="full"><label for="cal-item">Equipo o predio</label><select id="cal-item"></select></div>' +
      '<div><label for="cal-fecha">Día</label><input id="cal-fecha" type="date" /></div>' +
      "</div>" +
      '<p class="muted-mini" id="cal-domingo"></p>' +
      '<p class="muted-mini" id="cal-msg"></p>' +
      '<button class="btn" type="button" id="cal-guardar">Guardar en el calendario</button>' +
      "</section>";

    const $ = (id) => document.getElementById(id);

    function visibles() {
      return items.filter((it) => filtro === "Todos" || it.grupo === filtro);
    }

    function tonoChip(it) {
      const n = diffDias(it.fecha, hoy);
      if (n < 0) return "atras";
      if (n <= 7) return "cerca";
      if (n <= 31) return "media";
      return "lejos";
    }

    function pintar() {
      $("cal-titulo").textContent = MESES[mes].charAt(0).toUpperCase() + MESES[mes].slice(1) + " " + anio;
      const mismoMes = anio === ahora.getFullYear() && mes === ahora.getMonth();
      $("cal-dow").innerHTML = DOW.map((d, i) => {
        const esHoy = mismoMes && ahora.getDay() === (i + 1) % 7;
        return "<span" + (esHoy ? ' class="hoy-dow"' : "") + ">" + d + "</span>";
      }).join("");
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
        const nums = evs.map((it) => diffDias(it.fecha, hoy));
        const menor = nums.length ? Math.min.apply(null, nums) : 99;
        const prox = !evs.length ? "" : (menor < 0 ? " atrasada" : menor <= 7 ? " cerca" : " media");
        return `<div class="cal-dia${dia === hoyDia ? " hoy" : ""}${evs.length ? " ocupado" : ""}${prox}">
          <b>${dia}</b>
          ${evs.slice(0, 2).map((it) => `<button type="button" class="cal-chip ${claseGrupo(it.grupo)} ${tonoChip(it)}" data-agenda="${marcarDetalle(it)}" title="${esc(it.nombre)}">${esc(it.nombre)}</button>`).join("")}
          ${evs.length > 2 ? `<small>+${evs.length - 2}</small>` : ""}
        </div>`;
      }).join("");
      $("cal-vacio").hidden = delMes.length > 0;
      $("cal-aviso").innerHTML = htmlAviso(lista, hoy, false);
    }

    function pintarSelect() {
      const grupos = ["Equipos", "Predio", "Habitaciones"];
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
    function avisoDomingo() {
      const fecha = $("cal-fecha").value;
      const p = $("cal-domingo");
      if (!p) return;
      if (!fecha) { p.textContent = ""; return; }
      const d = new Date(fecha + "T12:00:00");
      p.textContent = d.getDay() === 0 ? "Ese día es domingo. Queda agendado igual." : "";
    }
    $("cal-fecha").value = hoy;
    $("cal-fecha").addEventListener("change", avisoDomingo);
    avisoDomingo();
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
