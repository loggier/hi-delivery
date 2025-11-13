import { z } from "zod";

const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

export const signInSchema = z.object({
  email: z.string().email({ message: "Por favor, ingresa un email válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
  remember: z.boolean().default(false).optional(),
});

export const productCategorySchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  slug: z.string().min(2, { message: "El slug debe tener al menos 2 caracteres." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "El slug solo puede contener letras minúsculas, números y guiones." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const businessCategorySchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  type: z.enum(["restaurant", "store", "service"], { required_error: "Debes seleccionar un tipo."}),
  active: z.boolean().default(true),
});

const permissionsSchema = z.object({
  recolectarEfectivo: z.boolean().default(false),
  complemento: z.boolean().default(false),
  atributo: z.boolean().default(false),
  banner: z.boolean().default(false),
  campaña: z.boolean().default(false),
  categoria: z.boolean().default(false),
  cupon: z.boolean().default(false),
  reembolso: z.boolean().default(false),
  gestionDeClientes: z.boolean().default(false),
  repartidor: z.boolean().default(false),
  proveerGanancias: z.boolean().default(false),
  empleado: z.boolean().default(false),
  producto: z.boolean().default(false),
  notificacion: z.boolean().default(false),
  pedido: z.boolean().default(false),
  tienda: z.boolean().default(false),
  reporte: z.boolean().default(false),
  configuraciones: z.boolean().default(false),
  listaDeRetiros: z.boolean().default(false),
  zona: z.boolean().default(false),
  modulo: z.boolean().default(false),
  paquete: z.boolean().default(false),
  puntoDeVenta: z.boolean().default(false),
  unidad: z.boolean().default(false),
  suscripcion: z.boolean().default(false),
});

export const roleSchema = z.object({
    name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
    permissions: permissionsSchema,
});

export const userSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email(),
  role_id: z.string({ required_error: "Debe seleccionar un rol."}),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  password: z.string().optional(), // Password is optional when editing, required when creating.
});

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

export const businessSchema = z.object({
    name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
    type: z.enum(["restaurant", "store", "service"], { required_error: "Debes seleccionar un tipo."}),
    category_id: z.string({ required_error: "Debes seleccionar una categoría." }),
    zone_id: z.string().optional(),
    email: z.string().email({ message: "Por favor, ingresa un email válido." }),
    owner_name: z.string().min(2, { message: "El nombre del contacto debe tener al menos 2 caracteres." }),
    phone_whatsapp: z.string()
        .regex(phoneRegex, { message: "El número debe ser de 10 dígitos (u opcionalmente empezar con 52)." })
        .transform(normalizePhone),
    address_line: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
    neighborhood: z.string().min(3, { message: "La colonia debe tener al menos 3 caracteres." }),
    city: z.string().min(3, { message: "La ciudad debe tener al menos 3 caracteres." }),
    state: z.string().min(3, { message: "El estado debe tener al menos 3 caracteres." }),
    zip_code: z.string().regex(/^\d{5}$/, { message: "El código postal debe ser de 5 dígitos." }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    tax_id: z.string().optional(),
    website: z.string().url({ message: "Por favor, ingresa una URL válida." }).optional().or(z.literal('')),
    instagram: z.string().optional(),
    logo_url: z.string().optional(),
    notes: z.string().max(500, { message: "Las notas no pueden exceder los 500 caracteres." }).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING_REVIEW"]),
    // Campos de contraseña (opcionales, solo para creación)
    password: z.string().optional(),
    passwordConfirmation: z.string().optional(),
}).refine(data => {
    // Si se proporciona una contraseña, la confirmación también debe proporcionarse y coincidir.
    if (data.password) {
        return data.password === data.passwordConfirmation;
    }
    return true; // Si no hay contraseña, la validación pasa.
}, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
}).refine(data => {
    if (data.password) {
        return passwordRegex.test(data.password);
    }
    return true;
}, {
    message: "La contraseña debe tener al menos 8 caracteres y una mayúscula, un número o un símbolo.",
    path: ["password"],
});


// A simplified schema for server-side validation of the initial account creation
export const riderAccountCreationSchema = z.object({
    firstName: z.string().min(2, { message: "El nombre es requerido." }),
    lastName: z.string().min(2, { message: "El apellido paterno es requerido." }),
    email: z.string().email({ message: "Por favor, ingresa un email válido." }),
    phoneE164: z.string()
        .regex(phoneRegex, { message: "El número debe ser de 10 dígitos (u opcionalmente empezar con 52)." })
        .transform(normalizePhone),
    password: z.string().regex(passwordRegex, { message: "La contraseña debe tener al menos 8 caracteres y una mayúscula, un número o un símbolo." }),
    passwordConfirmation: z.string(),
}).refine(data => data.password === data.passwordConfirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
});


const isClient = typeof window !== 'undefined';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

const fileSchema = (message: string) => 
  isClient
    ? z.instanceof(FileList, { message })
        .refine((files) => files?.length > 0, message)
        .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 5MB.`)
        .refine((files) => ACCEPTED_DOCUMENT_TYPES.includes(files?.[0]?.type), "Solo se permiten formatos .jpg, .png y .pdf")
    : z.any();

const imageFileSchema = (message: string) =>
  isClient
    ? z.instanceof(FileList, { message })
        .refine((files) => files?.length > 0, message)
        .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `El tamaño máximo es 5MB.`)
        .refine((files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type), "Solo se permiten formatos .jpg y .png")
    : z.any();


export const riderApplicationSchema = riderAccountCreationSchema.extend({
    motherLastName: z.string().optional(),
    birthDate: z.date({ required_error: "La fecha de nacimiento es requerida." }).refine(d => new Date().getFullYear() - d.getFullYear() >= 18, { message: "Debes ser mayor de 18 años." }),
    zone_id: z.string({ required_error: "La zona es requerida." }),
    address: z.string().min(5, { message: "La dirección es requerida." }),
    ineFrontUrl: fileSchema("El frente del INE es requerido.").nullable(),
    ineBackUrl: fileSchema("El reverso del INE es requerido.").nullable(),
    proofOfAddressUrl: fileSchema("El comprobante de domicilio es requerido.").nullable(),
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
    insurer: z.string().min(2, { message: "La aseguradora es requerida." }),
    policyNumber: z.string().min(5, { message: "El número de póliza es requerido." }),
    policyValidUntil: z.date({ required_error: "La vigencia de la póliza es requerida." }).min(new Date(), { message: "La póliza no puede estar vencida." }),
    policyFirstPageUrl: fileSchema("La primera página de la póliza es requerida.").nullable(),
    hasHelmet: z.boolean().default(false),
    hasUniform: z.boolean().default(false),
    hasBox: z.boolean().default(false),
    avatar1x1Url: imageFileSchema("La foto de perfil es requerida.").nullable(),
});


export const zoneSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  geofence: z.array(z.object({ lat: z.number(), lng: z.number() })).optional().refine(val => val && val.length >= 3, { message: 'La geocerca debe tener al menos 3 puntos.' }),
});

export const planSchema = z.object({
    name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    price: z.coerce.number().min(0, { message: "El precio debe ser un valor positivo." }),
    validity: z.enum(['mensual', 'quincenal', 'semanal', 'anual']),
    rider_fee: z.coerce.number().min(0, { message: "La cuota debe ser un valor positivo." }),
    fee_per_km: z.coerce.number().min(0, { message: "La cuota por km debe ser un valor positivo." }),
    min_shipping_fee: z.coerce.number().min(0, { message: "La cuota mínima de envío debe ser un valor positivo." }),
    min_distance: z.coerce.number().min(0, { message: "La distancia mínima debe ser un valor positivo." }),
    details: z.string().max(280, { message: "Los detalles no pueden exceder los 280 caracteres." }).optional(),
});
