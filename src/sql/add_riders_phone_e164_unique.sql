DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'riders_phone_e164_key'
  ) THEN
    ALTER TABLE grupohubs.riders
    ADD CONSTRAINT riders_phone_e164_key UNIQUE (phone_e164);
  END IF;
END $$;
