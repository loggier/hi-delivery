-- Adds the foreign key constraint to the user_id column in the businesses table
-- and sets up cascade deletion, so that deleting a business also deletes the associated user.

ALTER TABLE "grupohubs"."businesses"
ADD CONSTRAINT "businesses_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "grupohubs"."users"("id")
ON DELETE CASCADE;
