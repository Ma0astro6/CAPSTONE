/* Remodelaciones: zonas, obras, compras e hitos viven en Supabase. */
(function () {
  const TIPO_OBRA = {
    remodelacion: "Remodelación",
    renovacion: "Renovación",
    pintura: "Pintura",
    reparacion: "Reparación"
  };
  const ESTADO_OBRA = {
    planificada: "Planificada",
    en_curso: "En curso",
    por_cerrar: "Por cerrar",
    cerrada: "Cerrada"
  };
  const ESTADO_COMPRA = {
    cotizado: "Cotizado",
    pedido: "Pedido",
    comprado: "Comprado",
    recibido: "Recibido",
    en_stock: "En stock",
    anulado: "Anulado"
  };
  const ESTADO_HITO = {
    planificada: "Planificado",
    en_curso: "En curso",
    por_cerrar: "Por cerrar",
    hecha: "Hecho"
  };

  function db() {
    if (!window.db) throw new Error("No hay conexión a la base.");
    return window.db;
  }

  function esc(val) {
    return String(val == null ? "" : val)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function dinero(n) {
    return typeof clp === "function" ? clp(n || 0) : "$" + Number(n || 0).toLocaleString("es-CL");
  }

  function hoy() {
    return typeof hoyISO === "function" ? hoyISO() : new Date().toISOString().slice(0, 10);
  }

  function usuarioId() {
    try {
      const s = JSON.parse(sessionStorage.getItem("SESION") || "null");
      if (s && s.id) return s.id;
    } catch (e) { /* sin sesión legible */ }
    return null;
  }

  function opciones(mapa, actual) {
    return Object.keys(mapa).map((k) =>
      `<option value="${esc(k)}"${k === actual ? " selected" : ""}>${esc(mapa[k])}</option>`
    ).join("");
  }

  async function leer(q) {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function zonasHub() {
    const filas = await leer(
      db().from("zona")
        .select("id, codigo, nombre, tipo, piso")
        .eq("activa", true)
        .in("tipo", ["edificio", "cabana", "habitacion"])
        .order("codigo")
    );
    return filas.filter((z) => z.tipo !== "habitacion" || z.piso != null);
  }

  async function obrasDe(zonaId) {
    return leer(
      db().from("obra")
        .select("id, zona_id, nombre, tipo, estado, fecha_inicio, fecha_fin_plan, fecha_fin_real, presupuesto, notas")
        .eq("zona_id", zonaId)
        .order("id", { ascending: false })
    );
  }

  async function comprasDe(obraId) {
    return leer(
      db().from("v_compra")
        .select("id, obra_id, item, proveedor, estado, fecha, cantidad, neto_unitario, neto, iva, total")
        .eq("obra_id", obraId)
        .order("id", { ascending: false })
    );
  }

  async function hitosDe(obraId) {
    return leer(
      db().from("tarea")
        .select("id, nombre, fecha_inicio, fecha_fin, estado")
        .eq("obra_id", obraId)
        .eq("tipo", "hito_obra")
        .order("fecha_inicio")
    );
  }

  async function proveedores() {
    return leer(
      db().from("proveedor")
        .select("id, nombre, rubro, contacto, telefono, que_se_compra, plazo_tipico")
        .eq("activo", true)
        .order("nombre")
    );
  }

  async function asegurarProveedor(nombre) {
    const n = nombre.trim();
    const ya = await leer(db().from("proveedor").select("id, nombre").ilike("nombre", n).limit(1));
    if (ya[0]) return ya[0].id;
    const ins = await db().from("proveedor").insert({ nombre: n, activo: true }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    return ins.data.id;
  }

  function tagObra(obra) {
    if (!obra) return "";
    return (TIPO_OBRA[obra.tipo] || obra.tipo || "").toLowerCase();
  }

  function pintarHub(zonas, obras, gastos, filtro) {
    const s = (filtro || "").trim().toLowerCase();
    const abiertaPorZona = {};
    obras.forEach((o) => {
      if (!abiertaPorZona[o.zona_id]) abiertaPorZona[o.zona_id] = o;
    });
    const match = (z) => !s || z.nombre.toLowerCase().includes(s) || String(z.codigo).toLowerCase().includes(s);
    const lista = zonas.filter(match);
    const predio = lista.filter((z) => z.tipo === "edificio" || z.tipo === "cabana");
    const piso = (n) => lista.filter((z) => z.tipo === "habitacion" && Number(z.piso) === n);

    function quest(z) {
      const obra = abiertaPorZona[z.id];
      const hot = obra ? " hot" : "";
      const sub = obra ? tagObra(obra) : (z.tipo === "cabana" ? "cabaña" : "edificio");
      return `<a class="quest${hot}" href="zona.html?z=${encodeURIComponent(z.codigo)}"><b>${esc(z.nombre)}</b><span>${esc(sub)}</span></a>`;
    }
    function chip(z) {
      const obra = abiertaPorZona[z.id];
      const on = obra ? " on" : "";
      const sub = obra ? tagObra(obra) : "hab.";
      const detalle = obra && obra.notas ? `<small>${esc(obra.notas)}</small>` : "";
      return `<a class="room-chip${on}" href="zona.html?z=${encodeURIComponent(z.codigo)}"><b>${esc(z.codigo)}</b><i>${esc(sub)}</i>${detalle}</a>`;
    }
    function vacio() {
      return "<p class='muted-mini'>Sin coincidencias.</p>";
    }
    const decks = [
      { titulo: "Predio", tag: "Zonas", html: predio.map(quest).join("") || vacio() },
      { titulo: "Piso 1", tag: "101–108", html: piso(1).length ? `<div class="room-grid">${piso(1).map(chip).join("")}</div>` : vacio() },
      { titulo: "Piso 2", tag: "201–208", html: piso(2).length ? `<div class="room-grid">${piso(2).map(chip).join("")}</div>` : vacio() },
      { titulo: "Piso 3", tag: "301–308", html: piso(3).length ? `<div class="room-grid">${piso(3).map(chip).join("")}</div>` : vacio() }
    ];
    const ids = new Set(obras.map((o) => o.id));
    const gastoAbierto = gastos.filter((g) => ids.has(g.obra_id)).reduce((a, g) => a + Number(g.total || 0), 0);
    const mes = hoy().slice(0, 7);
    const gastoMes = gastos.filter((g) => String(g.fecha || "").slice(0, 7) === mes).reduce((a, g) => a + Number(g.total || 0), 0);
    return {
      html: decks.map((d) => `
        <section class="deck">
          <div class="deck-head"><h3>${d.titulo}</h3><span class="deck-tag">${d.tag}</span></div>
          ${d.html}
        </section>`).join(""),
      abiertas: obras.length,
      gastoAbierto,
      gastoMes
    };
  }

  async function montarHub() {
    const host = document.getElementById("tableros");
    const q = document.getElementById("filtro-zona");
    const msg = document.getElementById("re-msg");
    if (!host) return;
    let zonas = [];
    let obras = [];
    let gastos = [];
    function dibujar() {
      const v = pintarHub(zonas, obras, gastos, q ? q.value : "");
      host.innerHTML = v.html;
      const a = document.getElementById("hud-abiertas");
      const g = document.getElementById("hud-gasto");
      const m = document.getElementById("hud-mes");
      if (a) a.textContent = String(v.abiertas);
      if (g) g.textContent = dinero(v.gastoAbierto);
      if (m) m.textContent = dinero(v.gastoMes);
    }
    if (q) q.addEventListener("input", dibujar);
    try {
      if (msg) msg.textContent = "Cargando zonas…";
      zonas = await zonasHub();
      obras = await leer(
        db().from("obra")
          .select("id, zona_id, nombre, tipo, estado, notas")
          .neq("estado", "cerrada")
          .order("id", { ascending: false })
      );
      gastos = await leer(db().from("v_compra").select("obra_id, total, fecha"));
      dibujar();
      if (msg) msg.textContent = "Conectado · " + zonas.length + " zonas · " + obras.length + " obras abiertas.";
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }
  }

  function filaCompra(c) {
    const fijo = c.estado === "anulado";
    const opts = Object.keys(ESTADO_COMPRA).map((k) =>
      `<option value="${esc(k)}"${k === c.estado ? " selected" : ""}>${esc(ESTADO_COMPRA[k])}</option>`
    ).join("");
    return `<tr>
      <td>${esc(c.item)}</td>
      <td>${esc(c.proveedor)}</td>
      <td><select class="estado-compra" data-compra="${c.id}" data-antes="${esc(c.estado)}" aria-label="Estado de ${esc(c.item)}"${fijo ? ' disabled title="Anulado no se puede cambiar"' : ""}>${opts}</select></td>
      <td class="num">${dinero(c.neto)}</td>
      <td class="num">${dinero(c.iva)}</td>
      <td class="num money">${dinero(c.total)}</td>
    </tr>`;
  }

  function filaHito(h) {
    const label = ESTADO_HITO[h.estado] || h.estado;
    return `<tr>
      <td>${esc(h.nombre)}</td>
      <td>${esc(h.fecha_inicio || "—")}</td>
      <td>${esc(h.fecha_fin || "—")}</td>
      <td>${esc(label)}</td>
    </tr>`;
  }

  async function montarZona(codigo) {
    const titulo = document.getElementById("titulo");
    const msg = document.getElementById("zona-msg");
    const abrir = document.getElementById("bloque-abrir");
    const ficha = document.getElementById("bloque-obra");
    try {
      if (msg) msg.textContent = "Cargando zona…";
      const zonas = await leer(db().from("zona").select("id, codigo, nombre, tipo, piso").eq("codigo", codigo).limit(1));
      const zona = zonas[0];
      if (!zona) {
        if (titulo) titulo.textContent = "Zona no encontrada";
        if (msg) msg.textContent = "No hay una zona con código " + codigo + ".";
        return;
      }
      if (titulo) titulo.textContent = zona.nombre;
      const obras = await obrasDe(zona.id);
      const abierta = obras.find((o) => o.estado !== "cerrada") || null;
      const provs = await proveedores();
      const cerradas = obras.filter((o) => o.estado === "cerrada");

      if (!abierta) {
        abrir.hidden = false;
        ficha.hidden = true;
        if (msg) msg.textContent = "Esta zona está en el catálogo. Abre una obra para cargar compras e hitos.";
        document.getElementById("obra-nombre").value = "Obra " + zona.codigo;
        document.getElementById("obra-inicio").value = hoy();
        const previas = document.getElementById("obras-cerradas");
        previas.innerHTML = cerradas.length
          ? cerradas.map((o) => `<li>${esc(o.nombre)} · ${esc(ESTADO_OBRA[o.estado] || o.estado)}</li>`).join("")
          : "";
        document.getElementById("btn-abrir").onclick = async () => {
          const nombre = document.getElementById("obra-nombre").value.trim();
          const tipo = document.getElementById("obra-tipo").value;
          const inicio = document.getElementById("obra-inicio").value || null;
          const fin = document.getElementById("obra-fin").value || null;
          const presupuesto = document.getElementById("obra-presupuesto").value.trim();
          const notas = document.getElementById("obra-notas").value.trim();
          if (!nombre) {
            msg.textContent = "Falta el nombre de la obra.";
            if (window.cuadro) cuadro("Falta un dato", msg.textContent);
            return;
          }
          if (inicio && fin && fin < inicio) {
            msg.textContent = "El fin planificado queda antes del inicio.";
            if (window.cuadro) cuadro("Revisa las fechas", msg.textContent);
            return;
          }
          msg.textContent = "Guardando obra…";
          const ins = await db().from("obra").insert({
            zona_id: zona.id,
            nombre,
            tipo,
            estado: "en_curso",
            fecha_inicio: inicio,
            fecha_fin_plan: fin,
            presupuesto: presupuesto ? Math.round(Number(presupuesto)) : null,
            notas: notas || null
          }).select("id").single();
          if (ins.error) {
            msg.textContent = ins.error.message;
            if (window.cuadro) cuadro("No se guardó", ins.error.message);
            return;
          }
          if (window.cuadro) cuadro("Obra abierta", nombre + " quedó en " + zona.codigo + ".");
          montarZona(codigo);
        };
        return;
      }

      abrir.hidden = true;
      ficha.hidden = false;
      const compras = await comprasDe(abierta.id);
      const hitos = await hitosDe(abierta.id);
      document.getElementById("obra-titulo").textContent = abierta.nombre;
      document.getElementById("obra-meta").textContent =
        (TIPO_OBRA[abierta.tipo] || abierta.tipo) +
        (abierta.fecha_inicio ? " · " + abierta.fecha_inicio : "") +
        (abierta.fecha_fin_plan ? " → " + abierta.fecha_fin_plan : "") +
        (abierta.presupuesto ? " · presupuesto " + dinero(abierta.presupuesto) : "");
      const desc = document.getElementById("obra-desc");
      if (desc) desc.value = abierta.notas || "";
      const btnDesc = document.getElementById("btn-desc");
      if (btnDesc) {
        btnDesc.onclick = async () => {
          const notas = desc.value.trim();
          msg.textContent = "Guardando descripción…";
          const up = await db().from("obra").update({ notas: notas || null }).eq("id", abierta.id);
          if (up.error) {
            msg.textContent = up.error.message;
            if (window.cuadro) cuadro("No se guardó", up.error.message);
            return;
          }
          msg.textContent = "";
          if (window.cuadro) cuadro("Descripción guardada", "La nota de la obra quedó en la base.");
        };
      }
      const selEstado = document.getElementById("obra-estado");
      selEstado.innerHTML = opciones(ESTADO_OBRA, abierta.estado);
      document.getElementById("tabla-compras").querySelector("tbody").innerHTML =
        compras.map(filaCompra).join("") || "<tr><td colspan='6'>Sin compras. La primera línea queda abajo.</td></tr>";
      document.getElementById("tabla-compras").onchange = async (ev) => {
        const sel = ev.target.closest(".estado-compra");
        if (!sel || sel.disabled) return;
        const id = Number(sel.getAttribute("data-compra"));
        const estado = sel.value;
        const antes = sel.getAttribute("data-antes");
        if (antes === "anulado") {
          sel.value = "anulado";
          sel.disabled = true;
          return;
        }
        if (estado === "anulado" && !window.confirm("Anulado queda fijo. Después no se puede volver a cotizado, pedido ni comprado. ¿Anulamos esta compra?")) {
          sel.value = antes;
          return;
        }
        const up = await db().from("compra").update({ estado }).eq("id", id);
        if (up.error) {
          sel.value = antes;
          msg.textContent = up.error.message;
          if (window.cuadro) cuadro("No se cambió", up.error.message);
          return;
        }
        sel.setAttribute("data-antes", estado);
        if (estado === "anulado") {
          sel.disabled = true;
          sel.title = "Anulado no se puede cambiar";
        }
        const nombre = sel.closest("tr").querySelector("td").textContent || "Compra";
        const texto = estado === "anulado"
          ? nombre + " quedó anulada. Ese estado no se cambia."
          : nombre + " pasó a " + (ESTADO_COMPRA[estado] || estado) + ".";
        msg.textContent = "";
        if (window.cuadro) cuadro("Estado actualizado", texto);
      };
      document.getElementById("tabla-hitos").querySelector("tbody").innerHTML =
        hitos.map(filaHito).join("") || "<tr><td colspan='4'>Sin hitos. Un hito con inicio y fin entra a la carta Gantt.</td></tr>";
      const total = compras.reduce((a, c) => a + Number(c.total || 0), 0);
      document.getElementById("compra-total").textContent = dinero(total);
      const selProv = document.getElementById("compra-prov");
      selProv.innerHTML = `<option value="">Elige proveedor</option>` +
        provs.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
      document.getElementById("hito-estado").innerHTML = opciones(ESTADO_HITO, "planificada");
      document.getElementById("hito-inicio").value = hoy();
      document.getElementById("hito-fin").value = hoy();
      document.getElementById("hito-nombre").value = "";
      document.getElementById("compra-item").value = "";
      document.getElementById("compra-nuevo").value = "";
      document.getElementById("compra-neto").value = "";
      document.getElementById("compra-cant").value = "1";
      if (msg) {
        const nc = compras.length === 1 ? "1 compra" : compras.length + " compras";
        const nh = hitos.length === 1 ? "1 hito" : hitos.length + " hitos";
        msg.textContent = "Obra en la base · " + nc + " · " + nh + ".";
      }

      selEstado.onchange = async () => {
        const estado = selEstado.value;
        const patch = { estado };
        if (estado === "cerrada") patch.fecha_fin_real = hoy();
        const up = await db().from("obra").update(patch).eq("id", abierta.id);
        if (up.error) {
          msg.textContent = up.error.message;
          if (window.cuadro) cuadro("No se cambió", up.error.message);
          return;
        }
        if (window.cuadro) cuadro("Obra actualizada", abierta.nombre + " pasó a " + (ESTADO_OBRA[estado] || estado) + ".");
        montarZona(codigo);
      };

      document.getElementById("btn-compra").onclick = async () => {
        const item = document.getElementById("compra-item").value.trim();
        const nuevo = document.getElementById("compra-nuevo").value.trim();
        const provSel = selProv.value;
        const cantidad = Number(document.getElementById("compra-cant").value);
        const neto = Number(document.getElementById("compra-neto").value);
        const estado = document.getElementById("compra-estado").value;
        if (!item) {
          msg.textContent = "Falta el ítem.";
          if (window.cuadro) cuadro("Falta un dato", msg.textContent);
          return;
        }
        if (!nuevo && !provSel) {
          msg.textContent = "Elige un proveedor o escribe uno nuevo.";
          if (window.cuadro) cuadro("Falta un dato", msg.textContent);
          return;
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(neto) || neto < 0) {
          msg.textContent = "Revisa cantidad y neto unitario.";
          if (window.cuadro) cuadro("Falta un dato", msg.textContent);
          return;
        }
        msg.textContent = "Guardando compra…";
        try {
          const proveedorId = nuevo ? await asegurarProveedor(nuevo) : Number(provSel);
          const ins = await db().from("compra").insert({
            obra_id: abierta.id,
            proveedor_id: proveedorId,
            item,
            cantidad,
            neto_unitario: Math.round(neto),
            iva_pct: 19,
            estado,
            usuario_id: usuarioId()
          });
          if (ins.error) throw new Error(ins.error.message);
          if (window.cuadro) cuadro("Compra guardada", item + " quedó en " + abierta.nombre + ".");
          montarZona(codigo);
        } catch (e) {
          msg.textContent = e.message;
          if (window.cuadro) cuadro("No se guardó", e.message);
        }
      };

      document.getElementById("btn-hito").onclick = async () => {
        const nombre = document.getElementById("hito-nombre").value.trim();
        const inicio = document.getElementById("hito-inicio").value;
        const fin = document.getElementById("hito-fin").value;
        const estado = document.getElementById("hito-estado").value;
        if (!nombre || !inicio || !fin) {
          msg.textContent = "El hito necesita nombre, inicio y fin.";
          if (window.cuadro) cuadro("Falta un dato", msg.textContent);
          return;
        }
        if (fin < inicio) {
          msg.textContent = "El fin del hito queda antes del inicio.";
          if (window.cuadro) cuadro("Revisa las fechas", msg.textContent);
          return;
        }
        msg.textContent = "Guardando hito…";
        const ins = await db().from("tarea").insert({
          pilar: "RE",
          tipo: "hito_obra",
          nombre,
          zona_id: zona.id,
          obra_id: abierta.id,
          fecha_inicio: inicio,
          fecha_fin: fin,
          estado,
          mostrar_gantt: true
        });
        if (ins.error) {
          msg.textContent = ins.error.message;
          if (window.cuadro) cuadro("No se guardó", ins.error.message);
          return;
        }
        if (window.cuadro) cuadro("Hito guardado", nombre + " quedó en la carta de la obra.");
        montarZona(codigo);
      };
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }
  }

  async function montarProveedores() {
    const body = document.querySelector("#tabla-prov tbody");
    const msg = document.getElementById("prov-msg");
    const q = document.getElementById("filtro-prov");
    if (!body) return;
    let filas = [];
    function dibujar() {
      const s = (q && q.value || "").trim().toLowerCase();
      const vis = filas.filter((p) => {
        if (!s) return true;
        return [p.nombre, p.rubro, p.que_se_compra, p.contacto].some((x) => String(x || "").toLowerCase().includes(s));
      });
      body.innerHTML = vis.map((p) => `<tr>
        <td>${esc(p.nombre)}</td>
        <td>${esc(p.rubro || "—")}</td>
        <td>${esc(p.contacto || p.telefono || "—")}</td>
        <td>${esc(p.que_se_compra || "—")}</td>
        <td>${esc(p.plazo_tipico || "—")}</td>
      </tr>`).join("") || "<tr><td colspan='5'>Sin proveedores con ese filtro.</td></tr>";
    }
    if (q) q.addEventListener("input", dibujar);
    try {
      if (msg) msg.textContent = "Cargando proveedores…";
      filas = await proveedores();
      dibujar();
      if (msg) msg.textContent = filas.length + " proveedores en la base.";
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }
    const btn = document.getElementById("btn-prov");
    if (!btn) return;
    btn.onclick = async () => {
      const nombre = document.getElementById("prov-nombre").value.trim();
      if (!nombre) {
        msg.textContent = "Falta el nombre.";
        if (window.cuadro) cuadro("Falta un dato", msg.textContent);
        return;
      }
      msg.textContent = "Guardando…";
      const ins = await db().from("proveedor").insert({
        nombre,
        rubro: document.getElementById("prov-rubro").value.trim() || null,
        contacto: document.getElementById("prov-contacto").value.trim() || null,
        que_se_compra: document.getElementById("prov-compra").value.trim() || null,
        plazo_tipico: document.getElementById("prov-plazo").value.trim() || null,
        activo: true
      }).select("id, nombre, rubro, contacto, telefono, que_se_compra, plazo_tipico").single();
      if (ins.error) {
        msg.textContent = ins.error.message;
        if (window.cuadro) cuadro("No se guardó", ins.error.message);
        return;
      }
      filas.push(ins.data);
      filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      document.getElementById("prov-nombre").value = "";
      document.getElementById("prov-rubro").value = "";
      document.getElementById("prov-contacto").value = "";
      document.getElementById("prov-compra").value = "";
      document.getElementById("prov-plazo").value = "";
      dibujar();
      msg.textContent = "";
      if (window.cuadro) cuadro("Proveedor guardado", ins.data.nombre + " quedó en la lista.");
    };
  }

  async function pintarGantt(host) {
    if (!host || typeof ganttHTML !== "function" || typeof GANTT_OBRAS === "undefined") return;
    try {
      const hitos = await leer(
        db().from("tarea")
          .select("id, nombre, fecha_inicio, fecha_fin, estado, zona:zona_id(codigo)")
          .eq("pilar", "RE")
          .eq("tipo", "hito_obra")
          .eq("mostrar_gantt", true)
      );
      hitos.filter((h) => h.fecha_inicio && h.fecha_fin).forEach((h) => {
        const id = "hito-" + h.id;
        if (GANTT_OBRAS.some((it) => it.id === id)) return;
        let estado = "Planificado";
        if (h.estado === "hecha") estado = "Hecho";
        else if (h.estado === "por_cerrar") estado = "Por cerrar";
        else if (h.estado === "en_curso") estado = "En curso";
        else if (h.fecha_fin < hoy()) estado = "Atrasada";
        const codigo = h.zona && h.zona.codigo ? h.zona.codigo : "";
        GANTT_OBRAS.push({
          id,
          pilar: "RE",
          nom: h.nombre,
          ini: h.fecha_inicio,
          fin: h.fecha_fin,
          estado,
          href: codigo ? "zona.html?z=" + encodeURIComponent(codigo) : "remodelaciones.html"
        });
      });
    } catch (e) {}
    host.innerHTML = ganttHTML();
  }

  window.RE = { montarHub, montarZona, montarProveedores, pintarGantt };
})();
