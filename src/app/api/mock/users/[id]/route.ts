import { users } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { userSchema } from "@/lib/schemas";

let mockUsers = [...users];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const user = mockUsers.find((c) => c.id === params.id);
    if (!user) {
      return errorResponse(404, "Usuario no encontrado.");
    }
    return jsonResponse(200, user);
  } catch (error) {
    return errorResponse(500, "Error al obtener el usuario.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const userIndex = mockUsers.findIndex((c) => c.id === params.id);
    if (userIndex === -1) {
      return errorResponse(404, "Usuario no encontrado.");
    }

    const json = await request.json();
    const parsed = userSchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.");
    }

    const updatedUser = { ...mockUsers[userIndex], ...parsed.data };
    mockUsers[userIndex] = updatedUser;

    return jsonResponse(200, updatedUser);
  } catch (error) {
    return errorResponse(500, "Error al actualizar el usuario.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const userIndex = mockUsers.findIndex((c) => c.id === params.id);
    if (userIndex === -1) {
      return errorResponse(404, "Usuario no encontrado.");
    }

    mockUsers.splice(userIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar el usuario.");
  }
}
