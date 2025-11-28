import { orders } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../../helpers";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const customerOrders = orders.filter((o) => o.customer_id === params.id);
    
    // Sort by most recent date
    customerOrders.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return jsonResponse(200, customerOrders);
  } catch (error) {
    return errorResponse(500, "Error al obtener los pedidos del cliente.");
  }
}
