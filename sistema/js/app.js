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

function headerHTML(rol, crumbs) {
  const who = rol === "user"
    ? "<b>Equipo mantención</b>Usuario"
    : "<b>Andrés Cordero</b>Administrador";
  const back = crumbs && crumbs.length > 1
    ? `<a class="btn btn-back" href="${crumbs[crumbs.length - 2].href}">← Regresar</a>`
    : "";
  return `
    <header class="topbar">
      <div class="logo-wrap">${LOGO}</div>
      <div class="brand-line"><small>Obras · Mantención · Mejora</small></div>
      ${back}
      <div class="spacer"></div>
      <div class="who">${who}</div>
      <a class="btn" href="../index.html">Salir</a>
    </header>`;
}

function crumbHTML(items) {
  const back = items && items.length > 1
    ? `<a class="btn btn-back" href="${items[items.length - 2].href}">← Regresar</a>`
    : "";
  const trail = items.map((x, i) =>
    i === items.length - 1 ? x.label : `<a href="${x.href}">${x.label}</a> ▸ `
  ).join("");
  return `<nav class="crumb">${back}<span class="crumb-trail">${trail}</span></nav>`;
}

function pizarraHTML() {
  const dias = [
    { color: "rosa", dow: "Mar", dia: "29", cuando: "Hoy", texto: "Hab. 107 — tapa WC. Stock: 2 en bodega.", href: "reactivas.html" },
    { color: "amarillo", dow: "Vie", dia: "2", cuando: "3 días", texto: "Tratamiento de agua potable (fosa / pozo).", href: "fosas.html" },
    { color: "verde", dow: "Dom", dia: "4", cuando: "5 días", texto: "Pintar reja de acceso — plan anual.", href: "mejoras.html" },
    { color: "azul", dow: "Pend.", dia: "!", cuando: "Comprar", texto: "Silicona sanitaria: stock 0.", href: "bodega-insumos.html" },
    { color: "lila", dow: "Oct", dia: "12", cuando: "Semestre", texto: "Caldera hotel — visita externa.", href: "maquinas.html" }
  ];
  return `
    <section class="pizarra" aria-label="Calendario: lo que viene">
      <div class="agenda-head">
        <p class="pizarra-titulo">Calendario</p>
        <span class="agenda-rango">Lo que viene · semana del 29 de septiembre</span>
      </div>
      <div class="posits">
        ${dias.map((p) => `
          <a class="posit ${p.color}" href="${p.href}">
            <span class="cal-date"><b>${p.dia}</b>${p.dow}</span>
            <span class="cuando">${p.cuando}</span>
            <p>${p.texto}</p>
          </a>`).join("")}
      </div>
    </section>`;
}

function ganttHTML() {
  const filas = [
    { nom: "Caldera (MG)", left: "18%", width: "8%", color: "#2a6f8a" },
    { nom: "Agua potable (MG)", left: "0%", width: "100%", color: "rgba(58,125,76,.45)" },
    { nom: "Poda de altura (ME)", left: "52%", width: "8%", color: "#3a7d4c" },
    { nom: "Reja de acceso (ME)", left: "68%", width: "10%", color: "#c4783a" },
    { nom: "Hab. 107 (RE)", left: "70%", width: "6%", color: "#c4783a" },
    { nom: "Hab. 201 (RE)", left: "74%", width: "12%", color: "#c4783a" }
  ];
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `
    <section class="gantt-board" aria-label="Carta Gantt">
      <div class="agenda-head">
        <p class="pizarra-titulo">Carta Gantt</p>
        <span class="agenda-rango">Año 2026 · azul MG · verde ME · naranjo RE</span>
      </div>
      <div class="gantt-axis"><span></span><div>${meses.map((m) => `<i>${m}</i>`).join("")}</div></div>
      ${filas.map((f) => `
        <div class="gantt-row">
          <b>${f.nom}</b>
          <div class="gantt-bar"><i style="left:${f.left};width:${f.width};background:${f.color}"></i></div>
        </div>`).join("")}
    </section>`;
}

function mount(crumbs, opts) {
  const rol = sessionStorage.getItem("rol") || "admin";
  const host = document.getElementById("shell");
  if (!host) return;
  host.insertAdjacentHTML("afterbegin", headerHTML(rol, crumbs) + crumbHTML(crumbs));
  if (opts && opts.agenda) {
    host.insertAdjacentHTML("beforeend", pizarraHTML() + ganttHTML());
  }
}

function login(rol) {
  const u = document.getElementById("u");
  const p = document.getElementById("p");
  if (!u.value.trim() || !p.value.trim()) {
    document.getElementById("err").textContent = "Correo/usuario y contraseña son obligatorios.";
    return;
  }
  sessionStorage.setItem("rol", rol);
  window.location.href = "vistas/inicio.html";
}

function togglePass() {
  const p = document.getElementById("p");
  p.type = p.type === "password" ? "text" : "password";
}

function clp(n) {
  return "$" + Number(n).toLocaleString("es-CL");
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
