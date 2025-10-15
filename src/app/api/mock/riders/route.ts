import { riders } from "@/mocks/data";
import { type Rider } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { riderApplicationSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";
import { NextRequest } from "next/server";

let mockRiders = [...riders];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const zone = searchParams.get('zone');

    let filteredRiders = mockRiders;

    if (search) {
      const lowercasedSearch = search.toLowerCase();
      filteredRiders = filteredRiders.filter(r => 
        r.firstName.toLowerCase().includes(lowercasedSearch) ||
        r.lastName.toLowerCase().includes(lowercasedSearch) ||
        r.email.toLowerCase().includes(lowercasedSearch) ||
        r.phoneE164.includes(lowercasedSearch)
      );
    }
    if (status) {
      filteredRiders = filteredRiders.filter(r => r.status === status);
    }
    if (zone) {
      filteredRiders = filteredRiders.filter(r => r.zone === zone);
    }

    return jsonResponse(200, filteredRiders);
  } catch (error) {
    return errorResponse(500, "Error al obtener los repartidores.");
  }
}

export async function POST(request: NextRequest) {
  try {
    await simulateLatency(1000, 2000); // Simulate longer delay for form submission
    
    // With FormData, we can't just parse JSON. We need to process the form data.
    // In a real app, you'd use a library like `formidable` or process it manually.
    // For this mock, we'll assume the client sends JSON for simplicity,
    // but the schema setup implies file uploads.
    // A real implementation would upload files to a storage service and get back URLs.

    const formData = await request.formData();
    const now = new Date();

    // Mock file upload by creating fake URLs
    const fakeFileUrl = (name: string) => `/mock-docs/${name}-${Date.now()}.pdf`;
    const fakeImageUrl = (name: string) => `https://picsum.photos/seed/${name}${Date.now()}/400/300`;

    const newRider: Rider = {
      id: `rider-${faker.string.uuid()}`,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      motherLastName: formData.get('motherLastName') as string,
      email: formData.get('email') as string,
      birthDate: new Date(formData.get('birthDate') as string).toISOString(),
      riderType: 'Asociado',
      zone: formData.get('zone') as 'Monterrey' | 'Culiacan' | 'Mazatlan',
      identityType: 'INE',
      address: formData.get('address') as string,
      ineFrontUrl: fakeImageUrl('ineFront'),
      ineBackUrl: fakeImageUrl('ineBack'),
      proofOfAddressUrl: fakeFileUrl('proofOfAddress'),
      licenseFrontUrl: fakeImageUrl('licenseFront'),
      licenseBackUrl: fakeImageUrl('licenseBack'),
      vehicleType: 'Moto',
      ownership: formData.get('ownership') as "propia" | "rentada" | "prestada",
      brand: formData.get('brand') as "Italika" | "Yamaha" | "Honda" | "Vento" | "Veloci" | "Suzuki" | "Otra",
      year: parseInt(formData.get('year') as string, 10),
      model: formData.get('model') as string,
      color: formData.get('color') as string,
      plate: formData.get('plate') as string,
      licenseValidUntil: new Date(formData.get('licenseValidUntil') as string).toISOString(),
      motoPhotos: [
        fakeImageUrl('moto1'),
        fakeImageUrl('moto2'),
        fakeImageUrl('moto3'),
        fakeImageUrl('moto4'),
      ],
      circulationCardFrontUrl: fakeImageUrl('circCardFront'),
      circulationCardBackUrl: fakeImageUrl('circCardBack'),
      insurer: formData.get('insurer') as string,
      policyNumber: formData.get('policyNumber') as string,
      policyValidUntil: new Date(formData.get('policyValidUntil') as string).toISOString(),
      policyFirstPageUrl: fakeFileUrl('policy'),
      hasHelmet: formData.get('hasHelmet') === 'true',
      hasUniform: formData.get('hasUniform') === 'true',
      hasBox: formData.get('hasBox') === 'true',
      phoneE164: formData.get('phoneE164') as string, // Already transformed by schema
      passwordHashMock: `hashed_${formData.get('password')}`, // Mock hashing
      avatar1x1Url: fakeImageUrl('avatar'),
      status: 'pending_review',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    // Note: Zod validation is done on the client. A real backend would re-validate here.
    
    mockRiders.unshift(newRider);

    return jsonResponse(201, newRider);
  } catch (error) {
    console.error(error)
    return errorResponse(500, "Error al crear la solicitud del repartidor.");
  }
}
