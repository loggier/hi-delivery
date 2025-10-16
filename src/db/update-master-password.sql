-- Actualiza la contraseña del usuario master con un hash pre-generado.
-- Contraseña original: supersecret

UPDATE grupohubs.users
SET password = '$2a$12$L7R/a/bDtR29m31y1A9Vz.aV3HXB89y/17dI9xYw2d5g/bCE61bCq'
WHERE email = 'master@grupohubs.com';
