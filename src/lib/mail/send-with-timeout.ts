export const DEFAULT_EMAIL_TIMEOUT_MS = 8000;

/**
 * Devuelve la promesa original limitada por un tiempo máximo.
 * Si expira antes, rechaza con un error genérico y el timer se limpia en ambos casos.
 * Nota: la operación subyacente no se cancela; sólo deja de esperarse.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number = DEFAULT_EMAIL_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('El envío de correo excedió el tiempo límite.'));
    }, ms);
  });

  return Promise.race([promise, timeout]).then(
    (value) => {
      clearTimeout(timer);
      return value;
    },
    (error: unknown) => {
      clearTimeout(timer);
      throw error;
    },
  );
}
