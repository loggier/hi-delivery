import { businesses } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { businessSchema } from "@/lib/schemas";

let mockBusinesses = [...businesses];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const business = mockBusinesses.find((c) => c.id === params.id);
    if (!business) {
      return errorResponse(404, "Negocio no encontrado.");
    }
    return jsonResponse(200, business);
  } catch (error) {
    return errorResponse(500, "Error al obtener el negocio.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const businessIndex = mockBusinesses.findIndex((c) => c.id === params.id);
    if (businessIndex === -1) {
      return errorResponse(404, "Negocio no encontrado.");
    }

    const json = await request.json();
    
    const parsed = businessSchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }

    const updatedBusiness = { 
        ...mockBusinesses[businessIndex], 
        ...parsed.data,
        updatedAt: new Date().toISOString(),
    };
    mockBusinesses[businessIndex] = updatedBusiness;

    return jsonResponse(200, updatedBusiness);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Error al actualizar el negocio.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const businessIndex = mockBusinesses.findIndex((c) => c.id === params.id);
    if (businessIndex === -1) {
      return errorResponse(404, "Negocio no encontrado.");
    }

    mockBusinesses.splice(businessIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar el negocio.");
  }
}
