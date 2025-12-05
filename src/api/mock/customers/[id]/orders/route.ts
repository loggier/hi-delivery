import { orders } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../../helpers";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const customerOrders = orders.filter((o) => o.customerId === params.id);
    
    // Sort by most recent date
    customerOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return jsonResponse(200, customerOrders);
  } catch (error) {
    return errorResponse(500, "Error al obtener los pedidos del cliente.");
  }
}
