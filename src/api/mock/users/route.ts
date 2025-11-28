import { users } from "@/mocks/data";
import { type User } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { z } from "zod";
import { faker } from "@faker-js/faker";

// Define a local schema to avoid importing client-side code (`schemas.ts`) into the server environment.
const userSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email(),
  role_id: z.string({ required_error: "Debe seleccionar un rol."}),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  password: z.string().optional(), // Password is optional when editing, required when creating.
});


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
