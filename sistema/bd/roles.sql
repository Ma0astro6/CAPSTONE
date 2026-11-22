-- Roles editables y vista por rol. El administrador siempre ve todo en la aplicación.

CREATE TABLE IF NOT EXISTS rol (
  codigo     TEXT PRIMARY KEY,
  nombre     TEXT NOT NULL UNIQUE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rol (codigo, nombre) VALUES
  ('admin', 'Administrador'),
  ('prevencion', 'Prevencionista'),
  ('mantencion', 'Mantención'),
  ('usuario', 'Usuario')
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE usuario ALTER COLUMN rol DROP DEFAULT;
ALTER TABLE usuario ALTER COLUMN rol TYPE TEXT USING rol::text;
ALTER TABLE usuario ALTER COLUMN rol SET DEFAULT 'mantencion';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usuario_rol_fk'
  ) THEN
    ALTER TABLE usuario
      ADD CONSTRAINT usuario_rol_fk FOREIGN KEY (rol) REFERENCES rol(codigo);
  END IF;
END $$;

DROP TYPE IF EXISTS rol_usuario;

CREATE TABLE IF NOT EXISTS permiso_menu (
  rol_codigo  TEXT NOT NULL REFERENCES rol(codigo) ON DELETE CASCADE,
  opcion      TEXT NOT NULL,
  visible     BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (rol_codigo, opcion)
);

CREATE OR REPLACE FUNCTION public.opciones_menu()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY[
    'mg','me','re','gantt','reactivas','equipos','predio',
    'habitaciones','prevencion','proveedores','bodega'
  ]
$$;

INSERT INTO permiso_menu (rol_codigo, opcion, visible)
SELECT r.codigo, o.opcion, TRUE
FROM rol r
CROSS JOIN unnest(public.opciones_menu()) AS o(opcion)
ON CONFLICT (rol_codigo, opcion) DO NOTHING;

CREATE OR REPLACE FUNCTION public.login_usuario(p_login text, p_clave text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  u public.usuario%ROWTYPE;
  v_login text := lower(trim(coalesce(p_login, '')));
  v_rol text;
BEGIN
  IF v_login = '' OR coalesce(p_clave, '') = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario y contraseña son obligatorios');
  END IF;

  SELECT * INTO u
  FROM public.usuario
  WHERE activo
    AND (
      lower(correo) = v_login
      OR lower(coalesce(login, '')) = v_login
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario o contraseña incorrectos');
  END IF;

  IF u.clave_hash::text IS DISTINCT FROM crypt(p_clave, u.clave_hash::text) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario o contraseña incorrectos');
  END IF;

  SELECT nombre INTO v_rol FROM public.rol WHERE codigo = u.rol;

  RETURN json_build_object(
    'ok', true,
    'id', u.id,
    'nombre', u.nombre,
    'correo', u.correo,
    'login', u.login,
    'rol', u.rol,
    'rol_nombre', coalesce(v_rol, u.rol)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_usuario(
  p_nombre text,
  p_login text,
  p_correo text,
  p_clave text,
  p_rol text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_id int;
  v_rol text := lower(trim(coalesce(p_rol, '')));
BEGIN
  IF coalesce(trim(p_nombre), '') = ''
     OR coalesce(trim(p_login), '') = ''
     OR coalesce(trim(p_correo), '') = ''
     OR coalesce(p_clave, '') = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Faltan nombre, usuario, correo o contraseña');
  END IF;
  IF length(p_clave) < 6 THEN
    RETURN json_build_object('ok', false, 'error', 'La contraseña necesita al menos 6 caracteres');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rol WHERE codigo = v_rol) THEN
    RETURN json_build_object('ok', false, 'error', 'Ese tipo de usuario no existe');
  END IF;

  INSERT INTO public.usuario (nombre, correo, login, clave_hash, rol, activo)
  VALUES (
    trim(p_nombre),
    lower(trim(p_correo)),
    lower(trim(p_login)),
    crypt(p_clave, gen_salt('bf')),
    v_rol,
    TRUE
  )
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'id', v_id);
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('ok', false, 'error', 'Ese correo o usuario ya existe');
END;
$$;

CREATE OR REPLACE FUNCTION public.crear_rol(p_nombre text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_codigo text;
BEGIN
  IF v_nombre = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Falta el nombre del tipo');
  END IF;
  v_codigo := lower(regexp_replace(v_nombre, '[^a-zA-Z0-9]+', '', 'g'));
  IF v_codigo = '' THEN
    RETURN json_build_object('ok', false, 'error', 'El nombre necesita letras o números');
  END IF;

  INSERT INTO public.rol (codigo, nombre) VALUES (v_codigo, v_nombre);

  INSERT INTO public.permiso_menu (rol_codigo, opcion, visible)
  SELECT v_codigo, o.opcion, TRUE
  FROM unnest(public.opciones_menu()) AS o(opcion);

  RETURN json_build_object('ok', true, 'codigo', v_codigo, 'nombre', v_nombre);
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('ok', false, 'error', 'Ese tipo de usuario ya existe');
END;
$$;

CREATE OR REPLACE FUNCTION public.guardar_vista(p_rol text, p_opciones jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol text := lower(trim(coalesce(p_rol, '')));
  v_opcion text;
  v_visible boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rol WHERE codigo = v_rol) THEN
    RETURN json_build_object('ok', false, 'error', 'Ese rol no existe');
  END IF;
  IF p_opciones IS NULL OR jsonb_typeof(p_opciones) <> 'object' THEN
    RETURN json_build_object('ok', false, 'error', 'Faltan las opciones');
  END IF;

  FOR v_opcion, v_visible IN
    SELECT key, value::boolean
    FROM jsonb_each_text(p_opciones)
    WHERE key = ANY (public.opciones_menu())
  LOOP
    INSERT INTO public.permiso_menu (rol_codigo, opcion, visible)
    VALUES (v_rol, v_opcion, coalesce(v_visible, TRUE))
    ON CONFLICT (rol_codigo, opcion)
    DO UPDATE SET visible = EXCLUDED.visible;
  END LOOP;

  RETURN json_build_object('ok', true);
END;
$$;

ALTER TABLE rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE permiso_menu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rol_app ON rol;
CREATE POLICY rol_app ON rol FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS permiso_app ON permiso_menu;
CREATE POLICY permiso_app ON permiso_menu FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON rol TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON permiso_menu TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_usuario(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_usuario(text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_rol(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_vista(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.opciones_menu() TO anon, authenticated;

-- Modificar y eliminar usuarios desde Agregar usuarios.
CREATE OR REPLACE FUNCTION public.modificar_usuario(
  p_id int,
  p_nombre text,
  p_login text,
  p_correo text,
  p_rol text,
  p_clave text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_rol text := lower(trim(coalesce(p_rol, '')));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.usuario WHERE id = p_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Ese usuario no existe');
  END IF;
  IF coalesce(trim(p_nombre), '') = ''
     OR coalesce(trim(p_login), '') = ''
     OR coalesce(trim(p_correo), '') = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Faltan nombre, usuario o correo');
  END IF;
  IF coalesce(p_clave, '') <> '' AND length(p_clave) < 6 THEN
    RETURN json_build_object('ok', false, 'error', 'La contraseña nueva necesita al menos 6 caracteres');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rol WHERE codigo = v_rol) THEN
    RETURN json_build_object('ok', false, 'error', 'Ese tipo de usuario no existe');
  END IF;

  UPDATE public.usuario
  SET nombre = trim(p_nombre),
      login = lower(trim(p_login)),
      correo = lower(trim(p_correo)),
      rol = v_rol,
      clave_hash = CASE
        WHEN coalesce(p_clave, '') = '' THEN clave_hash
        ELSE crypt(p_clave, gen_salt('bf'))
      END
  WHERE id = p_id;

  RETURN json_build_object('ok', true, 'id', p_id);
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('ok', false, 'error', 'Ese correo o usuario ya existe');
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_usuario(p_id int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol text;
  v_admins int;
BEGIN
  SELECT rol INTO v_rol FROM public.usuario WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Ese usuario no existe');
  END IF;

  SELECT count(*) INTO v_admins
  FROM public.usuario
  WHERE rol = 'admin' AND activo AND id <> p_id;

  IF v_rol = 'admin' AND v_admins = 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Tiene que quedar al menos un administrador');
  END IF;

  DELETE FROM public.usuario WHERE id = p_id;
  RETURN json_build_object('ok', true);
EXCEPTION WHEN foreign_key_violation THEN
  RETURN json_build_object('ok', false, 'error', 'Este usuario tiene visitas o compras. No se puede eliminar.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.modificar_usuario(int, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_usuario(int) TO anon, authenticated;

-- Recuadros del inicio por tipo de usuario. Sin filas, se ve el inicio de siempre.
CREATE TABLE IF NOT EXISTS inicio_boton (
  rol_codigo  TEXT NOT NULL REFERENCES rol(codigo) ON DELETE CASCADE,
  puesto      SMALLINT NOT NULL CHECK (puesto BETWEEN 1 AND 4),
  codigo      TEXT NOT NULL,
  PRIMARY KEY (rol_codigo, puesto)
);

CREATE OR REPLACE FUNCTION public.guardar_inicio(p_rol text, p_puestos jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rol text := lower(trim(coalesce(p_rol, '')));
  v_puesto int;
  v_codigo text;
  v_ok text[] := ARRAY[
    'mg','me','re','bodega','gantt','reactivas','calendario','proveedores','prevencion','plan_prev',
    'crear_eq','buscar_eq','crear_predio','buscar_predio','crear_hab','crear_prev','buscar_prev'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rol WHERE codigo = v_rol) THEN
    RETURN json_build_object('ok', false, 'error', 'Ese tipo de usuario no existe');
  END IF;
  IF p_puestos IS NULL OR jsonb_typeof(p_puestos) <> 'object' THEN
    p_puestos := '{}'::jsonb;
  END IF;

  FOR v_puesto, v_codigo IN
    SELECT key::int, value
    FROM jsonb_each_text(p_puestos)
    WHERE key ~ '^[1-4]$'
      AND coalesce(value, '') <> ''
  LOOP
    IF NOT (v_codigo = ANY (v_ok)) THEN
      RETURN json_build_object('ok', false, 'error', 'Ese botón no existe');
    END IF;
  END LOOP;

  DELETE FROM public.inicio_boton WHERE rol_codigo = v_rol;

  INSERT INTO public.inicio_boton (rol_codigo, puesto, codigo)
  SELECT v_rol, key::int, value
  FROM jsonb_each_text(p_puestos)
  WHERE key ~ '^[1-4]$'
    AND coalesce(value, '') <> ''
    AND value = ANY (v_ok);

  RETURN json_build_object('ok', true);
END;
$$;

ALTER TABLE inicio_boton ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS inicio_boton_app ON inicio_boton;
CREATE POLICY inicio_boton_app ON inicio_boton FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON inicio_boton TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardar_inicio(text, jsonb) TO anon, authenticated;
