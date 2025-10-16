import { zones } from "@/mocks/data";
import { type Zone } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { zoneSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";
import { NextRequest } from "next/server";

let mockZones = [...zones];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    let filteredZones = mockZones;

    if (name) {
      filteredZones = filteredZones.filter(z => z.name.toLowerCase().includes(name.toLowerCase()));
    }
    
    return jsonResponse(200, filteredZones);
  } catch (error) {
    return errorResponse(500, "Error al obtener las zonas.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = zoneSchema.safeParse(json);

    if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }
    
    const now = new Date().toISOString();
    const newZone: Zone = {
      id: `zone-${faker.string.uuid()}`,
      businessCount: 0,
      riderCount: 0,
      created_at: now,
      updated_at: now,
      ...parsed.data,
    };

    mockZones.unshift(newZone);

    return jsonResponse(201, newZone);
  } catch (error) {
    return errorResponse(500, "Error al crear la zona.");
  }
}
