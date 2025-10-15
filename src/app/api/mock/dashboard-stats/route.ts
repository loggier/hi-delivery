import { businesses, categories, products, riders } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { subDays, format } from 'date-fns';

function generateChartData() {
    const today = new Date();
    const revenueData = [];
    const ordersData = [];

    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const formattedDate = format(date, 'MMM d');
        
        revenueData.push({
            date: formattedDate,
            ingresos: Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000,
        });

        ordersData.push({
            date: formattedDate,
            pedidos: Math.floor(Math.random() * (120 - 40 + 1)) + 40,
        });
    }
    return { revenueData, ordersData };
}


export async function GET() {
  try {
    await simulateLatency();

    const allEntities = [...businesses, ...riders, ...products, ...categories];
    const latestChanges = allEntities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const { revenueData, ordersData } = generateChartData();

    const stats = {
      activeBusinesses: businesses.filter(b => b.status === 'ACTIVE').length,
      activeRiders: riders.filter(r => r.status === 'ACTIVE').length,
      totalProducts: products.length,
      totalCategories: categories.length,
      latestChanges,
      revenueData,
      ordersData,
      totalRevenue: revenueData.reduce((acc, item) => acc + item.ingresos, 0),
      totalOrders: ordersData.reduce((acc, item) => acc + item.pedidos, 0),
    };

    return jsonResponse(200, stats);
  } catch (error) {
    return errorResponse(500, "Error al obtener las estadísticas del panel.");
  }
}
