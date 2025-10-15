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
  createdAt: string;
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

export type RiderStatus = 'pending_review' | 'approved' | 'rejected' | 'inactive';
export type VehicleOwnership = 'propia' | 'rentada' | 'prestada';
export type VehicleBrand = 'Italika' | 'Yamaha' | 'Honda' | 'Vento' | 'Veloci' | 'Suzuki' | 'Otra';

export type Rider = {
  id: string
  firstName: string
  lastName: string
  motherLastName?: string
  email: string
  birthDate: string
  riderType: 'Asociado'
  zone: 'Monterrey' | 'Culiacan' | 'Mazatlan'
  identityType: 'INE'
  address: string

  // Archivos obligatorios
  ineFrontUrl: string
  ineBackUrl: string
  proofOfAddressUrl: string
  licenseFrontUrl: string
  licenseBackUrl: string

  // Vehículo
  vehicleType: 'Moto'
  ownership: VehicleOwnership
  brand: VehicleBrand
  year: number
  model: string
  color: string
  plate: string
  licenseValidUntil: string
  motoPhotos: [string, string, string, string]
  circulationCardFrontUrl: string
  circulationCardBackUrl: string

  // Póliza
  insurer: string
  policyNumber: string
  policyValidUntil: string
  policyFirstPageUrl: string

  // Extra
  hasHelmet: boolean
  hasUniform: boolean
  hasBox: boolean

  // Login
  phoneE164: string
  passwordHashMock: string
  avatar1x1Url: string

  status: RiderStatus
  createdAt: string
  updatedAt: string
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

export type Zone = {
    id: string;
    name: string;
    businessCount: number;
    riderCount: number;
    status: "ACTIVE" | "INACTIVE";
    // For now, geofence will be a mock. In a real scenario, this could be GeoJSON.
    geofence?: any; 
    createdAt: string;
    updatedAt: string;
}
