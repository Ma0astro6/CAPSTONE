-- =====================================================================
--  Obras · Mantención · Mejora — Hotel Elalmendro Ecohotel
--  Esquema normalizado (3FN) — PostgreSQL
--  Ver MODELO_DATOS.md para el mapeo página → tabla.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Tipos enumerados
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario       AS ENUM ('admin', 'mantencion');
CREATE TYPE pilar             AS ENUM ('MG', 'ME', 'RE');
CREATE TYPE tipo_zona         AS ENUM ('edificio', 'cabana', 'habitacion', 'exterior', 'recinto');
CREATE TYPE grupo_categoria   AS ENUM ('Equipos', 'Predio', 'Habitaciones', 'Urgencias');
CREATE TYPE tipo_trabajador   AS ENUM ('interno', 'externo');
CREATE TYPE tipo_tarea        AS ENUM ('faena_jardin', 'riego', 'prevencion', 'plan_anual', 'hito_obra', 'recurrente');
CREATE TYPE estado_tarea      AS ENUM ('planificada', 'en_curso', 'por_cerrar', 'pendiente', 'atrasada', 'hecha', 'cancelada');
CREATE TYPE temporada         AS ENUM ('invierno', 'verano', 'ambas');
CREATE TYPE resultado_cierre  AS ENUM ('hecho', 'pendiente');
CREATE TYPE origen_aviso      AS ENUM ('recepcion', 'huesped', 'equipo', 'andres');
CREATE TYPE estado_aviso      AS ENUM ('abierto', 'en_curso', 'cerrado');
CREATE TYPE prioridad_nivel   AS ENUM ('baja', 'media', 'alta', 'urgente');
CREATE TYPE tipo_obra         AS ENUM ('remodelacion', 'renovacion', 'pintura', 'reparacion');
CREATE TYPE estado_obra       AS ENUM ('planificada', 'en_curso', 'por_cerrar', 'cerrada');
CREATE TYPE estado_compra     AS ENUM ('cotizado', 'pedido', 'comprado', 'recibido', 'en_stock', 'anulado');
CREATE TYPE tipo_movimiento   AS ENUM ('entrada', 'salida', 'ajuste');
CREATE TYPE area_mejora       AS ENUM ('obras', 'jardin', 'equipos');
CREATE TYPE estado_idea       AS ENUM ('idea', 'en_estudio', 'urgente', 'valorizada', 'descartada');
CREATE TYPE estado_proyecto   AS ENUM ('carpeta', 'futuro', 'aprobado', 'ejecutado');

-- ---------------------------------------------------------------------
-- 1. Seguridad
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  correo        VARCHAR(160) NOT NULL UNIQUE,
  clave_hash    VARCHAR(255) NOT NULL,
  rol           rol_usuario  NOT NULL DEFAULT 'mantencion',
  activo        BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en     TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. Catálogos transversales
-- ---------------------------------------------------------------------
CREATE TABLE zona (
  id             SERIAL PRIMARY KEY,
  codigo         VARCHAR(20)  NOT NULL UNIQUE,   -- '107', 'sol', 'hotel', 'sala-maquinas'
  nombre         VARCHAR(120) NOT NULL,
  tipo           tipo_zona    NOT NULL,
  piso           SMALLINT,                       -- 1, 2, 3 para habitaciones
  zona_padre_id  INT REFERENCES zona(id),        -- recinto dentro de un edificio
  activa         BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE proveedor (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL UNIQUE,
  rubro           VARCHAR(80),                   -- Retail construcción, Pinturas, Succión / camión
  contacto        VARCHAR(120),
  telefono        VARCHAR(60),
  correo          VARCHAR(160),
  que_se_compra   VARCHAR(200),
  plazo_tipico    VARCHAR(60),
  activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE trabajador (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120)    NOT NULL,
  tipo          tipo_trabajador NOT NULL DEFAULT 'interno',
  proveedor_id  INT REFERENCES proveedor(id),  -- si es externo
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (nombre, proveedor_id)
);

CREATE TABLE tipo_trabajo (
  id      SERIAL PRIMARY KEY,
  nombre  VARCHAR(60) NOT NULL UNIQUE          -- Revisión, Limpieza, Reparación, Recambio, Succión / tratamiento, Preventiva, Otro
);

-- ---------------------------------------------------------------------
-- 3. Mantención general — activos y visitas
-- ---------------------------------------------------------------------
CREATE TABLE categoria_activo (
  id       SERIAL PRIMARY KEY,
  codigo   VARCHAR(30)     NOT NULL UNIQUE,     -- maquina, radiador, refrigerador, fosa, bodega, puerta, bano, tv
  nombre   VARCHAR(80)     NOT NULL,
  grupo    grupo_categoria NOT NULL,
  orden    SMALLINT        NOT NULL DEFAULT 0
);

CREATE TABLE activo (
  id             SERIAL PRIMARY KEY,
  categoria_id   INT NOT NULL REFERENCES categoria_activo(id),
  codigo         VARCHAR(30),                   -- B-02 (bodegas), N° (máquinas)
  nombre         VARCHAR(160) NOT NULL,          -- Caldera ACV, Radiador hab. 203, Fosa 4
  subtipo        VARCHAR(40),                    -- fosas: Fosa / Grasera / Cámara / Planta
  zona_id        INT REFERENCES zona(id),
  ubicacion_det  VARCHAR(160),                   -- texto fino: "detrás de cocina"
  proveedor_id   INT REFERENCES proveedor(id),   -- proveedor habitual de la ficha
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  notas          TEXT,
  UNIQUE (categoria_id, nombre, zona_id)
);

-- Atributos propios solo de TV (supertipo/subtipo)
CREATE TABLE activo_tv (
  activo_id  INT PRIMARY KEY REFERENCES activo(id) ON DELETE CASCADE,
  marca      VARCHAR(40),
  pulgadas   VARCHAR(20)
);

-- Partes de un activo: lavamanos / tina / porta rollo (baños); control TV / control deco (pilas)
CREATE TABLE componente (
  id              SERIAL PRIMARY KEY,
  activo_id       INT NOT NULL REFERENCES activo(id) ON DELETE CASCADE,
  nombre          VARCHAR(60) NOT NULL,          -- Lavamanos, Tina/ducha, Porta rollo, Control TV, Control deco
  especificacion  VARCHAR(60),                   -- tipo de pila AAA / AA
  estado          VARCHAR(60),                   -- OK, cambiar, gotea…
  UNIQUE (activo_id, nombre)
);

-- ---------------------------------------------------------------------
-- 4. Tareas (jardín, prevención, plan anual, hitos de obra, riego)
-- ---------------------------------------------------------------------
CREATE TABLE obra (
  id               SERIAL PRIMARY KEY,
  zona_id          INT NOT NULL REFERENCES zona(id),
  nombre           VARCHAR(160) NOT NULL,         -- Remodelación 201, Pintura 201
  tipo             tipo_obra    NOT NULL,
  estado           estado_obra  NOT NULL DEFAULT 'planificada',
  fecha_inicio     DATE,
  fecha_fin_plan   DATE,
  fecha_fin_real   DATE,
  presupuesto      NUMERIC(12,0),
  responsable_id   INT REFERENCES trabajador(id),
  notas            TEXT
);

CREATE TABLE idea_mejora (
  id             SERIAL PRIMARY KEY,
  titulo         VARCHAR(160) NOT NULL,
  area           area_mejora  NOT NULL,
  propuesta_por  INT REFERENCES trabajador(id),
  estado         estado_idea  NOT NULL DEFAULT 'idea',
  pasa_a         VARCHAR(80),                     -- Valorizar, Cotizar, Plan anual jardín…
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  notas          TEXT
);

CREATE TABLE proyecto (
  id                  SERIAL PRIMARY KEY,
  idea_id             INT REFERENCES idea_mejora(id),
  nombre              VARCHAR(160) NOT NULL,
  costo_materiales    NUMERIC(12,0) NOT NULL DEFAULT 0,
  costo_mano_obra     NUMERIC(12,0) NOT NULL DEFAULT 0,
  estado              estado_proyecto NOT NULL DEFAULT 'futuro',
  carpeta_jefes       BOOLEAN NOT NULL DEFAULT FALSE,
  anio                SMALLINT,
  notas               TEXT
);

CREATE TABLE tarea (
  id               SERIAL PRIMARY KEY,
  pilar            pilar        NOT NULL,
  tipo             tipo_tarea   NOT NULL,
  codigo           VARCHAR(20),                   -- "1.1", "1.1.1" en prevención
  nombre           VARCHAR(200) NOT NULL,
  zona_id          INT REFERENCES zona(id),
  activo_id        INT REFERENCES activo(id),     -- si la tarea es sobre un equipo (caldera semestral)
  obra_id          INT REFERENCES obra(id),       -- hitos de remodelación
  proyecto_id      INT REFERENCES proyecto(id),   -- plan anual que viene de un proyecto
  responsable_id   INT REFERENCES trabajador(id),
  fecha_inicio     DATE,
  fecha_fin        DATE,
  estado           estado_tarea NOT NULL DEFAULT 'planificada',
  prioridad        prioridad_nivel,
  temporada        temporada,
  periodicidad     VARCHAR(60),                   -- "anual", "mensual", "Lun/Mié/Vie"
  costo_estimado   NUMERIC(12,0),
  mostrar_gantt    BOOLEAN NOT NULL DEFAULT TRUE,
  notas            TEXT,
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

-- Cierre del día: registro inmutable de "se hizo / quedó pendiente"
CREATE TABLE cierre_tarea (
  id             SERIAL PRIMARY KEY,
  tarea_id       INT NOT NULL REFERENCES tarea(id),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  resultado      resultado_cierre NOT NULL,
  fecha_retoma   DATE,                            -- obligatorio si pendiente
  nota           VARCHAR(300),
  usuario_id     INT NOT NULL REFERENCES usuario(id),
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (resultado <> 'pendiente' OR fecha_retoma IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 5. Reactivas (avisos) e insumos
-- ---------------------------------------------------------------------
CREATE TABLE aviso (
  id            SERIAL PRIMARY KEY,
  fecha         TIMESTAMP NOT NULL DEFAULT NOW(),
  origen        origen_aviso NOT NULL,
  zona_id       INT NOT NULL REFERENCES zona(id),
  activo_id     INT REFERENCES activo(id),
  descripcion   VARCHAR(300) NOT NULL,            -- "Tapa de baño rota"
  prioridad     prioridad_nivel NOT NULL DEFAULT 'media',
  estado        estado_aviso NOT NULL DEFAULT 'abierto',
  usuario_id    INT REFERENCES usuario(id)
);

CREATE TABLE insumo (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL UNIQUE,     -- Tapas WC, Silicona sanitaria, Pilas AAA
  uso            VARCHAR(120),                     -- Reactiva baños, Habitaciones
  unidad         VARCHAR(20) NOT NULL DEFAULT 'un',
  stock_minimo   NUMERIC(10,2) NOT NULL DEFAULT 0,
  bodega_id      INT REFERENCES activo(id),        -- activo de categoría bodega
  activo         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- 6. Visitas (historial de trabajo, solo INSERT)
-- ---------------------------------------------------------------------
CREATE TABLE visita (
  id              SERIAL PRIMARY KEY,
  fecha           DATE NOT NULL,
  activo_id       INT REFERENCES activo(id),
  componente_id   INT REFERENCES componente(id),
  tarea_id        INT REFERENCES tarea(id),
  aviso_id        INT REFERENCES aviso(id),
  tipo_trabajo_id INT NOT NULL REFERENCES tipo_trabajo(id),
  trabajador_id   INT NOT NULL REFERENCES trabajador(id),
  proveedor_id    INT REFERENCES proveedor(id),    -- empresa que vino (Cosmoplas, camión)
  detalle         TEXT NOT NULL,
  costo           NUMERIC(12,0),
  proxima_fecha   DATE,
  usuario_id      INT NOT NULL REFERENCES usuario(id),
  creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
  -- una visita es sobre un activo, una tarea o un aviso (al menos uno)
  CHECK (activo_id IS NOT NULL OR tarea_id IS NOT NULL OR aviso_id IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 7. Remodelación — compras y movimientos de stock
-- ---------------------------------------------------------------------
CREATE TABLE compra (
  id              SERIAL PRIMARY KEY,
  obra_id         INT REFERENCES obra(id),
  aviso_id        INT REFERENCES aviso(id),        -- compra para una reactiva
  insumo_id       INT REFERENCES insumo(id),       -- si repone bodega
  proveedor_id    INT NOT NULL REFERENCES proveedor(id),
  item            VARCHAR(160) NOT NULL,
  cantidad        NUMERIC(10,2) NOT NULL DEFAULT 1,
  neto_unitario   NUMERIC(12,0) NOT NULL,
  iva_pct         NUMERIC(4,2)  NOT NULL DEFAULT 19,
  estado          estado_compra NOT NULL DEFAULT 'cotizado',
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  documento       VARCHAR(80),                     -- boleta / factura
  usuario_id      INT REFERENCES usuario(id),
  CHECK (obra_id IS NOT NULL OR aviso_id IS NOT NULL OR insumo_id IS NOT NULL)
);

CREATE TABLE movimiento_insumo (
  id          SERIAL PRIMARY KEY,
  insumo_id   INT NOT NULL REFERENCES insumo(id),
  fecha       TIMESTAMP NOT NULL DEFAULT NOW(),
  tipo        tipo_movimiento NOT NULL,
  cantidad    NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
  visita_id   INT REFERENCES visita(id),           -- salida por reactiva
  compra_id   INT REFERENCES compra(id),           -- entrada por compra recibida
  usuario_id  INT REFERENCES usuario(id),
  nota        VARCHAR(200)
);

-- ---------------------------------------------------------------------
-- 8. Presupuesto anual (KPI)
-- ---------------------------------------------------------------------
CREATE TABLE presupuesto_anual (
  id     SERIAL PRIMARY KEY,
  anio   SMALLINT NOT NULL,
  pilar  pilar    NOT NULL,
  monto  NUMERIC(12,0) NOT NULL,
  UNIQUE (anio, pilar)
);

-- ---------------------------------------------------------------------
-- 9. Índices
-- ---------------------------------------------------------------------
CREATE INDEX ix_activo_categoria   ON activo(categoria_id);
CREATE INDEX ix_activo_zona        ON activo(zona_id);
CREATE INDEX ix_visita_activo_f    ON visita(activo_id, fecha DESC);
CREATE INDEX ix_visita_comp_f      ON visita(componente_id, fecha DESC);
CREATE INDEX ix_visita_tarea_f     ON visita(tarea_id, fecha DESC);
CREATE INDEX ix_tarea_fechas       ON tarea(fecha_inicio, fecha_fin);
CREATE INDEX ix_tarea_estado       ON tarea(estado);
CREATE INDEX ix_tarea_obra         ON tarea(obra_id);
CREATE INDEX ix_compra_obra        ON compra(obra_id);
CREATE INDEX ix_mov_insumo         ON movimiento_insumo(insumo_id);
CREATE INDEX ix_cierre_tarea_f     ON cierre_tarea(tarea_id, fecha DESC);

-- ---------------------------------------------------------------------
-- 10. Vistas (lo que las páginas leen; nada de esto se guarda)
-- ---------------------------------------------------------------------

-- Última visita por activo (columnas "Última", "Quién" de las listas MG)
CREATE VIEW v_activo_ultima_visita AS
SELECT a.id            AS activo_id,
       a.nombre,
       c.codigo        AS categoria,
       z.nombre        AS zona,
       a.subtipo,
       p.nombre        AS proveedor,
       uv.fecha        AS ultima_fecha,
       t.nombre        AS ultimo_quien,
       uv.detalle      AS ultimo_detalle,
       uv.proxima_fecha
FROM activo a
JOIN categoria_activo c ON c.id = a.categoria_id
LEFT JOIN zona z        ON z.id = a.zona_id
LEFT JOIN proveedor p   ON p.id = a.proveedor_id
LEFT JOIN LATERAL (
  SELECT v.* FROM visita v
  WHERE v.activo_id = a.id
  ORDER BY v.fecha DESC, v.id DESC
  LIMIT 1
) uv ON TRUE
LEFT JOIN trabajador t  ON t.id = uv.trabajador_id
WHERE a.activo;

-- Último recambio por componente (pilas TV / deco; lavamanos / tina / porta rollo)
CREATE VIEW v_componente_ultima_visita AS
SELECT co.id AS componente_id, co.activo_id, co.nombre, co.especificacion, co.estado,
       (SELECT MAX(v.fecha) FROM visita v WHERE v.componente_id = co.id) AS ultima_fecha
FROM componente co;

-- Stock actual por insumo y su semáforo
CREATE VIEW v_stock_insumo AS
SELECT i.id, i.nombre, i.uso, i.unidad, i.stock_minimo,
       b.nombre AS bodega,
       COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad
                                WHEN 'salida'  THEN -m.cantidad
                                ELSE m.cantidad END), 0) AS stock,
       CASE
         WHEN COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END),0) <= 0 THEN 'Comprar'
         WHEN COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad WHEN 'salida' THEN -m.cantidad ELSE m.cantidad END),0) <= i.stock_minimo THEN 'En mínimo'
         ELSE 'OK'
       END AS semaforo
FROM insumo i
LEFT JOIN activo b ON b.id = i.bodega_id
LEFT JOIN movimiento_insumo m ON m.insumo_id = i.id
WHERE i.activo
GROUP BY i.id, b.nombre;

-- Compras con IVA y total calculados (ficha de zona)
CREATE VIEW v_compra AS
SELECT c.id, c.obra_id, c.aviso_id, c.item, p.nombre AS proveedor, c.estado, c.fecha,
       c.cantidad, c.neto_unitario,
       (c.cantidad * c.neto_unitario)                              AS neto,
       ROUND(c.cantidad * c.neto_unitario * c.iva_pct / 100)       AS iva,
       ROUND(c.cantidad * c.neto_unitario * (1 + c.iva_pct / 100)) AS total
FROM compra c
JOIN proveedor p ON p.id = c.proveedor_id
WHERE c.estado <> 'anulado';

-- Zona con su obra abierta (hub de Remodelaciones)
CREATE VIEW v_zona_estado AS
SELECT z.id, z.codigo, z.nombre, z.tipo, z.piso,
       o.id AS obra_id, o.nombre AS obra, o.tipo AS tipo_obra, o.estado AS estado_obra,
       (SELECT COALESCE(SUM(total),0) FROM v_compra vc WHERE vc.obra_id = o.id) AS gasto_obra
FROM zona z
LEFT JOIN obra o ON o.zona_id = z.id AND o.estado <> 'cerrada'
WHERE z.activa;

-- Carta Gantt (Inicio y gantt.html)
CREATE VIEW v_gantt AS
SELECT t.id, t.pilar, t.tipo, t.nombre, t.fecha_inicio, t.fecha_fin, t.estado,
       z.nombre AS zona, o.nombre AS obra, tr.nombre AS responsable,
       CASE
         WHEN t.estado IN ('hecha','cancelada') THEN t.estado::text
         WHEN t.fecha_fin < CURRENT_DATE THEN 'atrasada'
         ELSE t.estado::text
       END AS estado_visual
FROM tarea t
LEFT JOIN zona z        ON z.id = t.zona_id
LEFT JOIN obra o        ON o.id = t.obra_id
LEFT JOIN trabajador tr ON tr.id = t.responsable_id
WHERE t.mostrar_gantt;

-- Calendario y Cierre del día: lo vencido, lo de hoy y los próximos 30 días
CREATE VIEW v_calendario AS
SELECT g.*,
       CASE
         WHEN g.estado NOT IN ('hecha','cancelada') AND g.fecha_fin <= CURRENT_DATE THEN TRUE
         ELSE FALSE
       END AS requiere_cierre
FROM v_gantt g
WHERE g.estado NOT IN ('hecha','cancelada')
  AND (g.fecha_fin <= CURRENT_DATE OR g.fecha_inicio <= CURRENT_DATE + INTERVAL '30 days');

-- Presupuesto vs consumido
CREATE VIEW v_presupuesto AS
SELECT pa.anio, pa.pilar, pa.monto AS presupuesto,
       COALESCE((SELECT SUM(vc.total) FROM v_compra vc
                 WHERE EXTRACT(YEAR FROM vc.fecha) = pa.anio), 0) AS consumido
FROM presupuesto_anual pa;

-- ---------------------------------------------------------------------
-- 11. Catálogos mínimos
-- ---------------------------------------------------------------------
INSERT INTO tipo_trabajo (nombre) VALUES
  ('Revisión'), ('Limpieza'), ('Reparación'), ('Recambio'),
  ('Succión / tratamiento'), ('Preventiva'), ('Otro');

INSERT INTO categoria_activo (codigo, nombre, grupo, orden) VALUES
  ('maquina',      'Máquinas',       'Equipos',      1),
  ('radiador',     'Radiadores',     'Equipos',      2),
  ('refrigerador', 'Refrigeradores', 'Equipos',      3),
  ('fosa',         'Fosas y agua',   'Predio',       4),
  ('bodega',       'Bodegas',        'Predio',       5),
  ('bano',         'Baños',          'Habitaciones', 6),
  ('tv',           'Televisores',    'Habitaciones', 7),
  ('puerta',       'Puertas',        'Habitaciones', 8);

INSERT INTO zona (codigo, nombre, tipo) VALUES
  ('hotel',   'Hotel (general)',   'edificio'),
  ('eventos', 'Centro de eventos', 'edificio'),
  ('casa',    'Casa / parcela',    'edificio'),
  ('sol',     'Cabaña Sol',        'cabana'),
  ('luna',    'Cabaña Luna',       'cabana');

INSERT INTO zona (codigo, nombre, tipo, piso)
SELECT n::text, 'Habitación ' || n, 'habitacion', (n / 100)
FROM generate_series(101, 108) n
UNION ALL SELECT n::text, 'Habitación ' || n, 'habitacion', (n / 100) FROM generate_series(201, 208) n
UNION ALL SELECT n::text, 'Habitación ' || n, 'habitacion', (n / 100) FROM generate_series(301, 308) n;

COMMIT;
