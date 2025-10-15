import { plans } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../../helpers";
import { planSchema } from "@/lib/schemas";

let mockPlans = [...plans];

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const plan = mockPlans.find((p) => p.id === params.id);
    if (!plan) {
      return errorResponse(404, "Plan no encontrado.");
    }
    return jsonResponse(200, plan);
  } catch (error) {
    return errorResponse(500, "Error al obtener el plan.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const planIndex = mockPlans.findIndex((p) => p.id === params.id);
    if (planIndex === -1) {
      return errorResponse(404, "Plan no encontrado.");
    }

    const json = await request.json();
    const parsed = planSchema.partial().safeParse(json);

     if (!parsed.success) {
      return errorResponse(400, "Datos proporcionados no válidos.", parsed.error.format());
    }

    const updatedPlan = { 
        ...mockPlans[planIndex], 
        ...parsed.data,
        updatedAt: new Date().toISOString(),
    };
    mockPlans[planIndex] = updatedPlan;

    return jsonResponse(200, updatedPlan);
  } catch (error) {
    return errorResponse(500, "Error al actualizar el plan.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await simulateLatency();
    const planIndex = mockPlans.findIndex((p) => p.id === params.id);
    if (planIndex === -1) {
      return errorResponse(404, "Plan no encontrado.");
    }

    mockPlans.splice(planIndex, 1);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(500, "Error al eliminar el plan.");
  }
}
