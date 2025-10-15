import { customers } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const customer = customers.find((c) => c.id === params.id);
    if (!customer) {
      return errorResponse(404, "Cliente no encontrado.");
    }
    return jsonResponse(200, customer);
  } catch (error) {
    return errorResponse(500, "Error al obtener el cliente.");
  }
}
