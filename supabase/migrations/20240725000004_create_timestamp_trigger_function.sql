
-- 1. Create the function that will be used by the trigger.
CREATE OR REPLACE FUNCTION grupohubs.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the trigger if it exists, to avoid errors on re-run.
DROP TRIGGER IF EXISTS set_modules_updated_at ON grupohubs.modules;

-- 3. Re-create the trigger to use the function.
CREATE TRIGGER set_modules_updated_at
BEFORE UPDATE ON grupohubs.modules
FOR EACH ROW
EXECUTE FUNCTION grupohubs.trigger_set_timestamp();
