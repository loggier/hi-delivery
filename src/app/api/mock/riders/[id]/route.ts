import { riders } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";

let mockRiders = [...riders];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const rider = mockRiders.find((c) => c.id === params.id);
    if (!rider) {
      return errorResponse(404, "Repartidor no encontrado.");
    }
    return jsonResponse(200, rider);
  } catch (error) {
    return errorResponse(500, "Error al obtener el repartidor.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const riderIndex = mockRiders.findIndex((c) => c.id === params.id);
    if (riderIndex === -1) {
      return errorResponse(404, "Repartidor no encontrado.");
    }

    const json = await request.json();

    const updatedRider = { 
        ...mockRiders[riderIndex], 
        ...json,
        updatedAt: new Date().toISOString(),
    };
    mockRiders[riderIndex] = updatedRider;

    return jsonResponse(200, updatedRider);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Error al actualizar el repartidor.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const riderIndex = mockRiders.findIndex((c) => c.id === params.id);
    if (riderIndex === -1) {
      return errorResponse(404, "Repartidor no encontrado.");
    }

    mockRiders.splice(riderIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar el repartidor.");
  }
}
