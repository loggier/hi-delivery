import { users } from "@/mocks/data";
import { type User } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { userSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";

let mockUsers = [...users];

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, mockUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener los usuarios.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = userSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const newUser: User = {
      id: `user-${faker.string.uuid()}`,
      created_at: new Date().toISOString(),
      ...parsed.data,
    };

    mockUsers.unshift(newUser);

    return jsonResponse(201, newUser);
  } catch (error) {
    return errorResponse(500, "Error al crear el usuario.");
  }
}
