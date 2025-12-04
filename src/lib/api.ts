

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Business, Category, Product, Rider, User, BusinessCategory, Zone, Customer, Order, Role, Plan, Payment, SystemSettings, CustomerAddress, OrderItem, OrderPayload, DashboardStats, Module, RolePermission } from "@/types";
import { createClient } from "./supabase/client";

const entityTranslations: { [key: string]: string } = {
    "products": "Producto",
    "product_categories": "Categoría de Producto",
    "business_categories": "Categoría de Negocio",
    "businesses": "Negocio",
    "riders": "Repartidor",
    "users": "Usuario",
    "zones": "Zona",
    "customers": "Cliente",
    "customer_addresses": "Dirección de Cliente",
    "roles": "Rol",
    "plans": "Plan",
    "payments": "Pago",
    "system_settings": "Configuración",
    "orders": "Pedido",
    "dashboard-stats": "Estadísticas del Panel",
    "modules": "Módulo",
}

// --- Generic Read/Create/Delete Hooks ---
function createApi<T extends { id: string | number }>(
  entity: keyof typeof entityTranslations,
  select: string = '*',
  options: { enabled?: boolean } = {}
) {
  const entityKey = [entity];
  const translatedEntity = entityTranslations[entity] || entity;
  const supabase = createClient();

  const useGetAll = (filters: Record<string, any> = {}, queryOptions: { enabled?: boolean } = {}) => {
    return useQuery<T[]>({
      queryKey: [entity, filters],
      queryFn: async () => {
        let query = supabase.from(entity).select(select).order('created_at', { ascending: false });;
        for (const key in filters) {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                if (key.includes('search')) {
                    const searchKey = key.split('_search')[0];
                    query = query.ilike(searchKey, `%${filters[key]}%`);
                } else if(key === 'active') { // Handle boolean filter for business categories
                    query = query.eq(key, filters[key] === 'true');
                }
                else {
                    query = query.eq(key, filters[key]);
                }
            }
        }
        const { data, error } = await query;
        if (error) throw error;
        return data as T[];
      },
      enabled: queryOptions.enabled ?? (!Object.keys(filters).some(key => key.endsWith('_id') && !filters[key]))
    });
  }

  const useGetOne = (id: string, queryOptions: { enabled?: boolean } = {}) => {
    return useQuery<T>({
        queryKey: [entity, id],
        queryFn: async () => {
            const { data, error } = await supabase.from(entity).select(select).eq('id', id).single();
            if (error) throw error;
            return data as T;
        },
        enabled: queryOptions.enabled ?? !!id,
    });
  }
  
  const useGetSettings = () => {
    return useQuery<T>({
      queryKey: [entity],
      queryFn: async () => {
        const { data, error } = await supabase.from(entity).select('*').limit(1).single();
        if (error) throw error;
        return data as T;
      },
    });
  };

  const useCreate = <T_DTO = Omit<T, "id" | "created_at" | "updated_at">>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<T, Error, T_DTO>({
      mutationFn: async (newItemDTO) => {
        const { data, error } = await supabase.from(entity).insert(newItemDTO as any).select().single();
        if (error) throw error;
        return data as T;
      },
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        if (data.customer_id) {
            queryClient.invalidateQueries({ queryKey: ['customer_addresses', { customer_id: data.customer_id }] });
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
  
  const useCreateWithFormData = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<T & { businessId?: string; user?: User }, Error, FormData>({
      mutationFn: async (formData) => {
        const response = await fetch(`/api/${entity}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Error al crear ${translatedEntity}`);
        return result;
      },
      onSuccess: (result: any) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        if (result.user) queryClient.invalidateQueries({queryKey: ['users']});
        toast({
          title: "Éxito",
          description: `${translatedEntity} creado exitosamente.`,
          variant: 'success',
        });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Error", description: error.message });
      },
    });
  };

  const useUpdateWithFormData = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<T, Error, { formData: FormData, id: string }>({
      mutationFn: async ({ formData, id }) => {
        const response = await fetch(`/api/${entity}/${id}`, {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Error al actualizar ${translatedEntity}`);
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
        toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
      },
    });
  };

  const useUpdate = <T_DTO extends { id: string | number }>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<T, Error, Partial<T_DTO>>({
        mutationFn: async (itemData) => {
            const { id, ...updateData } = itemData;
            const { data, error } = await supabase
                .from(entity)
                .update(updateData)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as T;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: entityKey });
            queryClient.setQueryData([entity, data.id], data);
            toast({
                title: "Éxito",
                description: `${translatedEntity} actualizado exitosamente.`,
                variant: 'success',
            });
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
        },
    });
  };

  const useDelete = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<void, Error, string>({
        mutationFn: async (id) => {
            const { error } = await supabase.from(entity).delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: entityKey });
            toast({
                title: "Éxito",
                description: `${translatedEntity} eliminado exitosamente.`,
            });
        },
        onError: (error) => {
            toast({ variant: "destructive", title: "Error", description: error.message });
        },
    });
  };

  return { useGetAll, useGetOne, useGetSettings, useCreate, useUpdate, useDelete, useCreateWithFormData, useUpdateWithFormData };
}

const useCreateOrder = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<Order, Error, { items: Omit<OrderItem, 'id' | 'order_id' | 'products'>[] } & OrderPayload>({
      mutationFn: async (orderData) => {
         const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Error al crear el pedido`);
        return result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Error al crear pedido",
          description: error.message,
        });
        throw error;
      },
    });
};

const useGetDashboardStats = (filters: { business_id?: string } = {}) => {
  const queryParams = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined) as [string, string][]
  ).toString();
  
  const url = `/api/dashboard-stats${queryParams ? `?${queryParams}` : ''}`;
  
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', filters],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
  });
};

const useUpdateUser = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<User, Error, Partial<User> & { id: string }>({
        mutationFn: async (userData) => {
            const { id, ...updateData } = userData;
            // The API route will handle password hashing and removing confirmation field.
            const response = await fetch(`/api/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            const result = await response.json();
            if (!response.ok) {
                const errorPayload = result.errors ? `${result.message} Detalles: ${JSON.stringify(result.errors)}` : result.message;
                throw new Error(errorPayload || "Error al actualizar el usuario.");
            }
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.setQueryData(['users', data.id], data);
            toast({
                title: "Éxito",
                description: `Usuario actualizado exitosamente.`,
                variant: 'success'
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

const useCreateOrUpdateRole = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const supabase = createClient();

    return useMutation<Role, Error, { role_id?: string; name: string; permissions: any[] }>({
        mutationFn: async (payload) => {
            const rpcPayload = {
                name_in: payload.name,
                permissions_in: payload.permissions,
                role_id_in: payload.role_id,
            };
            const { data, error } = await supabase.rpc('create_or_update_role_with_permissions', rpcPayload);
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
             queryClient.invalidateQueries({ queryKey: ['roles', data.id] });
            toast({
                title: "Éxito",
                description: `Rol guardado exitosamente.`,
                variant: 'success'
            });
        },
        onError: (error) => {
            toast({
                variant: "destructive",
                title: "Error al guardar el rol",
                description: error.message,
            });
        },
    });
}


const orderSelect = `*,
  business:businesses(name),
  customer:customers(first_name,last_name),
  rider:riders(id,first_name,last_name),
  order_items:order_items(*, products:products(name))
`;

const rolesSelect = `*, role_permissions(*)`

// --- API Hooks ---
export const api = {
    product_categories: createApi<Category>('product_categories'),
    business_categories: createApi<BusinessCategory>('business_categories'),
    businesses: createApi<Business>('businesses', '*,plan:plans(name),zone:zones(name)'),
    products: createApi<Product>('products'),
    riders: createApi<Rider>('riders'),
    users: {
        ...createApi<User>('users'),
        useUpdate: useUpdateUser,
    },
    zones: createApi<Zone>('zones'),
    customers: createApi<Customer>('customers'),
    customer_addresses: createApi<CustomerAddress>('customer_addresses'),
    orders: { 
      ...createApi<Order>('orders', orderSelect), 
      useCreate: useCreateOrder,
    },
    roles: {
        ...createApi<Role>('roles', rolesSelect),
        useCreate: useCreateOrUpdateRole,
        useUpdate: useCreateOrUpdateRole,
    },
    plans: createApi<Plan>('plans'),
    payments: createApi<Payment>('payments'),
    modules: createApi<Module>('modules'),
    dashboard: {
      useGetStats: useGetDashboardStats
    },
    settings: {
        useGet: createApi<SystemSettings>('system_settings').useGetSettings,
        useUpdate: createApi<SystemSettings>('system_settings').useUpdate,
    },
};

// --- Custom Subscription Management Hook ---
export const useManageSubscription = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const supabase = createClient();

    return useMutation<void, Error, { businessId: string; planId: string; amount: number }>({
        mutationFn: async ({ businessId, planId, amount }) => {
           const { data: plan, error: planError } = await supabase.from('plans').select('*').eq('id', planId).single();
           if(planError) throw new Error("Plan no encontrado.");

           const now = new Date();
           let periodEnd;
            switch (plan.validity) {
                case 'mensual': periodEnd = new Date(now.setMonth(now.getMonth() + 1)); break;
                case 'quincenal': periodEnd = new Date(now.setDate(now.getDate() + 15)); break;
                case 'semanal': periodEnd = new Date(now.setDate(now.getDate() + 7)); break;
                case 'anual': periodEnd = new Date(now.setFullYear(now.getFullYear() + 1)); break;
            }

           const { error: paymentError } = await supabase.from('payments').insert({
                business_id: businessId,
                plan_id: planId,
                amount: amount,
                payment_date: new Date().toISOString(),
                period_start: new Date().toISOString(),
                period_end: periodEnd.toISOString(),
           });

           if(paymentError) throw paymentError;

           const { error: businessError } = await supabase.from('businesses').update({
                plan_id: planId,
                subscription_status: 'active',
                current_period_ends_at: periodEnd.toISOString(),
           }).eq('id', businessId);
           
           if(businessError) throw businessError;
        },
        onSuccess: (_, { businessId }) => {
            queryClient.invalidateQueries({ queryKey: ['businesses', businessId] });
            queryClient.invalidateQueries({ queryKey: ['businesses'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
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

export const useCustomerOrders = (customerId: string) => {
  return useQuery<Order[]>({
    queryKey: ['orders', { customerId }],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
};
