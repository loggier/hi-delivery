-- 1. Create the timestamp trigger function inside the 'grupohubs' schema
CREATE OR REPLACE FUNCTION grupohubs.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Add 'created_at' and 'updated_at' columns to the 'modules' table
ALTER TABLE grupohubs.modules
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Drop the trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS set_modules_updated_at ON grupohubs.modules;

-- 4. Create the trigger to automatically update the 'updated_at' column
CREATE TRIGGER set_modules_updated_at
BEFORE UPDATE ON grupohubs.modules
FOR EACH ROW
EXECUTE FUNCTION grupohubs.trigger_set_timestamp();
