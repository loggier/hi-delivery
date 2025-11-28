

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Business, Category, Product, Rider, User, BusinessCategory, Zone, Customer, Order, Role, Plan, Payment, SystemSettings, CustomerAddress, OrderPayload } from "@/types";
import { faker } from "@faker-js/faker";
import { PostgrestError } from "@supabase/supabase-js";
import { add } from "date-fns";

const entityTranslations: { [key: string]: string } = {
    "product-categories": "Categoría de Producto",
    "business-categories": "Categoría de Negocio",
    "businesses": "Negocio",
    "products": "Producto",
    "riders": "Repartidor",
    "users": "Usuario",
    "zones": "Zona",
    "customers": "Cliente",
    "customer-addresses": "Dirección de Cliente",
    "roles": "Rol",
    "plans": "Plan",
    "payments": "Pago",
    "settings": "Configuración",
    "orders": "Pedido",
}

// --- Generic Fetcher ---
async function handleApiQuery<T>(query: Promise<Response>): Promise<T> {
    const response = await query;
    if (!response.ok) {
        let errorMsg = `Error: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMsg = errorBody.message || errorMsg;
        } catch (e) {
            // Ignore if body is not JSON
        }
        throw new Error(errorMsg);
    }
    return response.json();
}

// --- Generic CRUD Hooks ---
function createCRUDApi<T extends { id: string }>(entity: string) {
  const entityKey = [entity];
  const translatedEntity = entityTranslations[entity] || entity;
  
  // GET all
  const useGetAll = (params: Record<string, string | boolean | undefined> = {}) => {
    const queryKey = [entity, params];
    
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)])
    ).toString();

    const url = `/api/mock/${entity}${queryString ? `?${queryString}` : ''}`;
    
    return useQuery<T[]>({
      queryKey: queryKey,
      queryFn: async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${entity}`);
        return res.json();
      },
      enabled: !Object.keys(params).some(key => key.endsWith('_id') && !params[key])
    });
  }

  // GET one
  const useGetOne = (id: string) => {
    return useQuery<T>({
        queryKey: [entity, id],
        queryFn: async () => {
            const res = await fetch(`/api/mock/${entity}/${id}`);
            if (!res.ok) throw new Error(`Failed to fetch ${entity} with id ${id}`);
            return res.json();
        },
        enabled: !!id,
    });
  }

  // CREATE
  const useCreate = <T_DTO = Omit<T, "id" | "created_at" | "updated_at">>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<T & { businessId?: string; user?: User }, Error, T_DTO>({
      mutationFn: async (newItemDTO) => {
        const response = await fetch(`/api/mock/${entity}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItemDTO),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al crear.');
        }
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [entity] });
        if (entity === 'customer_addresses') {
            const customerId = (data as any).customer_id;
            queryClient.invalidateQueries({ queryKey: ['customer-addresses', { customer_id: customerId }] });
        }
        if (entity === 'businesses' || entity === 'riders') {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        }
        toast({
          title: "Éxito",
          description: `${translatedEntity} creado exitosamente.`,
          variant: 'success'
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });
  };
  
  // CREATE with FormData
  const useCreateWithFormData = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<T & { businessId?: string }, Error, FormData>({
      mutationFn: async (formData) => {
        const response = await fetch(`/api/${entity}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `Error al crear ${translatedEntity}`);
        }
        return result;
      },
      onSuccess: (result: any) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        if (result.user) {
            queryClient.invalidateQueries({queryKey: ['users']});
        }
        toast({
          title: "Éxito",
          description: `${translatedEntity} creado exitosamente.`,
          variant: 'success',
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });
  };

    const useUpdateWithFormData = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<T, Error, { formData: FormData, id: string }>({
      mutationFn: async ({ formData, id }) => {
        const response = await fetch(`/api/${entity}/${id}`, {
          method: 'POST', // Using POST for FormData with method override if needed, but often simple POST to resource ID is used for updates.
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || `Error al actualizar ${translatedEntity}`);
        }
        return result.business || result.product || result.rider || result;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        queryClient.setQueryData([...entityKey, data.id], data);
        toast({
          title: "Éxito",
          description: `${translatedEntity} actualizado exitosamente.`,
          variant: 'success',
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error al actualizar",
          description: error.message,
        });
      },
    });
  };

  // UPDATE
  const useUpdate = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<T, Error, Partial<T> & { id: string }>({
      mutationFn: async (item) => {
        const { id, ...updateData } = item;
        const response = await fetch(`/api/mock/${entity}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar.');
        }
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        queryClient.setQueryData([...entityKey, data.id], data);
         if (entity === 'customer_addresses') {
            const customerId = (data as any).customer_id;
            queryClient.invalidateQueries({ queryKey: ['customer-addresses', { customer_id: customerId }] });
        }
        toast({
          title: "Éxito",
          description: `${translatedEntity} actualizado exitosamente.`,
          variant: 'success'
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });
  };

  // DELETE
  const useDelete = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            const response = await fetch(`/api/mock/${entity}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar.');
            }
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: entityKey });
            if (entity === 'businesses' || entity === 'riders') {
                queryClient.invalidateQueries({ queryKey: ['users'] });
            }
            toast({
                title: "Éxito",
                description: `${translatedEntity} eliminado exitosamente.`,
            });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            });
        },
    });
  };
  
  return { useGetAll, useGetOne, useCreate, useUpdate, useDelete, useCreateWithFormData, useUpdateWithFormData };
}

// Special API for settings as it's a single-row table
function createSettingsApi() {
    const entity = 'system_settings';
    const entityKey = [entity];
    const translatedEntity = entityTranslations['settings'];

    const useGet = () => {
        return useQuery<SystemSettings>({
            queryKey: entityKey,
            queryFn: async () => {
                // This is a mock, so we can't rely on a single ID. We'll fetch all and take the first.
                const res = await fetch(`/api/mock/${entity}`);
                 if (!res.ok) throw new Error(`Failed to fetch ${entity}`);
                const data = await res.json();
                return data[0];
            },
        });
    };

    const useUpdate = () => {
        const queryClient = useQueryClient();
        const { toast } = useToast();
        return useMutation<SystemSettings, Error, Partial<SystemSettings>>({
            mutationFn: (settings) => {
                // In mock API, we'll PATCH the first settings object.
                 return handleApiQuery(fetch(`/api/mock/${entity}/1`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(settings)
                }));
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: entityKey });
                queryClient.setQueryData(entityKey, data);
                toast({
                    title: "Éxito",
                    description: `${translatedEntity} actualizada exitosamente.`,
                    variant: 'success'
                });
            },
            onError: (error) => {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message,
                });
            },
        });
    };

    return { useGet, useUpdate };
}


// --- Specific API Hooks ---
export const api = {
    "product_categories": createCRUDApi<Category>('product-categories'),
    "business_categories": createCRUDApi<BusinessCategory>('business-categories'),
    businesses: createCRUDApi<Business>('businesses'),
    products: createCRUDApi<Product>('products'),
    riders: createCRUDApi<Rider>('riders'),
    users: createCRUDApi<User>('users'),
    zones: createCRUDApi<Zone>('zones'),
    customers: createCRUDApi<Customer>('customers'),
    "customer-addresses": createCRUDApi<CustomerAddress>('customer-addresses'),
    orders: createCRUDApi<Order>('orders'),
    roles: createCRUDApi<Role>('roles'),
    plans: createCRUDApi<Plan>('plans'),
    payments: createCRUDApi<Payment>('payments'),
    // settings: createSettingsApi(),
};

// Custom hooks for nested resources
export const useCustomerOrders = (customerId: string) => {
    return useQuery<Order[]>({
        queryKey: ['customers', customerId, 'orders'],
        queryFn: async () => {
            const res = await fetch(`/api/mock/customers/${customerId}/orders`);
            if (!res.ok) throw new Error('Failed to fetch customer orders');
            return res.json();
        },
        enabled: !!customerId,
    });
};


type RevenueData = { date: string; ingresos: number };
type OrdersData = { date: string; pedidos: number };
type OrderStatusSummary = {
    unassigned: number;
    accepted: number;
    cooking: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    refunded: number;
    failed: number;
};


// --- Dashboard Stats ---
export const useDashboardStats = () => useQuery<{
    activeBusinesses: number;
    activeRiders: number;
    totalProducts: number;
    totalCategories: number;
    latestChanges: (Category | Business | Product | Rider)[];
    revenueData: RevenueData[];
    ordersData: OrdersData[];
    orderStatusSummary: OrderStatusSummary;
    totalRevenue: number;
    totalOrders: number;
}>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
        const res = await fetch(`/api/mock/dashboard-stats`);
        if (!res.ok) throw new Error('Failed to fetch dashboard stats');
        return res.json();
    }
});


// --- Custom Subscription Management Hook ---
export const useManageSubscription = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<void, Error, { businessId: string; planId: string; amount: number }>({
        mutationFn: async ({ businessId, planId, amount }) => {
           // This is a complex operation involving creating payments and updating businesses.
           // For a mock API, we can simulate this by invalidating queries.
           // In a real Supabase scenario, this would be a transaction or an RPC call.
           
           // Mock creating payment
           const payment = {
                id: `pay-${faker.string.uuid()}`,
                business_id: businessId,
                plan_id: planId,
                amount: amount,
                payment_date: new Date().toISOString(),
           };
           // In a real app: await supabase.from('payments').insert(payment);

           // Mock updating business
           const {data: plan} = await handleApiQuery<Plan>(fetch(`/api/mock/plans/${planId}`));
           const now = new Date();
           const periodEnd = add(now, { months: 1 }); // Assuming monthly for simplicity
            
           const businessUpdate = {
                plan_id: planId,
                subscription_status: 'active',
                current_period_ends_at: periodEnd.toISOString(),
           };
           
            await handleApiQuery(fetch(`/api/mock/businesses/${businessId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(businessUpdate),
            }));
        },
        onSuccess: (_, { businessId }) => {
            queryClient.invalidateQueries({ queryKey: ['businesses', businessId] });
            queryClient.invalidateQueries({ queryKey: ['businesses'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] }); // Assuming a payments query exists
            toast({
                title: "Suscripción Actualizada",
                description: "El pago ha sido registrado y el plan ha sido actualizado.",
                variant: "success",
            });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error al gestionar suscripción",
                description: error.message,
            });
        }
    });
};
