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

export type BusinessType = "restaurant" | "store" | "service";

export type BusinessCategory = {
  id: string;
  name: string;
  type: BusinessType;
  active: boolean;
};

export type Business = {
  id: string;
  name: string;
  type: BusinessType;
  categoryId: string;
  email: string;
  ownerName: string;
  phoneWhatsApp: string;
  location: {
    addressLine: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  };
  taxId?: string;
  website?: string;
  instagram?: string;
  logoUrl?: string;
  notes?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING_REVIEW";
  createdAt: string;
  updatedAt: string;
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
