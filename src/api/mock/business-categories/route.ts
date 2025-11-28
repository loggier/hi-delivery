import { businessCategories } from "@/mocks/data";
import { type BusinessCategory } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { faker } from "@faker-js/faker";
import { z } from "zod";
import { NextRequest } from "next/server";

// Define a local schema to avoid importing client-side code (`schemas.ts`) into the server environment.
const newCategorySchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  type: z.enum(["restaurant", "store", "service"], { required_error: "Debes seleccionar un tipo."}),
  active: z.boolean().default(true),
});


let mockCategories = [...businessCategories];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const active = searchParams.get('active');

    let filteredCategories = mockCategories;

    if (name) {
      filteredCategories = filteredCategories.filter(c => c.name.toLowerCase().includes(name.toLowerCase()));
    }

    if (active === 'true') {
      filteredCategories = filteredCategories.filter(c => c.active);
    }
    
    return jsonResponse(200, filteredCategories.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener las categorías.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = newCategorySchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const newCategory: BusinessCategory = {
      id: `cat-${faker.string.uuid()}`,
      created_at: new Date().toISOString(),
      ...parsed.data,
    };

    mockCategories.unshift(newCategory);

    return jsonResponse(201, newCategory);
  } catch (error) {
    return errorResponse(500, "Error al crear la categoría.");
  }
}
