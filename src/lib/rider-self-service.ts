import 'server-only';

import { z } from 'zod';

/**
 * Reglas de lo que un repartidor puede modificar por sí mismo desde el wizard.
 * Todo lo que no esté aquí (status, user_id, zone_id, password_hash, email, etc.) se descarta.
 */

export const RIDER_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const VEHICLE_OWNERSHIP = ['propia', 'rentada', 'prestada'] as const;
const CURRENT_YEAR = new Date().getFullYear();

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'La fecha no es válida.');

const booleanString = z.enum(['true', 'false']);

/** Campos de texto que el repartidor puede enviar. Las claves desconocidas se eliminan al parsear. */
export const riderSelfTextSchema = z.object({
  motherLastName: z.string().trim().max(80).optional(),
  birthDate: dateString.optional(),
  address: z.string().trim().min(5, 'La dirección es requerida.').max(300).optional(),
  ownership: z.enum(VEHICLE_OWNERSHIP).optional(),
  brand: z.string().trim().min(1).max(60).optional(),
  year: z.coerce.number().int().min(1990).max(CURRENT_YEAR + 1).optional(),
  model: z.string().trim().max(60).optional(),
  color: z.string().trim().max(40).optional(),
  plate: z.string().trim().min(4).max(12).optional(),
  licenseValidUntil: dateString.optional(),
  insurer: z.string().trim().max(100).optional(),
  policyNumber: z.string().trim().max(60).optional(),
  policyValidUntil: dateString.optional(),
  hasHelmet: booleanString.optional(),
  hasUniform: booleanString.optional(),
  hasBox: booleanString.optional(),
});

export type RiderSelfTextFields = z.infer<typeof riderSelfTextSchema>;

const TEXT_FIELD_COLUMNS: Record<keyof RiderSelfTextFields, string> = {
  motherLastName: 'mother_last_name',
  birthDate: 'birth_date',
  address: 'address',
  ownership: 'ownership',
  brand: 'brand',
  year: 'year',
  model: 'model',
  color: 'color',
  plate: 'plate',
  licenseValidUntil: 'license_valid_until',
  insurer: 'insurer',
  policyNumber: 'policy_number',
  policyValidUntil: 'policy_valid_until',
  hasHelmet: 'has_helmet',
  hasUniform: 'has_uniform',
  hasBox: 'has_box',
};

const DATE_TEXT_FIELDS = new Set<keyof RiderSelfTextFields>(['birthDate', 'licenseValidUntil', 'policyValidUntil']);
const BOOLEAN_TEXT_FIELDS = new Set<keyof RiderSelfTextFields>(['hasHelmet', 'hasUniform', 'hasBox']);

/** Convierte los campos de texto validados a columnas de `riders`. Omite los campos ausentes. */
export function buildRiderTextColumns(fields: RiderSelfTextFields): Record<string, string | number | boolean> {
  const columns: Record<string, string | number | boolean> = {};

  for (const field of Object.keys(TEXT_FIELD_COLUMNS) as Array<keyof RiderSelfTextFields>) {
    const raw = fields[field];
    if (raw === undefined) continue;

    const column = TEXT_FIELD_COLUMNS[field];
    if (DATE_TEXT_FIELDS.has(field)) {
      columns[column] = new Date(String(raw)).toISOString();
    } else if (BOOLEAN_TEXT_FIELDS.has(field)) {
      columns[column] = raw === 'true';
    } else {
      columns[column] = raw as string | number;
    }
  }

  return columns;
}

/** Archivos de documentos del repartidor: nombre del campo -> columna de `riders`. */
export const RIDER_DOCUMENT_COLUMNS: Record<string, string> = {
  ineFrontUrl: 'ine_front_url',
  ineBackUrl: 'ine_back_url',
  proofOfAddressUrl: 'proof_of_address_url',
  licenseFrontUrl: 'license_front_url',
  licenseBackUrl: 'license_back_url',
  circulationCardFrontUrl: 'circulation_card_front_url',
  circulationCardBackUrl: 'circulation_card_back_url',
  policyFirstPageUrl: 'policy_first_page_url',
};

export const RIDER_MOTO_PHOTO_FIELDS = new Set(['motoPhotoFront', 'motoPhotoBack', 'motoPhotoLeft', 'motoPhotoRight']);
export const RIDER_AVATAR_FIELD = 'avatar1x1Url';

export type RiderUploadKind = 'document' | 'image';

/** Devuelve el tipo de subida permitido para un campo de archivo, o null si el campo no está en la lista blanca. */
export function getRiderUploadKind(fieldName: string): RiderUploadKind | null {
  if (Object.prototype.hasOwnProperty.call(RIDER_DOCUMENT_COLUMNS, fieldName)) return 'document';
  if (RIDER_MOTO_PHOTO_FIELDS.has(fieldName) || fieldName === RIDER_AVATAR_FIELD) return 'image';
  return null;
}

type DetectedType = { ext: 'pdf' | 'jpg' | 'png' | 'webp'; mime: string };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

/** Detecta el tipo real por firma binaria. No confía en el nombre ni en el MIME que envía el cliente. */
function detectType(bytes: Uint8Array): DetectedType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return { ext: 'pdf', mime: 'application/pdf' };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { ext: 'jpg', mime: 'image/jpeg' };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: 'png', mime: 'image/png' };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8, 12), [0x57, 0x45, 0x42, 0x50])) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

const ALLOWED_EXTENSIONS: Record<string, DetectedType['ext']> = {
  pdf: 'pdf',
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

export type ValidatedUpload =
  | { ok: true; ext: DetectedType['ext']; mime: string; bytes: ArrayBuffer }
  | { ok: false; message: string };

/**
 * Valida un archivo subido: tamaño máximo, firma binaria, MIME declarado y extensión
 * dentro de la lista blanca. Las fotos (`image`) sólo aceptan imágenes; los documentos también PDF.
 */
export async function validateRiderUpload(file: File, kind: RiderUploadKind): Promise<ValidatedUpload> {
  if (file.size <= 0) return { ok: false, message: 'El archivo está vacío.' };
  if (file.size > RIDER_UPLOAD_MAX_BYTES) {
    return { ok: false, message: `Cada archivo puede pesar hasta ${RIDER_UPLOAD_MAX_BYTES / (1024 * 1024)} MB.` };
  }

  const bytes = await file.arrayBuffer();
  const detected = detectType(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12)));
  if (!detected) return { ok: false, message: 'Formato de archivo no permitido. Usa PDF, JPG, PNG o WEBP.' };
  if (kind === 'image' && detected.ext === 'pdf') {
    return { ok: false, message: 'La foto debe ser una imagen JPG, PNG o WEBP.' };
  }

  const declaredMime = file.type?.toLowerCase();
  if (declaredMime && declaredMime !== detected.mime) {
    return { ok: false, message: 'El tipo del archivo no coincide con su contenido.' };
  }

  if (file.name.includes('.')) {
    const nameExt = (file.name.split('.').pop() ?? '').toLowerCase();
    if (ALLOWED_EXTENSIONS[nameExt] !== detected.ext) {
      return { ok: false, message: 'La extensión del archivo no coincide con su contenido.' };
    }
  }

  return { ok: true, ext: detected.ext, mime: detected.mime, bytes };
}
