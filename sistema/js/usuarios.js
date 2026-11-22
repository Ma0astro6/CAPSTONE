/* Alta de usuarios, tipos de usuario y vista por rol. */
(function () {
  const MENU = [
    { codigo: "mg", grupo: "Inicio", nombre: "Mantención general" },
    { codigo: "me", grupo: "Inicio", nombre: "Mejoras" },
    { codigo: "re", grupo: "Inicio", nombre: "Remodelaciones" },
    { codigo: "gantt", grupo: "Inicio", nombre: "Carta Gantt" },
    { codigo: "reactivas", grupo: "Mantención", nombre: "Reactivas" },
    { codigo: "equipos", grupo: "Mantención", nombre: "Equipos" },
    { codigo: "predio", grupo: "Mantención", nombre: "Predio" },
    { codigo: "habitaciones", grupo: "Mantención", nombre: "Habitaciones" },
    { codigo: "prevencion", grupo: "Mantención", nombre: "Prevención" },
    { codigo: "proveedores", grupo: "Remodelaciones", nombre: "Proveedores" },
    { codigo: "bodega", grupo: "Remodelaciones", nombre: "Bodega de insumos" }
  ];

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

  async function leer(q) {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async function roles() {
    return leer(db().from("rol").select("codigo, nombre").order("nombre"));
  }

  async function usuarios() {
    return leer(
      db().from("usuario")
        .select("id, nombre, login, correo, rol, activo")
        .order("nombre")
    );
  }

  function nombreRol(lista, codigo) {
    const r = lista.find((x) => x.codigo === codigo);
    return r ? r.nombre : codigo;
  }

  async function montarUsuarios() {
    const msg = document.getElementById("usr-msg");
    const body = document.querySelector("#tabla-usuarios tbody");
    const sel = document.getElementById("u-rol");
    const form = document.getElementById("form-usuario");
    if (!body || !sel) return;
    let listaRoles = [];
    let lista = [];
    let editando = null;

    function modoNuevo() {
      editando = null;
      form.hidden = true;
      document.getElementById("form-titulo").textContent = "Nuevo usuario";
      document.getElementById("u-clave-label").textContent = "Contraseña";
      document.getElementById("btn-guardar-usuario").textContent = "Guardar usuario";
      document.getElementById("u-nombre").value = "";
      document.getElementById("u-login").value = "";
      document.getElementById("u-correo").value = "";
      document.getElementById("u-clave").value = "";
    }

    function pintar() {
      const lapiz = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg>';
      const basura = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 13h8l1-13"/></svg>';
      body.innerHTML = lista.map((u) => `<tr>
        <td class="col-user"><div class="perm-user"><b>${esc(u.nombre)}</b><small>${esc(u.login || "—")}</small></div></td>
        <td>${esc(u.correo)}</td>
        <td><span class="rol-pill r-${esc(u.rol)}">${esc(nombreRol(listaRoles, u.rol))}</span></td>
        <td class="acc-acciones">
          <button class="acc-link" type="button" data-edit="${u.id}">${lapiz}Editar</button>
          <button class="acc-link peligro" type="button" data-del="${u.id}">${basura}Eliminar</button>
        </td>
      </tr>`).join("") || "<tr><td colspan='4'>Todavía no hay usuarios.</td></tr>";
      const actual = sel.value;
      sel.innerHTML = listaRoles.map((r) =>
        `<option value="${esc(r.codigo)}">${esc(r.nombre)}</option>`
      ).join("");
      if (actual) sel.value = actual;
    }

    try {
      if (msg) msg.textContent = "Cargando usuarios…";
      listaRoles = await roles();
      lista = await usuarios();
      pintar();
      if (msg) msg.textContent = lista.length + " usuarios · " + listaRoles.length + " tipos.";
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }

    function leerRes(data) {
      return typeof data === "string" ? JSON.parse(data) : data;
    }

    document.getElementById("btn-mostrar-form").onclick = () => {
      modoNuevo();
      form.hidden = false;
      document.getElementById("u-nombre").focus();
    };

    document.getElementById("btn-cancelar").onclick = () => modoNuevo();
    document.getElementById("form-x").onclick = () => modoNuevo();
    form.addEventListener("click", (ev) => { if (ev.target === form) modoNuevo(); });

    body.onclick = async (ev) => {
      const editBtn = ev.target.closest("[data-edit]");
      const delBtn = ev.target.closest("[data-del]");
      if (editBtn) {
        const u = lista.find((x) => String(x.id) === editBtn.getAttribute("data-edit"));
        if (!u) return;
        editando = u.id;
        form.hidden = false;
        document.getElementById("form-titulo").textContent = "Editar usuario";
        document.getElementById("u-clave-label").textContent = "Nueva contraseña (opcional)";
        document.getElementById("btn-guardar-usuario").textContent = "Guardar cambios";
        document.getElementById("u-nombre").value = u.nombre || "";
        document.getElementById("u-login").value = u.login || "";
        document.getElementById("u-correo").value = u.correo || "";
        document.getElementById("u-clave").value = "";
        sel.value = u.rol;
        document.getElementById("u-nombre").focus();
        return;
      }
      if (!delBtn) return;
      const u = lista.find((x) => String(x.id) === delBtn.getAttribute("data-del"));
      if (!u) return;
      const ses = typeof getSesion === "function" ? getSesion() : null;
      if (ses && Number(ses.id) === Number(u.id)) {
        msg.textContent = "No puedes eliminar la cuenta con la que entraste.";
        if (window.cuadro) cuadro("No se eliminó", msg.textContent);
        return;
      }
      if (!window.confirm("¿Eliminar a " + u.nombre + "?")) return;
      msg.textContent = "Eliminando…";
      const { data, error } = await db().rpc("eliminar_usuario", { p_id: u.id });
      if (error) {
        msg.textContent = error.message;
        if (window.cuadro) cuadro("No se eliminó", error.message);
        return;
      }
      const res = leerRes(data);
      if (!res || !res.ok) {
        msg.textContent = (res && res.error) || "No se pudo eliminar.";
        if (window.cuadro) cuadro("No se eliminó", msg.textContent);
        return;
      }
      if (editando === u.id) modoNuevo();
      lista = await usuarios();
      pintar();
      msg.textContent = "";
      if (window.cuadro) cuadro("Usuario eliminado", (u.login || u.nombre) + " ya no puede entrar.");
    };

    document.getElementById("btn-guardar-usuario").onclick = async () => {
      const nombre = document.getElementById("u-nombre").value.trim();
      const login = document.getElementById("u-login").value.trim();
      const correo = document.getElementById("u-correo").value.trim();
      const clave = document.getElementById("u-clave").value;
      const rol = sel.value;
      if (!nombre || !login || !correo || (!editando && !clave)) {
        msg.textContent = editando
          ? "Faltan nombre, usuario o correo."
          : "Faltan nombre, usuario, correo o contraseña.";
        if (window.cuadro) cuadro("Falta un dato", msg.textContent);
        return;
      }
      msg.textContent = "Guardando usuario…";
      const llamada = editando
        ? db().rpc("modificar_usuario", {
          p_id: editando,
          p_nombre: nombre,
          p_login: login,
          p_correo: correo,
          p_clave: clave,
          p_rol: rol
        })
        : db().rpc("crear_usuario", {
          p_nombre: nombre,
          p_login: login,
          p_correo: correo,
          p_clave: clave,
          p_rol: rol
        });
      const { data, error } = await llamada;
      if (error) {
        msg.textContent = error.message;
        if (window.cuadro) cuadro("No se guardó", error.message);
        return;
      }
      const res = leerRes(data);
      if (!res || !res.ok) {
        msg.textContent = (res && res.error) || "No se pudo guardar el usuario.";
        if (window.cuadro) cuadro("No se guardó", msg.textContent);
        return;
      }
      const eraEdicion = !!editando;
      modoNuevo();
      lista = await usuarios();
      pintar();
      msg.textContent = "";
      if (window.cuadro) cuadro(eraEdicion ? "Usuario actualizado" : "Usuario creado", login + " quedó con su tipo de usuario.");
    };

    const modalTipo = document.getElementById("modal-tipo");
    const rolMsg = document.getElementById("rol-msg");
    const rolInput = document.getElementById("rol-nombre");
    function cerrarTipo() {
      if (modalTipo) modalTipo.hidden = true;
    }
    document.getElementById("btn-tipo").onclick = () => {
      if (rolMsg) rolMsg.textContent = "";
      if (rolInput) rolInput.value = "";
      modalTipo.hidden = false;
      if (rolInput) rolInput.focus();
    };
    document.getElementById("tipo-x").onclick = cerrarTipo;
    modalTipo.onclick = (ev) => { if (ev.target === modalTipo) cerrarTipo(); };

    document.getElementById("btn-rol").onclick = async () => {
      const nombre = rolInput.value.trim();
      if (!nombre) {
        rolMsg.textContent = "Falta el nombre del tipo.";
        if (window.cuadro) cuadro("Falta un dato", rolMsg.textContent);
        return;
      }
      rolMsg.textContent = "Creando tipo…";
      const { data, error } = await db().rpc("crear_rol", { p_nombre: nombre });
      if (error) {
        rolMsg.textContent = error.message;
        if (window.cuadro) cuadro("No se guardó", error.message);
        return;
      }
      const res = typeof data === "string" ? JSON.parse(data) : data;
      if (!res || !res.ok) {
        rolMsg.textContent = (res && res.error) || "No se pudo crear el tipo.";
        if (window.cuadro) cuadro("No se guardó", rolMsg.textContent);
        return;
      }
      rolInput.value = "";
      listaRoles = await roles();
      pintar();
      sel.value = res.codigo;
      cerrarTipo();
      msg.textContent = "";
      if (window.cuadro) cuadro("Tipo creado", res.nombre + " ya se puede asignar.");
    };
  }

  const MODULOS = [
    { codigo: "mg", nombre: "Mantención general", detalle: "Equipos, predio y habitaciones" },
    { codigo: "me", nombre: "Mejoras", detalle: "Ideas y plan anual" },
    { codigo: "re", nombre: "Remodelaciones", detalle: "Zonas, compras y proveedores" },
    { codigo: "gantt", nombre: "Carta Gantt", detalle: "Lo que pasa en el año" }
  ];
  const PANTALLAS = {
    mg: [
      { codigo: "reactivas", nombre: "Reactivas", detalle: "Avisos urgentes" },
      { codigo: "equipos", nombre: "Equipos", detalle: "Máquinas y refrigeradores" },
      { codigo: "predio", nombre: "Predio", detalle: "Fosas, bodegas y jardín" },
      { codigo: "habitaciones", nombre: "Habitaciones", detalle: "Baños, TV, pilas y puertas" },
      { codigo: "prevencion", nombre: "Prevención", detalle: "Protocolos" }
    ],
    re: [
      { codigo: "proveedores", nombre: "Proveedores", detalle: "Quién suministra" },
      { codigo: "bodega", nombre: "Bodega", detalle: "Insumos y stock" }
    ]
  };
  const PADRE = {};
  Object.keys(PANTALLAS).forEach((mod) => {
    PANTALLAS[mod].forEach((p) => { PADRE[p.codigo] = mod; });
  });

  async function montarVista() {
    const root = document.getElementById("perm-root");
    const msg = document.getElementById("vista-msg");
    const nota = document.getElementById("perm-note");
    if (!root) return;
    let listaRoles = [];
    let lista = [];
    let inicioFilas = [];
    const mapa = {};
    let modo = "modulos";
    let pantalla = "mg";
    let filtro = "";

    function ve(rol, codigo) {
      const m = mapa[rol] || {};
      return m[codigo] !== false;
    }

    function columnas() {
      if (modo === "modulos") return MODULOS;
      return PANTALLAS[pantalla] || [];
    }

    function marcar(rol, codigo, on) {
      if (!mapa[rol]) mapa[rol] = {};
      mapa[rol][codigo] = on;
      if (!on && PANTALLAS[codigo]) {
        PANTALLAS[codigo].forEach((h) => {
          if (h.codigo === "prevencion") return;
          mapa[rol][h.codigo] = false;
        });
      }
      if (on && PADRE[codigo] && codigo !== "prevencion") mapa[rol][PADRE[codigo]] = true;
    }

    function visibles() {
      const q = filtro.trim().toLowerCase();
      return lista.filter((u) => {
        if (!q) return true;
        const tipo = nombreRol(listaRoles, u.rol).toLowerCase();
        return [u.nombre, u.login, u.correo, tipo].join(" ").toLowerCase().includes(q);
      });
    }

    function puestosDe(rol) {
      const propios = inicioFilas.filter((f) => f.rol_codigo === rol);
      if (!propios.length) return { 1: "mg", 2: "me", 3: "re", 4: "bodega" };
      const map = { 1: "", 2: "", 3: "", 4: "" };
      propios.forEach((f) => { map[f.puesto] = f.codigo; });
      return map;
    }

    function permitido(rol, op) {
      if (!op) return false;
      if (!ve(rol, op)) return false;
      if (op === "prevencion") return true;
      if (PADRE[op] && !ve(rol, PADRE[op])) return false;
      return true;
    }

    function botonLibre(rol, codigo) {
      const catalogo = typeof BOTONES_INICIO !== "undefined" ? BOTONES_INICIO : [];
      const boton = catalogo.find((b) => b.codigo === codigo);
      if (!boton || typeof PAGINA_MENU === "undefined") return false;
      return permitido(rol, PAGINA_MENU[boton.href]);
    }

    function opcionesInicio(rol, actual) {
      const catalogo = (typeof BOTONES_INICIO !== "undefined" ? BOTONES_INICIO : []).filter((b) => botonLibre(rol, b.codigo));
      const grupo = (titulo, items) => {
        if (!items.length) return "";
        return '<optgroup label="' + esc(titulo) + '">' +
          items.map((b) => '<option value="' + esc(b.codigo) + '"' + (b.codigo === actual ? " selected" : "") + ">" + esc(b.titulo) + "</option>").join("") +
          "</optgroup>";
      };
      return '<option value=""' + (actual ? "" : " selected") + ">— vacío —</option>" +
        grupo("Módulos", catalogo.filter((b) => !b.accion)) +
        grupo("Acciones", catalogo.filter((b) => b.accion));
    }

    function pintarInicio() {
      if (nota) {
        nota.textContent = "Acá eliges los recuadros del inicio de cada tipo. Si un módulo o una pantalla está bloqueado, no aparece en la lista y no se puede dejar en el inicio.";
      }
      const etiquetas = ["Recuadro 1", "Recuadro 2", "Recuadro 3", "Barra de abajo"];
      root.innerHTML = listaRoles.length ? listaRoles.map((rol) => {
        const gente = lista.filter((u) => u.rol === rol.codigo).map((u) => u.nombre);
        const puestos = puestosDe(rol.codigo);
        return '<section class="perm-card inicio-card"><h3>' + esc(rol.nombre) + "</h3>" +
          '<p class="quien">Lo ve' + (gente.length === 1 ? "" : "n") + ": " + esc(gente.join(", ") || "nadie con este tipo") + "</p>" +
          '<div class="inicio-slots">' +
          etiquetas.map((etiq, i) => {
            const puesto = String(i + 1);
            let actual = puestos[i + 1] || "";
            if (actual && !botonLibre(rol.codigo, actual)) actual = "";
            return "<label>" + etiq +
              '<select data-inicio="' + esc(rol.codigo) + '" data-puesto="' + puesto + '">' +
              opcionesInicio(rol.codigo, actual) + "</select></label>";
          }).join("") +
          '</div><div class="inicio-actions">' +
          '<button class="perm-guardar" type="button" data-save-inicio="' + esc(rol.codigo) + '">Guardar</button>' +
          '<button class="inicio-reset" type="button" data-reset-inicio="' + esc(rol.codigo) + '">Dejar el inicio de siempre</button>' +
          "</div></section>";
      }).join("") : '<section class="perm-card"><p>No hay tipos de usuario.</p></section>';
    }

    async function guardarInicio(rol, reset) {
      const puestos = {};
      if (!reset) {
        root.querySelectorAll('select[data-inicio="' + rol + '"]').forEach((sel) => {
          const valor = sel.value;
          puestos[sel.getAttribute("data-puesto")] = botonLibre(rol, valor) ? valor : "";
        });
      }
      const { data, error } = await db().rpc("guardar_inicio", { p_rol: rol, p_puestos: puestos });
      if (error) throw new Error(error.message);
      const res = typeof data === "string" ? JSON.parse(data) : data;
      if (!res || !res.ok) throw new Error((res && res.error) || "No se pudo guardar.");
      inicioFilas = inicioFilas.filter((f) => f.rol_codigo !== rol);
      Object.keys(puestos).forEach((puesto) => {
        if (puestos[puesto]) {
          inicioFilas.push({ rol_codigo: rol, puesto: Number(puesto), codigo: puestos[puesto] });
        }
      });
      const ses = typeof getSesion === "function" ? getSesion() : null;
      if (ses && ses.rol === rol && typeof guardarPermisos === "function") await guardarPermisos(rol);
    }

    function pintar() {
      if (modo === "inicio") {
        pintarInicio();
        return;
      }
      const cols = columnas();
      const filas = visibles();
      if (nota) {
        nota.textContent = modo === "modulos"
          ? "Acá decides qué menú puede abrir cada usuario, administrador incluido."
          : "Elige el módulo y marca qué pantallas quedan habilitadas. Marcar una pantalla también abre su módulo.";
      }
      root.innerHTML =
        '<section class="perm-card">' +
        '<div class="perm-tools">' +
        '<input id="perm-q" type="search" placeholder="Filtrar por nombre, usuario o tipo" value="' + esc(filtro) + '" />' +
        '<button class="perm-guardar" type="button" id="perm-todo">Guardar cambios</button></div>' +
        (modo === "pantallas"
          ? '<div class="perm-sub">' +
            '<button type="button" data-mod="mg"' + (pantalla === "mg" ? ' class="on"' : "") + ">Mantención general</button>" +
            '<button type="button" data-mod="re"' + (pantalla === "re" ? ' class="on"' : "") + ">Remodelaciones</button></div>"
          : "") +
        '<div class="table-scroll"><table class="data permisos"><thead><tr>' +
        '<th class="col-user">Usuario</th>' +
        cols.map((c) => "<th>" + esc(c.nombre) + "<small>" + esc(c.detalle) + "</small></th>").join("") +
        "<th>Acción</th></tr></thead><tbody>" +
        (filas.length ? filas.map((u) => {
          return "<tr>" +
            '<td class="col-user"><div class="perm-user"><b>' + esc(u.nombre) + "</b><small>" +
            esc(u.login || u.correo || "") + " · " + esc(nombreRol(listaRoles, u.rol)) + "</small></div></td>" +
            cols.map((c) => '<td><input type="checkbox" data-rol="' + esc(u.rol) + '" data-op="' + esc(c.codigo) + '"' +
              (ve(u.rol, c.codigo) ? " checked" : "") + "></td>").join("") +
            '<td><button class="perm-guardar" type="button" data-save="' + esc(u.rol) + '">Guardar</button></td></tr>';
        }).join("") : '<tr><td class="col-user" colspan="' + (cols.length + 2) + '">Ningún usuario coincide.</td></tr>') +
        "</tbody></table></div></section>";
      const q = document.getElementById("perm-q");
      if (q) {
        q.focus();
        const n = q.value.length;
        q.setSelectionRange(n, n);
      }
    }

    async function limpiarInicio(rol) {
      const propios = inicioFilas.filter((f) => f.rol_codigo === rol);
      const quedan = propios.filter((f) => botonLibre(rol, f.codigo));
      if (quedan.length === propios.length) return;
      const puestos = { 1: "", 2: "", 3: "", 4: "" };
      quedan.forEach((f) => { puestos[f.puesto] = f.codigo; });
      const { data, error } = await db().rpc("guardar_inicio", { p_rol: rol, p_puestos: puestos });
      if (error) throw new Error(error.message);
      const res = typeof data === "string" ? JSON.parse(data) : data;
      if (!res || !res.ok) throw new Error((res && res.error) || "No se pudo guardar.");
      inicioFilas = inicioFilas.filter((f) => f.rol_codigo !== rol).concat(quedan);
    }

    async function guardar(rol) {
      if (!rol) return true;
      const opciones = {};
      MENU.forEach((op) => { opciones[op.codigo] = ve(rol, op.codigo); });
      const { data, error } = await db().rpc("guardar_vista", { p_rol: rol, p_opciones: opciones });
      if (error) throw new Error(error.message);
      const res = typeof data === "string" ? JSON.parse(data) : data;
      if (!res || !res.ok) throw new Error((res && res.error) || "No se pudo guardar.");
      await limpiarInicio(rol);
      const ses = typeof getSesion === "function" ? getSesion() : null;
      if (ses && ses.rol === rol && typeof guardarPermisos === "function") await guardarPermisos(rol);
      return true;
    }

    try {
      if (msg) msg.textContent = "Cargando permisos…";
      listaRoles = await roles();
      lista = await usuarios();
      const permisos = await leer(db().from("permiso_menu").select("rol_codigo, opcion, visible"));
      inicioFilas = await leer(db().from("inicio_boton").select("rol_codigo, puesto, codigo"));
      permisos.forEach((p) => {
        if (!mapa[p.rol_codigo]) mapa[p.rol_codigo] = {};
        mapa[p.rol_codigo][p.opcion] = p.visible !== false;
      });
      pintar();
      if (msg) msg.textContent = lista.length + " usuarios.";
    } catch (e) {
      if (msg) msg.textContent = e.message;
    }

    document.querySelector(".perm-tabs").onclick = (ev) => {
      const btn = ev.target.closest("[data-vista]");
      if (!btn) return;
      modo = btn.getAttribute("data-vista");
      document.querySelectorAll(".perm-tabs button").forEach((b) => b.classList.toggle("on", b === btn));
      pintar();
    };

    root.onclick = async (ev) => {
      const saveInicio = ev.target.closest("[data-save-inicio]");
      const resetInicio = ev.target.closest("[data-reset-inicio]");
      if (saveInicio || resetInicio) {
        const rol = (saveInicio || resetInicio).getAttribute(saveInicio ? "data-save-inicio" : "data-reset-inicio");
        msg.textContent = "Guardando…";
        try {
          await guardarInicio(rol, !!resetInicio);
          const tipo = nombreRol(listaRoles, rol);
          const texto = resetInicio
            ? "Inicio de siempre para " + tipo + ". Se ve al volver a entrar."
            : "Botones guardados para " + tipo + ". Se ven al volver a entrar.";
          msg.textContent = "";
          if (window.cuadro) cuadro("Inicio guardado", texto);
        } catch (e) {
          msg.textContent = e.message;
          if (window.cuadro) cuadro("No se guardó", e.message);
        }
        return;
      }
      const sub = ev.target.closest("[data-mod]");
      if (sub) {
        pantalla = sub.getAttribute("data-mod");
        pintar();
        return;
      }
      const btn = ev.target.closest("[data-save]");
      if (btn) {
        msg.textContent = "Guardando…";
        try {
          await guardar(btn.getAttribute("data-save"));
          const tipo = nombreRol(listaRoles, btn.getAttribute("data-save"));
          msg.textContent = "";
          if (window.cuadro) cuadro("Permisos guardados", "Los de " + tipo + " se ven al volver a entrar.");
        } catch (e) {
          msg.textContent = e.message;
          if (window.cuadro) cuadro("No se guardó", e.message);
        }
        return;
      }
      if (ev.target.id === "perm-todo") {
        const rolesVistos = [...new Set(visibles().map((u) => u.rol))];
        msg.textContent = "Guardando…";
        try {
          for (const rol of rolesVistos) await guardar(rol);
          const texto = rolesVistos.length
            ? "Cambios guardados. Se ven al volver a entrar."
            : "No hay usuarios para guardar.";
          msg.textContent = "";
          if (window.cuadro) cuadro(rolesVistos.length ? "Permisos guardados" : "Nada que guardar", texto);
        } catch (e) {
          msg.textContent = e.message;
          if (window.cuadro) cuadro("No se guardó", e.message);
        }
      }
    };

    root.oninput = (ev) => {
      if (ev.target.id === "perm-q") {
        filtro = ev.target.value;
        pintar();
      }
    };

    root.onchange = (ev) => {
      const box = ev.target.closest("[data-op]");
      if (!box) return;
      const rol = box.getAttribute("data-rol");
      marcar(rol, box.getAttribute("data-op"), box.checked);
      root.querySelectorAll('input[data-rol="' + rol + '"]').forEach((el) => {
        el.checked = ve(rol, el.getAttribute("data-op"));
      });
    };
  }

  window.USR = { montarUsuarios, montarVista };
})();
