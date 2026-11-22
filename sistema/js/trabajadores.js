(function () {
  const root = document.getElementById("trab-root");
  if (!root) return;

  let gente = [];
  let entregas = [];
  let charlas = [];
  let archivos = [];
  let proveedores = [];
  let elegido = null;
  let filtro = "";
  let quitando = null;

  function esc(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function fechaLinda(iso) {
    const s = String(iso || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
    return new Date(s + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
  }

  function hoy() {
    const t = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
  }

  function aviso(titulo, texto) {
    if (window.cuadro) cuadro(titulo, texto);
  }

  function de(lista, id) {
    return lista.filter((x) => x.trabajador_id === id);
  }

  function empresa(t) {
    const p = proveedores.find((x) => x.id === t.proveedor_id);
    return p ? p.nombre : "";
  }

  function visibles() {
    const q = filtro.trim().toLowerCase();
    return gente.filter((t) => {
      if (!q) return true;
      return (t.nombre + " " + empresa(t)).toLowerCase().includes(q);
    });
  }

  async function cargar() {
    const [tr, en, ch, ar, pr] = await Promise.all([
      window.db.from("trabajador").select("id, nombre, tipo, proveedor_id, activo").order("nombre"),
      window.db.from("entrega").select("id, trabajador_id, clase, item, fecha, cantidad, nota").order("fecha", { ascending: false }),
      window.db.from("charla").select("id, trabajador_id, fecha, tema, asistio").order("fecha", { ascending: false }),
      window.db.from("archivo_trabajador").select("id, trabajador_id, nombre, ruta, creado_en").order("creado_en", { ascending: false }),
      window.db.from("proveedor").select("id, nombre").order("nombre")
    ]);
    if (tr.error) throw new Error(tr.error.message);
    if (en.error) throw new Error(en.error.message);
    if (ch.error) throw new Error(ch.error.message);
    if (ar.error) throw new Error(ar.error.message);
    if (pr.error) throw new Error(pr.error.message);
    gente = tr.data || [];
    entregas = en.data || [];
    charlas = ch.data || [];
    archivos = ar.data || [];
    proveedores = pr.data || [];
    if (elegido && !gente.some((t) => t.id === elegido)) elegido = null;
  }

  function pintarLista() {
    const lista = visibles();
    if (!lista.length) return '<p class="dia-vacio">Nadie coincide con la búsqueda.</p>';
    return lista.map((t) => {
      const n = de(entregas, t.id).length + de(charlas, t.id).length + de(archivos, t.id).length;
      const tipo = t.tipo === "externo" ? "Externo" : "Interno";
      const extra = empresa(t) ? " · " + esc(empresa(t)) : "";
      const baja = t.activo ? "" : " · inactivo";
      return '<button type="button" class="trab-persona' + (t.id === elegido ? " on" : "") + '" data-id="' + t.id + '">' +
        "<b>" + esc(t.nombre) + "</b><small>" + tipo + extra + baja + " · " + n + " anotaciones</small></button>";
    }).join("");
  }

  function filasEntrega(id) {
    const rows = de(entregas, id);
    if (!rows.length) return '<p class="dia-vacio">Sin entregas.</p>';
    return rows.map((r) =>
      '<div class="trab-fila"><div><b>' + esc(r.item) + "</b><small>" +
      (r.clase === "ropa" ? "Ropa" : "EPP") + " · " + fechaLinda(r.fecha) + " · " + r.cantidad +
      (r.nota ? " · " + esc(r.nota) : "") + "</small></div>" +
      '<button type="button" class="btn btn-ghost" data-quitar="entrega" data-qid="' + r.id + '">Quitar</button></div>'
    ).join("");
  }

  function filasCharla(id) {
    const rows = de(charlas, id);
    if (!rows.length) return '<p class="dia-vacio">Sin charlas.</p>';
    return rows.map((r) =>
      '<div class="trab-fila"><div><b>' + esc(r.tema) + "</b><small>" + fechaLinda(r.fecha) +
      (r.asistio ? " · asistió" : " · no asistió") + "</small></div>" +
      '<button type="button" class="btn btn-ghost" data-quitar="charla" data-qid="' + r.id + '">Quitar</button></div>'
    ).join("");
  }

  function urlArchivo(ruta) {
    const pub = window.db.storage.from("trabajadores").getPublicUrl(ruta);
    return pub && pub.data ? pub.data.publicUrl : "";
  }

  function filasArchivo(id) {
    const rows = de(archivos, id);
    if (!rows.length) return '<p class="dia-vacio">Sin papeles.</p>';
    return rows.map((r) =>
      '<div class="trab-fila"><div><b><a href="' + esc(urlArchivo(r.ruta)) + '" target="_blank" rel="noopener">' +
      esc(r.nombre) + "</a></b><small>" + fechaLinda(r.creado_en) + "</small></div>" +
      '<button type="button" class="btn btn-ghost" data-quitar="archivo" data-qid="' + r.id + '">Quitar</button></div>'
    ).join("");
  }

  function pintarFicha() {
    const t = gente.find((x) => x.id === elegido);
    if (!t) return '<p class="note">Elige a una persona de la lista. Si todavía no está, agrégala.</p>';
    const ops = proveedores.map((p) =>
      '<option value="' + p.id + '"' + (p.id === t.proveedor_id ? " selected" : "") + ">" + esc(p.nombre) + "</option>"
    ).join("");
    return '<header class="modal-head"><h3>' + esc(t.nombre) + "</h3></header>" +
      '<section class="trab-bloque">' +
      "<h3>Datos</h3>" +
      '<p class="muted-mini">Solo tipo, empresa y si sigue en el hotel. No anota entregas ni sube archivos.</p>' +
      '<div class="form-grid">' +
      '<div><label>Tipo</label><select id="ficha-tipo"><option value="interno"' + (t.tipo === "interno" ? " selected" : "") + '>Interno</option><option value="externo"' + (t.tipo === "externo" ? " selected" : "") + ">Externo</option></select></div>" +
      '<div><label>Empresa</label><select id="ficha-empresa"><option value="">Sin empresa</option>' + ops + "</select></div>" +
      "</div>" +
      '<label class="muted-mini"><input id="ficha-activo" type="checkbox"' + (t.activo ? " checked" : "") + "> Sigue en el hotel</label>" +
      '<button class="btn" type="button" id="ficha-guardar" style="margin-top:10px">Guardar datos</button></section>' +
      '<div class="trab-bloques">' +
      '<section class="trab-bloque"><h3>EPP y ropa</h3>' +
      '<p class="muted-mini">Solo la entrega. No sube un papel.</p>' + filasEntrega(t.id) +
      '<form class="trab-form" id="form-entrega">' +
      '<select id="ent-clase"><option value="epp">EPP</option><option value="ropa">Ropa</option></select>' +
      '<input id="ent-item" type="text" placeholder="Qué se entregó" required />' +
      '<input id="ent-fecha" type="date" value="' + hoy() + '" required />' +
      '<input id="ent-cant" type="number" min="1" value="1" required />' +
      '<input id="ent-nota" type="text" placeholder="Nota" />' +
      '<button class="btn" type="submit">Anotar entrega</button></form></section>' +
      '<section class="trab-bloque"><h3>Charlas</h3>' +
      '<p class="muted-mini">Solo si asistió o no. No sube un papel.</p>' + filasCharla(t.id) +
      '<form class="trab-form" id="form-charla">' +
      '<input id="ch-tema" type="text" placeholder="Tema" required />' +
      '<input id="ch-fecha" type="date" value="' + hoy() + '" required />' +
      '<div class="trab-asistencia"><button class="btn" type="button" id="ch-si">Asistió</button>' +
      '<button class="btn btn-ghost" type="button" id="ch-no">No asistió</button></div></form></section>' +
      '<section class="trab-bloque"><h3>Papeles</h3>' +
      '<p class="muted-mini">Solo el archivo. Cada uno queda aparte y no reemplaza a los anteriores.</p>' + filasArchivo(t.id) +
      '<form class="trab-form" id="form-archivo">' +
      '<input id="ar-nombre" type="text" placeholder="Nombre, si subes uno solo" />' +
      '<input id="ar-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" multiple required />' +
      '<button class="btn" type="submit">Subir papel</button></form></section>' +
      "</div>";
  }

  function pintar() {
    root.innerHTML =
      '<div class="trab-layout">' +
      '<section class="trab-lista"><input id="trab-busca" type="search" placeholder="Buscar persona" value="' + esc(filtro) + '" />' +
      '<button class="btn btn-full" type="button" id="trab-nuevo" style="margin-top:10px">Agregar trabajador</button>' +
      '<div class="trab-personas">' + pintarLista() + "</div></section>" +
      '<section class="trab-ficha">' + pintarFicha() + "</section></div>";
    const busca = document.getElementById("trab-busca");
    busca.addEventListener("input", () => {
      filtro = busca.value;
      const pos = busca.selectionStart;
      pintar();
      const otra = document.getElementById("trab-busca");
      otra.focus();
      otra.setSelectionRange(pos, pos);
    });
    document.getElementById("trab-nuevo").onclick = abrirNuevo;
    root.querySelectorAll(".trab-persona").forEach((btn) => {
      btn.onclick = () => { elegido = Number(btn.getAttribute("data-id")); pintar(); };
    });
    const guardar = document.getElementById("ficha-guardar");
    if (guardar) guardar.onclick = guardarDatos;
    const fe = document.getElementById("form-entrega");
    if (fe) fe.onsubmit = anotarEntrega;
    const fc = document.getElementById("form-charla");
    if (fc) fc.onsubmit = (ev) => ev.preventDefault();
    const si = document.getElementById("ch-si");
    const no = document.getElementById("ch-no");
    if (si) si.onclick = () => anotarCharla(true);
    if (no) no.onclick = () => anotarCharla(false);
    const fa = document.getElementById("form-archivo");
    if (fa) fa.onsubmit = subirPapel;
    root.querySelectorAll("[data-quitar]").forEach((btn) => {
      btn.onclick = () => pedirQuitar(btn.getAttribute("data-quitar"), Number(btn.getAttribute("data-qid")));
    });
  }

  function abrirNuevo() {
    const modal = document.getElementById("trab-modal");
    document.getElementById("nuevo-nombre").value = "";
    document.getElementById("nuevo-tipo").value = "interno";
    const sel = document.getElementById("nuevo-empresa");
    sel.innerHTML = '<option value="">Sin empresa</option>' + proveedores.map((p) =>
      '<option value="' + p.id + '">' + esc(p.nombre) + "</option>"
    ).join("");
    modal.hidden = false;
    document.getElementById("nuevo-nombre").focus();
  }

  async function crear() {
    const nombre = document.getElementById("nuevo-nombre").value.trim().slice(0, 120);
    const tipo = document.getElementById("nuevo-tipo").value === "externo" ? "externo" : "interno";
    const prov = document.getElementById("nuevo-empresa").value;
    if (!nombre) { aviso("Falta un dato", "El nombre es obligatorio."); return; }
    const ins = await window.db.from("trabajador").insert({
      nombre,
      tipo,
      proveedor_id: prov ? Number(prov) : null,
      activo: true
    }).select("id").single();
    if (ins.error) { aviso("No se guardó", ins.error.message); return; }
    document.getElementById("trab-modal").hidden = true;
    elegido = ins.data.id;
    await cargar();
    pintar();
    aviso("Trabajador creado", nombre + " quedó en el archivo.");
  }

  async function guardarDatos() {
    const t = gente.find((x) => x.id === elegido);
    if (!t) return;
    const tipo = document.getElementById("ficha-tipo").value === "externo" ? "externo" : "interno";
    const prov = document.getElementById("ficha-empresa").value;
    const activo = document.getElementById("ficha-activo").checked;
    const up = await window.db.from("trabajador").update({
      tipo,
      proveedor_id: prov ? Number(prov) : null,
      activo
    }).eq("id", t.id);
    if (up.error) { aviso("No se guardó", up.error.message); return; }
    await cargar();
    pintar();
    aviso("Datos guardados", t.nombre + " quedó actualizado.");
  }

  async function anotarEntrega(ev) {
    ev.preventDefault();
    const item = document.getElementById("ent-item").value.trim().slice(0, 120);
    const fecha = document.getElementById("ent-fecha").value;
    const cantidad = Number(document.getElementById("ent-cant").value);
    if (!item || !fecha || !(cantidad > 0)) { aviso("Falta un dato", "El ítem, la fecha y la cantidad son obligatorios."); return; }
    const ins = await window.db.from("entrega").insert({
      trabajador_id: elegido,
      clase: document.getElementById("ent-clase").value,
      item,
      fecha,
      cantidad: Math.round(cantidad),
      nota: document.getElementById("ent-nota").value.trim().slice(0, 300) || null
    });
    if (ins.error) { aviso("No se guardó", ins.error.message); return; }
    await cargar();
    pintar();
    aviso("Entrega anotada", item + " quedó en la ficha.");
  }

  async function anotarCharla(asistio) {
    const tema = document.getElementById("ch-tema").value.trim().slice(0, 160);
    const fecha = document.getElementById("ch-fecha").value;
    if (!tema || !fecha) { aviso("Falta un dato", "El tema y la fecha son obligatorios."); return; }
    const ins = await window.db.from("charla").insert({
      trabajador_id: elegido,
      tema,
      fecha,
      asistio: !!asistio
    });
    if (ins.error) { aviso("No se guardó", ins.error.message); return; }
    await cargar();
    pintar();
    aviso("Charla anotada", tema + (asistio ? " quedó como asistió." : " quedó como no asistió."));
  }

  async function subirPapel(ev) {
    ev.preventDefault();
    const input = document.getElementById("ar-file");
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) { aviso("Falta un dato", "Elige un archivo."); return; }
    const grande = files.find((f) => f.size > 8 * 1024 * 1024);
    if (grande) { aviso("No se guardó", grande.name + " pasa de 8 MB."); return; }
    const titulo = document.getElementById("ar-nombre").value.trim();
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const nombre = (files.length === 1 && titulo ? titulo : file.name).slice(0, 160);
      const limpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const ruta = elegido + "/" + Date.now() + "-" + i + "-" + limpio;
      const up = await window.db.storage.from("trabajadores").upload(ruta, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });
      if (up.error) { aviso("No se guardó", up.error.message); break; }
      const ins = await window.db.from("archivo_trabajador").insert({
        trabajador_id: elegido,
        nombre,
        ruta
      });
      if (ins.error) {
        await window.db.storage.from("trabajadores").remove([ruta]);
        aviso("No se guardó", ins.error.message);
        break;
      }
      ok += 1;
    }
    await cargar();
    pintar();
    if (ok) aviso("Papel guardado", ok === 1 ? "Quedó en la ficha, sin borrar los anteriores." : ok + " archivos quedaron en la ficha.");
  }

  function pedirQuitar(tipo, id) {
    quitando = { tipo, id };
    const nombres = { entrega: "esta entrega", charla: "esta charla", archivo: "este papel" };
    document.getElementById("quitar-texto").textContent = "Se saca " + (nombres[tipo] || "esto") + " de la ficha.";
    document.getElementById("quitar-modal").hidden = false;
  }

  async function confirmarQuitar() {
    if (!quitando) return;
    const { tipo, id } = quitando;
    document.getElementById("quitar-modal").hidden = true;
    quitando = null;
    if (tipo === "archivo") {
      const row = archivos.find((a) => a.id === id);
      if (row) await window.db.storage.from("trabajadores").remove([row.ruta]);
      const del = await window.db.from("archivo_trabajador").delete().eq("id", id);
      if (del.error) { aviso("No se guardó", del.error.message); return; }
    } else if (tipo === "entrega") {
      const del = await window.db.from("entrega").delete().eq("id", id);
      if (del.error) { aviso("No se guardó", del.error.message); return; }
    } else {
      const del = await window.db.from("charla").delete().eq("id", id);
      if (del.error) { aviso("No se guardó", del.error.message); return; }
    }
    await cargar();
    pintar();
    aviso("Listo", "Quedó fuera de la ficha.");
  }

  document.getElementById("nuevo-x").onclick = () => { document.getElementById("trab-modal").hidden = true; };
  document.getElementById("nuevo-cancelar").onclick = () => { document.getElementById("trab-modal").hidden = true; };
  document.getElementById("nuevo-ok").onclick = crear;
  document.getElementById("trab-modal").addEventListener("click", (ev) => {
    if (ev.target.id === "trab-modal") document.getElementById("trab-modal").hidden = true;
  });
  document.getElementById("quitar-x").onclick = () => { quitando = null; document.getElementById("quitar-modal").hidden = true; };
  document.getElementById("quitar-no").onclick = () => { quitando = null; document.getElementById("quitar-modal").hidden = true; };
  document.getElementById("quitar-si").onclick = confirmarQuitar;

  cargar().then(pintar).catch((err) => {
    root.innerHTML = '<p class="note">' + esc(err.message || "No se pudo cargar el archivo.") + "</p>";
  });
})();
