-- Agrega la columna user_id a la tabla de negocios y la vincula a la tabla de usuarios.
ALTER TABLE
  grupohubs.businesses
ADD
  COLUMN user_id VARCHAR(255);

-- Opcionalmente, puedes agregar la restricción de clave foránea si los usuarios ya existen
-- ALTER TABLE grupohubs.businesses
-- ADD CONSTRAINT fk_user
-- FOREIGN KEY (user_id) REFERENCES grupohubs.users(id) ON DELETE SET NULL;
