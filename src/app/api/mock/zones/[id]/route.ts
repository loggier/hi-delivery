import { zones } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { zoneSchema } from "@/lib/schemas";

let mockZones = [...zones];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const zone = mockZones.find((c) => c.id === params.id);
    if (!zone) {
      return errorResponse(404, "Zona no encontrada.");
    }
    return jsonResponse(200, zone);
  } catch (error) {
    return errorResponse(500, "Error al obtener la zona.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const zoneIndex = mockZones.findIndex((c) => c.id === params.id);
    if (zoneIndex === -1) {
      return errorResponse(404, "Zona no encontrada.");
    }

    const json = await request.json();
    
    const parsed = zoneSchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }

    const updatedZone = { 
        ...mockZones[zoneIndex], 
        ...parsed.data,
        updatedAt: new Date().toISOString(),
    };
    mockZones[zoneIndex] = updatedZone;

    return jsonResponse(200, updatedZone);
  } catch (error) {
    console.error(error);
    return errorResponse(500, "Error al actualizar la zona.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const zoneIndex = mockZones.findIndex((c) => c.id === params.id);
    if (zoneIndex === -1) {
      return errorResponse(404, "Zona no encontrada.");
    }

    mockZones.splice(zoneIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar la zona.");
  }
}
