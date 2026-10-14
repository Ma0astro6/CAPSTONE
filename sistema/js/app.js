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

function applyCierreToGantt() {
  if (typeof GANTT_OBRAS === "undefined") return;
  const map = loadCierre();
  GANTT_OBRAS.forEach((it) => {
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

function necesitaCierre(it, hoy) {
  if (!it || it.estado === "Hecho") return false;
  if (it.estado === "Pendiente" || it.estado === "Atrasada" || it.estado === "Por cerrar") return true;
  if (it.fin && it.fin < hoy) return true;
  if (it.ini === hoy || it.fin === hoy) return true;
  return false;
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
  const dias = calTarjetas(hoy);
  const etiqueta = new Date(hoy + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  return `
    <section class="pizarra" aria-label="Calendario: lo que viene">
      <div class="agenda-head">
        <p class="pizarra-titulo">Calendario</p>
        <span class="agenda-rango">Hoy ${etiqueta} · lo abierto y lo que viene</span>
      </div>
      <div class="posits">
        ${dias.map((p) => `
          <a class="posit ${p.color}" href="${p.href}">
            <span class="cal-date"><b>${p.dia}</b>${p.dow}</span>
            <span class="cuando">${p.cuando}</span>
            <p>${p.nom}${p.notaCierre ? " · " + p.notaCierre : ""}</p>
          </a>`).join("")}
      </div>
    </section>`;
}

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
  return `
    <section class="cierre-board" aria-label="Cierre del día">
      <div class="agenda-head">
        <p class="pizarra-titulo">Cierre del día</p>
      </div>
      ${abiertas.length ? `<div class="cierre-grid">${abiertas.map((it) => `
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
        </article>`).join("")}</div>` : ""}
      ${cerradasHoy.length ? `<p class="cierre-log">Marcadas hoy: ${cerradasHoy.map((c) => c.nom + " (" + c.estado.toLowerCase() + ")").join(" · ")}</p>` : ""}
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

function ganttHTML() {
  applyCierreToGantt();
  const items = (typeof GANTT_OBRAS !== "undefined" ? GANTT_OBRAS : []).slice().sort((a, b) => a.ini.localeCompare(b.ini));
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const colores = { MG: "#2a6f8a", ME: "#3a7d4c", RE: "#c4783a" };
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const hoyPct = ganttYearPct(hoyIso);
  const filas = items.map((it) => {
    let left = ganttYearPct(it.ini);
    let right = ganttYearPct(it.fin);
    if (right < left) right = left;
    let width = Math.max(1.6, right - left);
    if (it.ini === it.fin) width = 1.8;
    const rango = it.ini === it.fin ? ganttFmt(it.ini) : ganttFmt(it.ini) + " – " + ganttFmt(it.fin);
    return { ...it, left, width, rango, color: colores[it.pilar] || "#2a6f8a" };
  });
  return `
    <section class="gantt-board" aria-label="Carta Gantt">
      <div class="agenda-head">
        <p class="pizarra-titulo">Carta Gantt</p>
        <span class="agenda-rango">Año 2026 · la barra es el periodo · la línea oro es hoy · clic abre la ficha</span>
      </div>
      <div class="gantt-legend">
        <span><i style="background:#2a6f8a"></i> MG mantención</span>
        <span><i style="background:#3a7d4c"></i> ME mejoras</span>
        <span><i style="background:#c4783a"></i> RE remodelación</span>
        <span><i class="hoy-dot"></i> Hoy ${ganttFmt(hoyIso)}</span>
      </div>
      <div class="gantt-axis"><span>Tarea</span><div>${meses.map((m) => `<i>${m}</i>`).join("")}</div></div>
      ${filas.map((f) => `
        <a class="gantt-row gantt-link" href="${f.href}">
          <div class="gantt-lab">
            <b>${f.nom}</b>
            <small>${f.pilar} · ${f.rango}</small>
            <em class="gantt-est ${f.estado === "Hecho" ? "ok" : (f.estado === "Atrasada" || f.estado === "Pendiente" ? "warn" : "")}">${f.estado}</em>
          </div>
          <div class="gantt-bar">
            <span class="gantt-hoy" style="left:${hoyPct}%"></span>
            <i style="left:${f.left}%;width:${f.width}%;background:${f.color}"></i>
          </div>
        </a>`).join("")}
    </section>`;
}

function registrarCierre(id, estado, extra) {
  const map = loadCierre();
  map[id] = {
    estado,
    fecha: hoyISO(),
    nota: (extra && extra.nota) || "",
    proxima: (extra && extra.proxima) || ""
  };
  saveCierre(map);
  renderAgenda();
}

function bindCierre() {
  const board = document.querySelector(".cierre-board");
  const modal = document.getElementById("cierre-modal");
  if (!board) return;
  board.addEventListener("click", (ev) => {
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
    modal.hidden = true;
    registrarCierre(id, "Pendiente", { proxima, nota });
  };
}

function renderAgenda() {
  const host = document.getElementById("agenda-host");
  if (!host) return;
  applyCierreToGantt();
  host.innerHTML = pizarraHTML() + cierreHTML() + ganttHTML();
  bindCierre();
}

function mount(crumbs, opts) {
  const rol = sessionStorage.getItem("rol") || "admin";
  const host = document.getElementById("shell");
  if (!host) return;
  applyCierreToGantt();
  host.insertAdjacentHTML("afterbegin", headerHTML(rol, crumbs) + crumbHTML(crumbs));
  if (opts && opts.agenda) {
    host.insertAdjacentHTML("beforeend", '<div id="agenda-host"></div>');
    renderAgenda();
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
