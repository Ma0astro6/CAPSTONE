/* Prototipo estructural Fase 2: solo navegación entre pantallas. Sin API ni persistencia. */

const LOGO = `
<svg viewBox="0 0 220 90" xmlns="http://www.w3.org/2000/svg" aria-label="Elalmendro ecohotel">
  <g fill="none" stroke="#111" stroke-width="3">
    <circle cx="110" cy="22" r="14"/>
    <path d="M110 8c4 2 7 6 7 10"/>
  </g>
  <path d="M118 10c-2-6-8-8-8-8" fill="#111"/>
  <text x="110" y="58" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#111">Elalmendro</text>
  <text x="110" y="78" text-anchor="middle" font-family="Calibri, sans-serif" font-size="12" fill="#111">ecohotel</text>
</svg>`;

function getSesion() {
  try {
    return JSON.parse(sessionStorage.getItem("SESION") || "null");
  } catch (e) {
    return null;
  }
}

function clearSesion() {
  sessionStorage.removeItem("SESION");
  sessionStorage.removeItem("rol");
  sessionStorage.removeItem("PERMISOS");
  sessionStorage.removeItem("INICIO_BOTONES");
  sessionStorage.removeItem("AVISO_ENTRADA");
  sessionStorage.removeItem("PILA_VISTAS");
}

function rolLabel(rol, nombre) {
  if (nombre) return nombre;
  const map = {
    admin: "Administrador",
    invitado: "Invitado",
    extra: "Extra",
    prevencion: "Prevencionista",
    mantencion: "Mantención",
    usuario: "Usuario"
  };
  return map[rol] || "Usuario";
}

function headerHTML(sesion, crumbs) {
  const nombre = (sesion && sesion.nombre) || "Usuario";
  const cargo = rolLabel(sesion && sesion.rol, sesion && sesion.rol_nombre);
  const who = `<b>${nombre}</b><span>${cargo}</span>`;
  const salir = location.pathname.includes("/vistas/") ? "../index.html" : "index.html";
  const admin = sesion && sesion.rol === "admin"
    ? `<a href="usuarios.html">Usuarios</a>
       <a href="vista-usuario.html">Permisos</a>`
    : "";
  return `
    <header class="topbar">
      <div class="logo-wrap">${LOGO}</div>
      <div class="who">${who}</div>
      <div class="spacer"></div>
      <div class="menu-cuenta">
        <button type="button" class="menu-barras" aria-label="Abrir menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <div class="menu-panel" hidden>
          ${admin}
          <a class="salir" href="${salir}" onclick="clearSesion()">Salir</a>
        </div>
      </div>
    </header>`;
}

const PAGINA_MENU = {
  "mantencion.html": "mg",
  "calendario.html": "mg",
  "mejoras.html": "me",
  "remodelaciones.html": "re",
  "gantt.html": "gantt",
  "reactivas.html": "reactivas",
  "equipos-crear.html": "equipos",
  "equipos-buscar.html": "equipos",
  "maquinas.html": "equipos",
  "radiadores.html": "equipos",
  "refrigeradores.html": "equipos",
  "predio-crear.html": "predio",
  "predio-buscar.html": "predio",
  "fosas.html": "predio",
  "bodegas.html": "predio",
  "jardin.html": "predio",
  "habitaciones-crear.html": "habitaciones",
  "habitaciones-buscar.html": "habitaciones",
  "banos.html": "habitaciones",
  "tvs.html": "habitaciones",
  "puertas.html": "habitaciones",
  "pilas.html": "habitaciones",
  "prevencion.html": "prevencion",
  "prevencion-crear.html": "prevencion",
  "prevencion-buscar.html": "prevencion",
  "prevencion-plan.html": "prevencion",
  "trabajadores.html": "prevencion",
  "proveedores.html": "proveedores",
  "bodega-insumos.html": "bodega",
  "zona.html": "re",
  "usuarios.html": "admin",
  "vista-usuario.html": "admin"
};

function permisosDeSesion() {
  try {
    return JSON.parse(sessionStorage.getItem("PERMISOS") || "null");
  } catch (e) {
    return null;
  }
}

const BOTONES_INICIO = [
  { codigo: "mg", titulo: "Mantención general", texto: "Las planillas de Andrés: buscar, filtrar y registrar visita", href: "mantencion.html", clase: "t-man", marca: "MG" },
  { codigo: "me", titulo: "Mejoras", texto: "Por hacer, plan anual y proyectos valorizados", href: "mejoras.html", clase: "t-mej", marca: "ME" },
  { codigo: "re", titulo: "Remodelaciones", texto: "Zonas del predio, compras, proveedores y Gantt", href: "remodelaciones.html", clase: "t-rem", marca: "RE" },
  { codigo: "bodega", titulo: "Bodega", texto: "Inventario de insumos", href: "bodega-insumos.html", clase: "t-bod", marca: "" },
  { codigo: "gantt", titulo: "Carta Gantt", texto: "Lo que pasa en el año", href: "gantt.html", clase: "t-mej", marca: "ME" },
  { codigo: "reactivas", titulo: "Reactivas", texto: "Avisos urgentes de recepción o huésped", href: "reactivas.html", clase: "t-rea", marca: "MG" },
  { codigo: "calendario", titulo: "Calendario", texto: "Lo que se acerca en equipos y predio", href: "calendario.html", clase: "t-man", marca: "MG" },
  { codigo: "proveedores", titulo: "Proveedores", texto: "Quién suministra", href: "proveedores.html", clase: "t-rem", marca: "RE" },
  { codigo: "prevencion", titulo: "Prevención", texto: "Protocolos y capacitaciones", href: "prevencion.html", clase: "t-mej", marca: "MG" },
  { codigo: "plan_prev", titulo: "Plan del año", texto: "Carta de prevención, de enero a diciembre", href: "prevencion-plan.html", clase: "t-mej", marca: "MG" },
  { codigo: "crear_eq", titulo: "Generar mantención", texto: "Anotar una mantención de un equipo", href: "equipos-crear.html", clase: "t-man", marca: "MG", accion: true },
  { codigo: "buscar_eq", titulo: "Buscar equipo", texto: "Encontrar una máquina y ver su historial", href: "equipos-buscar.html", clase: "t-man", marca: "MG", accion: true },
  { codigo: "crear_predio", titulo: "Generar trabajo de predio", texto: "Anotar un trabajo del predio", href: "predio-crear.html", clase: "t-man", marca: "MG", accion: true },
  { codigo: "buscar_predio", titulo: "Buscar en el predio", texto: "Encontrar una fosa, una bodega o una faena", href: "predio-buscar.html", clase: "t-man", marca: "MG", accion: true },
  { codigo: "crear_hab", titulo: "Generar mantención de pieza", texto: "Anotar una mantención de habitación", href: "habitaciones-crear.html", clase: "t-man", marca: "MG", accion: true },
  { codigo: "crear_prev", titulo: "Registrar avance de prevención", texto: "Anotar un avance de un protocolo o una capacitación", href: "prevencion-crear.html", clase: "t-mej", marca: "MG", accion: true },
  { codigo: "buscar_prev", titulo: "Buscar tarea de prevención", texto: "Encontrar un protocolo o una capacitación", href: "prevencion-buscar.html", clase: "t-mej", marca: "MG", accion: true }
];

function escHtml(val) {
  return String(val == null ? "" : val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

const PADRE_MENU = {
  reactivas: "mg",
  equipos: "mg",
  predio: "mg",
  habitaciones: "mg",
  proveedores: "re",
  bodega: "re"
};

function botonInicio(codigo) {
  return BOTONES_INICIO.find((b) => b.codigo === codigo) || null;
}

function permisoDeBoton(codigo) {
  const boton = botonInicio(codigo);
  if (!boton) return "";
  return PAGINA_MENU[boton.href] || "";
}

function botonPermitido(codigo) {
  const op = permisoDeBoton(codigo);
  if (!op) return false;
  if (!opcionVisible(op)) return false;
  const padre = PADRE_MENU[op];
  return !padre || opcionVisible(padre);
}

function botonesAsignados() {
  try {
    return JSON.parse(sessionStorage.getItem("INICIO_BOTONES") || "null");
  } catch (e) {
    return null;
  }
}

function opcionVisible(codigo) {
  const sesion = getSesion();
  if (!sesion) return true;
  const map = permisosDeSesion();
  if (!map || !Object.prototype.hasOwnProperty.call(map, codigo)) return true;
  return map[codigo] !== false;
}

function paginaActual() {
  const parts = location.pathname.split("/");
  return decodeURIComponent(parts[parts.length - 1] || "");
}

function puedeVerPagina() {
  const op = PAGINA_MENU[paginaActual()];
  if (!op) return true;
  if (op === "admin") return !!(getSesion() && getSesion().rol === "admin");
  if (!opcionVisible(op)) return false;
  const padre = PADRE_MENU[op];
  return !padre || opcionVisible(padre);
}

function htmlBotonInicio(codigo, ancho) {
  const boton = botonInicio(codigo);
  if (!boton) return "";
  const titulo = escHtml(boton.titulo);
  const texto = escHtml(boton.texto);
  if (ancho) {
    return `<a class="tile tile-bodega" href="${boton.href}"><h3>${titulo}</h3><p>${texto}</p></a>`;
  }
  const marca = boton.marca ? `<span class="code">${escHtml(boton.marca)}</span>` : "";
  return `<a class="tile ${boton.clase}" href="${boton.href}"><h3>${titulo}</h3><p>${texto}</p>${marca}</a>`;
}

async function pintarBotonesInicio() {
  const grid = document.querySelector("main .grid-3");
  if (!grid) return;
  const sesion = getSesion();
  if (!sesion || !sesion.rol || !window.db) return;
  let filas = botonesAsignados();
  if (!filas) {
    const { data, error } = await db.from("inicio_boton").select("puesto, codigo").eq("rol_codigo", sesion.rol);
    if (error) return;
    filas = data || [];
    sessionStorage.setItem("INICIO_BOTONES", JSON.stringify(filas));
  }
  if (!filas.length) return;
  const porPuesto = {};
  filas.forEach((fila) => {
    if (botonPermitido(fila.codigo)) porPuesto[fila.puesto] = fila.codigo;
  });
  const cuadros = [1, 2, 3].map((puesto) => porPuesto[puesto]).filter(Boolean);
  grid.classList.toggle("cols-1", cuadros.length === 1);
  grid.classList.toggle("cols-2", cuadros.length === 2);
  grid.innerHTML = cuadros.map((codigo) => htmlBotonInicio(codigo, false)).join("");
  const barra = document.querySelector("main > a.tile-bodega");
  if (porPuesto[4]) {
    const html = htmlBotonInicio(porPuesto[4], true);
    if (barra) barra.outerHTML = html;
    else grid.insertAdjacentHTML("afterend", html);
  } else if (barra) {
    barra.remove();
  }
  aplicarMenus();
}

const CUADROS_ABRE = {
  "mantencion.html": "t-man",
  "mejoras.html": "t-mej",
  "remodelaciones.html": "t-rem"
};

function cuadroDestino(a) {
  if (!a || !a.classList || !a.classList.contains("tile")) return "";
  const href = (a.getAttribute("href") || "").split("?")[0].split("#")[0].split("/").pop();
  return CUADROS_ABRE[href] || "";
}

let cuadroYendo = false;
function abrirCuadroPantalla(a, tono) {
  if (cuadroYendo || document.querySelector(".tile-abre")) return;
  const r = a.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) {
    location.href = a.href;
    return;
  }
  cuadroYendo = true;
  const capa = document.createElement("div");
  capa.className = "tile-abre " + tono;
  capa.innerHTML = a.innerHTML;
  capa.style.top = r.top + "px";
  capa.style.left = r.left + "px";
  capa.style.width = r.width + "px";
  capa.style.height = r.height + "px";
  capa.style.borderRadius = "18px";
  capa.style.padding = "18px 16px";
  document.body.appendChild(capa);
  document.body.style.overflow = "hidden";
  a.style.visibility = "hidden";
  let anim;
  try {
    anim = capa.animate([
      {
        top: r.top + "px",
        left: r.left + "px",
        width: r.width + "px",
        height: r.height + "px",
        borderRadius: "18px",
        padding: "18px 16px"
      },
      {
        top: "0px",
        left: "0px",
        width: "100vw",
        height: "100vh",
        borderRadius: "0px",
        padding: "72px 64px"
      }
    ], { duration: 520, easing: "cubic-bezier(.22, .82, .2, 1)", fill: "forwards" });
  } catch (e) {
    try { sessionStorage.setItem("CUADRO_ABRE", tono); } catch (err) {}
    location.href = a.href;
    return;
  }
  requestAnimationFrame(() => capa.classList.add("crece"));
  const ir = () => {
    if (capa.dataset.listo) return;
    capa.dataset.listo = "1";
    try { sessionStorage.setItem("CUADRO_ABRE", tono); } catch (e) {}
    location.href = a.href;
  };
  anim.onfinish = ir;
  setTimeout(ir, 800);
}

document.addEventListener("click", (ev) => {
  if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  const a = ev.target.closest && ev.target.closest("a.tile");
  const tono = cuadroDestino(a);
  if (!tono) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  ev.preventDefault();
  abrirCuadroPantalla(a, tono);
});

function aplicarMenus() {
  document.querySelectorAll("[data-menu]").forEach((el) => {
    const codigo = el.getAttribute("data-menu");
    el.hidden = !opcionVisible(codigo);
  });
}

async function guardarPermisos(rol) {
  if (!rol || !window.db) {
    sessionStorage.removeItem("PERMISOS");
    return;
  }
  const { data, error } = await db.from("permiso_menu").select("opcion, visible").eq("rol_codigo", rol);
  if (error) {
    sessionStorage.removeItem("PERMISOS");
    return;
  }
  const map = {};
  (data || []).forEach((row) => { map[row.opcion] = !!row.visible; });
  sessionStorage.setItem("PERMISOS", JSON.stringify(map));
  const botones = await db.from("inicio_boton").select("puesto, codigo").eq("rol_codigo", rol);
  if (!botones.error) sessionStorage.setItem("INICIO_BOTONES", JSON.stringify(botones.data || []));
}

function puedeAbrirHref(href) {
  if (!href) return false;
  const page = String(href).split("?")[0].split("/").pop();
  if (!page || page === "inicio.html") return true;
  const op = PAGINA_MENU[page];
  if (!op) return true;
  if (op === "admin") return !!(getSesion() && getSesion().rol === "admin");
  if (!opcionVisible(op)) return false;
  const padre = PADRE_MENU[op];
  return !padre || opcionVisible(padre);
}

function crumbHTML(items) {
  const lista = items || [];
  const visibles = lista.filter((x, i) => i === lista.length - 1 || puedeAbrirHref(x.href));
  const backHref = visibles.length > 1 ? visibles[visibles.length - 2].href : "";
  const back = backHref
    ? `<a class="btn btn-back" href="${backHref}" data-regresar="1">← Regresar</a>`
    : "";
  const trail = visibles.map((x, i) =>
    i === visibles.length - 1 ? x.label : `<a href="${x.href}">${x.label}</a> ▸ `
  ).join("");
  return `<nav class="crumb">${back}<span class="crumb-trail">${trail}</span></nav>`;
}

function registrarVista() {
  const actual = paginaActual() + location.search;
  if (!actual || actual === "index.html") return;
  let pila = [];
  try { pila = JSON.parse(sessionStorage.getItem("PILA_VISTAS") || "[]"); } catch (e) { pila = []; }
  if (!Array.isArray(pila)) pila = [];
  const i = pila.findIndex((p) => String(p).split("?")[0] === paginaActual());
  if (i >= 0) pila = pila.slice(0, i);
  pila.push(actual);
  if (pila.length > 12) pila = pila.slice(pila.length - 12);
  sessionStorage.setItem("PILA_VISTAS", JSON.stringify(pila));
}

function bindRegresar() {
  const a = document.querySelector("[data-regresar]");
  if (!a) return;
  a.addEventListener("click", (ev) => {
    ev.preventDefault();
    const fallback = a.getAttribute("href") || "inicio.html";
    let pila = [];
    try { pila = JSON.parse(sessionStorage.getItem("PILA_VISTAS") || "[]"); } catch (e) { pila = []; }
    const prev = Array.isArray(pila) && pila.length >= 2 ? pila[pila.length - 2] : "";
    if (prev && puedeAbrirHref(prev)) {
      location.href = prev;
      return;
    }
    location.href = fallback;
  });
}

function hoyISO() {
  const t = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function isoMasDias(iso, n) {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadCierre() {
  try {
    return JSON.parse(sessionStorage.getItem("CIERRE_DIA") || "{}");
  } catch (e) {
    return {};
  }
}

function saveCierre(map) {
  sessionStorage.setItem("CIERRE_DIA", JSON.stringify(map));
}

function originalGantt() {
  if (typeof GANTT_OBRAS === "undefined") return [];
  if (!window.GANTT_ORIGINAL) window.GANTT_ORIGINAL = GANTT_OBRAS.map((it) => ({ ...it }));
  return window.GANTT_ORIGINAL;
}

function applyCierreToGantt() {
  if (typeof GANTT_OBRAS === "undefined") return;
  const orig = {};
  originalGantt().forEach((it) => { orig[it.id] = it; });
  const map = loadCierre();
  GANTT_OBRAS.forEach((it) => {
    const base = orig[it.id];
    if (base) {
      it.estado = base.estado;
      it.ini = base.ini;
      it.fin = base.fin;
      it.notaCierre = "";
    }
    const c = map[it.id];
    if (!c) return;
    if (c.estado === "Hecho") it.estado = "Hecho";
    if (c.estado === "Pendiente") {
      it.estado = "Pendiente";
      if (c.proxima) it.fin = c.proxima;
    }
    if (c.nota) it.notaCierre = c.nota;
  });
}

async function cargarCierres() {
  if (!window.db || typeof GANTT_OBRAS === "undefined") return;
  const tareas = await window.db.from("tarea").select("id, codigo").like("codigo", "gantt:%");
  if (tareas.error) throw new Error(tareas.error.message);
  const filas = tareas.data || [];
  if (!filas.length) {
    saveCierre({});
    return;
  }
  const cierres = await window.db.from("cierre_tarea")
    .select("tarea_id, fecha, resultado, fecha_retoma, nota, creado_en")
    .in("tarea_id", filas.map((t) => t.id))
    .order("creado_en", { ascending: false });
  if (cierres.error) throw new Error(cierres.error.message);
  const ultimo = {};
  (cierres.data || []).forEach((c) => { if (!ultimo[c.tarea_id]) ultimo[c.tarea_id] = c; });
  const map = {};
  filas.forEach((t) => {
    const c = ultimo[t.id];
    if (!c || !t.codigo || t.codigo.indexOf("gantt:") !== 0) return;
    map[t.codigo.slice(6)] = {
      estado: c.resultado === "hecho" ? "Hecho" : "Pendiente",
      fecha: c.fecha,
      nota: c.nota || "",
      proxima: c.fecha_retoma || ""
    };
  });
  saveCierre(map);
}

async function registrarCierre(id, estado, extra) {
  const it = typeof GANTT_OBRAS !== "undefined" ? GANTT_OBRAS.find((x) => x.id === id) : null;
  const ses = getSesion();
  if (!it || !window.db || !ses || !ses.id) {
    if (window.cuadro) cuadro("No se guardó", "No hay sesión o la tarea no está en la carta.");
    return;
  }
  const base = originalGantt().find((x) => x.id === id) || it;
  const resultado = estado === "Hecho" ? "hecho" : "pendiente";
  const proxima = (extra && extra.proxima) || "";
  const nota = ((extra && extra.nota) || "").slice(0, 300);
  try {
    const buscada = await window.db.from("tarea").select("id").eq("codigo", "gantt:" + id).maybeSingle();
    if (buscada.error) throw new Error(buscada.error.message);
    if (!buscada.data) throw new Error("Esa barra todavía no tiene tarea en la base.");
    const tareaId = buscada.data.id;
    const ins = await window.db.from("cierre_tarea").insert({
      tarea_id: tareaId,
      fecha: hoyISO(),
      resultado,
      fecha_retoma: resultado === "pendiente" ? (proxima || isoMasDias(hoyISO(), 1)) : null,
      nota: nota || null,
      usuario_id: ses.id
    });
    if (ins.error) throw new Error(ins.error.message);
    const up = await window.db.from("tarea").update({
      estado: resultado === "hecho" ? "hecha" : "pendiente",
      fecha_fin: resultado === "pendiente" ? (proxima || isoMasDias(hoyISO(), 1)) : base.fin
    }).eq("id", tareaId);
    if (up.error) throw new Error(up.error.message);
    const map = loadCierre();
    map[id] = { estado, fecha: hoyISO(), nota, proxima: resultado === "pendiente" ? (proxima || isoMasDias(hoyISO(), 1)) : "" };
    saveCierre(map);
    if (window.cuadro) {
      cuadro(
        estado === "Hecho" ? "Quedó hecho" : "Quedó pendiente",
        it.nom + (estado === "Hecho" ? " se guardó como hecho." : " se retoma el " + (map[id].proxima) + ".")
      );
    }
    renderAgenda();
  } catch (err) {
    if (window.cuadro) cuadro("No se guardó", err.message || "No se pudo guardar el cierre.");
  }
}

function necesitaCierre(it, hoy) {
  if (!it || it.estado === "Hecho") return false;
  if (it.estado === "Pendiente") return !it.fin || it.fin <= hoy;
  if (it.estado === "Atrasada" || it.estado === "Por cerrar") return true;
  if (it.fin && it.fin < hoy) return true;
  if (it.ini === hoy || it.fin === hoy) return true;
  return false;
}

async function cargarVisitasCarta() {
  window.VISITAS_CARTA = window.VISITAS_CARTA || [];
  window.PENDIENTES_VISITA = window.PENDIENTES_VISITA || [];
  if (!window.db) return;
  const anio = new Date().getFullYear();
  const desde = anio + "-01-01";
  const hasta = anio + "-12-31";
  const q = await window.db.from("visita").select(
    "id, fecha, proxima_fecha, detalle, estado, trabajador(nombre), activo(nombre, ubicacion_det, zona(nombre), categoria_activo(grupo)), tarea(nombre, tipo, zona(nombre))"
  ).gte("fecha", desde).lte("fecha", hasta).order("fecha");
  if (q.error) throw new Error(q.error.message);
  const hoy = hoyISO();
  const carta = [];
  const pendientes = [];
  const vistos = new Set();
  function poner(item) {
    const clave = item.nom + "|" + item.ini;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    carta.push(item);
    if (item.estado !== "Hecho" && item.ini <= hoy) pendientes.push(item);
  }
  (q.data || []).forEach((v) => {
    const act = v.activo;
    const tar = v.tarea;
    if (!v.fecha || (!act && !tar)) return;
    const grupo = (act && act.categoria_activo && act.categoria_activo.grupo)
      || (tar && tar.tipo === "prevencion" ? "Prevención" : tar ? "Jardín" : "");
    const base = {
      visitaId: v.id,
      pilar: "MG",
      nom: (act && act.nombre) || (tar && tar.nombre) || "Mantención",
      href: "calendario.html",
      quien: (v.trabajador && v.trabajador.nombre) || "",
      lugar: (act && ((act.zona && act.zona.nombre) || act.ubicacion_det)) || (tar && tar.zona && tar.zona.nombre) || "",
      detalle: v.detalle || "",
      grupo
    };
    poner(Object.assign({}, base, {
      id: "vis-" + v.id,
      ini: v.fecha,
      fin: v.fecha,
      estado: v.estado === "terminada" ? "Hecho" : (v.fecha < hoy ? "Atrasada" : "Por hacer")
    }));
    const prox = v.proxima_fecha ? String(v.proxima_fecha).slice(0, 10) : "";
    if (prox && prox.slice(0, 4) === String(anio) && prox !== String(v.fecha).slice(0, 10)) {
      poner(Object.assign({}, base, {
        id: "prox-" + v.id,
        ini: prox,
        fin: prox,
        estado: prox < hoy ? "Atrasada" : "Por hacer",
        quien: "Próxima visita"
      }));
    }
  });
  const abiertas = carta.filter((it) => it.estado !== "Hecho");
  const hechas = carta.filter((it) => it.estado === "Hecho")
    .sort((a, b) => String(b.ini).localeCompare(String(a.ini)))
    .slice(0, 20);
  window.VISITAS_CARTA = abiertas.concat(hechas);
  window.PENDIENTES_VISITA = pendientes;
  window.PENDIENTES_PREV = [];
  const prevQ = await window.db.from("tarea")
    .select("id, nombre, fecha_fin")
    .eq("tipo", "prevencion")
    .lte("fecha_fin", hoy)
    .not("estado", "in", "(hecha,cancelada)");
  if (!prevQ.error) {
    window.PENDIENTES_PREV = (prevQ.data || []).filter((t) => t.fecha_fin).map((t) => ({
      id: t.id,
      nom: t.nombre,
      fin: String(t.fecha_fin).slice(0, 10)
    }));
  }
}

async function cerrarVisita(id, estado, extra) {
  if (!window.db) return;
  const proxima = (extra && extra.proxima) || "";
  const nota = ((extra && extra.nota) || "").slice(0, 300);
  const patch = { estado: estado === "terminada" ? "terminada" : "por_hacer" };
  if (estado !== "terminada" && proxima) patch.fecha = proxima;
  if (nota) patch.detalle = nota;
  const up = await window.db.from("visita").update(patch).eq("id", Number(id));
  if (up.error) {
    if (window.cuadro) cuadro("No se guardó", up.error.message);
    return;
  }
  if (window.cuadro) {
    cuadro(
      estado === "terminada" ? "Quedó hecho" : "Quedó pendiente",
      estado === "terminada" ? "Salió del cierre de hoy." : "Se retoma el " + (proxima || "otro día") + "."
    );
  }
  try { await cargarVisitasCarta(); } catch (e) { /* el cierre igual se reescribe */ }
  renderAgenda();
  if (typeof pintarAvisosEnInicio === "function") pintarAvisosEnInicio();
}

async function cerrarTarea(id, estado, extra) {
  if (!window.db) return;
  const proxima = (extra && extra.proxima) || "";
  const patch = { estado: estado === "hecha" ? "hecha" : "pendiente" };
  if (estado !== "hecha" && proxima) {
    const actual = await window.db.from("tarea").select("fecha_inicio").eq("id", Number(id)).maybeSingle();
    const ini = actual.data && actual.data.fecha_inicio ? String(actual.data.fecha_inicio).slice(0, 10) : "";
    if (ini && proxima < ini) {
      if (window.cuadro) cuadro("Revisa las fechas", "La nueva fecha no puede ser anterior al inicio de la capacitación.");
      return;
    }
    patch.fecha_fin = proxima;
  }
  const up = await window.db.from("tarea").update(patch).eq("id", Number(id));
  if (up.error) {
    if (window.cuadro) cuadro("No se guardó", up.error.message);
    return;
  }
  const nombre = (window.PENDIENTES_PREV || []).find((t) => String(t.id) === String(id));
  if (window.cuadro) {
    cuadro(
      estado === "hecha" ? "Quedó hecho" : "Quedó pendiente",
      estado === "hecha"
        ? (nombre ? nombre.nom : "La capacitación") + " salió de lo que se acerca."
        : "Se retoma el " + (proxima || "otro día") + "."
    );
  }
  try { await cargarVisitasCarta(); } catch (e) { /* el cierre igual se reescribe */ }
  renderAgenda();
  if (typeof pintarAvisosEnInicio === "function") pintarAvisosEnInicio();
}

function calTarjetas(hoy) {
  applyCierreToGantt();
  const obras = typeof GANTT_OBRAS !== "undefined" ? GANTT_OBRAS.slice() : [];
  const pendientes = obras.filter((it) => necesitaCierre(it, hoy)).sort((a, b) => (a.fin || "").localeCompare(b.fin || ""));
  const proximas = obras
    .filter((it) => it.estado !== "Hecho" && !necesitaCierre(it, hoy) && it.fin >= hoy)
    .sort((a, b) => (a.ini || "").localeCompare(b.ini || ""));
  const mix = pendientes.concat(proximas).slice(0, 5);
  const colores = ["rosa", "amarillo", "verde", "azul", "lila"];
  return mix.map((it, i) => {
    const d = new Date((necesitaCierre(it, hoy) ? (it.fin < hoy ? hoy : it.fin) : it.ini) + "T12:00:00");
    const dow = d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", "");
    const dia = String(d.getDate());
    let cuando = it.estado;
    let color = colores[i % 5];
    if (necesitaCierre(it, hoy)) {
      color = it.fin < hoy || it.estado === "Atrasada" || it.estado === "Pendiente" ? "amarillo" : "rosa";
      cuando = it.estado === "Pendiente" ? "Pendiente" : (it.fin < hoy ? "Atrasada" : "Hoy · cerrar");
    } else if (it.ini > hoy) {
      const days = Math.round((new Date(it.ini + "T12:00:00") - new Date(hoy + "T12:00:00")) / 86400000);
      cuando = days === 1 ? "Mañana" : days + " días";
      color = "verde";
    }
    return { ...it, color, dow, dia, cuando };
  });
}

function pizarraHTML() {
  const hoy = hoyISO();
  const base = new Date(hoy + "T12:00:00");
  const pad = (n) => String(n).padStart(2, "0");
  const dias = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dias.push({
      iso: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()),
      dia: d.getDate(),
      dow: d.toLocaleDateString("es-CL", { weekday: "short" }).replace(".", ""),
      hoy: i === 0
    });
  }
  const desde = dias[0].dia;
  const hasta = dias[6].dia;
  return `
    <section class="pizarra" aria-label="Próximos 7 días">
      <div class="agenda-head">
        <p class="pizarra-titulo">Próximos 7 días</p>
        <span class="agenda-rango">Del ${desde} al ${hasta} · verde esta semana · amarillo este mes · rojo atrasada</span>
      </div>
      <div class="semana">
        ${dias.map((d) => `
          <div class="semana-dia${d.hoy ? " hoy" : ""}" data-dia="${d.iso}">
            <span class="cal-date"><b>${d.dia}</b>${d.dow}</span>
            <p class="semana-vacio">Libre</p>
          </div>`).join("")}
      </div>
    </section>`;
}

let cierreAbierto = false;

function cierreHTML() {
  const hoy = hoyISO();
  applyCierreToGantt();
  const obras = typeof GANTT_OBRAS !== "undefined" ? GANTT_OBRAS : [];
  const abiertas = obras.filter((it) => necesitaCierre(it, hoy));
  const map = loadCierre();
  const cerradasHoy = Object.keys(map)
    .filter((id) => map[id].fecha === hoy)
    .map((id) => {
      const it = obras.find((x) => x.id === id) || { nom: id };
      return { ...it, ...map[id] };
    });
  const visitas = (window.PENDIENTES_VISITA || []).slice(0, 12);
  const prevs = window.PENDIENTES_PREV || [];
  const n = abiertas.length + visitas.length + prevs.length;
  const tarjetas = abiertas.map((it) => `
        <article class="cierre-card" data-id="${it.id}">
          <div>
            <b>${it.nom}</b>
            <small>${it.pilar} · ${ganttFmt(it.ini)}${it.ini !== it.fin ? " – " + ganttFmt(it.fin) : ""} · ${it.estado}</small>
            ${it.notaCierre ? `<em class="cierre-nota">${it.notaCierre}</em>` : ""}
          </div>
          <div class="cierre-actions">
            <button type="button" class="btn btn-mini btn-mini-gold" data-cierre="hecho">Se hizo</button>
            <button type="button" class="btn btn-mini" data-cierre="pendiente">Quedó pendiente</button>
            <a class="btn btn-mini btn-ghost" href="${it.href}">Ver ficha</a>
          </div>
        </article>`).concat(visitas.map((it) => `
        <article class="cierre-card" data-visita="${it.visitaId}">
          <div>
            <b>${escTarea(it.nom)}</b>
            <small>${escTarea(it.lugar || it.grupo || "Mantención")} · ${ganttFmt(it.ini)} · por hacer${it.quien ? " · " + escTarea(it.quien) : ""}</small>
            ${it.detalle ? `<em class="cierre-nota">${escTarea(it.detalle)}</em>` : ""}
          </div>
          <div class="cierre-actions">
            <button type="button" class="btn btn-mini btn-mini-gold" data-visita-accion="hecho">Se hizo</button>
            <button type="button" class="btn btn-mini" data-visita-accion="pendiente">Quedó pendiente</button>
          </div>
        </article>`)).concat(prevs.map((it) => `
        <article class="cierre-card" data-tarea="${it.id}">
          <div>
            <b>${escTarea(it.nom)}</b>
            <small>Prevención · ${ganttFmt(it.fin)} · capacitación</small>
          </div>
          <div class="cierre-actions">
            <button type="button" class="btn btn-mini btn-mini-gold" data-tarea-accion="hecho">Se hizo</button>
            <button type="button" class="btn btn-mini" data-tarea-accion="pendiente">Quedó pendiente</button>
          </div>
        </article>`)).join("");
  return `
    <section class="cierre-board${cierreAbierto ? " abierto" : ""}" aria-label="Cierre del día">
      <button type="button" class="cierre-toggle" aria-expanded="${cierreAbierto ? "true" : "false"}">
        <p class="pizarra-titulo">Cierre del día</p>
        <span class="cierre-lado">
          ${n ? `<span class="cierre-badge">${n}</span>` : `<span class="cierre-cero">Al día</span>`}
          <span class="cierre-flecha" aria-hidden="true"></span>
        </span>
      </button>
      <div class="cierre-cuerpo"${cierreAbierto ? "" : " hidden"}>
      ${n ? `<div class="cierre-grid">${tarjetas}</div>` : ""}
      ${cerradasHoy.length ? `<p class="cierre-log">Marcadas hoy: ${cerradasHoy.map((c) => c.nom + " (" + c.estado.toLowerCase() + ")").join(" · ")}</p>` : ""}
      ${n ? "" : `<p class="cierre-log">No queda nada por marcar.</p>`}
      </div>
    </section>
    <div class="modal-bg" id="cierre-modal" hidden>
      <div class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h3 id="cierre-modal-title">Quedó pendiente</h3>
          <button class="btn btn-ghost" type="button" id="cierre-modal-x">Cerrar</button>
        </div>
        <p class="note">Indique la fecha de retoma. El trabajo permanece en el calendario y en la carta Gantt.</p>
        <input type="hidden" id="cierre-id" />
        <label for="cierre-prox">Retomar el</label>
        <input type="date" id="cierre-prox" />
        <label for="cierre-nota">Por qué quedó / qué falta</label>
        <input type="text" id="cierre-nota" placeholder="Ej. faltó pintura, visita se movió, no llegó el maestro" />
        <button class="btn btn-gold" type="button" id="cierre-ok" style="margin-top:14px">Dejar pendiente</button>
      </div>
    </div>`;
}

function ganttYearPct(iso) {
  const d = new Date(iso + "T12:00:00");
  const a = new Date(d.getFullYear(), 0, 1).getTime();
  const b = new Date(d.getFullYear(), 11, 31).getTime();
  return Math.max(0, Math.min(100, ((d.getTime() - a) / (b - a)) * 100));
}

function ganttFmt(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

function ramaGantt(it) {
  const texto = (String(it.grupo || "") + " " + String(it.nom || "") + " " + String(it.href || "")).toLowerCase();
  if (it.pilar !== "MG") return "";
  if (/prevenc/.test(texto)) return "Prevención";
  if (/predio|fosa|jardin|jardín|agua|graser/.test(texto)) return "Predio";
  if (/habit|baño|bano|puerta|pila|tv/.test(texto)) return "Habitaciones";
  return "Equipos";
}

function medidasGantt(it) {
  let left = ganttYearPct(it.ini);
  let right = ganttYearPct(it.fin);
  if (right < left) right = left;
  let width = Math.max(1.6, right - left);
  if (it.ini === it.fin) width = 1.8;
  const rango = it.ini === it.fin ? ganttFmt(it.ini) : ganttFmt(it.ini) + " – " + ganttFmt(it.fin);
  return { ...it, left, width, rango };
}

function filaGantt(f, hoyPct) {
  const tono = f.estado === "Hecho" ? "ok" : (f.estado === "Atrasada" || f.estado === "Pendiente" ? "warn" : "");
  return `<button type="button" class="gantt-row gantt-link" data-gantt="${escTarea(f.id)}">
    <div class="gantt-lab">
      <b>${escTarea(f.nom)}</b>
      <small>${f.lugar ? escTarea(f.lugar) + " · " : ""}${escTarea(f.quien || f.rango)}</small>
      <em class="gantt-est ${tono}">${escTarea(f.estado)}</em>
    </div>
    <div class="gantt-bar">
      <span class="gantt-hoy" style="left:${hoyPct}%"></span>
      <i style="left:${f.left}%;width:${f.width}%;background:${f.color}"></i>
    </div>
  </button>`;
}

function ejeGantt(meses, hoyPct) {
  return `<div class="gantt-axis"><span>Tarea</span><div>${meses.map((m) => `<i>${m}</i>`).join("")}<span class="gantt-hoy-eje" style="left:${hoyPct}%">Hoy</span></div></div>`;
}

function ganttAbierto(id) {
  return !!(window.GANTT_ABIERTO && window.GANTT_ABIERTO[id]);
}

function repintarGantt(ancla) {
  const id = ancla && ancla.getAttribute ? ancla.getAttribute("data-gantt-toggle") : "";
  const top = ancla && ancla.getBoundingClientRect ? ancla.getBoundingClientRect().top : null;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const html = ganttHTML();
  const board = document.querySelector(".gantt-board");
  if (board) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    if (tmp.firstElementChild) board.replaceWith(tmp.firstElementChild);
  } else {
    const host = document.getElementById("gantt-host");
    if (host) host.innerHTML = html;
  }
  if (!id || top == null) return;
  const sel = window.CSS && CSS.escape ? CSS.escape(id) : id;
  const nuevo = document.querySelector('[data-gantt-toggle="' + sel + '"]');
  if (!nuevo) return;
  const delta = nuevo.getBoundingClientRect().top - top;
  if (Math.abs(delta) > 1) window.scrollBy(0, delta);
}

function ganttHTML() {
  applyCierreToGantt();
  const colores = { MG: "#2a6f8a", ME: "#3a7d4c", RE: "#c4783a" };
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const hoyPct = ganttYearPct(hoyIso);
  const items = (typeof GANTT_OBRAS !== "undefined" ? GANTT_OBRAS : [])
    .concat(window.VISITAS_CARTA || [])
    .map((it) => medidasGantt({ ...it, color: colores[it.pilar] || "#2a6f8a", rama: ramaGantt(it) }))
    .sort((a, b) => String(a.ini).localeCompare(String(b.ini)));
  const pilares = [
    { id: "MG", nombre: "Mantención general", color: colores.MG, ramas: ["Equipos", "Predio", "Habitaciones", "Prevención"] },
    { id: "ME", nombre: "Mejoras", color: colores.ME, ramas: [] },
    { id: "RE", nombre: "Remodelaciones", color: colores.RE, ramas: [] }
  ];
  const bloqueFilas = (lista) => {
    const orden = lista.slice().sort((a, b) => {
      const ah = a.estado === "Hecho" ? 1 : 0;
      const bh = b.estado === "Hecho" ? 1 : 0;
      if (ah !== bh) return ah - bh;
      return String(b.ini).localeCompare(String(a.ini));
    });
    return orden.length
      ? ejeGantt(meses, hoyPct) + orden.map((f) => filaGantt(f, hoyPct)).join("")
      : `<p class="muted-mini">Nada en este grupo.</p>`;
  };
  const cuerpo = (p) => {
    const suyos = items.filter((it) => it.pilar === p.id);
    if (!p.ramas.length) return `<div class="gantt-cuerpo">${bloqueFilas(suyos)}</div>`;
    return `<div class="gantt-cuerpo">${p.ramas.map((rama) => {
      const id = p.id + ":" + rama;
      const lista = suyos.filter((it) => it.rama === rama);
      if (!lista.length) return "";
      const abierto = ganttAbierto(id);
      return `<section class="gantt-rama${abierto ? " abierto" : ""}">
        <button type="button" class="gantt-rama-btn" data-gantt-toggle="${escTarea(id)}">
          <b>${escTarea(rama)}</b><small>${lista.length}</small><span class="gantt-flecha"></span>
        </button>
        ${abierto ? bloqueFilas(lista) : ""}
      </section>`;
    }).join("")}</div>`;
  };
  return `
    <section class="gantt-board" aria-label="Carta Gantt" data-menu="gantt">
      <div class="agenda-head">
        <p class="pizarra-titulo">Carta Gantt</p>
        <span class="agenda-rango">Tres grupos · ábrelos para ver el detalle · la marca “Hoy” es el día de hoy</span>
      </div>
      <div class="gantt-legend">
        <span><i style="background:#2a6f8a"></i> Mantención</span>
        <span><i style="background:#3a7d4c"></i> Mejoras</span>
        <span><i style="background:#c4783a"></i> Remodelación</span>
        <span><i class="hoy-dot"></i> Hoy ${ganttFmt(hoyIso)}</span>
      </div>
      ${pilares.map((p) => {
        const n = items.filter((it) => it.pilar === p.id).length;
        const abierto = ganttAbierto(p.id);
        return `<section class="gantt-pilar${abierto ? " abierto" : ""}">
          <button type="button" class="gantt-pilar-btn" data-gantt-toggle="${p.id}">
            <i style="background:${p.color}"></i>
            <b>${p.nombre}</b>
            <small>${n}</small>
            <span class="gantt-flecha"></span>
          </button>
          ${abierto ? cuerpo(p) : ""}
        </section>`;
      }).join("")}
    </section>`;
}

function cartaAnioHTML(items, anio) {
  const anioN = Number(anio);
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const verHoy = hoy.getFullYear() === anioN;
  const hoyPct = verHoy ? ganttYearPct(hoyIso) : -1;
  const pct = (iso) => {
    const y = Number(String(iso).slice(0, 4));
    if (y < anioN) return 0;
    if (y > anioN) return 100;
    return ganttYearPct(iso);
  };
  const filas = (items || []).slice().sort((a, b) => String(a.ini).localeCompare(String(b.ini))).map((it) => {
    let left = pct(it.ini);
    let right = pct(it.fin);
    if (right < left) right = left;
    let width = Math.max(1.6, right - left);
    if (it.ini === it.fin) width = 1.8;
    const rango = it.ini === it.fin ? ganttFmt(it.ini) : ganttFmt(it.ini) + " – " + ganttFmt(it.fin);
    return { ...it, left, width, rango };
  });
  if (!filas.length) {
    return `<section class="gantt-board" aria-label="Plan del año"><div class="agenda-head"><p class="pizarra-titulo">Plan del año</p></div><p class="note">En ${anioN} no hay tareas de prevención con inicio y fin. Las que anotes en Crear aparecen acá.</p></section>`;
  }
  return `
    <section class="gantt-board" aria-label="Plan del año">
      <div class="agenda-head">
        <p class="pizarra-titulo">Plan del año</p>
        <span class="agenda-rango">Año ${anioN} · la barra es el periodo · clic muestra el detalle</span>
      </div>
      <div class="gantt-legend">
        <span><i style="background:#2a6f8a"></i> Prevención</span>
        ${verHoy ? `<span><i class="hoy-dot"></i> Hoy ${ganttFmt(hoyIso)}</span>` : ""}
      </div>
      <div class="gantt-axis"><span>Tarea</span><div>${meses.map((m) => `<i>${m}</i>`).join("")}</div></div>
      ${filas.map((f) => `
        <button type="button" class="gantt-row gantt-link" data-plan="${escTarea(f.id)}">
          <div class="gantt-lab">
            <b>${escTarea(f.nom)}</b>
            <small>${escTarea(f.rango)}</small>
            <em class="gantt-est ${f.estado === "Hecho" ? "ok" : (f.estado === "Atrasada" || f.estado === "Pendiente" ? "warn" : "")}">${escTarea(f.estado)}</em>
          </div>
          <div class="gantt-bar">
            ${verHoy ? `<span class="gantt-hoy" style="left:${hoyPct}%"></span>` : ""}
            <i style="left:${f.left}%;width:${f.width}%;background:#2a6f8a"></i>
          </div>
        </button>`).join("")}
    </section>`;
}

function bindCierre() {
  const board = document.querySelector(".cierre-board");
  const modal = document.getElementById("cierre-modal");
  if (!board) return;
  const toggle = board.querySelector(".cierre-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      cierreAbierto = !cierreAbierto;
      const cuerpo = board.querySelector(".cierre-cuerpo");
      board.classList.toggle("abierto", cierreAbierto);
      if (cuerpo) cuerpo.hidden = !cierreAbierto;
      toggle.setAttribute("aria-expanded", cierreAbierto ? "true" : "false");
    });
  }
  board.addEventListener("click", (ev) => {
    const tbtn = ev.target.closest("[data-tarea-accion]");
    if (tbtn) {
      const tcard = tbtn.closest("[data-tarea]");
      const tid = tcard && tcard.getAttribute("data-tarea");
      if (!tid) return;
      if (tbtn.getAttribute("data-tarea-accion") === "hecho") {
        cerrarTarea(tid, "hecha", {});
        return;
      }
      if (!modal) return;
      modal.dataset.modo = "tarea";
      document.getElementById("cierre-id").value = tid;
      document.getElementById("cierre-prox").value = isoMasDias(hoyISO(), 1);
      document.getElementById("cierre-nota").value = "";
      modal.hidden = false;
      return;
    }
    const vbtn = ev.target.closest("[data-visita-accion]");
    if (vbtn) {
      const vcard = vbtn.closest("[data-visita]");
      const vid = vcard && vcard.getAttribute("data-visita");
      if (!vid) return;
      if (vbtn.getAttribute("data-visita-accion") === "hecho") {
        cerrarVisita(vid, "terminada", {});
        return;
      }
      if (!modal) return;
      modal.dataset.modo = "visita";
      document.getElementById("cierre-id").value = vid;
      document.getElementById("cierre-prox").value = isoMasDias(hoyISO(), 1);
      document.getElementById("cierre-nota").value = "";
      modal.hidden = false;
      return;
    }
    const btn = ev.target.closest("[data-cierre]");
    if (!btn) return;
    const card = btn.closest("[data-id]");
    const id = card && card.getAttribute("data-id");
    if (!id) return;
    if (btn.getAttribute("data-cierre") === "hecho") {
      registrarCierre(id, "Hecho", {});
      return;
    }
    if (!modal) return;
    modal.dataset.modo = "gantt";
    document.getElementById("cierre-id").value = id;
    document.getElementById("cierre-prox").value = isoMasDias(hoyISO(), 1);
    document.getElementById("cierre-nota").value = "";
    modal.hidden = false;
  });
  if (!modal || modal.dataset.bound) return;
  modal.dataset.bound = "1";
  document.getElementById("cierre-modal-x").onclick = () => { modal.hidden = true; };
  modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });
  document.getElementById("cierre-ok").onclick = () => {
    const id = document.getElementById("cierre-id").value;
    const proxima = document.getElementById("cierre-prox").value || isoMasDias(hoyISO(), 1);
    const nota = document.getElementById("cierre-nota").value.trim();
    const modo = modal.dataset.modo || "gantt";
    modal.hidden = true;
    if (modo === "visita") cerrarVisita(id, "por_hacer", { proxima, nota });
    else if (modo === "tarea") cerrarTarea(id, "pendiente", { proxima, nota });
    else registrarCierre(id, "Pendiente", { proxima, nota });
  };
}

function escTarea(val) {
  return String(val == null ? "" : val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function fechaLinda(iso) {
  const s = String(iso || "");
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return s || "—";
  const d = new Date(s.slice(0, 10) + "T12:00:00");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

function asegurarModalTarea() {
  let modal = document.getElementById("tarea-modal");
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "modal-bg";
  modal.id = "tarea-modal";
  modal.hidden = true;
  modal.innerHTML =
    '<div class="modal-card" role="dialog" aria-modal="true">' +
    '<div class="modal-head"><h3 id="tarea-titulo">Detalle</h3>' +
    '<button class="btn btn-ghost" type="button" id="tarea-x">Cerrar</button></div>' +
    '<div id="tarea-cuerpo"></div></div>';
  document.body.appendChild(modal);
  modal.querySelector("#tarea-x").onclick = () => { modal.hidden = true; };
  modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });
  return modal;
}

function mostrarDetalle(titulo, cuerpo) {
  const modal = asegurarModalTarea();
  modal.querySelector("#tarea-titulo").textContent = titulo;
  modal.querySelector("#tarea-cuerpo").innerHTML = cuerpo;
  modal.hidden = false;
}

function abrirDetalleGantt(id) {
  const vis = (window.VISITAS_CARTA || []).find((x) => x.id === id);
  if (vis) {
    mostrarDetalle(vis.nom, `
      <dl class="ficha-dl">
        <div><dt>Equipo o punto</dt><dd>${escTarea(vis.nom)}</dd></div>
        <div><dt>Dónde</dt><dd>${escTarea(vis.lugar || "Sin lugar anotado")}</dd></div>
        <div><dt>Quién</dt><dd>${escTarea(vis.quien || "Sin nombre")}</dd></div>
        <div><dt>Fecha</dt><dd>${escTarea(fechaLinda(vis.ini))}</dd></div>
        <div><dt>Estado</dt><dd>${escTarea(vis.estado)}</dd></div>
        <div><dt>Trabajo</dt><dd>${escTarea(vis.detalle || "Sin detalle")}</dd></div>
      </dl>
      <p class="muted-mini">Es la mantención anotada en Crear. Desde el calendario se ve el mismo día.</p>`);
    return;
  }
  if (typeof GANTT_OBRAS === "undefined") return;
  applyCierreToGantt();
  const it = GANTT_OBRAS.find((x) => x.id === id);
  if (!it) return;
  const area = { MG: "Mantención general", ME: "Mejoras", RE: "Remodelación" }[it.pilar] || it.pilar;
  const rango = it.ini === it.fin ? fechaLinda(it.ini) : fechaLinda(it.ini) + " – " + fechaLinda(it.fin);
  const cierre = loadCierre()[id];
  mostrarDetalle(it.nom, `
    <dl class="ficha-dl">
      <div><dt>Área</dt><dd>${escTarea(area)}</dd></div>
      <div><dt>Periodo</dt><dd>${escTarea(rango)}</dd></div>
      <div><dt>Estado</dt><dd>${escTarea(it.estado || "—")}</dd></div>
      ${cierre && cierre.nota ? `<div><dt>Cierre</dt><dd>${escTarea(cierre.nota)}</dd></div>` : ""}
      ${cierre && cierre.proxima ? `<div><dt>Retoma</dt><dd>${escTarea(fechaLinda(cierre.proxima))}</dd></div>` : ""}
      <div><dt>Dónde seguir</dt><dd><a href="${escTarea(it.href)}">${escTarea(it.href.indexOf("zona") >= 0 ? "La zona de la obra" : it.href.indexOf("fosas") >= 0 ? "El predio" : it.href.indexOf("mejoras") >= 0 ? "Mejoras" : "La ficha del equipo")}</a></dd></div>
    </dl>
    <p class="muted-mini">Es una barra del plan del hotel. Quién la hizo y la habitación salen cuando la barra es una mantención creada en Crear.</p>`);
}

function abrirDetalleAgenda(it) {
  if (!it) return;
  const visitas = (it.visitas || []).slice(0, 6);
  const hist = visitas.length
    ? `<h4 class="mini-h">Últimas visitas</h4>
      <table class="data hist"><thead><tr><th>Fecha</th><th>Tipo</th><th>Quién</th><th>Trabajo</th></tr></thead><tbody>
      ${visitas.map((v) => `<tr>
        <td>${escTarea(fechaLinda(v.fecha))}</td>
        <td>${escTarea(v.tipo || "—")}</td>
        <td>${escTarea(v.quien || "—")}</td>
        <td>${escTarea(v.detalle || "—")}</td>
      </tr>`).join("")}
      </tbody></table>`
    : `<p class="muted-mini">Todavía no hay visitas anotadas para esta tarea.</p>`;
  mostrarDetalle(it.nombre, `
    <dl class="ficha-dl">
      <div><dt>Grupo</dt><dd>${escTarea(it.grupo || "—")}${it.tipo ? " · " + escTarea(it.tipo) : ""}</dd></div>
      <div><dt>Lugar</dt><dd>${escTarea(it.lugar || "—")}</dd></div>
      <div><dt>${it.motivo === "por_hacer" ? "Por hacerse" : "Próxima visita"}</dt><dd>${escTarea(fechaLinda(it.fecha))}</dd></div>
    </dl>
    ${it.id === "jardin-temp" ? '<p class="muted-mini"><a href="jardin.html">Abrir las faenas de jardín</a></p>' : ""}
    ${hist}`);
}

function bindDetalleTarea() {
  if (document.body.dataset.detalleTarea) return;
  document.body.dataset.detalleTarea = "1";
  document.addEventListener("click", (ev) => {
    const tog = ev.target.closest("[data-gantt-toggle]");
    if (tog) {
      ev.preventDefault();
      const id = tog.getAttribute("data-gantt-toggle");
      window.GANTT_ABIERTO = window.GANTT_ABIERTO || {};
      window.GANTT_ABIERTO[id] = !window.GANTT_ABIERTO[id];
      repintarGantt(tog);
      return;
    }
    const gantt = ev.target.closest("[data-gantt]");
    if (gantt) {
      ev.preventDefault();
      abrirDetalleGantt(gantt.getAttribute("data-gantt"));
      return;
    }
    const plan = ev.target.closest("[data-plan]");
    if (plan) {
      ev.preventDefault();
      const it = window.PLAN_PREV && window.PLAN_PREV[plan.getAttribute("data-plan")];
      if (!it) return;
      const rango = it.ini === it.fin ? fechaLinda(it.ini) : fechaLinda(it.ini) + " – " + fechaLinda(it.fin);
      mostrarDetalle(it.nom, `
        <dl class="ficha-dl">
          <div><dt>Periodo</dt><dd>${escTarea(rango)}</dd></div>
          <div><dt>Estado</dt><dd>${escTarea(it.estado || "—")}</dd></div>
          <div><dt>Quién</dt><dd>${escTarea(it.quien || "—")}</dd></div>
        </dl>
        <p class="muted-mini"><a href="prevencion.html">Abrir la lista de prevención</a></p>`);
      return;
    }
    const agenda = ev.target.closest("[data-agenda]");
    if (!agenda) return;
    ev.preventDefault();
    const clave = agenda.getAttribute("data-agenda");
    const it = window.DETALLE_TAREA && window.DETALLE_TAREA[clave];
    abrirDetalleAgenda(it);
  });
}

function renderAgenda() {
  const host = document.getElementById("agenda-host");
  if (!host) return;
  applyCierreToGantt();
  const carta = typeof opcionVisible !== "function" || opcionVisible("gantt");
  host.innerHTML = pizarraHTML() + (carta ? cierreHTML() + ganttHTML() : "");
  if (carta) bindCierre();
  if (typeof aplicarMenus === "function") aplicarMenus();
}

function bindMenu() {
  const btn = document.querySelector(".menu-barras");
  const panel = document.querySelector(".menu-panel");
  if (!btn || !panel) return;
  btn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const abrir = panel.hidden;
    panel.hidden = !abrir;
    btn.setAttribute("aria-expanded", abrir ? "true" : "false");
  });
  panel.addEventListener("click", (ev) => ev.stopPropagation());
  document.addEventListener("click", () => {
    panel.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  });
}

function mount(crumbs, opts) {
  const host = document.getElementById("shell");
  if (!host) return;
  const sesion = getSesion();
  if (!sesion || !sesion.id) {
    const dest = location.pathname.includes("/vistas/") ? "../index.html" : "index.html";
    window.location.href = dest;
    return;
  }
  if (!puedeVerPagina()) {
    window.location.href = "inicio.html";
    return;
  }
  registrarVista();
  applyCierreToGantt();
  host.insertAdjacentHTML("afterbegin", headerHTML(sesion, crumbs) + crumbHTML(crumbs));
  bindMenu();
  bindRegresar();
  bindDetalleTarea();
  if (opts && opts.agenda) {
    host.insertAdjacentHTML("beforeend", '<div id="agenda-host"></div>');
    renderAgenda();
    cargarCierres()
      .then(() => cargarVisitasCarta())
      .then(() => {
        renderAgenda();
        if (typeof pintarAvisosEnInicio === "function") return pintarAvisosEnInicio();
      })
      .catch((err) => {
        if (window.cuadro) cuadro("No se leyeron los cierres", err.message || "La base no respondió.");
      });
  }
  aplicarMenus();
  bindMontos();
}

function leerMonto(valor) {
  const limpio = String(valor == null ? "" : valor).replace(/\D/g, "");
  if (!limpio) return null;
  return Number(limpio);
}

function textoMonto(valor) {
  const n = leerMonto(valor);
  if (n == null) return "";
  return n.toLocaleString("es-CL");
}

function formatearCampoMonto(input) {
  const antes = input.selectionStart;
  const digitosAntes = String(input.value.slice(0, antes == null ? input.value.length : antes)).replace(/\D/g, "").length;
  const siguiente = textoMonto(input.value);
  if (input.value === siguiente) return;
  input.value = siguiente;
  if (antes == null || document.activeElement !== input || !input.setSelectionRange) return;
  let vistos = 0;
  let pos = siguiente.length;
  for (let i = 0; i < siguiente.length; i++) {
    if (/\d/.test(siguiente[i])) vistos++;
    if (vistos >= digitosAntes) {
      pos = i + 1;
      break;
    }
  }
  if (!digitosAntes) pos = 0;
  input.setSelectionRange(pos, pos);
}

function bindMontos(raiz) {
  const base = raiz && raiz.querySelectorAll ? raiz : document;
  base.querySelectorAll("[data-monto]").forEach((input) => {
    if (input.value) formatearCampoMonto(input);
  });
}

document.addEventListener("input", (ev) => {
  const input = ev.target;
  if (!input || !input.matches || !input.matches("[data-monto]")) return;
  formatearCampoMonto(input);
});

window.leerMonto = leerMonto;
window.textoMonto = textoMonto;
window.bindMontos = bindMontos;

async function login() {
  const u = document.getElementById("u");
  const p = document.getElementById("p");
  const err = document.getElementById("err");
  const btn = document.getElementById("btn-login");
  err.textContent = "";
  if (!u.value.trim() || !p.value.trim()) {
    err.textContent = "Usuario y contraseña son obligatorios.";
    return;
  }
  if (!window.db) {
    err.textContent = "No hay conexión a la base de datos.";
    return;
  }
  const carga = document.getElementById("carga");
  const t0 = Date.now();
  if (carga) carga.hidden = false;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Validando…";
  }
  const soltar = () => {
    if (carga) carga.hidden = true;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Iniciar sesión";
    }
  };
  try {
    const { data, error } = await db.rpc("login_usuario", {
      p_login: u.value.trim(),
      p_clave: p.value
    });
    if (error) {
      err.textContent = error.message;
      soltar();
      return;
    }
    const res = typeof data === "string" ? JSON.parse(data) : data;
    if (!res || !res.ok) {
      err.textContent = (res && res.error) || "Usuario o contraseña incorrectos.";
      soltar();
      return;
    }
    sessionStorage.setItem("SESION", JSON.stringify({
      id: res.id,
      nombre: res.nombre,
      correo: res.correo,
      login: res.login,
      rol: res.rol,
      rol_nombre: res.rol_nombre || ""
    }));
    sessionStorage.setItem("rol", res.rol === "admin" ? "admin" : "user");
    await guardarPermisos(res.rol);
    sessionStorage.setItem("AVISO_ENTRADA", "1");
    const espera = 2600 - (Date.now() - t0);
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    window.location.href = "vistas/inicio.html";
  } catch (e) {
    err.textContent = "No se pudo validar el acceso.";
    console.error(e);
    soltar();
  }
}

function togglePass() {
  const p = document.getElementById("p");
  const btn = document.getElementById("btn-pass");
  if (!p) return;
  const show = p.type === "password";
  p.type = show ? "text" : "password";
  if (btn) {
    btn.textContent = show ? "Ocultar" : "Ver";
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
  }
}

function clp(n) {
  return "$" + Number(n).toLocaleString("es-CL");
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function avisoMal(titulo) {
  const t = String(titulo || "").trim().toLowerCase();
  return /^(no se|no hay|falta|revisa|error|fechas invertidas|nada que)/.test(t);
}

function cuadro(titulo, texto) {
  let modal = document.getElementById("aviso-resultado");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal-bg";
    modal.id = "aviso-resultado";
    modal.innerHTML =
      '<div class="modal-card modal-angosta" role="dialog" aria-modal="true">' +
      '<div class="aviso-marca" id="aviso-resultado-marca" aria-hidden="true"></div>' +
      '<div class="modal-head"><h3 id="aviso-resultado-tit">Listo</h3>' +
      '<button class="btn btn-ghost" type="button" id="aviso-resultado-x">Cerrar</button></div>' +
      '<p id="aviso-resultado-txt"></p></div>';
    document.body.appendChild(modal);
    modal.querySelector("#aviso-resultado-x").onclick = () => { modal.hidden = true; };
    modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.hidden = true; });
  }
  const mal = avisoMal(titulo);
  const card = modal.querySelector(".modal-card");
  card.classList.toggle("aviso-ok", !mal);
  card.classList.toggle("aviso-mal", mal);
  const marca = modal.querySelector("#aviso-resultado-marca");
  marca.className = "aviso-marca " + (mal ? "mal" : "ok");
  marca.textContent = mal ? "✕" : "✓";
  modal.querySelector("#aviso-resultado-tit").textContent = titulo;
  modal.querySelector("#aviso-resultado-txt").textContent = texto;
  modal.hidden = false;
}
window.cuadro = cuadro;
window.cartaAnioHTML = cartaAnioHTML;
window.cargarCierres = cargarCierres;
