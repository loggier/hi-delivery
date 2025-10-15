import { roles } from "@/mocks/data";
import { type Role } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { roleSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";

let mockRoles = [...roles];

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, mockRoles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener los roles.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = roleSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const newRole: Role = {
      id: `role-${faker.string.uuid()}`,
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };

    mockRoles.unshift(newRole);

    return jsonResponse(201, newRole);
  } catch (error) {
    return errorResponse(500, "Error al crear el rol.");
  }
}
