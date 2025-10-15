'use server';

import bcrypt from 'bcryptjs';

/**
 * Verifica si una contraseña en texto plano coincide con un hash.
 * @param password La contraseña en texto plano.
 * @param hashedPassword El hash almacenado.
 * @returns Una promesa que se resuelve a `true` si las contraseñas coinciden, de lo contrario `false`.
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

/**
 * Genera un hash para una contraseña.
 * @param password La contraseña en texto plano a hashear.
 * @returns Una promesa que se resuelve al hash de la contraseña.
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}
