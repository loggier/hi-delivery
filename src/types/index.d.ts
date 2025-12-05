






export type OrderStatus = 'pending_acceptance' | 'accepted' | 'cooking' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  item_description: string;
  products: { name: string };
};

export type OrderPayload = {
  business_id: string;
  customer_id: string;
  status: OrderStatus | 'refunded' | 'failed';
  pickup_address: {
    text: string;
    coordinates: {
      lat: number;
      lng: number;
    }
  };
  delivery_address: {
    text: string;
    coordinates: {
      lat: number;
      lng: number;
    }
  };
  customer_name: string;
  customer_phone: string;
  subtotal: number;
  delivery_fee: number;
  order_total: number;
  distance: number;
  items_description?: string;
  route_path?: any; // To store Google Maps DirectionsResult
};


export type Module = {
    id: string;
    name: string;
    description: string;
};

export type RolePermission = {
    id: string;
    role_id: string;
    module_id: string;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
};

export type Role = {
  id: string;
  name: string;
  created_at: string;
  role_permissions: RolePermission[];
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
  role?: Role;
  business_id?: string;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  address: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  order_count: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  customer_name: string;
  business_id: string;
  rider_id?: string;
  order_total: number;
  status: OrderStatus;
  created_at: string;
  business: { name: string };
  customer: { first_name: string, last_name: string };
  rider?: { id: string, first_name: string, last_name: string };
  delivery_address: { text: string, coordinates: { lat: number, lng: number } };
  pickup_address: { text: string, coordinates: { lat: number, lng: number } };
  items_description?: string;
  subtotal: number;
  delivery_fee: number;
  customer_phone: string;
  distance: number;
  order_items: OrderItem[];
  route_path?: any; // To store Google Maps DirectionsResult
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
export type WeeklyDemand = 'nuevo' | '0-10' | '11-50' | '51-100' | '101-200' | '201-500' | 'mas de 500';

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
  status: "ACTIVE" | "INACTIVE" | "PENDING_REVIEW" | "INCOMPLETE";
  plan_id?: string;
  subscription_status?: SubscriptionStatus;
  current_period_ends_at?: string;
  started_at?: string;
  created_at: string;
  updated_at: string;
  password?: string;
  passwordConfirmation?: string;

  // New Fields
  delivery_time_min?: number;
  delivery_time_max?: number;
  has_delivery_service?: boolean;
  average_ticket?: number;
  weekly_demand?: WeeklyDemand;
  business_photo_facade_url?: string;
  business_photo_interior_url?: string;
  digital_menu_url?: string;
  owner_ine_front_url?: string;
  owner_ine_back_url?: string;
  tax_situation_proof_url?: string;
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
  avatar1x1_url?: string;

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
  description?: string;
  sku?: string;
  price: number;
  image_url?: string;
  status: "ACTIVE" | "INACTIVE";
  business_id: string;
  category_id: string;
  created_at: string;
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

export type DashboardStats = {
  dailyRevenue: number;
  dailyRiderEarnings: number;
  dailyOrders: number;
  averageTicketToday: number;
  activeOrders: number;
  orderStatusSummary: { [key: string]: number };
  topBusinesses: { business_id: string; business_name: string; order_count: number }[];
  topRiders: { rider_id: string; rider_name: string; order_count: number }[];
  topCustomers: { customer_id: string; customer_name: string; order_count: number }[];
  revenueLast7Days?: { date: string; ingresos: number }[];
  ordersLast7Days?: { date: string; pedidos: number }[];
};
