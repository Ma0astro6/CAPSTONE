/* Stock de bodega: el número es entradas menos salidas. No se escribe a mano. */
(function () {
  const SEMILLA = [
    { nombre: "Tapas WC", uso: "Reactiva baños", unidad: "un", stock_minimo: 2, stock: 2 },
    { nombre: "Silicona sanitaria", uso: "Baños / remodelación", unidad: "un", stock_minimo: 3, stock: 0 },
    { nombre: "Pintura interior 4 L", uso: "Habitaciones", unidad: "un", stock_minimo: 2, stock: 4 },
    { nombre: "Flexibles de agua", uso: "Reactiva", unidad: "un", stock_minimo: 4, stock: 8 },
    { nombre: "Sifones", uso: "Reactiva", unidad: "un", stock_minimo: 2, stock: 5 },
    { nombre: "Pilas AAA", uso: "Controles TV", unidad: "un", stock_minimo: 8, stock: 12 }
  ];

  let semilla = null;

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

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function estadoDe(stock, minimo) {
    if (stock <= 0) return "Comprar";
    if (stock <= minimo) return "En mínimo";
    return "OK";
  }

  function textoCantidad(n) {
    const v = num(n);
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  }

  async function usuarioId() {
    let ses = null;
    try { ses = JSON.parse(sessionStorage.getItem("SESION") || "null"); } catch (e) { ses = null; }
    if (ses && ses.id) return ses.id;
    const q = await db().from("usuario").select("id").limit(1);
    if (q.error) throw new Error(q.error.message);
    if (!q.data || !q.data[0]) throw new Error("No hay un usuario para registrar el movimiento.");
    return q.data[0].id;
  }

  async function asegurarSemilla() {
    if (!semilla) {
      semilla = (async () => {
        const hay = await db().from("insumo").select("id").limit(1);
        if (hay.error) throw new Error(hay.error.message);
        if (hay.data && hay.data.length) return;
        const ins = await db().from("insumo").insert(SEMILLA.map((s) => ({
          nombre: s.nombre,
          uso: s.uso,
          unidad: s.unidad,
          stock_minimo: s.stock_minimo,
          activo: true
        }))).select("id, nombre");
        if (ins.error) throw new Error(ins.error.message);
        const porNombre = {};
        (ins.data || []).forEach((row) => { porNombre[row.nombre] = row.id; });
        const usuario = await usuarioId();
        const entradas = SEMILLA.filter((s) => s.stock > 0).map((s) => ({
          insumo_id: porNombre[s.nombre],
          tipo: "entrada",
          cantidad: s.stock,
          usuario_id: usuario,
          nota: "Saldo inicial de la bodega"
        }));
        if (!entradas.length) return;
        const mov = await db().from("movimiento_insumo").insert(entradas);
        if (mov.error) throw new Error(mov.error.message);
      })().catch((err) => {
        semilla = null;
        throw err;
      });
    }
    return semilla;
  }

  async function cargarStock() {
    await asegurarSemilla();
    const ins = await db().from("insumo").select("id, nombre, uso, unidad, stock_minimo").eq("activo", true).order("nombre");
    if (ins.error) throw new Error(ins.error.message);
    const mov = await db().from("movimiento_insumo").select("insumo_id, tipo, cantidad");
    if (mov.error) throw new Error(mov.error.message);
    const suma = {};
    (mov.data || []).forEach((m) => {
      const cant = num(m.cantidad);
      const delta = m.tipo === "salida" ? -cant : cant;
      suma[m.insumo_id] = (suma[m.insumo_id] || 0) + delta;
    });
    return (ins.data || []).map((row) => {
      const stock = suma[row.id] || 0;
      const minimo = num(row.stock_minimo);
      return {
        id: row.id,
        nombre: row.nombre,
        uso: row.uso || "",
        unidad: row.unidad || "un",
        minimo,
        stock,
        estado: estadoDe(stock, minimo)
      };
    });
  }

  async function moverStock(insumoId, tipo, cantidad, extra) {
    const n = num(cantidad);
    if (!insumoId) throw new Error("Elige un insumo.");
    if (n <= 0) throw new Error("La cantidad tiene que ser mayor que cero.");
    if (tipo === "salida") {
      const lista = await cargarStock();
      const item = lista.find((it) => it.id === insumoId);
      if (!item) throw new Error("Ese insumo no está en la bodega.");
      if (n > item.stock) {
        throw new Error("No alcanza " + item.nombre + ". Hay " + textoCantidad(item.stock) + " " + item.unidad + ".");
      }
    }
    const mov = await db().from("movimiento_insumo").insert({
      insumo_id: insumoId,
      tipo,
      cantidad: n,
      visita_id: extra && extra.visitaId ? extra.visitaId : null,
      usuario_id: await usuarioId(),
      nota: extra && extra.nota ? String(extra.nota).slice(0, 200) : null
    });
    if (mov.error) throw new Error(mov.error.message);
  }

  function htmlStock(items) {
    if (!items || !items.length) return '<p class="muted-mini">La bodega no tiene insumos.</p>';
    return '<div class="stock-strip">' + items.map((it) => {
      const cls = it.estado === "Comprar" ? "out" : it.estado === "En mínimo" ? "min" : "ok";
      return '<article class="stock-card ' + cls + '"><b>' + esc(it.nombre) + "</b><strong>" +
        textoCantidad(it.stock) + " " + esc(it.unidad) + "</strong><small>" + esc(it.estado) +
        " · mín. " + textoCantidad(it.minimo) + "</small></article>";
    }).join("") + "</div>";
  }

  function chipStock(estado) {
    if (estado === "OK") return "ok";
    if (estado === "Comprar") return "warn";
    return "";
  }

  window.cargarStock = cargarStock;
  window.moverStock = moverStock;
  window.htmlStock = htmlStock;
  window.chipStock = chipStock;
  window.textoCantidad = textoCantidad;
})();
