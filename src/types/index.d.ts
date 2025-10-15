export type Role = "ADMIN" | "RESTAURANT_OWNER";

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type Business = {
  id: string;
  name: string;
  rfc?: string;
  address: string;
  contactName: string;
  contactPhone: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type Document = {
  id: string;
  name: string;
  url: string;
  type: "INE" | "PROOF_OF_ADDRESS" | "LICENSE" | "POLICY";
  expiryDate?: string;
  uploadedAt: string;
};

export type Rider = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING_DOCUMENTS";
  documents: Document[];
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  sku?: string;
  price: number;
  imageUrl?: string;
  status: "ACTIVE" | "INACTIVE";
  businessId: string;
  categoryId: string;
  createdAt: string;
};
