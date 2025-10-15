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

export const businessSchema = z.object({
    name: z.string().min(2, { message: "El nombre del negocio debe tener al menos 2 caracteres." }),
    rfc: z.string().optional(),
    address: z.string().min(10, { message: "La dirección debe tener al menos 10 caracteres." }),
    contactName: z.string().min(2, { message: "El nombre de contacto debe tener al menos 2 caracteres." }),
    contactPhone: z.string().min(10, { message: "El número de teléfono debe tener al menos 10 dígitos." }),
    status: z.enum(["ACTIVE", "INACTIVE"]),
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
