import { businesses, categories, products, riders } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";

export async function GET() {
  try {
    await simulateLatency();

    const allEntities = [...businesses, ...riders, ...products, ...categories];
    const latestChanges = allEntities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const stats = {
      activeBusinesses: businesses.filter(b => b.status === 'ACTIVE').length,
      activeRiders: riders.filter(r => r.status === 'ACTIVE').length,
      totalProducts: products.length,
      totalCategories: categories.length,
      latestChanges,
    };

    return jsonResponse(200, stats);
  } catch (error) {
    return errorResponse(500, "Error al obtener las estadísticas del panel.");
  }
}
