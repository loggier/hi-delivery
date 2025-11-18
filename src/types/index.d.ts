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

export type SubscriptionStatus = "active" | "inactive" | "past_due";

export type Business = {
  id: string;
  user_id: string;
  name: string;
  type: BusinessType;
  category_id: string;
  zone_id?: string;
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
  plan_id?: string;
  subscription_status?: SubscriptionStatus;
  current_period_ends_at?: string;
  started_at?: string;
  created_at: string;
  updated_at: string;
  password?: string;
  passwordConfirmation?: string;
};

export type Document = {
  id: string;
  name: string;
  url: string;
  type: "INE" | "PROOF_OF_ADDRESS" | "LICENSE" | "POLICY";
  expiryDate?: string;
  uploadedAt: string;
};

export type RiderStatus = 'pending_review' | 'approved' | 'rejected' | 'inactive' | 'incomplete';
export type VehicleOwnership = 'propia' | 'rentada' | 'prestada';
export type VehicleBrand = 'Italika' | 'Yamaha' | 'Honda' | 'Vento' | 'Veloci' | 'Suzuki' | 'Otra';

export type Rider = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_e164: string;
  status: RiderStatus;
  password_hash: string;
  created_at: string;
  updated_at: string;
  zone?: string; // Legacy field for mock data, prefer zone_id
  
  mother_last_name?: string;
  birth_date?: string;
  rider_type?: 'Asociado';
  zone_id?: string;
  address?: string;

  // Archivos
  ine_front_url?: string;
  ine_back_url?: string;
  proof_of_address_url?: string;
  license_front_url?: string;
  license_back_url?: string;
  avatar_1x1_url?: string;

  // Vehículo
  vehicle_type?: 'Moto';
  ownership?: VehicleOwnership;
  brand?: VehicleBrand | string;
  year?: number;
  model?: string;
  color?: string;
  plate?: string;
  license_valid_until?: string;
  moto_photos?: string[];
  circulation_card_front_url?: string;
  circulation_card_back_url?: string;

  // Póliza
  insurer?: string;
  policy_number?: string;
  policy_valid_until?: string;
  policy_first_page_url?: string;

  // Extra
  has_helmet?: boolean;
  has_uniform?: boolean;
  has_box?: boolean;
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
    geofence?: { lat: number; lng: number }[]; 
    created_at: string;
    updated_at: string;
}

export type PlanValidity = 'mensual' | 'quincenal' | 'semanal' | 'anual';

export type Plan = {
  id: string;
  name: string;
  price: number;
  validity: PlanValidity;
  rider_fee: number;
  fee_per_km: number;
  min_shipping_fee: number;
  min_distance: number;
  details?: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  business_id: string;
  plan_id: string;
  amount: number;
  payment_date: string;
  period_start: string;
  period_end: string;
  created_at: string;
};

export type SystemSettings = {
    id: number;
    min_shipping_amount: number;
    min_distance_km: number;
    max_distance_km: number;
    cost_per_extra_km: number;
    created_at: string;
    updated_at: string;
}
