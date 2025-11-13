
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
