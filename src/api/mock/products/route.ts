import { products } from "@/mocks/data";
import { type Product } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { productSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";

let mockProducts = [...products];

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, mockProducts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener los productos.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = productSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const newProduct: Product = {
      id: `prod-${faker.string.uuid()}`,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };

    mockProducts.unshift(newProduct);

    return jsonResponse(201, newProduct);
  } catch (error) {
    return errorResponse(500, "Error al crear el producto.");
  }
}
