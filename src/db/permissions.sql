-- Grant usage on the schema to the anon role
GRANT USAGE ON SCHEMA grupohubs TO anon;

-- Grant all privileges on all tables in the schema to the anon role
GRANT ALL ON ALL TABLES IN SCHEMA grupohubs TO anon;

-- Grant all privileges on all sequences in the schema to the anon role (important for auto-incrementing IDs if you use them)
GRANT ALL ON ALL SEQUENCES IN SCHEMA grupohubs TO anon;

-- Optional but recommended: Alter default privileges so that future tables created in this schema also get these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA grupohubs GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA grupohubs GRANT ALL ON SEQUENCES TO anon;

-- Also, ensure the service_role has the necessary permissions, just in case.
GRANT USAGE ON SCHEMA grupohubs TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA grupohubs TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA grupohubs TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA grupohubs GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA grupohubs GRANT ALL ON SEQUENCES TO service_role;
