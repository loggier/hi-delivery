export type Role = {
  id: string;
  name: string;
  permissions: Permissions;
  created_at: string;
};

export type Permissions = {
  recolectarEfectivo: boolean;
  complemento: boolean;
  atributo: boolean;
  banner: boolean;
  campaña: boolean;
  categoria: boolean;
  cupon: boolean;
  reembolso: boolean;
  gestionDeClientes: boolean;
  repartidor: boolean;
  proveerGanancias: boolean;
  empleado: boolean;
  producto: boolean;
  notificacion: boolean;
  pedido: boolean;
  tienda: boolean;
  reporte: boolean;
  configuraciones: boolean;
  listaDeRetiros: boolean;
  zona: boolean;
  modulo: boolean;
  paquete: boolean;
  puntoDeVenta: boolean;
  unidad: boolean;
  suscripcion: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar_url?: string;
  role_id: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  mainAddress: string;
  additionalAddress1?: string;
  additionalAddress2?: string;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
};

export type Order = {
  id: string;
  customerId: string;
  businessId: string;
  riderId: string;
  productCount: number;
  total: number;
  status: 'DELIVERED' | 'CANCELLED' | 'PENDING';
  createdAt: string;
};

export type BusinessType = "restaurant" | "store" | "service";

export type BusinessCategory = {
  id: string;
  name: string;
  type: BusinessType;
  active: boolean;
  created_at: string;
};

export type Business = {
  id: string;
  name: string;
  type: BusinessType;
  category_id: string;
  email: string;
  owner_name: string;
  phone_whatsapp: string;
  address_line: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  tax_id?: string;
  website?: string;
  instagram?: string;
  logo_url?: string;
  notes?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING_REVIEW";
  created_at: string;
  updated_at: string;
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
  created_at: string;
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

export type PlanValidity = 'mensual' | 'quincenal' | 'semanal' | 'anual';

export type Plan = {
    id: string;
    name: string;
    price: number;
    validity: PlanValidity;
    riderFee: number;
    feePerKm: number;
    minShippingFee: number;
    minDistance: number;
    details?: string;
    createdAt: string;
    updatedAt: string;
};
