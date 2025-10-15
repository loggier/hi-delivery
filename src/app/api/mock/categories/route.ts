import { categories } from "@/mocks/data";
import { type Category } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { categorySchema } from "@/lib/schemas";

let mockCategories = [...categories];

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, mockCategories);
  } catch (error) {
    return errorResponse(500, "Error al obtener las categorías.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = categorySchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.");
    }
    
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };

    mockCategories.unshift(newCategory);

    return jsonResponse(201, newCategory);
  } catch (error) {
    return errorResponse(500, "Error al crear la categoría.");
  }
}
