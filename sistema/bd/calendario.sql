-- Próxima mantención programada desde el calendario (equipos y predio).
ALTER TABLE public.activo ADD COLUMN IF NOT EXISTS proxima_programada date;
