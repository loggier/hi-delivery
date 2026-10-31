-- Reenvío administrativo del enlace de registro de repartidores (forward-only, sin DROP ni DELETE).
-- Límite: máximo 3 reenvíos por repartidor en una ventana de 24 horas, y auditoría de quién reenvió.
-- Pendiente de aplicar por db-supabase. No aplicar desde código.

ALTER TABLE grupohubs.riders ADD COLUMN IF NOT EXISTS registration_resend_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE grupohubs.riders ADD COLUMN IF NOT EXISTS registration_resend_window_started_at TIMESTAMPTZ;
ALTER TABLE grupohubs.riders ADD COLUMN IF NOT EXISTS registration_last_resent_at TIMESTAMPTZ;
ALTER TABLE grupohubs.riders ADD COLUMN IF NOT EXISTS registration_last_resent_by TEXT;

