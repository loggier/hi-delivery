import { Business, Category, Product, Rider, User, Document, BusinessCategory, BusinessType, VehicleBrand, RiderStatus, Zone } from "@/types";
import { faker } from '@faker-js/faker/locale/es_MX';

const now = new Date();

// --- USERS ---
export const users: User[] = [
  {
    id: 'user-1',
    name: 'Usuario Administrador',
    email: 'admin@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date('2023-01-01T10:00:00Z').toISOString(),
  },
  {
    id: 'user-2',
    name: 'Admin Inactivo',
    email: 'inactive@example.com',
    role: 'ADMIN',
    status: 'INACTIVE',
    createdAt: new Date('2023-02-15T11:30:00Z').toISOString(),
  },
];

// --- PRODUCT CATEGORIES ---
export let productCategories: Category[] = [
  {
    id: 'prod-cat-1',
    name: 'Comida Mexicana',
    slug: 'comida-mexicana',
    status: 'ACTIVE',
    createdAt: new Date('2023-03-10T08:00:00Z').toISOString(),
  },
  {
    id: 'prod-cat-2',
    name: 'Comida Italiana',
    slug: 'comida-italiana',
    status: 'ACTIVE',
    createdAt: new Date('2023-03-10T08:05:00Z').toISOString(),
  },
  {
    id: 'prod-cat-3',
    name: 'Postres',
    slug: 'postres',
    status: 'INACTIVE',
    createdAt: new Date('2023-04-01T12:00:00Z').toISOString(),
  },
    {
    id: 'prod-cat-4',
    name: 'Comida Japonesa',
    slug: 'comida-japonesa',
    status: 'ACTIVE',
    createdAt: new Date('2023-05-20T14:00:00Z').toISOString(),
  },
];

// --- BUSINESS CATEGORIES ---
export let businessCategories: BusinessCategory[] = [
  { id: 'cat-pizza', name: 'Pizzería', type: 'restaurant', active: true, createdAt: new Date().toISOString() },
  { id: 'cat-tacos', name: 'Tacos', type: 'restaurant', active: true, createdAt: new Date().toISOString() },
  { id: 'cat-intl', name: 'Internacional', type: 'restaurant', active: true, createdAt: new Date().toISOString() },
  { id: 'cat-sushi', name: 'Sushi', type: 'restaurant', active: true, createdAt: new Date().toISOString() },
  { id: 'cat-abar', name: 'Abarrotes', type: 'store', active: true, createdAt: new Date().toISOString() },
  { id: 'cat-ropa', name: 'Ropa y Accesorios', type: 'store', active: false, createdAt: new Date().toISOString() },
  { id: 'cat-serv', name: 'Servicios Profesionales', type: 'service', active: true, createdAt: new Date().toISOString() },
  { id: 'cat-hogar', name: 'Servicios del Hogar', type: 'service', active: true, createdAt: new Date().toISOString() },
];


// --- BUSINESSES ---
function createBusiness(partial?: Partial<Business>): Business {
  const type = partial?.type || faker.helpers.arrayElement<BusinessType>(['restaurant', 'store', 'service']);
  const relevantCategories = businessCategories.filter(c => c.type === type);
  const category = faker.helpers.arrayElement(relevantCategories);
  const now = new Date();

  return {
    id: `biz-${faker.string.uuid()}`,
    name: faker.company.name(),
    type,
    categoryId: category.id,
    email: faker.internet.email(),
    ownerName: faker.person.fullName(),
    phoneWhatsApp: `+52${faker.string.numeric(10)}`,
    location: {
      addressLine: faker.location.streetAddress(),
      neighborhood: faker.location.secondaryAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
    status: faker.helpers.arrayElement(['ACTIVE', 'INACTIVE', 'PENDING_REVIEW']),
    taxId: faker.string.alphanumeric(13).toUpperCase(),
    website: faker.internet.url(),
    instagram: `@${faker.internet.userName().toLowerCase()}`,
    logoUrl: faker.image.avatar(),
    createdAt: faker.date.past({ years: 1, refDate: now }).toISOString(),
    updatedAt: faker.date.recent({ days: 30, refDate: now }).toISOString(),
    ...partial,
  };
}

export let businesses: Business[] = [
  createBusiness({ name: 'Tacos El Tío', type: 'restaurant', categoryId: 'cat-tacos', status: 'ACTIVE', phoneWhatsApp: '+525512345678' }),
  createBusiness({ name: 'Pizza Nostra', type: 'restaurant', categoryId: 'cat-pizza', status: 'ACTIVE', phoneWhatsApp: '+525587654321' }),
  createBusiness({ name: 'Sushi Go', type: 'restaurant', categoryId: 'cat-sushi', status: 'INACTIVE', phoneWhatsApp: '+525555555555' }),
  createBusiness({ name: 'Abarrotes Doña Mary', type: 'store', categoryId: 'cat-abar', status: 'PENDING_REVIEW', phoneWhatsApp: '+523312345678' }),
  createBusiness({ name: 'Contadores Fiscales S.C.', type: 'service', categoryId: 'cat-serv', status: 'ACTIVE', phoneWhatsApp: '+528187654321' }),
  createBusiness({ name: 'Boutique "La Bonita"', type: 'store', categoryId: 'cat-ropa', status: 'ACTIVE' }),
  createBusiness({ name: 'Plomería Express', type: 'service', categoryId: 'cat-hogar', status: 'INACTIVE' }),
  createBusiness({ name: 'Restaurante "El Buen Sazón"', type: 'restaurant', categoryId: 'cat-intl', status: 'PENDING_REVIEW' }),
];


// --- PRODUCTS ---
export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Taco al Pastor',
    price: 20.5,
    status: 'ACTIVE',
    businessId: businesses.find(b => b.name === 'Tacos El Tío')?.id || 'biz-1',
    categoryId: 'prod-cat-1',
    imageUrl: `https://picsum.photos/seed/taco/400/300`,
    createdAt: new Date('2023-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Pizza Margherita',
    sku: 'PZ-MAR-01',
    price: 180.0,
    status: 'ACTIVE',
    businessId: businesses.find(b => b.name === 'Pizza Nostra')?.id || 'biz-2',
    categoryId: 'prod-cat-2',
    imageUrl: `https://picsum.photos/seed/pizza/400/300`,
    createdAt: new Date('2023-08-02T11:00:00Z').toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Set de Nigiri',
    price: 250.0,
    status: 'INACTIVE',
    businessId: businesses.find(b => b.name === 'Sushi Go')?.id || 'biz-3',
    categoryId: 'prod-cat-4',
    imageUrl: `https://picsum.photos/seed/sushi/400/300`,
    createdAt: new Date('2023-08-03T12:00:00Z').toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Gringa de Suadero',
    sku: 'GR-SUA-02',
    price: 45.0,
    status: 'ACTIVE',
    businessId: businesses.find(b => b.name === 'Tacos El Tío')?.id || 'biz-1',
    categoryId: 'prod-cat-1',
    imageUrl: `https://picsum.photos/seed/gringa/400/300`,
    createdAt: new Date('2023-08-04T13:00:00Z').toISOString(),
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
    firstName,
    lastName,
    motherLastName: faker.person.lastName(),
    email: faker.internet.email({ firstName, lastName }),
    birthDate: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }).toISOString(),
    riderType: 'Asociado',
    zone: faker.helpers.arrayElement(['Monterrey', 'Culiacan', 'Mazatlan']),
    identityType: 'INE',
    address: faker.location.streetAddress(true),
    ineFrontUrl: '/mock-docs/ine-front.png',
    ineBackUrl: '/mock-docs/ine-back.png',
    proofOfAddressUrl: '/mock-docs/proof-of-address.pdf',
    licenseFrontUrl: '/mock-docs/license-front.png',
    licenseBackUrl: '/mock-docs/license-back.png',
    vehicleType: 'Moto',
    ownership: faker.helpers.arrayElement(['propia', 'rentada', 'prestada']),
    brand: faker.helpers.arrayElement<VehicleBrand>(['Italika', 'Yamaha', 'Honda', 'Vento', 'Veloci', 'Suzuki']),
    year: faker.number.int({ min: 2010, max: new Date().getFullYear() }),
    model: faker.vehicle.model(),
    color: faker.vehicle.color(),
    plate: faker.vehicle.vrm(),
    licenseValidUntil: faker.date.future({ years: 2, refDate: now }).toISOString(),
    motoPhotos: [
        `https://picsum.photos/seed/${faker.string.uuid()}/400/300`,
        `https://picsum.photos/seed/${faker.string.uuid()}/400/300`,
        `https://picsum.photos/seed/${faker.string.uuid()}/400/300`,
        `https://picsum.photos/seed/${faker.string.uuid()}/400/300`
    ],
    circulationCardFrontUrl: '/mock-docs/circulation-front.png',
    circulationCardBackUrl: '/mock-docs/circulation-back.png',
    insurer: faker.company.name(),
    policyNumber: faker.string.alphanumeric(10).toUpperCase(),
    policyValidUntil: faker.date.future({ years: 1, refDate: now }).toISOString(),
    policyFirstPageUrl: '/mock-docs/policy.pdf',
    hasHelmet: faker.datatype.boolean(),
    hasUniform: faker.datatype.boolean(),
    hasBox: faker.datatype.boolean(),
    phoneE164: `+52${faker.string.numeric(10)}`,
    passwordHashMock: faker.internet.password(), // In reality, this would be a hash
    avatar1x1Url: faker.image.avatar(),
    status: faker.helpers.arrayElement<RiderStatus>(['pending_review', 'approved', 'rejected', 'inactive']),
    createdAt: createdAt.toISOString(),
    updatedAt: faker.date.recent({ days: 90, refDate: now }).toISOString(),
    ...partial,
  };
}

export let riders: Rider[] = [
    createRider({ status: 'approved', zone: 'Monterrey' }),
    createRider({ status: 'pending_review', zone: 'Culiacan' }),
    createRider({ status: 'rejected', zone: 'Mazatlan' }),
    createRider({ status: 'inactive', zone: 'Monterrey' }),
    createRider({ status: 'approved', zone: 'Culiacan' }),
];

// --- ZONES ---
export let zones: Zone[] = [
    {
        id: 'zone-1',
        name: 'Monterrey Centro',
        businessCount: 3,
        riderCount: 2,
        status: 'ACTIVE',
        createdAt: new Date('2023-01-15T09:00:00Z').toISOString(),
        updatedAt: new Date('2023-10-01T11:00:00Z').toISOString(),
    },
    {
        id: 'zone-2',
        name: 'Culiacán Tres Ríos',
        businessCount: 1,
        riderCount: 2,
        status: 'ACTIVE',
        createdAt: new Date('2023-02-20T10:00:00Z').toISOString(),
        updatedAt: new Date('2023-11-05T14:30:00Z').toISOString(),
    },
    {
        id: 'zone-3',
        name: 'Mazatlán Zona Dorada',
        businessCount: 1,
        riderCount: 1,
        status: 'INACTIVE',
        createdAt: new Date('2023-03-01T16:00:00Z').toISOString(),
        updatedAt: new Date('2023-09-15T18:00:00Z').toISOString(),
    }
];

// Update rider zones to match new zones
riders.forEach(r => {
    if (r.zone === 'Monterrey') r.zone = 'Monterrey Centro';
    if (r.zone === 'Culiacan') r.zone = 'Culiacán Tres Ríos';
    if (r.zone === 'Mazatlan') r.zone = 'Mazatlán Zona Dorada';
});

// Associate businesses with new zones for counts
businesses[0].location.city = 'Monterrey Centro';
businesses[1].location.city = 'Monterrey Centro';
businesses[2].location.city = 'Monterrey Centro';
businesses[3].location.city = 'Culiacán Tres Ríos';
businesses[4].location.city = 'Mazatlán Zona Dorada';

// Link entities for dashboard
export const allEntities = [...businesses, ...riders, ...products, ...productCategories, ...zones];
