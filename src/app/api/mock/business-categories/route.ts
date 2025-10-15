import { businessCategories } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";

export async function GET() {
  try {
    await simulateLatency();
    return jsonResponse(200, businessCategories);
  } catch (error) {
    return errorResponse(500, "Error al obtener las categorías de negocio.");
  }
}
