-- Add created_at and updated_at columns to the roles table
ALTER TABLE grupohubs.roles
ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Create a trigger to automatically update the updated_at timestamp on role update
CREATE TRIGGER set_roles_updated_at
BEFORE UPDATE ON grupohubs.roles
FOR EACH ROW
EXECUTE PROCEDURE grupohubs.trigger_set_timestamp();
