# Modelo de datos — Obras · Mantención · Mejora (Elalmendro)

Levantado página por página desde el prototipo (`sistema/vistas/*.html`, `js/datos.js`, `js/datos-mg.js`, `js/app.js`, `js/catalogo.js`) y desde las planillas de Andrés (`Enviado por andres/`).

Objetivo: una base en **3FN** donde nada se repita entre páginas. Lo que hoy está duplicado en el prototipo (la "última visita" guardada en la fila, el stock escrito a mano en Reactivas, el estado de la obra en un diccionario `ABIERTAS`, el Gantt en un arreglo aparte) pasa a ser **derivado** desde una sola tabla fuente.

Motor propuesto: **PostgreSQL** (el DDL está en `esquema.sql`). Si se decide MySQL, cambian `SERIAL → INT AUTO_INCREMENT`, `TEXT` largos y las vistas; el modelo es el mismo.

---

## 1. Idea central: cinco cosas distintas que hoy parecen una

| Concepto | Qué es | Tabla |
|---|---|---|
| **Zona** | Dónde: hotel, eventos, casa, cabañas, habitaciones 101–308, sala de máquinas, etc. | `zona` |
| **Activo** | Qué se mantiene: caldera, radiador hab. 203, fosa 4, bodega B-02, puerta cocina, TV hab. 105, baño hab. 107 | `activo` (+ `componente`) |
| **Visita** | Lo que se hizo un día sobre un activo (historial, nunca se pisa) | `visita` |
| **Tarea** | Algo con fecha de inicio/fin y estado: faena de jardín, tarea de prevención, plan anual, hito de obra | `tarea` |
| **Obra** | Remodelación o renovación de una zona, con compras e hitos | `obra`, `compra` |

Transversales: `proveedor`, `trabajador`, `usuario`, `insumo`, `movimiento_insumo`, `cierre_tarea`.

---

## 2. Página por página

### `index.html` — Login
- **Hoy:** cualquier usuario entra; rol en `sessionStorage` (`admin` / `user`).
- **BD:** `usuario` (id, nombre, correo, clave_hash, rol `admin|mantencion`, activo). El "Entrar como mantención" pasa a ser un usuario real con rol `mantencion`.

### `inicio.html` — Calendario · Cierre del día · Carta Gantt
- **Hoy:** `GANTT_OBRAS` hardcodeado en `datos.js`; cierre guardado en `sessionStorage.CIERRE_DIA`.
- **BD:**
  - Calendario y Gantt = `SELECT` sobre `tarea` (`mostrar_gantt = true`, fechas, estado, pilar). No existe una tabla "gantt".
  - Cierre del día = `cierre_tarea` (tarea_id, fecha, resultado `hecho|pendiente`, fecha_retoma, nota, usuario_id). Al marcar *hecho* se actualiza `tarea.estado`; al marcar *pendiente* se mueve `tarea.fecha_fin` a la fecha de retoma y queda el registro.
  - Vista `v_calendario`: tareas abiertas vencidas o que vencen hoy + próximas 30 días.

### `mantencion.html` — Hub MG (4 grupos)
- **Hoy:** contadores `MG.maquinas.length`, etc.
- **BD:** `categoria_activo` con columna `grupo` (`Equipos`, `Predio`, `Habitaciones`, `Urgencias`). Los contadores son `COUNT(*)` por categoría.

### `maquinas.html` / `radiadores.html` / `refrigeradores.html`
- **Columnas en pantalla:** equipo/zona, ubicación, proveedor, última, quién.
- **Fuente Excel:** `LISTA DE MANTENCIONES.xlsx` hojas MAQUINAS, RADIADORES, REFRIGERADOR.
- **BD:** filas en `activo` con `categoria = maquina|radiador|refrigerador`, `zona_id`, `proveedor_id`. "Última" y "Quién" **no se guardan**: salen de `v_activo_ultima_visita` (última `visita` por activo). Las ~40 columnas de fechas del Excel se convierten en filas de `visita`.

### `fosas.html` — Fosas, graseras y planta
- **Columnas:** punto, tipo (Fosa/Grasera/Cámara/Planta), ubicación, última succión. Contactos de camiones arriba.
- **Fuente:** `LISTA FOSAS DE ALCANTARILLADOS.xlsx` Hoja1 (Hoja2 = índice de zonas, va a `zona`).
- **BD:** `activo` categoría `fosa` con `subtipo`. Los 3 contactos (Villareal, Carrillo, Delard) son `proveedor` con rubro `Succión / camión`. La succión es una `visita` con `tipo_trabajo = Succión / tratamiento`.

### `bodegas.html`
- **Columnas:** código, bodega, ubicación, última revisión, quién.
- **Fuente:** `LISTA DE BODEGAS.xlsx`.
- **BD:** `activo` categoría `bodega`, `codigo` = código del Excel. Revisión = `visita`.

### `jardin.html` — Jardinería
- **Columnas:** sector, prioridad, faena, temporada, última. Más cuadro de riego y labores.
- **Fuente:** `2024-Trabajos de jardinería 4 sectores.xlsx` (CENTRO, HOTEL1, PARCELA CASA, RIEGO) + `Labores Jardineros.docx`.
- **BD:** cada faena es una `tarea` tipo `faena_jardin` con `zona_id` (sector), `prioridad`, `temporada` (`invierno|verano|ambas`), `periodicidad`. El riego son `tarea` tipo `riego` con `periodicidad` ("Lun/Mié/Vie"). Las visitas de jardín son `visita` con `tarea_id` (sin activo).

### `banos.html`
- **Columnas:** recinto, lavamanos, tina/ducha, porta rollo, última visita.
- **Fuente:** `MANTENCION DE BAÑOS.xlsx`.
- **BD:** un `activo` categoría `bano` por recinto, con tres `componente` (Lavamanos, Tina/ducha, Porta rollo) y su `estado`. La visita puede apuntar al componente (`visita.componente_id`).

### `tvs.html` y `pilas.html`
- **Columnas TV:** zona, marca, pulgadas, control TV, control deco, última.
- **Columnas pilas:** zona, pila TV, fecha TV, pila deco, fecha deco.
- **Fuente:** `TV-Habitaciones.xlsx`, `MANTENCION DE PILAS.xlsx`.
- **BD:** se unifican. Un `activo` categoría `tv` por zona con `activo_tv` (marca, pulgadas). Dos `componente`: *Control TV* y *Control deco*, cada uno con `especificacion` = tipo de pila. "Fecha TV / fecha deco" = última `visita` de tipo `Recambio` sobre ese componente. Así una página es la ficha y la otra el historial de pilas, sin duplicar la habitación.

### `puertas.html`
- **Columnas:** puerta, ubicación, última (engrase), quién.
- **Fuente:** `LISTA DE PUERTAS POR ENGRASAR Y ACEITAR.xlsx` (Hoja1; Hoja2 duplica por zona).
- **BD:** `activo` categoría `puerta`. Engrase = `visita` tipo `Preventiva`.

### `reactivas.html` — Reactivas / emergencias
- **Columnas:** qué se rompió, zona, stock, última, quién. Mini-tiles de stock.
- **Hoy:** datos inventados; el stock está escrito a mano.
- **BD:** `aviso` (fecha, origen `recepcion|huesped|equipo`, zona_id, descripcion, activo_id opcional, prioridad, estado `abierto|en_curso|cerrado`). La atención es una `visita` con `aviso_id`. El stock sale de `v_stock_insumo`, y el descuento es un `movimiento_insumo` tipo `salida` ligado a la visita.

### `prevencion.html` — Prevención de riesgos
- **Columnas:** ítem, tarea, quién, inicio, fin, estado, último avance.
- **Fuente:** `GANTT PREVENSION.xlsx`.
- **BD:** `tarea` tipo `prevencion` con `codigo` ("1.1", "1.1.1"), `responsable_id` → `trabajador`, fechas y estado. "Último avance" = última `visita` con `tarea_id`.

### `remodelaciones.html` — Hub RE
- **Hoy:** `ZONAS_RE`, diccionario `ABIERTAS` {107: obra, 201: pintura}, montos a mano en `hud-stats`.
- **BD:** las zonas vienen de `zona` (tipo `habitacion` con `piso`, `cabana`, `edificio`). Una habitación está "abierta" si tiene una `obra` con estado distinto de `cerrada`. Los montos del encabezado = `SUM(neto*(1+iva))` de `compra` por obra.

### `zona.html` — Ficha de zona (compras + hitos)
- **Columnas compras:** ítem, proveedor, estado, neto, IVA, total. Formulario de nueva línea.
- **Columnas hitos:** hito, inicio, fin, estado.
- **Fuente:** carpetas `Remodelacion 201/202/203/204` (Presupuesto + Carta Gantt), `Remodelación 102/301/305`, cabañas, cocina, etc.
- **BD:** `obra` (zona_id, nombre, tipo, estado, fechas, presupuesto). `compra` (obra_id, proveedor_id, item, cantidad, neto_unitario, iva_pct, estado). IVA y total se calculan, no se guardan. Hitos = `tarea` tipo `hito_obra` con `obra_id`; los mismos hitos alimentan el Gantt global.

### `proveedores.html`
- **Columnas:** proveedor, rubro, contacto, lo que se compra, plazo típico.
- **Fuente:** `PROVEEDORES REMODELACIONES.xlsx`.
- **BD:** `proveedor`. Lo usan `activo.proveedor_id`, `compra.proveedor_id`, `visita.proveedor_id` y los contactos de fosas.

### `bodega-insumos.html`
- **Columnas:** insumo, uso, stock, mínimo, ubicación, estado (OK / en mínimo / comprar).
- **Fuente:** `EN BODEGA.xlsx`, `INSUMOS -NUEVA BODEGA OESTE.xlsx`, `INSUMOS JARDINERIA.xlsx`.
- **BD:** `insumo` (nombre, uso, unidad, stock_minimo, bodega → `activo` categoría bodega). El stock **no se guarda**: `v_stock_insumo = SUM(entradas) - SUM(salidas)` desde `movimiento_insumo`. El estado es un `CASE` sobre stock vs mínimo. Una `compra` recibida genera un movimiento de entrada.

### `mejoras.html` — Mejoras
- **Tablas:** ideas por hacer (idea, área, quién propone, estado, pasa a); plan anual obras (tarea, mes, costo est., estado); plan anual jardín (tarea, temporada, costo, estado); proyectos valorizados (nombre, monto, etiqueta carpeta/futuro).
- **Fuente:** `POR HACER- Area Mantenciones.xlsx`, `PLAN ANUAL DE TRABAJO.xlsx`, `Carta_Gantt.xlsx`.
- **BD:** `idea_mejora` (titulo, area `obras|jardin`, propuesta_por, estado `idea|en_estudio|urgente|valorizada|descartada`, pasa_a). `proyecto` (idea_id opcional, nombre, costo_materiales, costo_mano_obra, estado `carpeta|futuro|aprobado|ejecutado`). Plan anual = `tarea` tipo `plan_anual` con `proyecto_id` opcional, `costo_estimado`, `temporada`/mes en fechas. Los KPI son sumas.

### `gantt.html`
- Misma vista `v_gantt` que Inicio, sin filtro de pilar.

### `presupuesto.html`, `obras.html`, `activos.html`, `ficha-activo.html` (páginas antiguas, no enlazadas)
- `presupuesto_anual` (anio, pilar, monto) para el KPI "presupuesto vs consumido"; consumido = `SUM(compra)`. Las otras tres quedan cubiertas por `tarea` y `activo`; se pueden borrar del prototipo.

---

## 3. Lo que se deja de guardar (se deriva)

| Dato en pantalla | De dónde sale |
|---|---|
| Última visita / quién / detalle | `MAX(visita.fecha)` por activo o tarea (`v_activo_ultima_visita`) |
| Fecha pila TV / deco | última visita `Recambio` del componente |
| Stock de insumo y su estado | `v_stock_insumo` |
| IVA y total de compra | `neto_unitario * cantidad * iva_pct` |
| Habitación "abierta" en RE | existe `obra` no cerrada en esa zona |
| Montos del hub RE y KPI de Mejoras | `SUM` sobre `compra` / `proyecto` / `tarea.costo_estimado` |
| Barras del Gantt y tarjetas del calendario | `v_gantt`, `v_calendario` sobre `tarea` |
| Contadores del hub MG | `COUNT(*)` por `categoria_activo` |

---

## 4. Normalización — decisiones

- **1FN:** las ~40 columnas de fecha por fila en los Excel se convierten en filas de `visita`. Los textos "Sí — 2 tapas" se separan en `insumo` + `movimiento_insumo`.
- **2FN:** proveedor, trabajador y zona tienen su tabla; nada de repetir "Cosmoplas" o "Sala de máquinas" como texto en 30 filas.
- **3FN:** nada calculable se almacena (última visita, stock, IVA, totales, estado abierto).
- **Supertipo/subtipo:** `activo` es común; solo TV necesita atributos propios (`activo_tv`). Baños y controles usan `componente`, que es genérico y sirve para cualquier activo futuro.
- **Una sola tabla de tareas:** faena de jardín, prevención, plan anual, hito de obra y riego comparten estructura (nombre, fechas, estado, responsable). Se distinguen por `tipo_tarea`. Esto es lo que hace que el Gantt y el Cierre del día funcionen con una sola consulta.
- **Historial inmutable:** `visita` y `cierre_tarea` solo se insertan. Corregir una ficha es `UPDATE activo`; nunca borra visitas.

---

## 5. Orden de carga desde los Excel

1. `usuario`, `categoria_activo`, `tipo_trabajo` (catálogos fijos).
2. `zona` desde Hoja2 de fosas + puertas Hoja2 + `ZONAS_RE`.
3. `proveedor` desde `PROVEEDORES REMODELACIONES.xlsx` + contactos de fosas.
4. `trabajador` desde los nombres distintos en las columnas "quién".
5. `activo` + `componente` + `activo_tv` desde cada planilla MG.
6. `visita` desde las columnas de fecha (adaptar `_build_mg.py` para emitir INSERT en vez de JSON).
7. `tarea` desde jardín, GANTT PREVENSION, PLAN ANUAL, Cartas Gantt de remodelación.
8. `obra`, `compra` desde carpetas Remodelación.
9. `insumo`, `movimiento_insumo` (saldo inicial como entrada) desde EN BODEGA / INSUMOS.
10. `idea_mejora`, `proyecto` desde POR HACER y la carpeta de jefes.
