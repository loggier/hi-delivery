import { customers } from "@/mocks/data";
import { type Customer } from "@/types";
import { errorResponse, jsonResponse, simulateLatency } from "../helpers";
import { NextRequest } from "next/server";
import { newCustomerSchema } from "@/lib/schemas";
import { faker } from "@faker-js/faker";

let mockCustomers = [...customers];

export async function GET(req: NextRequest) {
  try {
    await simulateLatency();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('name_search');

    let filteredCustomers = mockCustomers;

    if (search) {
        const lowercasedSearch = search.toLowerCase();
        filteredCustomers = filteredCustomers.filter(c =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(lowercasedSearch) ||
            (c.email && c.email.toLowerCase().includes(lowercasedSearch)) ||
            c.phone.includes(lowercasedSearch)
        );
    }
    
    filteredCustomers.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.created_at).getTime());

    return jsonResponse(200, filteredCustomers);
  } catch (error) {
    return errorResponse(500, "Error al obtener los clientes.");
  }
}

export async function POST(request: Request) {
  try {
    await simulateLatency();
    const json = await request.json();
    const parsed = newCustomerSchema.safeParse(json);

    if (!parsed.success) {
      return jsonResponse(400, { message: "Datos de cliente inválidos.", errors: parsed.error.format() });
    }

    const now = new Date().toISOString();
    const newCustomer: Customer = {
      id: `cust-${faker.string.uuid()}`,
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      order_count: 0,
      total_spent: 0,
      created_at: now,
      updated_at: now,
    };

    mockCustomers.unshift(newCustomer);

    return jsonResponse(201, newCustomer);
  } catch (error) {
    return errorResponse(500, "Error al crear el cliente.");
  }
}
