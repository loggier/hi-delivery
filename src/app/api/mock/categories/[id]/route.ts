import { categories } from "@/mocks/data";
import { type Category } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { categorySchema } from "@/lib/schemas";

let mockCategories = [...categories];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const category = mockCategories.find((c) => c.id === params.id);
    if (!category) {
      return errorResponse(404, "Category not found.");
    }
    return jsonResponse(200, category);
  } catch (error) {
    return errorResponse(500, "Failed to fetch category.");
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const categoryIndex = mockCategories.findIndex((c) => c.id === params.id);
    if (categoryIndex === -1) {
      return errorResponse(404, "Category not found.");
    }

    const json = await request.json();
    const parsed = categorySchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Invalid data provided.");
    }

    const updatedCategory = { ...mockCategories[categoryIndex], ...parsed.data };
    mockCategories[categoryIndex] = updatedCategory;

    return jsonResponse(200, updatedCategory);
  } catch (error) {
    return errorResponse(500, "Failed to update category.");
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
      return errorResponse(404, "Category not found.");
    }

    mockCategories.splice(categoryIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Failed to delete category.");
  }
}
