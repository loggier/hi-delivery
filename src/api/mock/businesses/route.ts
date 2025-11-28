import { businesses, users } from "@/mocks/data";
import { type Business, type User } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { faker } from "@faker-js/faker";
import { NextRequest } from "next/server";
import { z } from "zod";

// Define a local schema to avoid importing client-side code (`schemas.ts`) into the server environment.
const businessCreationSchema = z.object({
  owner_name: z.string().min(2, { message: "Tu nombre completo es requerido." }),
  email: z.string().email({ message: "Por favor, ingresa un email válido." }),
  password: z.string(),
});

let mockBusinesses = [...businesses];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const planId = searchParams.get('plan_id');

    let filteredBusinesses = mockBusinesses;
    
    if (status) {
      filteredBusinesses = filteredBusinesses.filter(b => b.status === status);
    }
    
    if(planId) {
      filteredBusinesses = filteredBusinesses.filter(b => b.plan_id === planId);
    }

    return jsonResponse(200, filteredBusinesses.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener los negocios.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    // In a real app with FormData, you'd parse it differently.
    // For this mock with JSON, we parse as is.
    const json = await request.json();
    const parsed = businessCreationSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos de creación de cuenta inválidos.", parsed.error.format());
    }

    const { owner_name, email, password } = parsed.data;

    // 1. Create a user (if it doesn't exist)
    let user = users.find(u => u.email === email);
    if (user) {
        return errorResponse(409, "El correo electrónico ya está registrado.");
    }
    
    const newUser: User = {
        id: `user-${faker.string.uuid()}`,
        name: owner_name,
        email: email,
        role_id: 'owen-business', // Assuming 'Dueño de Negocio' role
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
    };
    users.unshift(newUser);

    // 2. Create the business
    const newBusiness: Business = {
      id: `biz-${faker.string.uuid()}`,
      user_id: newUser.id,
      name: `Negocio de ${owner_name}`, // Default name
      owner_name: owner_name,
      email: email,
      status: 'INCOMPLETE',
      type: 'restaurant', // Default type
      category_id: '', // To be filled in next step
      phone_whatsapp: '',
      address_line: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockBusinesses.unshift(newBusiness);

    return jsonResponse(201, { message: "Cuenta creada con éxito.", user: newUser, business: newBusiness, businessId: newBusiness.id });
  } catch (error) {
    return errorResponse(500, "Error al crear el negocio.");
  }
}
