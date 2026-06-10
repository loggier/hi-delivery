ALTER TABLE grupohubs.system_settings
ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT NOT NULL DEFAULT 'hi-delivery',
ADD COLUMN IF NOT EXISTS evolution_phone_number TEXT;
