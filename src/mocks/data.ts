import { Business, Category, Product, Rider, User, Document } from "@/types";

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

// --- BUSINESSES ---
export const businesses: Business[] = [
  {
    id: 'biz-1',
    name: 'Tacos El Tío',
    rfc: 'TET123456XYZ',
    address: 'Av. Siempre Viva 123, Springfield',
    contactName: 'Juan Pérez',
    contactPhone: '5512345678',
    status: 'ACTIVE',
    createdAt: new Date('2023-05-01T18:00:00Z').toISOString(),
  },
  {
    id: 'biz-2',
    name: 'Pizza Nostra',
    address: 'Calle Falsa 456, Shelbyville',
    contactName: 'Maria Rossi',
    contactPhone: '5587654321',
    status: 'ACTIVE',
    createdAt: new Date('2023-06-15T20:00:00Z').toISOString(),
  },
  {
    id: 'biz-3',
    name: 'Sushi Go',
    rfc: 'SGO987654ABC',
    address: 'Blvd. del Puerto 789, Capital City',
    contactName: 'Kenji Tanaka',
    contactPhone: '5555555555',
    status: 'INACTIVE',
    createdAt: new Date('2023-07-20T22:30:00Z').toISOString(),
  },
];

// --- PRODUCTS ---
export const products: Product[] = [
  {
    id: 'prod-1',
    name: 'Taco al Pastor',
    price: 20.5,
    status: 'ACTIVE',
    businessId: 'biz-1',
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
    businessId: 'biz-2',
    categoryId: 'cat-2',
    imageUrl: `https://picsum.photos/seed/pizza/400/300`,
    createdAt: new Date('2023-08-02T11:00:00Z').toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Set de Nigiri',
    price: 250.0,
    status: 'INACTIVE',
    businessId: 'biz-3',
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
    businessId: 'biz-1',
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
