import { products } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { productSchema } from "@/lib/schemas";

let mockProducts = [...products];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const product = mockProducts.find((p) => p.id === params.id);
    if (!product) {
      return errorResponse(404, "Producto no encontrado.");
    }
    return jsonResponse(200, product);
  } catch (error) {
    return errorResponse(500, "Error al obtener el producto.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const productIndex = mockProducts.findIndex((p) => p.id === params.id);
    if (productIndex === -1) {
      return errorResponse(404, "Producto no encontrado.");
    }

    const json = await request.json();
    const parsed = productSchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }

    const updatedProduct = { ...mockProducts[productIndex], ...parsed.data };
    mockProducts[productIndex] = updatedProduct;

    return jsonResponse(200, updatedProduct);
  } catch (error) {
    return errorResponse(500, "Error al actualizar el producto.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const productIndex = mockProducts.findIndex((p) => p.id === params.id);
    if (productIndex === -1) {
      return errorResponse(404, "Producto no encontrado.");
    }

    mockProducts.splice(productIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar el producto.");
  }
}
