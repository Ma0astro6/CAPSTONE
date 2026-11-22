/* Fichas de mantención contra PostgreSQL (Supabase).
   La fila de pantalla vive en notas (JSON). La visita nueva es una fila de la tabla visita. */
(function () {
  const CATS = [
    ["maquina", "Máquinas", "Equipos", 1],
    ["radiador", "Radiadores", "Equipos", 2],
    ["refrigerador", "Refrigeradores", "Equipos", 3],
    ["fosa", "Fosas", "Predio", 4],
    ["bodega", "Bodegas", "Predio", 5],
    ["puerta", "Puertas", "Habitaciones", 6],
    ["bano", "Baños", "Habitaciones", 7],
    ["tv", "Televisores", "Habitaciones", 8],
    ["pila", "Pilas", "Habitaciones", 9],
    ["reactiva", "Reactivas", "Urgencias", 10]
  ];
  const TIPOS = ["Revisión", "Limpieza", "Reparación", "Recambio", "Succión / tratamiento", "Preventiva", "Otro"];
  const FUENTE = {
    maquinas: { tabla: "activo", cat: "maquina", nombre: (r) => r.equipo, zona: (r) => r.ubicacion },
    radiadores: { tabla: "activo", cat: "radiador", nombre: (r) => "Radiador " + (r.zona || ""), zona: (r) => r.ubicacion || r.zona },
    refrigeradores: { tabla: "activo", cat: "refrigerador", nombre: (r) => r.equipo, zona: (r) => r.ubicacion },
    fosas: { tabla: "activo", cat: "fosa", nombre: (r) => r.punto, zona: (r) => r.ubicacion, subtipo: (r) => r.tipo },
    bodegas: { tabla: "activo", cat: "bodega", nombre: (r) => r.nombre, zona: (r) => r.ubicacion },
    puertas: { tabla: "activo", cat: "puerta", nombre: (r) => r.puerta, zona: (r) => r.ubicacion },
    banos: { tabla: "activo", cat: "bano", nombre: (r) => "Baño " + (r.recinto || ""), zona: (r) => r.recinto },
    tvs: { tabla: "activo", cat: "tv", nombre: (r) => "TV " + (r.zona || ""), zona: (r) => r.zona },
    pilas: { tabla: "activo", cat: "pila", nombre: (r) => "Pilas " + (r.zona || ""), zona: (r) => r.zona },
    reactivas: { tabla: "activo", cat: "reactiva", nombre: (r) => r.que, zona: (r) => r.zona },
    jardin: { tabla: "tarea", tipo: "faena_jardin", nombre: (r) => r.faena, zona: (r) => r.sector },
    prevencion: { tabla: "tarea", tipo: "prevencion", nombre: (r) => r.tarea, zona: (r) => "" }
  };

  const cache = { zona: null, prov: null, trab: null, tipo: null, cat: null, user: null };

  function db() {
    if (!window.db) throw new Error("No hay conexión a la base.");
    return window.db;
  }

  function limpiar(row) {
    const o = {};
    Object.keys(row).forEach((k) => {
      if (k === "_bd" || k === "visitas") return;
      o[k] = row[k];
    });
    return o;
  }

  function clToIso(s) {
    const m = String(s || "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    return m[3] + "-" + m[2] + "-" + m[1];
  }

  function isoToCl(iso) {
    if (!iso) return "";
    const p = String(iso).slice(0, 10).split("-");
    if (p.length !== 3) return "";
    return p[2] + "-" + p[1] + "-" + p[0];
  }

  function slug(s) {
    const base = String(s || "zona")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 16);
    return base || "zona";
  }

  function costoNum(v) {
    const n = String(v || "").replace(/\./g, "").replace(/[^\d]/g, "");
    return n ? Number(n) : null;
  }

  async function asegurarCatalogos() {
    if (cache.cat) return;
    const client = db();
    let cats = await client.from("categoria_activo").select("id, codigo");
    if (cats.error) throw new Error(cats.error.message);
    const tengo = new Set((cats.data || []).map((c) => c.codigo));
    const faltan = CATS.filter((c) => !tengo.has(c[0])).map((c) => ({
      codigo: c[0], nombre: c[1], grupo: c[2], orden: c[3]
    }));
    if (faltan.length) {
      const ins = await client.from("categoria_activo").insert(faltan).select("id, codigo");
      if (ins.error) throw new Error(ins.error.message);
      cats = await client.from("categoria_activo").select("id, codigo");
      if (cats.error) throw new Error(cats.error.message);
    }
    cache.cat = {};
    (cats.data || []).forEach((c) => { cache.cat[c.codigo] = c.id; });

    let tipos = await client.from("tipo_trabajo").select("id, nombre");
    if (tipos.error) throw new Error(tipos.error.message);
    const tn = new Set((tipos.data || []).map((t) => t.nombre));
    const tf = TIPOS.filter((n) => !tn.has(n)).map((nombre) => ({ nombre }));
    if (tf.length) {
      const ins = await client.from("tipo_trabajo").insert(tf).select("id, nombre");
      if (ins.error) throw new Error(ins.error.message);
      tipos = await client.from("tipo_trabajo").select("id, nombre");
      if (tipos.error) throw new Error(tipos.error.message);
    }
    cache.tipo = {};
    (tipos.data || []).forEach((t) => { cache.tipo[t.nombre] = t.id; });

    const zs = await client.from("zona").select("id, nombre, codigo");
    if (zs.error) throw new Error(zs.error.message);
    cache.zona = {};
    cache.zonaCod = new Set();
    (zs.data || []).forEach((z) => {
      cache.zona[z.nombre.toLowerCase()] = z.id;
      cache.zonaCod.add(z.codigo);
    });

    const ps = await client.from("proveedor").select("id, nombre");
    if (ps.error) throw new Error(ps.error.message);
    cache.prov = {};
    (ps.data || []).forEach((p) => { cache.prov[p.nombre.toLowerCase()] = p.id; });

    const ts = await client.from("trabajador").select("id, nombre");
    if (ts.error) throw new Error(ts.error.message);
    cache.trab = {};
    (ts.data || []).forEach((t) => { cache.trab[t.nombre.toLowerCase()] = t.id; });
  }

  async function idUsuario() {
    if (cache.user) return cache.user;
    let ses = null;
    try { ses = JSON.parse(sessionStorage.getItem("SESION") || "null"); } catch (e) { ses = null; }
    if (ses && ses.id) {
      const propio = await db().from("usuario").select("id").eq("id", ses.id).maybeSingle();
      if (!propio.error && propio.data) {
        cache.user = propio.data.id;
        return cache.user;
      }
    }
    if (ses && ses.login) {
      const porLogin = await db().from("usuario").select("id").eq("login", ses.login).maybeSingle();
      if (!porLogin.error && porLogin.data) {
        cache.user = porLogin.data.id;
        ses.id = porLogin.data.id;
        try { sessionStorage.setItem("SESION", JSON.stringify(ses)); } catch (e) { /* sesión de solo lectura */ }
        return cache.user;
      }
    }
    const q = await db().from("usuario").select("id").limit(1);
    if (q.error) throw new Error(q.error.message);
    if (!q.data || !q.data[0]) throw new Error("No hay un usuario en la base para registrar la visita.");
    cache.user = q.data[0].id;
    return cache.user;
  }

  async function idZona(nombre) {
    const n = String(nombre || "Sin zona").trim().slice(0, 120) || "Sin zona";
    const k = n.toLowerCase();
    if (cache.zona[k]) return cache.zona[k];
    let codigo = slug(n);
    let i = 2;
    while (cache.zonaCod.has(codigo)) {
      codigo = (slug(n).slice(0, 14) + "-" + i).slice(0, 20);
      i += 1;
    }
    const tipo = /^\d{2,3}$/.test(n) ? "habitacion" : "recinto";
    const ins = await db().from("zona").insert({ codigo, nombre: n, tipo }).select("id, codigo").single();
    if (ins.error) throw new Error(ins.error.message);
    cache.zona[k] = ins.data.id;
    cache.zonaCod.add(ins.data.codigo);
    return ins.data.id;
  }

  async function idProveedor(nombre) {
    const n = String(nombre || "").trim().slice(0, 120);
    if (!n) return null;
    const k = n.toLowerCase();
    if (cache.prov[k]) return cache.prov[k];
    const ins = await db().from("proveedor").insert({ nombre: n }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    cache.prov[k] = ins.data.id;
    return ins.data.id;
  }

  async function idTrabajador(nombre) {
    const n = String(nombre || "Sin nombre").trim().slice(0, 120) || "Sin nombre";
    const k = n.toLowerCase();
    if (cache.trab[k]) return cache.trab[k];
    const ins = await db().from("trabajador").insert({ nombre: n, tipo: "interno" }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    cache.trab[k] = ins.data.id;
    return ins.data.id;
  }

  function filasLocales(fuente) {
    const datos = typeof MG !== "undefined" ? MG : window.MG;
    if (!datos || !Array.isArray(datos[fuente])) return [];
    return datos[fuente];
  }

  async function sembrar(fuente) {
    const spec = FUENTE[fuente];
    const locales = filasLocales(fuente);
    const usuarioId = await idUsuario();
    const vistos = new Set();
    const creados = [];
    for (let i = 0; i < locales.length; i += 1) {
      const row = locales[i];
      const zonaId = await idZona(spec.zona(row));
      let nombre = String(spec.nombre(row) || "Sin nombre").trim().slice(0, 150) || "Sin nombre";
      let clave = zonaId + "|" + nombre.toLowerCase();
      let n = 2;
      while (vistos.has(clave)) {
        nombre = (String(spec.nombre(row) || "Sin nombre").trim().slice(0, 140) + " (" + n + ")");
        clave = zonaId + "|" + nombre.toLowerCase();
        n += 1;
      }
      vistos.add(clave);
      const notas = JSON.stringify(row);
      const codigo = ("mg:" + fuente + ":" + i).slice(0, spec.tabla === "tarea" ? 20 : 30);
      if (spec.tabla === "activo") {
        const proveedorId = row.proveedor ? await idProveedor(row.proveedor) : null;
        const ins = await db().from("activo").insert({
          categoria_id: cache.cat[spec.cat],
          codigo,
          nombre: nombre.slice(0, 160),
          subtipo: spec.subtipo ? (spec.subtipo(row) || null) : null,
          zona_id: zonaId,
          ubicacion_det: String(row.ubicacion || "").slice(0, 160) || null,
          proveedor_id: proveedorId,
          notas
        }).select("id").single();
        if (ins.error) throw new Error(ins.error.message);
        if (fuente === "tvs") {
          const tv = await db().from("activo_tv").insert({
            activo_id: ins.data.id,
            marca: row.marca || null,
            pulgadas: row.pulgadas || null
          });
          if (tv.error) throw new Error(tv.error.message);
        }
        creados.push({ id: ins.data.id, row, tabla: "activo" });
      } else {
        const est = String(row.estado || "").toLowerCase();
        const estado = est.includes("curso") ? "en_curso" : est.includes("hech") || est.includes("complet") ? "hecha" : est.includes("pend") ? "pendiente" : "planificada";
        const ins = await db().from("tarea").insert({
          pilar: "MG",
          tipo: spec.tipo,
          codigo,
          nombre: nombre.slice(0, 200),
          zona_id: zonaId,
          fecha_inicio: clToIso(row.inicio),
          fecha_fin: (() => {
            const a = clToIso(row.inicio);
            const b = clToIso(row.fin);
            if (a && b && b < a) return null;
            return b;
          })(),
          estado,
          notas
        }).select("id").single();
        if (ins.error) throw new Error(ins.error.message);
        creados.push({ id: ins.data.id, row, tabla: "tarea" });
      }
    }
    for (let i = 0; i < creados.length; i += 40) {
      const trozo = creados.slice(i, i + 40);
      const visitas = [];
      for (const item of trozo) {
        const fecha = clToIso(item.row.ultima || item.row.fecha_tv);
        const detalle = String(item.row.detalle || "").trim();
        const quien = String(item.row.quien || "").trim();
        if (!fecha && !detalle && !quien) continue;
        visitas.push({
          fecha: fecha || new Date().toISOString().slice(0, 10),
          activo_id: item.tabla === "activo" ? item.id : null,
          tarea_id: item.tabla === "tarea" ? item.id : null,
          tipo_trabajo_id: cache.tipo["Revisión"],
          trabajador_id: await idTrabajador(quien || "Sin nombre"),
          proveedor_id: item.row.proveedor ? await idProveedor(item.row.proveedor) : null,
          detalle: (detalle || "Registro tomado de la planilla").slice(0, 4000),
          costo: costoNum(item.row.costo),
          usuario_id: usuarioId
        });
      }
      if (!visitas.length) continue;
      const ins = await db().from("visita").insert(visitas);
      if (ins.error) throw new Error(ins.error.message);
    }
  }

  async function visitasDe(tabla, ids) {
    const out = {};
    ids.forEach((id) => { out[id] = []; });
    const col = tabla === "tarea" ? "tarea_id" : "activo_id";
    for (let i = 0; i < ids.length; i += 80) {
      const trozo = ids.slice(i, i + 80);
      const q = await db().from("visita").select("activo_id, tarea_id, fecha, detalle, costo, proxima_fecha, tipo_trabajo(nombre), trabajador(nombre), proveedor(nombre)").in(col, trozo);
      if (q.error) throw new Error(q.error.message);
      (q.data || []).forEach((v) => {
        const id = v[col];
        if (!out[id]) out[id] = [];
        out[id].push({
          fecha: isoToCl(v.fecha),
          tipo: (v.tipo_trabajo && v.tipo_trabajo.nombre) || "",
          quien: (v.trabajador && v.trabajador.nombre) || "",
          empresa: (v.proveedor && v.proveedor.nombre) || "",
          detalle: v.detalle || "",
          costo: v.costo == null ? "" : String(v.costo),
          proxima: isoToCl(v.proxima_fecha)
        });
      });
    }
    return out;
  }

  async function cargarFichas(fuente, yaSembro) {
    const spec = FUENTE[fuente];
    if (!spec) throw new Error("Lista sin conexión: " + fuente);
    await asegurarCatalogos();
    const q = spec.tabla === "activo"
      ? await db().from("activo").select("id, codigo, notas").like("codigo", "mg:" + fuente + ":%").order("id")
      : await db().from("tarea").select("id, codigo, notas").like("codigo", "mg:" + fuente + ":%").order("id");
    if (q.error) throw new Error(q.error.message);
    if (!q.data || !q.data.length) {
      if (yaSembro) return [];
      await sembrar(fuente);
      return cargarFichas(fuente, true);
    }
    const ids = q.data.map((r) => r.id);
    const visitas = await visitasDe(spec.tabla, ids);
    return q.data.map((r) => {
      let row = {};
      try { row = JSON.parse(r.notas || "{}"); } catch (e) { row = {}; }
      row.visitas = visitas[r.id] || [];
      row._bd = { tabla: spec.tabla, id: r.id, fuente };
      return row;
    });
  }

  async function guardarFicha(row) {
    if (!row || !row._bd || !window.db) {
      throw new Error("Esta ficha no está conectada a la base. No se guardó.");
    }
    await asegurarCatalogos();
    const spec = FUENTE[row._bd.fuente];
    const limpio = limpiar(row);
    const notas = JSON.stringify(limpio);
    const zonaId = await idZona(spec.zona(limpio));
    const nombre = String(spec.nombre(limpio) || "Sin nombre").trim().slice(0, spec.tabla === "tarea" ? 200 : 160);
    if (row._bd.tabla === "activo") {
      const up = await db().from("activo").update({
        notas,
        nombre: nombre || "Sin nombre",
        zona_id: zonaId,
        ubicacion_det: String(limpio.ubicacion || "").slice(0, 160) || null,
        proveedor_id: limpio.proveedor ? await idProveedor(limpio.proveedor) : null,
        subtipo: spec.subtipo ? (spec.subtipo(limpio) || null) : null
      }).eq("id", row._bd.id);
      if (up.error) throw new Error(up.error.message);
      if (row._bd.fuente === "tvs") {
        const tv = await db().from("activo_tv").upsert({
          activo_id: row._bd.id,
          marca: limpio.marca || null,
          pulgadas: limpio.pulgadas || null
        });
        if (tv.error) throw new Error(tv.error.message);
      }
      return;
    }
    const cambios = {
      notas,
      nombre: nombre || "Tarea",
      zona_id: zonaId
    };
    if (limpio.inicio) {
      const ini = clToIso(limpio.inicio);
      const fin = clToIso(limpio.fin);
      if (ini) cambios.fecha_inicio = ini;
      if (ini && fin && fin >= ini) cambios.fecha_fin = fin;
    }
    if (limpio.estado) {
      const est = String(limpio.estado).toLowerCase();
      cambios.estado = est.includes("curso") ? "en_curso"
        : (est.includes("hech") || est.includes("complet")) ? "hecha"
        : est.includes("atras") ? "atrasada"
        : est.includes("cerrar") ? "por_cerrar"
        : est.includes("pend") ? "pendiente"
        : "planificada";
    }
    const up = await db().from("tarea").update(cambios).eq("id", row._bd.id);
    if (up.error) throw new Error(up.error.message);
  }

  async function guardarVisita(row, visita) {
    if (!row || !row._bd || !window.db) {
      throw new Error("Este ítem no está conectado a la base. No se guardó.");
    }
    await asegurarCatalogos();
    const usuarioId = await idUsuario();
    const fecha = clToIso(visita.fecha);
    if (!fecha) throw new Error("La fecha de la visita no es válida.");
    const ins = await db().from("visita").insert({
      fecha,
      activo_id: row._bd.tabla === "activo" ? row._bd.id : null,
      tarea_id: row._bd.tabla === "tarea" ? row._bd.id : null,
      tipo_trabajo_id: cache.tipo[visita.tipo] || cache.tipo["Otro"],
      trabajador_id: await idTrabajador(visita.quien),
      proveedor_id: visita.empresa ? await idProveedor(visita.empresa) : null,
      detalle: String(visita.detalle || "").slice(0, 4000),
      costo: costoNum(visita.costo),
      proxima_fecha: clToIso(visita.proxima),
      estado: visita.estado === "por_hacer" ? "por_hacer" : "terminada",
      usuario_id: usuarioId
    }).select("id").single();
    if (ins.error) throw new Error(ins.error.message);
    const limpio = limpiar(row);
    const notas = JSON.stringify(limpio);
    const up = row._bd.tabla === "activo"
      ? await db().from("activo").update({ notas }).eq("id", row._bd.id)
      : await db().from("tarea").update({ notas }).eq("id", row._bd.id);
    if (up.error) throw new Error(up.error.message);
    return ins.data.id;
  }

  window.cargarFichas = cargarFichas;
  window.guardarFicha = guardarFicha;
  window.guardarVisita = guardarVisita;
})();
