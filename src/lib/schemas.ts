import { z } from "zod";

const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

export const signInSchema = z.object({
  email: z.string().email({ message: "Por favor, ingresa un email válido." }),
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


export const userSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email(),
  role: z.enum(["ADMIN"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const phoneRegex = /^(?:\+?52)?(\d{10})$/;

const normalizePhone = (phone: string) => {
  const match = phone.match(phoneRegex);
  if (match) {
    return `+52${match[1]}`;
  }
  return phone;
};

export const businessSchema = z.object({
    name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
    type: z.enum(["restaurant", "store", "service"], { required_error: "Debes seleccionar un tipo."}),
    categoryId: z.string({ required_error: "Debes seleccionar una categoría." }),
    email: z.string().email({ message: "Por favor, ingresa un email válido." }),
    ownerName: z.string().min(2, { message: "El nombre del contacto debe tener al menos 2 caracteres." }),
    phoneWhatsApp: z.string()
        .regex(phoneRegex, { message: "El número debe ser de 10 dígitos (u opcionalmente empezar con 52)." })
        .transform(normalizePhone),
    location: z.object({
        addressLine: z.string().min(5, { message: "La dirección debe tener al menos 5 caracteres." }),
        neighborhood: z.string().min(3, { message: "La colonia debe tener al menos 3 caracteres." }),
        city: z.string().min(3, { message: "La ciudad debe tener al menos 3 caracteres." }),
        state: z.string().min(3, { message: "El estado debe tener al menos 3 caracteres." }),
        zip: z.string().regex(/^\d{5}$/, { message: "El código postal debe ser de 5 dígitos." }),
        lat: z.number().optional(),
        lng: z.number().optional(),
    }),
    taxId: z.string().optional(),
    website: z.string().url({ message: "Por favor, ingresa una URL válida." }).optional().or(z.literal('')),
    instagram: z.string().optional(),
    logoUrl: z.string().optional(),
    notes: z.string().max(500, { message: "Las notas no pueden exceder los 500 caracteres." }).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING_REVIEW"]),
});


export const productSchema = z.object({
  name: z.string().min(2, { message: "El nombre del producto debe tener al menos 2 caracteres." }),
  sku: z.string().optional(),
  price: z.coerce.number().min(0.01, { message: "El precio debe ser mayor que 0." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  businessId: z.string({ required_error: "Por favor, selecciona un negocio." }),
  categoryId: z.string({ required_error: "Por favor, selecciona una categoría." }),
  imageUrl: z.string().optional(),
});


const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const fileSchema = (message: string) => z.any()
    .refine(files => files?.length == 1, message)
    .refine(files => files?.[0]?.size <= 5000000, `El tamaño máximo es 5MB.`)
    .refine(
      files => ["image/jpeg", "image/png", "application/pdf"].includes(files?.[0]?.type),
      "Solo se permiten formatos .jpg, .png y .pdf"
    );

const imageFileSchema = (message: string) => z.any()
    .refine(files => files?.length == 1, message)
    .refine(files => files?.[0]?.size <= 5000000, `El tamaño máximo es 5MB.`)
    .refine(
      files => ["image/jpeg", "image/png"].includes(files?.[0]?.type),
      "Solo se permiten formatos .jpg y .png"
    );


const motoPhotosSchema = z.any()
    .refine(files => files && files.length > 0, "Debes subir al menos una foto.")
    .refine(files => files?.length <= 4, "Puedes subir un máximo de 4 fotos.")
    .refine(files => files && Array.from(files).every((file: any) => file.size <= 5000000), `El tamaño máximo por foto es 5MB.`)
    .refine(files => files && Array.from(files).every((file: any) => ["image/jpeg", "image/png"].includes(file.type)), "Solo se permiten formatos .jpg y .png");


export const riderApplicationSchema = z.object({
    // Información del repartidor
    firstName: z.string().min(2, { message: "El nombre es requerido." }),
    lastName: z.string().min(2, { message: "El apellido paterno es requerido." }),
    motherLastName: z.string().optional(),
    birthDate: z.date({ required_error: "La fecha de nacimiento es requerida." }).refine(date => {
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        return date <= eighteenYearsAgo;
    }, { message: "Debes ser mayor de 18 años." }),
    zone: z.enum(['Monterrey', 'Culiacan', 'Mazatlan'], { required_error: "La zona es requerida." }),
    address: z.string().min(5, { message: "La dirección es requerida." }),
    ineFrontUrl: fileSchema("El frente del INE es requerido."),
    ineBackUrl: fileSchema("El reverso del INE es requerido."),
    proofOfAddressUrl: fileSchema("El comprobante de domicilio es requerido."),

    // Vehículo
    ownership: z.enum(['propia', 'rentada', 'prestada'], { required_error: "Debes seleccionar una opción." }),
    brand: z.enum(['Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki', 'Otra'], { required_error: "La marca es requerida." }),
    brandOther: z.string().optional(),
    year: z.coerce.number({ required_error: "El año es requerido." }).min(2010).max(new Date().getFullYear() + 1),
    model: z.string().min(1, { message: "El modelo es requerido." }),
    color: z.string().min(2, { message: "El color es requerido." }),
    plate: z.string().min(4, { message: "La placa es requerida." }),
    licenseFrontUrl: fileSchema("El frente de la licencia es requerido."),
    licenseBackUrl: fileSchema("El reverso de la licencia es requerido."),
    licenseValidUntil: z.date({ required_error: "La vigencia de la licencia es requerida." }).min(new Date(), { message: "La licencia no puede estar vencida." }),
    circulationCardFrontUrl: fileSchema("El frente de la tarjeta de circulación es requerido."),
    circulationCardBackUrl: fileSchema("El reverso de la tarjeta de circulación es requerido."),
    motoPhotos: motoPhotosSchema,

    // Póliza
    insurer: z.string().min(2, { message: "La aseguradora es requerida." }),
    policyNumber: z.string().min(5, { message: "El número de póliza es requerido." }),
    policyValidUntil: z.date({ required_error: "La vigencia de la póliza es requerida." }).min(new Date(), { message: "La póliza no puede estar vencida." }),
    policyFirstPageUrl: fileSchema("La primera página de la póliza es requerida."),

    // Extras
    hasHelmet: z.boolean().default(false),
    hasUniform: z.boolean().default(false),
    hasBox: z.boolean().default(false),
    
    // Login
    email: z.string().email({ message: "Por favor, ingresa un email válido." }),
    phoneE164: z.string()
        .regex(phoneRegex, { message: "El número debe ser de 10 dígitos (u opcionalmente empezar con 52)." })
        .transform(normalizePhone),
    password: z.string().regex(passwordRegex, { message: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo." }),
    passwordConfirmation: z.string(),

    // Foto
    avatar1x1Url: imageFileSchema("La foto de perfil es requerida."),
}).refine(data => data.password === data.passwordConfirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["passwordConfirmation"],
});


export const zoneSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});
