
"use client";

import { z } from "zod";

const phoneRegex = /^(?:\+?52)?(\d{10})$/;

const normalizePhone = (phone: string) => {
  const match = phone.match(phoneRegex);
  if (match) {
    return `+52${match[1]}`;
  }
  return phone;
};

// Mínimo 8 caracteres, y al menos una mayúscula, un número o un símbolo.
const passwordRegex = /^(?=.*[A-Z\d@$!%*?&]).{8,}$/;

const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ACCEPTED_DOCUMENT_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

const fileSchema = (message: string) => z.instanceof(FileList, { message })
    .refine((files) => files?.length > 0, message)
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 5MB.`)
    .refine((files) => ACCEPTED_DOCUMENT_TYPES.includes(files?.[0]?.type), "Solo se permiten formatos .jpg, .png y .pdf");

const imageFileSchema = (message: string) => z.instanceof(FileList, { message })
    .refine((files) => files?.length > 0, message)
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 5MB.`)
    .refine((files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type), "Solo se permiten formatos .jpg y .png");


export const riderApplicationSchema = z.object({
    // Step 1
    firstName: z.string().min(2, { message: "El nombre es requerido." }),
    lastName: z.string().min(2, { message: "El apellido paterno es requerido." }),
    email: z.string().email({ message: "Por favor, ingresa un email válido." }),
    phoneE164: z.string()
        .regex(phoneRegex, { message: "El número debe ser de 10 dígitos (u opcionalmente empezar con 52)." })
        .transform(normalizePhone),
    password: z.string().regex(passwordRegex, { message: "La contraseña debe tener al menos 8 caracteres y una mayúscula, un número o un símbolo." }),
    passwordConfirmation: z.string(),

    // Step 2
    motherLastName: z.string().optional(),
    birthDate: z.date({ required_error: "La fecha de nacimiento es requerida." }).refine(date => {
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        return date <= eighteenYearsAgo;
    }, { message: "Debes ser mayor de 18 años." }),
    zone_id: z.string({ required_error: "La zona es requerida." }),
    address: z.string().min(5, { message: "La dirección es requerida." }),
    ineFrontUrl: fileSchema("El frente del INE es requerido.").nullable(),
    ineBackUrl: fileSchema("El reverso del INE es requerido.").nullable(),
    proofOfAddressUrl: fileSchema("El comprobante de domicilio es requerido.").nullable(),

    // Step 3
    ownership: z.enum(['propia', 'rentada', 'prestada'], { required_error: "Debes seleccionar una opción." }),
    brand: z.enum(['Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki', 'Otra'], { required_error: "La marca es requerida." }),
    brandOther: z.string().optional(),
    year: z.coerce.number({ required_error: "El año es requerido." }).min(2010).max(new Date().getFullYear() + 1),
    model: z.string().min(1, { message: "El modelo es requerido." }),
    color: z.string().min(2, { message: "El color es requerido." }),
    plate: z.string().min(4, { message: "La placa es requerida." }),
    licenseFrontUrl: fileSchema("El frente de la licencia es requerido.").nullable(),
    licenseBackUrl: fileSchema("El reverso de la licencia es requerido.").nullable(),
    licenseValidUntil: z.date({ required_error: "La vigencia de la licencia es requerida." }).min(new Date(), { message: "La licencia no puede estar vencida." }),
    circulationCardFrontUrl: fileSchema("El frente de la tarjeta de circulación es requerido.").nullable(),
    circulationCardBackUrl: fileSchema("El reverso de la tarjeta de circulación es requerido.").nullable(),
    motoPhotoFront: imageFileSchema("La foto frontal de la moto es requerida.").nullable(),
    motoPhotoBack: imageFileSchema("La foto trasera de la moto es requerida.").nullable(),
    motoPhotoLeft: imageFileSchema("La foto del lado izquierdo es requerida.").nullable(),
    motoPhotoRight: imageFileSchema("La foto del lado derecho es requerida.").nullable(),
    
    // Step 4
    insurer: z.string().min(2, { message: "La aseguradora es requerida." }),
    policyNumber: z.string().min(5, { message: "El número de póliza es requerido." }),
    policyValidUntil: z.date({ required_error: "La vigencia de la póliza es requerida." }).min(new Date(), { message: "La póliza no puede estar vencida." }),
    policyFirstPageUrl: fileSchema("La primera página de la póliza es requerida.").nullable(),

    // Step 5
    hasHelmet: z.boolean().default(false),
    hasUniform: z.boolean().default(false),
    hasBox: z.boolean().default(false),
    
    // Step 6
    avatar1x1Url: imageFileSchema("La foto de perfil es requerida.").nullable(),

}).refine(data => data.password === data.passwordConfirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
});
