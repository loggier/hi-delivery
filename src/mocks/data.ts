import { Business, Category, Product, Rider, User, Document, BusinessCategory, BusinessType } from "@/types";
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

// --- CATEGORIES ---
export const categories: Category[] = [
  {
    id: 'cat-1',
    name: 'Comida Mexicana',
    slug: 'comida-mexicana',
    status: 'ACTIVE',
    createdAt: new Date('2023-03-10T08:00:00Z').toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Comida Italiana',
    slug: 'comida-italiana',
    status: 'ACTIVE',
    createdAt: new Date('2023-03-10T08:05:00Z').toISOString(),
  },
  {
    id: 'cat-3',
    name: 'Postres',
    slug: 'postres',
    status: 'INACTIVE',
    createdAt: new Date('2023-04-01T12:00:00Z').toISOString(),
  },
    {
    id: 'cat-4',
    name: 'Comida Japonesa',
    slug: 'comida-japonesa',
    status: 'ACTIVE',
    createdAt: new Date('2023-05-20T14:00:00Z').toISOString(),
  },
];

// --- BUSINESS CATEGORIES ---
export const businessCategories: BusinessCategory[] = [
  { id: 'cat-pizza', name: 'Pizzería', type: 'restaurant', active: true },
  { id: 'cat-tacos', name: 'Tacos', type: 'restaurant', active: true },
  { id: 'cat-intl', name: 'Internacional', type: 'restaurant', active: true },
  { id: 'cat-sushi', name: 'Sushi', type: 'restaurant', active: true },
  { id: 'cat-abar', name: 'Abarrotes', type: 'store', active: true },
  { id: 'cat-ropa', name: 'Ropa y Accesorios', type: 'store', active: true },
  { id: 'cat-serv', name: 'Servicios Profesionales', type: 'service', active: true },
  { id: 'cat-hogar', name: 'Servicios del Hogar', type: 'service', active: true },
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

export const businesses: Business[] = [
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
    categoryId: 'cat-1',
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
    categoryId: 'cat-2',
    imageUrl: `https://picsum.photos/seed/pizza/400/300`,
    createdAt: new Date('2023-08-02T11:00:00Z').toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Set de Nigiri',
    price: 250.0,
    status: 'INACTIVE',
    businessId: businesses.find(b => b.name === 'Sushi Go')?.id || 'biz-3',
    categoryId: 'cat-4',
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
    categoryId: 'cat-1',
    imageUrl: `https://picsum.photos/seed/gringa/400/300`,
    createdAt: new Date('2023-08-04T13:00:00Z').toISOString(),
  },
];


const createFutureDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

// --- DOCUMENTS & RIDERS ---
export const documents: Document[] = [
    { id: 'doc-1', name: 'INE_Pedro.pdf', url: '/mock-docs/ine.pdf', type: 'INE', uploadedAt: now.toISOString() },
    { id: 'doc-2', name: 'Comprobante_Pedro.pdf', url: '/mock-docs/comprobante.pdf', type: 'PROOF_OF_ADDRESS', uploadedAt: now.toISOString() },
    { id: 'doc-3', name: 'Licencia_Pedro.pdf', url: '/mock-docs/licencia.pdf', type: 'LICENSE', expiryDate: createFutureDate(180), uploadedAt: now.toISOString() },
    { id: 'doc-4', name: 'Poliza_Pedro.pdf', url: '/mock-docs/poliza.pdf', type: 'POLICY', expiryDate: createFutureDate(365), uploadedAt: now.toISOString() },
    { id: 'doc-5', name: 'INE_Ana.pdf', url: '/mock-docs/ine.pdf', type: 'INE', uploadedAt: now.toISOString() },
    { id: 'doc-6', name: 'Comprobante_Ana.pdf', url: '/mock-docs/comprobante.pdf', type: 'PROOF_OF_ADDRESS', uploadedAt: now.toISOString() },
    { id: 'doc-7', name: 'Licencia_Ana.pdf', url: '/mock-docs/licencia.pdf', type: 'LICENSE', expiryDate: createFutureDate(90), uploadedAt: now.toISOString() },
    { id: 'doc-8', name: 'Poliza_Ana.pdf', url: '/mock-docs/poliza.pdf', type: 'POLICY', expiryDate: createFutureDate(250), uploadedAt: now.toISOString() },
];


export const riders: Rider[] = [
  {
    id: 'rider-1',
    name: 'Pedro',
    lastName: 'Gomez',
    email: 'pedro@riders.com',
    phone: '5511223344',
    status: 'ACTIVE',
    documents: [documents[0], documents[1], documents[2], documents[3]],
    createdAt: new Date('2023-09-01T09:00:00Z').toISOString(),
  },
  {
    id: 'rider-2',
    name: 'Ana',
    lastName: 'Lopez',
    email: 'ana@riders.com',
    phone: '5544332211',
    status: 'PENDING_DOCUMENTS',
    documents: [documents[4], documents[5]],
    createdAt: new Date('2023-09-05T15:00:00Z').toISOString(),
  },
  {
    id: 'rider-3',
    name: 'Carlos',
    lastName: 'Sanchez',
    email: 'carlos@riders.com',
    phone: '5599887766',
    status: 'INACTIVE',
    documents: [],
    createdAt: new Date('2023-09-10T11:00:00Z').toISOString(),
  },
];
