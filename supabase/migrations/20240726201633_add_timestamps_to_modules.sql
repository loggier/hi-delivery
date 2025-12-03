-- Add created_at and updated_at columns to the modules table

ALTER TABLE grupohubs.modules
ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE TRIGGER set_modules_timestamp
BEFORE UPDATE ON grupohubs.modules
FOR EACH ROW
EXECUTE FUNCTION grupohubs.trigger_set_timestamp();
