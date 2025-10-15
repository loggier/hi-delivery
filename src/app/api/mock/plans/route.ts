import { plans } from "@/mocks/data";
import { type Plan } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { planSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";
import { NextRequest } from "next/server";

let mockPlans = [...plans];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    let filteredPlans = mockPlans;

    if (name) {
      filteredPlans = filteredPlans.filter(p => p.name.toLowerCase().includes(name.toLowerCase()));
    }
    
    return jsonResponse(200, filteredPlans.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (error) {
    return errorResponse(500, "Error al obtener los planes.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = planSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const now = new Date().toISOString();
    const newPlan: Plan = {
      id: `plan-${faker.string.uuid()}`,
      createdAt: now,
      updatedAt: now,
      ...parsed.data,
    };

    mockPlans.unshift(newPlan);

    return jsonResponse(201, newPlan);
  } catch (error) {
    return errorResponse(500, "Error al crear el plan.");
  }
}
