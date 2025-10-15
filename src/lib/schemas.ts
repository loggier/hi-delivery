import { z } from "zod";

const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

export const signInSchema = z.object({
  email: z.string().email({ message: "Por favor, ingresa un email válido." }),
});

export const categorySchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  slug: z.string().min(2, { message: "El slug debe tener al menos 2 caracteres." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "El slug solo puede contener letras minúsculas, números y guiones." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
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

export const riderSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  lastName: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres." }),
  email: z.string().email(),
  phone: z.string().min(10, { message: "El teléfono debe tener al menos 10 dígitos." }),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING_DOCUMENTS"]),
});

export const ineSchema = z.object({
  file: z.any().refine(file => file?.length > 0, "El INE es requerido."),
});

export const proofOfAddressSchema = z.object({
    file: z.any().refine(file => file?.length > 0, "El comprobante de domicilio es requerido."),
});

export const licenseSchema = z.object({
    file: z.any().refine(file => file?.length > 0, "La licencia es requerida."),
    expiryDate: z.date().min(thirtyDaysFromNow, { message: "La licencia debe ser válida por al menos 30 días."}),
});

export const policySchema = z.object({
    file: z.any().refine(file => file?.length > 0, "La póliza de seguro es requerida."),
    expiryDate: z.date().min(thirtyDaysFromNow, { message: "La póliza debe ser válida por al menos 30 días."}),
});

export const riderDocumentsSchema = z.object({}).merge(ineSchema).merge(proofOfAddressSchema).merge(licenseSchema).merge(policySchema);
