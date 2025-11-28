import { productCategories } from "@/mocks/data";
import { type Category } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { faker } from "@faker-js/faker";
import { z } from "zod";

// Define a local schema to avoid importing client-side code (`schemas.ts`) into the server environment.
const newCategorySchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  slug: z.string().min(2, { message: "El slug debe tener al menos 2 caracteres." }),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});


let mockCategories = [...productCategories];

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, mockCategories);
  } catch (error) {
    return errorResponse(500, "Error al obtener las categorías de productos.");
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
    
    const newCategory: Category = {
      id: `prod-cat-${faker.string.uuid()}`,
      created_at: new Date().toISOString(),
      ...parsed.data,
    };

    mockCategories.unshift(newCategory);

    return jsonResponse(201, newCategory);
  } catch (error) {
    return errorResponse(500, "Error al crear la categoría.");
  }
}
