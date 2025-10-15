import { productCategories } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { productCategorySchema } from "@/lib/schemas";

let mockCategories = [...productCategories];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const category = mockCategories.find((c) => c.id === params.id);
    if (!category) {
      return errorResponse(404, "Categoría no encontrada.");
    }
    return jsonResponse(200, category);
  } catch (error) {
    return errorResponse(500, "Error al obtener la categoría.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const categoryIndex = mockCategories.findIndex((c) => c.id === params.id);
    if (categoryIndex === -1) {
      return errorResponse(404, "Categoría no encontrada.");
    }

    const json = await request.json();
    const parsed = productCategorySchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.");
    }

    const updatedCategory = { ...mockCategories[categoryIndex], ...parsed.data };
    mockCategories[categoryIndex] = updatedCategory;

    return jsonResponse(200, updatedCategory);
  } catch (error) {
    return errorResponse(500, "Error al actualizar la categoría.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const categoryIndex = mockCategories.findIndex((c) => c.id === params.id);
    if (categoryIndex === -1) {
      return errorResponse(404, "Categoría no encontrada.");
    }

    mockCategories.splice(categoryIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar la categoría.");
  }
}
