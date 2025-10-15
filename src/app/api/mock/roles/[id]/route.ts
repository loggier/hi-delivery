import { roles } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { roleSchema } from "@/lib/schemas";

let mockRoles = [...roles];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const role = mockRoles.find((c) => c.id === params.id);
    if (!role) {
      return errorResponse(404, "Rol no encontrado.");
    }
    return jsonResponse(200, role);
  } catch (error) {
    return errorResponse(500, "Error al obtener el rol.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const roleIndex = mockRoles.findIndex((c) => c.id === params.id);
    if (roleIndex === -1) {
      return errorResponse(404, "Rol no encontrado.");
    }

    const json = await request.json();
    const parsed = roleSchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.");
    }

    const updatedRole = { ...mockRoles[roleIndex], ...parsed.data };
    mockRoles[roleIndex] = updatedRole;

    return jsonResponse(200, updatedRole);
  } catch (error) {
    return errorResponse(500, "Error al actualizar el rol.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const roleIndex = mockRoles.findIndex((c) => c.id === params.id);
    if (roleIndex === -1) {
      return errorResponse(404, "Rol no encontrado.");
    }

    mockRoles.splice(roleIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar el rol.");
  }
}
