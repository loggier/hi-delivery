import { customers } from "@/mocks/data";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let filteredCustomers = customers;

    if (search) {
        const lowercasedSearch = search.toLowerCase();
        filteredCustomers = filteredCustomers.filter(c =>
            c.firstName.toLowerCase().includes(lowercasedSearch) ||
            c.lastName.toLowerCase().includes(lowercasedSearch) ||
            (c.email && c.email.toLowerCase().includes(lowercasedSearch)) ||
            c.phone.includes(lowercasedSearch)
        );
    }
    
    // Sort by most recent update
    filteredCustomers.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return jsonResponse(200, filteredCustomers);
  } catch (error) {
    return errorResponse(500, "Error al obtener los clientes.");
  }
}
