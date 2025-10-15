import { businessCategories } from "@/mocks/data";
import { type BusinessCategory } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { businessCategorySchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";

let mockCategories = [...businessCategories];

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, mockCategories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener las categorías de negocio.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = businessCategorySchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const newCategory: BusinessCategory = {
      id: `bus-cat-${faker.string.uuid()}`,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };

    mockCategories.unshift(newCategory);

    return jsonResponse(201, newCategory);
  } catch (error) {
    return errorResponse(500, "Error al crear la categoría de negocio.");
  }
}
