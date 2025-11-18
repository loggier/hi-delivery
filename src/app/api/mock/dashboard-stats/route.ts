import { businesses, productCategories, products, riders } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { subDays, format } from 'date-fns';
import { faker } from "@faker-js/faker";

function generateChartData() {
    const today = new Date();
    const revenueData = [];
    const ordersData = [];

    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const formattedDate = format(date, 'MMM d');
        
        revenueData.push({
            date: formattedDate,
            ingresos: faker.number.int({ min: 1000, max: 8000 }),
        });

        ordersData.push({
            date: formattedDate,
            pedidos: faker.number.int({ min: 40, max: 150 }),
        });
    }
    return { revenueData, ordersData };
}

function generateOrderStatusSummary() {
    return {
        unassigned: faker.number.int({ min: 0, max: 5 }),
        accepted: faker.number.int({ min: 1, max: 10 }),
        cooking: faker.number.int({ min: 0, max: 8 }),
        outForDelivery: faker.number.int({ min: 0, max: 12 }),
        delivered: faker.number.int({ min: 20, max: 50 }),
        cancelled: faker.number.int({ min: 1, max: 5 }),
        refunded: faker.number.int({ min: 0, max: 2 }),
        failed: faker.number.int({ min: 0, max: 1 }),
    };
}


export async function GET() {
  try {
    await simulateLatency();

    const allEntities = [...businesses, ...riders, ...products, ...productCategories];
    const latestChanges = allEntities
      .sort((a, b) => new Date(b.created_at || (b as any).createdAt).getTime() - new Date(a.created_at || (a as any).createdAt).getTime())
      .slice(0, 5);

    const { revenueData, ordersData } = generateChartData();
    const orderStatusSummary = generateOrderStatusSummary();

    const stats = {
      activeBusinesses: businesses.filter(b => b.status === 'ACTIVE').length,
      activeRiders: riders.filter(r => r.status === 'approved').length,
      totalProducts: products.length,
      totalCategories: productCategories.length,
      latestChanges,
      revenueData,
      ordersData,
      orderStatusSummary,
      totalRevenue: revenueData.reduce((acc, item) => acc + item.ingresos, 0),
      totalOrders: ordersData.reduce((acc, item) => acc + item.pedidos, 0),
    };

    return jsonResponse(200, stats);
  } catch (error) {
    return errorResponse(500, "Error al obtener las estadísticas del panel.");
  }
}
