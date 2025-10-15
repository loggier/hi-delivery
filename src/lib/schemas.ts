import { z } from "zod";

const thirtyDaysFromNow = new Date();
thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

export const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

export const categorySchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  slug: z.string().min(2, { message: "Slug must be at least 2 characters." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Slug can only contain lowercase letters, numbers, and hyphens." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const userSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email(),
  role: z.enum(["ADMIN"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const businessSchema = z.object({
    name: z.string().min(2, { message: "Business name must be at least 2 characters." }),
    rfc: z.string().optional(),
    address: z.string().min(10, { message: "Address must be at least 10 characters." }),
    contactName: z.string().min(2, { message: "Contact name must be at least 2 characters." }),
    contactPhone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
    status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  sku: z.string().optional(),
  price: z.coerce.number().min(0.01, { message: "Price must be greater than 0." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  businessId: z.string({ required_error: "Please select a business." }),
  categoryId: z.string({ required_error: "Please select a category." }),
  imageUrl: z.string().optional(),
});

export const riderSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email(),
  phone: z.string().min(10, { message: "Phone must be at least 10 digits." }),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING_DOCUMENTS"]),
});

export const ineSchema = z.object({
  file: z.any().refine(file => file?.length > 0, "INE is required."),
});

export const proofOfAddressSchema = z.object({
    file: z.any().refine(file => file?.length > 0, "Proof of address is required."),
});

export const licenseSchema = z.object({
    file: z.any().refine(file => file?.length > 0, "License is required."),
    expiryDate: z.date().min(thirtyDaysFromNow, { message: "License must be valid for at least 30 days."}),
});

export const policySchema = z.object({
    file: z.any().refine(file => file?.length > 0, "Insurance policy is required."),
    expiryDate: z.date().min(thirtyDaysFromNow, { message: "Policy must be valid for at least 30 days."}),
});

export const riderDocumentsSchema = z.object({}).merge(ineSchema).merge(proofOfAddressSchema).merge(licenseSchema).merge(policySchema);
