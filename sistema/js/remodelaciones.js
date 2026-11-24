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

  function anioActual() {
    return new Date().getFullYear();
  }

  function anioDe(iso) {
    const y = Number(String(iso || "").slice(0, 4));
    return y > 1900 ? y : 0;
  }

  function obraDelAnio(obra, anio) {
    return anioDe(obra && obra.fecha_inicio) === anio;
  }

  function elegirObra(lista) {
    const abierta = lista.find((o) => o.estado !== "cerrada");
    return abierta || lista[0] || null;
  }

  function hrefZona(codigo, anio) {
    return "zona.html?z=" + encodeURIComponent(codigo) + "&anio=" + anio;
  }

  function pintarHub(zonas, obras, gastos, filtro, anio) {
    const s = (filtro || "").trim().toLowerCase();
    const delAnio = obras.filter((o) => obraDelAnio(o, anio));
    const porZona = {};
    delAnio.forEach((o) => {
      const prev = porZona[o.zona_id];
      if (!prev) {
        porZona[o.zona_id] = o;
        return;
      }
      const prevAbierta = prev.estado !== "cerrada";
      const estaAbierta = o.estado !== "cerrada";
      if (estaAbierta && !prevAbierta) porZona[o.zona_id] = o;
      else if (estaAbierta === prevAbierta && o.id > prev.id) porZona[o.zona_id] = o;
    });
    const match = (z) => !s || z.nombre.toLowerCase().includes(s) || String(z.codigo).toLowerCase().includes(s);
    const lista = zonas.filter(match);
    const predio = lista.filter((z) => z.tipo === "edificio" || z.tipo === "cabana");
    const piso = (n) => lista.filter((z) => z.tipo === "habitacion" && Number(z.piso) === n);

    function marca(obra) {
      if (!obra) return "";
      return obra.estado === "cerrada" ? " pasada" : " hot";
    }
    function quest(z) {
      const obra = porZona[z.id];
      const sub = obra ? tagObra(obra) : "sin obra";
      return `<a class="quest${obra ? marca(obra) : ""}" href="${hrefZona(z.codigo, anio)}"><b>${esc(z.nombre)}</b><span>${esc(sub)}</span></a>`;
    }
    function chip(z) {
      const obra = porZona[z.id];
      const tono = !obra ? "" : (obra.estado === "cerrada" ? " pasada" : " on");
      const sub = obra ? tagObra(obra) : "hab.";
      const detalle = obra && obra.notas ? `<small>${esc(obra.notas)}</small>` : "";
      return `<a class="room-chip${tono}" href="${hrefZona(z.codigo, anio)}"><b>${esc(z.codigo)}</b><i>${esc(sub)}</i>${detalle}</a>`;
    }
    function vacio() {
      return "<p class='muted-mini'>Sin coincidencias.</p>";
    }
    const decks = [
      {
        id: "deck-predio",
        titulo: "Predio",
        tag: "Zonas",
        nota: "Lo que no es una habitación numerada: la casa, el centro de eventos, el hotel en general y las cabañas. Se abre igual que una pieza. «Sin obra» significa que ese año todavía no hay trabajo ahí.",
        html: predio.map(quest).join("") || vacio()
      },
      { titulo: "Piso 1", tag: "101–108", html: piso(1).length ? `<div class="room-grid">${piso(1).map(chip).join("")}</div>` : vacio() },
      { titulo: "Piso 2", tag: "201–208", html: piso(2).length ? `<div class="room-grid">${piso(2).map(chip).join("")}</div>` : vacio() },
      { titulo: "Piso 3", tag: "301–308", html: piso(3).length ? `<div class="room-grid">${piso(3).map(chip).join("")}</div>` : vacio() }
    ];
    const ids = new Set(delAnio.map((o) => o.id));
    const gastoAnio = gastos.filter((g) => ids.has(g.obra_id)).reduce((a, g) => a + Number(g.total || 0), 0);
    const abiertas = delAnio.filter((o) => o.estado !== "cerrada").length;
    return {
      html: decks.map((d) => `
        <section class="deck"${d.id ? ` id="${d.id}"` : ""}>
          <div class="deck-head"><h3>${d.titulo}</h3><span class="deck-tag">${d.tag}</span></div>
          ${d.nota ? `<p class="deck-nota">${d.nota}</p>` : ""}
          ${d.html}
        </section>`).join(""),
      total: delAnio.length,
      abiertas,
      gastoAnio
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
    let anio = anioActual();
    function dibujar() {
      const v = pintarHub(zonas, obras, gastos, q ? q.value : "", anio);
      host.innerHTML = v.html;
      const t = document.getElementById("hud-total");
      const a = document.getElementById("hud-abiertas");
      const g = document.getElementById("hud-gasto");
      if (t) t.textContent = String(v.total);
      if (a) a.textContent = String(v.abiertas);
      if (g) g.textContent = dinero(v.gastoAnio);
      if (msg) msg.textContent = "Año " + anio + " · " + v.total + " obras · " + v.abiertas + " abiertas.";
      const sw = document.getElementById("anio-re");
      if (sw) {
        sw.querySelectorAll("button").forEach((b) => {
          b.classList.toggle("on", Number(b.getAttribute("data-anio")) === anio);
          b.setAttribute("aria-pressed", Number(b.getAttribute("data-anio")) === anio ? "true" : "false");
        });
      }
    }
    function pintarAnios() {
      const sw = document.getElementById("anio-re");
      if (!sw) return;
      const años = new Set([anioActual(), anioActual() - 1]);
      obras.forEach((o) => {
        const y = anioDe(o.fecha_inicio);
        if (y) años.add(y);
      });
      const lista = [...años].sort((a, b) => a - b);
      if (!lista.includes(anio)) anio = anioActual();
      sw.innerHTML = lista.map((n) => `<button type="button" data-anio="${n}">${n}</button>`).join("");
      sw.onclick = (ev) => {
        const b = ev.target.closest("button[data-anio]");
        if (!b) return;
        anio = Number(b.getAttribute("data-anio"));
        const u = new URL(location.href);
        u.searchParams.set("anio", String(anio));
        history.replaceState(null, "", u);
        dibujar();
      };
    }
    if (q) q.addEventListener("input", dibujar);
    try {
      if (msg) msg.textContent = "Cargando zonas…";
      zonas = await zonasHub();
      obras = await leer(
        db().from("obra")
          .select("id, zona_id, nombre, tipo, estado, fecha_inicio, notas")
          .order("id", { ascending: false })
      );
      gastos = await leer(db().from("v_compra").select("obra_id, total, fecha"));
      const pedido = Number(typeof qs === "function" ? qs("anio") : 0);
      if (pedido) anio = pedido;
      pintarAnios();
      dibujar();
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

  async function montarZona(codigo, anioPedido) {
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
      const anio = Number(anioPedido) || anioActual();
      const todas = await obrasDe(zona.id);
      const obras = todas.filter((o) => obraDelAnio(o, anio));
      const obra = elegirObra(obras);
      const provs = await proveedores();

      if (!obra) {
        abrir.hidden = false;
        ficha.hidden = true;
        if (msg) msg.textContent = "En " + anio + " esta zona no tiene obra. La que abras queda en ese año.";
        document.getElementById("obra-nombre").value = "Obra " + zona.codigo;
        document.getElementById("obra-inicio").value = anio === anioActual() ? hoy() : anio + "-01-01";
        const previas = document.getElementById("obras-cerradas");
        const otras = todas.filter((o) => !obraDelAnio(o, anio));
        previas.innerHTML = otras.length
          ? otras.map((o) => `<li>${esc(o.nombre)} · ${anioDe(o.fecha_inicio) || "sin año"} · ${esc(ESTADO_OBRA[o.estado] || o.estado)}</li>`).join("")
          : "";
        document.getElementById("btn-abrir").onclick = async () => {
          const nombre = document.getElementById("obra-nombre").value.trim();
          const tipo = document.getElementById("obra-tipo").value;
          const inicio = document.getElementById("obra-inicio").value || null;
          const fin = document.getElementById("obra-fin").value || null;
          const presupuesto = window.leerMonto ? leerMonto(document.getElementById("obra-presupuesto").value) : null;
          const notas = document.getElementById("obra-notas").value.trim();
          if (!nombre) {
            msg.textContent = "Falta el nombre de la obra.";
            if (window.cuadro) cuadro("Falta un dato", msg.textContent);
            return;
          }
          if (inicio && anioDe(inicio) !== anio) {
            msg.textContent = "El inicio tiene que caer en " + anio + ".";
            if (window.cuadro) cuadro("Revisa las fechas", msg.textContent);
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
            presupuesto: presupuesto == null ? null : presupuesto,
            notas: notas || null
          }).select("id").single();
          if (ins.error) {
            msg.textContent = ins.error.message;
            if (window.cuadro) cuadro("No se guardó", ins.error.message);
            return;
          }
          if (window.cuadro) cuadro("Obra abierta", nombre + " quedó en " + zona.codigo + ".");
          montarZona(codigo, anio);
        };
        return;
      }

      abrir.hidden = true;
      ficha.hidden = false;
      const compras = await comprasDe(obra.id);
      const hitos = await hitosDe(obra.id);
      document.getElementById("obra-titulo").textContent = obra.nombre;
      document.getElementById("obra-meta").textContent =
        (TIPO_OBRA[obra.tipo] || obra.tipo) +
        (obra.fecha_inicio ? " · " + obra.fecha_inicio : "") +
        (obra.fecha_fin_plan ? " → " + obra.fecha_fin_plan : "") +
        (obra.presupuesto ? " · presupuesto " + dinero(obra.presupuesto) : "");
      const desc = document.getElementById("obra-desc");
      if (desc) desc.value = obra.notas || "";
      const btnDesc = document.getElementById("btn-desc");
      if (btnDesc) {
        btnDesc.onclick = async () => {
          const notas = desc.value.trim();
          msg.textContent = "Guardando descripción…";
          const up = await db().from("obra").update({ notas: notas || null }).eq("id", obra.id);
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
      selEstado.innerHTML = opciones(ESTADO_OBRA, obra.estado);
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
        msg.textContent = "Año " + anio + " · " + (ESTADO_OBRA[obra.estado] || obra.estado) + " · " + nc + " · " + nh + ".";
      }

      selEstado.onchange = async () => {
        const estado = selEstado.value;
        const patch = { estado };
        if (estado === "cerrada") patch.fecha_fin_real = hoy();
        const up = await db().from("obra").update(patch).eq("id", obra.id);
        if (up.error) {
          msg.textContent = up.error.message;
          if (window.cuadro) cuadro("No se cambió", up.error.message);
          return;
        }
        if (window.cuadro) cuadro("Obra actualizada", obra.nombre + " pasó a " + (ESTADO_OBRA[estado] || estado) + ".");
        montarZona(codigo, anio);
      };

      document.getElementById("btn-compra").onclick = async () => {
        const item = document.getElementById("compra-item").value.trim();
        const nuevo = document.getElementById("compra-nuevo").value.trim();
        const provSel = selProv.value;
        const cantidad = Number(document.getElementById("compra-cant").value);
        const neto = window.leerMonto ? leerMonto(document.getElementById("compra-neto").value) : Number(document.getElementById("compra-neto").value);
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
            obra_id: obra.id,
            proveedor_id: proveedorId,
            item,
            cantidad,
            neto_unitario: Math.round(neto),
            iva_pct: 19,
            estado,
            usuario_id: usuarioId()
          });
          if (ins.error) throw new Error(ins.error.message);
          if (window.cuadro) cuadro("Compra guardada", item + " quedó en " + obra.nombre + ".");
          montarZona(codigo, anio);
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
          obra_id: obra.id,
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
        montarZona(codigo, anio);
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
    if (typeof cargarVisitasCarta === "function") {
      try { await cargarVisitasCarta(); } catch (e) { /* la carta del plan igual se pinta */ }
    }
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
