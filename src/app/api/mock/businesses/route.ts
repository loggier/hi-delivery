import { businesses } from "@/mocks/data";
import { type Business } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { businessSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";
import { NextRequest } from "next/server";

let mockBusinesses = [...businesses];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');

    let filteredBusinesses = mockBusinesses;

    if (name) {
      filteredBusinesses = filteredBusinesses.filter(b => b.name.toLowerCase().includes(name.toLowerCase()));
    }
    if (email) {
      filteredBusinesses = filteredBusinesses.filter(b => b.email.toLowerCase().includes(email.toLowerCase()));
    }
    if (status) {
      filteredBusinesses = filteredBusinesses.filter(b => b.status === status);
    }
    if (type) {
      filteredBusinesses = filteredBusinesses.filter(b => b.type === type);
    }
    if (categoryId) {
        filteredBusinesses = filteredBusinesses.filter(b => b.categoryId === categoryId);
    }

    return jsonResponse(200, filteredBusinesses);
  } catch (error) {
    return errorResponse(500, "Error al obtener los negocios.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = businessSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const now = new Date().toISOString();
    const newBusiness: Business = {
      id: `biz-${faker.string.uuid()}`,
      createdAt: now,
      updatedAt: now,
      ...parsed.data,
    };

    mockBusinesses.unshift(newBusiness);

    return jsonResponse(201, newBusiness);
  } catch (error) {
    return errorResponse(500, "Error al crear el negocio.");
  }
}
