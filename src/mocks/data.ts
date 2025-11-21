import { Business, Category, Product, Rider, User, Document, BusinessCategory, BusinessType, VehicleBrand, RiderStatus, Zone, Customer, Order, Role, Permissions, Plan } from "@/types";
import { faker } from '@faker-js/faker/locale/es_MX';

const now = new Date();

// --- PLANS ---
export let plans: Plan[] = [
    {
        id: 'plan-basic',
        name: 'Básico',
        price: 299,
        validity: 'mensual',
        rider_fee: 35,
        fee_per_km: 8,
        min_shipping_fee: 40,
        min_distance: 3,
        details: 'Ideal para negocios que están comenzando.',
        created_at: new Date('2023-01-10T10:00:00Z').toISOString(),
        updated_at: new Date('2023-01-10T10:00:00Z').toISOString(),
    },
    {
        id: 'plan-plus',
        name: 'Plus',
        price: 599,
        validity: 'mensual',
        rider_fee: 30,
        fee_per_km: 7,
        min_shipping_fee: 35,
        min_distance: 5,
        details: 'Más envíos, mejores tarifas. El más popular.',
        created_at: new Date('2023-01-10T10:00:00Z').toISOString(),
        updated_at: new Date('2023-01-10T10:00:00Z').toISOString(),
    },
    {
        id: 'plan-premium',
        name: 'Premium Anual',
        price: 8999,
        validity: 'anual',
        rider_fee: 25,
        fee_per_km: 6,
        min_shipping_fee: 30,
        min_distance: 7,
        details: 'Acceso total y las mejores tarifas para negocios de alto volumen. Ahorra con el pago anual.',
        created_at: new Date('2023-01-10T10:00:00Z').toISOString(),
        updated_at: new Date('2023-01-10T10:00:00Z').toISOString(),
    },
]

// --- ROLES & PERMISSIONS ---
const allPermissionsFalse: Permissions = {
  recolectarEfectivo: false, complemento: false, atributo: false, banner: false, campaña: false, categoria: false, cupon: false,
  reembolso: false, gestionDeClientes: false, repartidor: false, proveerGanancias: false, empleado: false, producto: false,
  notificacion: false, pedido: false, tienda: false, reporte: false, configuraciones: false, listaDeRetiros: false,
  zona: false, modulo: false, paquete: false, puntoDeVenta: false, unidad: false, suscripcion: false
};

const allPermissionsTrue: Permissions = Object.keys(allPermissionsFalse).reduce((acc, key) => {
  acc[key as keyof Permissions] = true;
  return acc;
}, {} as Permissions);

export let roles: Role[] = [
    {
        id: 'role-admin',
        name: 'Super Administrador',
        created_at: new Date('2023-01-01T10:00:00Z').toISOString(),
        permissions: allPermissionsTrue,
    },
    {
        id: 'role-operations',
        name: 'Gerente de Operaciones',
        created_at: new Date('2023-01-15T10:00:00Z').toISOString(),
        permissions: {
            ...allPermissionsFalse,
            repartidor: true,
            pedido: true,
            zona: true,
            reporte: true,
        }
    },
    {
        id: 'role-support',
        name: 'Soporte',
        created_at: new Date('2023-02-01T10:00:00Z').toISOString(),
        permissions: {
            ...allPermissionsFalse,
            gestionDeClientes: true,
            reembolso: true,
            pedido: true,
        }
    },
     {
        id: 'owen-business',
        name: 'Dueño de Negocio',
        created_at: new Date('2023-02-01T10:00:00Z').toISOString(),
        permissions: {
            ...allPermissionsFalse,
            producto: true,
            pedido: true,
            reporte: true,
            configuraciones: true,
        }
    }
];

// --- USERS ---
export let users: User[] = [
  {
    id: 'user-1',
    name: 'Usuario Administrador',
    email: 'admin@example.com',
    role_id: 'role-admin',
    status: 'ACTIVE',
    created_at: new Date('2023-01-01T10:00:00Z').toISOString(),
  },
  {
    id: 'user-2',
    name: 'Admin Inactivo',
    email: 'inactive@example.com',
    role_id: 'role-support',
    status: 'INACTIVE',
    created_at: new Date('2023-02-15T11:30:00Z').toISOString(),
  },
   {
    id: 'user-3',
    name: 'Dueño de Restaurante',
    email: 'owner@example.com',
    role_id: 'owen-business',
    status: 'ACTIVE',
    created_at: new Date('2024-05-10T11:30:00Z').toISOString(),
  },
];

// --- PRODUCT CATEGORIES ---
export let productCategories: Category[] = [
  {
    id: 'prod-cat-1',
    name: 'Comida Mexicana',
    slug: 'comida-mexicana',
    status: 'ACTIVE',
    created_at: new Date('2023-03-10T08:00:00Z').toISOString(),
  },
  {
    id: 'prod-cat-2',
    name: 'Comida Italiana',
    slug: 'comida-italiana',
    status: 'ACTIVE',
    created_at: new Date('2023-03-10T08:05:00Z').toISOString(),
  },
  {
    id: 'prod-cat-3',
    name: 'Postres',
    slug: 'postres',
    status: 'INACTIVE',
    created_at: new Date('2023-04-01T12:00:00Z').toISOString(),
  },
    {
    id: 'prod-cat-4',
    name: 'Comida Japonesa',
    slug: 'comida-japonesa',
    status: 'ACTIVE',
    created_at: new Date('2023-05-20T14:00:00Z').toISOString(),
  },
];

// --- BUSINESS CATEGORIES ---
export let businessCategories: BusinessCategory[] = [
  { id: 'cat-pizza', name: 'Pizzería', type: 'restaurant', active: true, created_at: new Date().toISOString() },
  { id: 'cat-tacos', name: 'Tacos', type: 'restaurant', active: true, created_at: new Date().toISOString() },
  { id: 'cat-intl', name: 'Internacional', type: 'restaurant', active: true, created_at: new Date().toISOString() },
  { id: 'cat-sushi', name: 'Sushi', type: 'restaurant', active: true, created_at: new Date().toISOString() },
  { id: 'cat-abar', name: 'Abarrotes', type: 'store', active: true, created_at: new Date().toISOString() },
  { id: 'cat-ropa', name: 'Ropa y Accesorios', type: 'store', active: false, created_at: new Date().toISOString() },
  { id: 'cat-serv', name: 'Servicios Profesionales', type: 'service', active: true, created_at: new Date().toISOString() },
  { id: 'cat-hogar', name: 'Servicios del Hogar', type: 'service', active: true, created_at: new Date().toISOString() },
];


// --- BUSINESSES ---
function createBusiness(partial?: Partial<Business>): Business {
  const type = partial?.type || faker.helpers.arrayElement<BusinessType>(['restaurant', 'store', 'service']);
  const relevantCategories = businessCategories.filter(c => c.type === type);
  const category = faker.helpers.arrayElement(relevantCategories);
  const now = new Date();

  return {
    id: `biz-${faker.string.uuid()}`,
    user_id: `user-${faker.string.uuid()}`,
    name: faker.company.name(),
    type,
    category_id: category.id,
    email: faker.internet.email(),
    owner_name: faker.person.fullName(),
    phone_whatsapp: `+52${faker.string.numeric(10)}`,
    address_line: faker.location.streetAddress(),
    neighborhood: faker.location.secondaryAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip_code: faker.location.zipCode(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    coordinates: {
        lat: faker.location.latitude({ min: 19.3, max: 19.5 }),
        lng: faker.location.longitude({ min: -99.2, max: -99.0 }),
    },
    status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE', 'PENDING_REVIEW']),
    tax_id: faker.string.alphanumeric(13).toUpperCase(),
    website: faker.internet.url(),
    instagram: `@${faker.internet.userName().toLowerCase()}`,
    logo_url: faker.image.avatar(),
    created_at: faker.date.past({ years: 1, refDate: now }).toISOString(),
    updated_at: faker.date.recent({ days: 30, refDate: now }).toISOString(),
    ...partial,
  };
}

export let businesses: Business[] = [
  createBusiness({ name: 'Tacos El Tío', type: 'restaurant', category_id: 'cat-tacos', status: 'ACTIVE', phone_whatsapp: '+525512345678' }),
  createBusiness({ name: 'Pizza Nostra', type: 'restaurant', category_id: 'cat-pizza', status: 'ACTIVE', phone_whatsapp: '+525587654321' }),
  createBusiness({ name: 'Sushi Go', type: 'restaurant', category_id: 'cat-sushi', status: 'INACTIVE', phone_whatsapp: '+525555555555' }),
  createBusiness({ name: 'Abarrotes Doña Mary', type: 'store', category_id: 'cat-abar', status: 'PENDING_REVIEW', phone_whatsapp: '+523312345678' }),
  createBusiness({ name: 'Contadores Fiscales S.C.', type: 'service', category_id: 'cat-serv', status: 'ACTIVE', phone_whatsapp: '+528187654321' }),
  createBusiness({ name: 'Boutique "La Bonita"', type: 'store', category_id: 'cat-ropa', status: 'ACTIVE' }),
  createBusiness({ name: 'Plomería Express', type: 'service', category_id: 'cat-hogar', status: 'INACTIVE' }),
  createBusiness({ name: 'Restaurante "El Buen Sazón"', type: 'restaurant', category_id: 'cat-intl', status: 'PENDING_REVIEW' }),
];


// --- PRODUCTS ---
export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Taco al Pastor',
    price: 20.5,
    status: 'ACTIVE',
    business_id: businesses.find(b => b.name === 'Tacos El Tío')?.id || 'biz-1',
    category_id: 'prod-cat-1',
    image_url: `https://picsum.photos/seed/taco/400/300`,
    created_at: new Date('2023-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Pizza Margherita',
    sku: 'PZ-MAR-01',
    price: 180.0,
    status: 'ACTIVE',
    business_id: businesses.find(b => b.name === 'Pizza Nostra')?.id || 'biz-2',
    category_id: 'prod-cat-2',
    image_url: `https://picsum.photos/seed/pizza/400/300`,
    created_at: new Date('2023-08-02T11:00:00Z').toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Set de Nigiri',
    price: 250.0,
    status: 'INACTIVE',
    business_id: businesses.find(b => b.name === 'Sushi Go')?.id || 'biz-3',
    category_id: 'prod-cat-4',
    image_url: `https://picsum.photos/seed/sushi/400/300`,
    created_at: new Date('2023-08-03T12:00:00Z').toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Gringa de Suadero',
    sku: 'GR-SUA-02',
    price: 45.0,
    status: 'ACTIVE',
    business_id: businesses.find(b => b.name === 'Tacos El Tío')?.id || 'biz-1',
    category_id: 'prod-cat-1',
    image_url: `https://picsum.photos/seed/gringa/400/300`,
    created_at: new Date('2023-08-04T13:00:00Z').toISOString(),
  },
];

// --- RIDERS ---
function createRider(partial?: Partial<Rider>): Rider {
  const now = new Date();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const createdAt = faker.date.past({ years: 1, refDate: now });

  return {
    id: `rider-${faker.string.uuid()}`,
    user_id: `user-${faker.string.uuid()}`,
    first_name: firstName,
    last_name: lastName,
    email: faker.internet.email({ firstName, lastName }),
    phone_e164: `+52${faker.string.numeric(10)}`,
    status: 'approved',
    password_hash: faker.internet.password(),
    created_at: createdAt.toISOString(),
    updated_at: faker.date.recent({ days: 90, refDate: now }).toISOString(),
    ...partial,
  };
}

export let riders: Rider[] = [
    createRider({ status: 'approved', zone_id: 'zone-1' }),
    createRider({ status: 'pending_review', zone_id: 'zone-2' }),
    createRider({ status: 'rejected', zone_id: 'zone-3' }),
    createRider({ status: 'inactive', zone_id: 'zone-1' }),
    createRider({ status: 'approved', zone_id: 'zone-2' }),
];

// --- ZONES ---
export let zones: Zone[] = [
    {
        id: 'zone-1',
        name: 'Monterrey Centro',
        businessCount: 3,
        riderCount: 2,
        status: 'ACTIVE',
        created_at: new Date('2023-01-15T09:00:00Z').toISOString(),
        updated_at: new Date('2023-10-01T11:00:00Z').toISOString(),
    },
    {
        id: 'zone-2',
        name: 'Culiacán Tres Ríos',
        businessCount: 1,
        riderCount: 2,
        status: 'ACTIVE',
        created_at: new Date('2023-02-20T10:00:00Z').toISOString(),
        updated_at: new Date('2023-11-05T14:30:00Z').toISOString(),
    },
    {
        id: 'zone-3',
        name: 'Mazatlán Zona Dorada',
        businessCount: 1,
        riderCount: 1,
        status: 'INACTIVE',
        created_at: new Date('2023-03-01T16:00:00Z').toISOString(),
        updated_at: new Date('2023-09-15T18:00:00Z').toISOString(),
    }
];

// Link entities for dashboard
businesses[0].zone_id = 'zone-1';
businesses[1].zone_id = 'zone-1';
businesses[2].zone_id = 'zone-1';
businesses[3].zone_id = 'zone-2';
businesses[4].zone_id = 'zone-3';


// --- CUSTOMERS & ORDERS ---
let customers: Customer[] = [];
let orders: Order[] = [];

for (let i = 0; i < 25; i++) {
    const createdAt = faker.date.past({ years: 2 });
    const customer: Customer = {
        id: `cust-${faker.string.uuid()}`,
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        order_count: 0,
        total_spent: 0,
        created_at: createdAt.toISOString(),
        updated_at: faker.date.recent({ days: 60, refDate: now }).toISOString(),
    };
    customers.push(customer);
}

customers.forEach(customer => {
    const numOrders = faker.number.int({ min: 1, max: 15 });
    let totalSpent = 0;
    for (let i = 0; i < numOrders; i++) {
        const business = faker.helpers.arrayElement(businesses);
        const rider = faker.helpers.arrayElement(riders.filter(r => r.status === 'approved'));
        const total = faker.number.float({ min: 80, max: 1200, multipleOf: 0.5 });
        
        const order: Order = {
            id: `ord-${faker.string.uuid()}`,
            customerId: customer.id,
            businessId: business.id,
            riderId: rider.id,
            productCount: faker.number.int({ min: 1, max: 8 }),
            total,
            status: faker.helpers.arrayElement(['DELIVERED', 'CANCELLED', 'PENDING']),
            created_at: faker.date.between({ from: customer.created_at, to: now }).toISOString(),
        };
        orders.push(order);
        if (order.status === 'DELIVERED') {
            totalSpent += total;
        }
    }
    customer.order_count = numOrders;
    customer.total_spent = totalSpent;
});

export { customers, orders };


// Link entities for dashboard
export const allEntities = [...businesses, ...riders, ...products, ...productCategories, ...zones];
