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
      <div><small>Obras · Mantención · Mejora</small></div>
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
  const posits = [
    { color: "rosa", cuando: "Hoy", texto: "Hab. 107 — tapa WC. Stock: 2 en bodega.", href: "reactivas.html" },
    { color: "amarillo", cuando: "Quedan 3 días", texto: "Tratamiento de agua potable (fosa / pozo).", href: "fosas.html" },
    { color: "verde", cuando: "En 5 días", texto: "Pintar reja de acceso — plan anual de obras.", href: "mejoras.html" },
    { color: "azul", cuando: "Comprar", texto: "Silicona sanitaria: stock 0. Pedir a Easy.", href: "bodega-insumos.html" },
    { color: "lila", cuando: "Semestre", texto: "Caldera hotel — próxima visita externa.", href: "maquinas.html" }
  ];
  return `
    <section class="pizarra" aria-label="Pizarra: lo que viene">
      <p class="pizarra-titulo">Pizarra · lo que viene</p>
      <div class="posits">
        ${posits.map((p) => `
          <a class="posit ${p.color}" href="${p.href}">
            <span class="cuando">${p.cuando}</span>
            <p>${p.texto}</p>
          </a>`).join("")}
      </div>
    </section>`;
}

function mount(crumbs) {
  const rol = sessionStorage.getItem("rol") || "admin";
  const host = document.getElementById("shell");
  if (!host) return;
  host.insertAdjacentHTML("afterbegin", headerHTML(rol, crumbs) + pizarraHTML() + crumbHTML(crumbs));
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
