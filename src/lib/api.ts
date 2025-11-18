

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Business, Category, Product, Rider, User, BusinessCategory, Zone, Customer, Order, Role, Plan, Payment, SystemSettings } from "@/types";
import { createClient } from "./supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import { hashPassword } from "./auth-utils";
import { add } from "date-fns";

const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA!;


// --- Generic Fetcher ---
async function handleSupabaseQuery<T>(query: Promise<{ data: T | null, error: PostgrestError | null }>): Promise<T> {
    const { data, error } = await query;
    if (error) {
        console.error("Supabase error:", JSON.stringify(error, null, 2));
        throw new Error(error.message || "Ocurrió un error en la base de datos.");
    }
    return data as T;
}


const entityTranslations: { [key: string]: string } = {
    "product_categories": "Categoría de Producto",
    "business_categories": "Categoría de Negocio",
    "businesses": "Negocio",
    "products": "Producto",
    "riders": "Repartidor",
    "users": "Usuario",
    "zones": "Zona",
    "customers": "Cliente",
    "roles": "Rol",
    "plans": "Plan",
    "payments": "Pago",
    "settings": "Configuración",
}

// --- Generic CRUD Hooks ---
function createCRUDApi<T extends { id: string }>(entity: string) {
  const entityKey = [entity];
  const translatedEntity = entityTranslations[entity] || entity;
  
  const supabase = createClient();

  // GET all
  const useGetAll = (params: Record<string, string> = {}) => {
    const queryKey = [entity, params];
    
    return useQuery<T[]>({
      queryKey: queryKey,
      queryFn: async () => {
        let query = supabase.from(entity).select('*', { count: 'exact' });

        Object.entries(params).forEach(([key, value]) => {
            if(value) {
                if(key === 'name_search') {
                    query = query.or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%,email.ilike.%${value}%`);
                } else if (key === 'name') {
                    query = query.ilike('name', `%${value}%`);
                }
                else {
                    query = query.eq(key, value);
                }
            }
        });
        
        if (!params['plan_id']) { // Do not sort by created_at if we are filtering by plan
            query = query.order('created_at', { ascending: false });
        }
        
        return handleSupabaseQuery(query.returns<T[]>());
      }
    });
  }

  // GET one
  const useGetOne = (id: string) => {
    return useQuery<T>({
        queryKey: [...entityKey, id],
        queryFn: () => handleSupabaseQuery(supabase.from(entity).select('*').eq('id', id).single()),
        enabled: !!id,
    });
  }

  // CREATE
  const useCreate = <T_DTO = Omit<T, "id" | "created_at" | "updated_at" | "user_id">>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation<T & { businessId?: string; user?: User }, Error, T_DTO>({
      mutationFn: async (newItemDTO) => {
        const itemWithId = {
            id: `${entity.slice(0,4)}-${faker.string.uuid()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...newItemDTO
        }
        return handleSupabaseQuery(supabase.from(entity).insert(itemWithId).select().single());
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        if (entity === 'businesses') {
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
    return useMutation<T, Error, FormData>({
      mutationFn: async (formData) => {
        // This is a client-side hook, so we call our own API route.
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
        if (result.user) { // If a user was created alongside (e.g. business owner)
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

  // UPDATE
  const useUpdate = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<T, Error, { formData: FormData; id: string } | (Partial<T> & { id: string })>({
      mutationFn: async (item) => {
        if ('formData' in item) {
          const response = await fetch(`/api/${entity}/${item.id}`, {
            method: 'POST', // Using POST for FormData with file uploads
            body: item.formData,
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || `Error al actualizar ${translatedEntity}`);
          }
          return result.business; // The API returns the updated business object
        } else {
          const { id, ...updateData } = item;
          return handleSupabaseQuery(supabase.from(entity).update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single());
        }
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
        queryClient.setQueryData([...entityKey, data.id], data);
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
            const supabase = createClient();
            const { error: deleteError } = await supabase.from(entity).delete().eq('id', id);
            if (deleteError) {
                throw new Error(deleteError.message || `No se pudo eliminar el ${translatedEntity}.`);
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
  
  return { useGetAll, useGetOne, useCreate, useUpdate, useDelete, useCreateWithFormData };
}

// Special API for settings as it's a single-row table
function createSettingsApi() {
    const entity = 'system_settings';
    const entityKey = [entity];
    const translatedEntity = entityTranslations['settings'];
    const supabase = createClient();
    const SETTINGS_ID = 1; // The single row ID

    const useGet = () => {
        return useQuery<SystemSettings>({
            queryKey: entityKey,
            queryFn: async () => {
                return handleSupabaseQuery(
                    supabase.from(entity).select('*').eq('id', SETTINGS_ID).single()
                );
            },
        });
    };

    const useUpdate = () => {
        const queryClient = useQueryClient();
        const { toast } = useToast();
        return useMutation<SystemSettings, Error, Partial<SystemSettings>>({
            mutationFn: (settings) => {
                return handleSupabaseQuery(
                    supabase
                        .from(entity)
                        .update({ ...settings, updated_at: new Date().toISOString() })
                        .eq('id', SETTINGS_ID)
                        .select()
                        .single()
                );
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
    product_categories: createCRUDApi<Category>('product_categories'),
    business_categories: createCRUDApi<BusinessCategory>('business_categories'),
    businesses: createCRUDApi<Business>('businesses'),
    products: createCRUDApi<Product>('products'),
    riders: createCRUDApi<Rider>('riders'),
    users: createCRUDApi<User>('users'),
    zones: createCRUDApi<Zone>('zones'),
    customers: createCRUDApi<Customer>('customers'),
    orders: createCRUDApi<Order>('orders'),
    roles: createCRUDApi<Role>('roles'),
    plans: createCRUDApi<Plan>('plans'),
    payments: createCRUDApi<Payment>('payments'),
    settings: createSettingsApi(),
};

// Custom hooks for nested resources
export const useCustomerOrders = (customerId: string) => {
    const supabase = createClient();
    return useQuery<Order[]>({
        queryKey: ['customers', customerId, 'orders'],
        queryFn: () => handleSupabaseQuery(supabase.from('orders').select('*').eq('customerId', customerId)),
        enabled: !!customerId,
    });
};


type RevenueData = { date: string; ingresos: number };
type OrdersData = { date: string; pedidos: number };

// --- Dashboard Stats ---
export const useDashboardStats = () => useQuery<{
    activeBusinesses: number;
    activeRiders: number;
    totalProducts: number;
    totalCategories: number;
    latestChanges: (Category | Business | Product | Rider)[];
    revenueData: RevenueData[];
    ordersData: OrdersData[];
    totalRevenue: number;
    totalOrders: number;
}>({
    queryKey: ['dashboardStats'],
    // This part remains mock for now as it aggregates data from multiple tables.
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
    const supabase = createClient();

    return useMutation<void, Error, { businessId: string; planId: string; amount: number }>({
        mutationFn: async ({ businessId, planId, amount }) => {
            const { data: plan, error: planError } = await supabase.from('plans').select('*').eq('id', planId).single();
            if (planError || !plan) throw new Error(planError.message || "Plan no encontrado.");

            const { data: business, error: businessError } = await supabase.from('businesses').select('*').eq('id', businessId).single();
            if (businessError || !business) throw new Error(businessError.message || "Negocio no encontrado.");

            const now = new Date();
            const periodStart = (business.current_period_ends_at && new Date(business.current_period_ends_at) > now)
                ? new Date(business.current_period_ends_at)
                : now;

            let periodEnd: Date;
            switch(plan.validity) {
                case 'semanal': periodEnd = add(periodStart, { weeks: 1 }); break;
                case 'quincenal': periodEnd = add(periodStart, { weeks: 2 }); break;
                case 'mensual': periodEnd = add(periodStart, { months: 1 }); break;
                case 'anual': periodEnd = add(periodStart, { years: 1 }); break;
                default: throw new Error("Validez de plan inválida.");
            }

            // Create payment record
            const paymentToCreate: Omit<Payment, 'created_at'> = {
                id: `pay-${faker.string.uuid()}`,
                business_id: businessId,
                plan_id: planId,
                amount: amount,
                payment_date: now.toISOString(),
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
            };
            const { error: paymentError } = await supabase.from('payments').insert(paymentToCreate);
            if (paymentError) throw new Error(paymentError.message);

            // Update business subscription status
            const businessUpdate = {
                plan_id: planId,
                subscription_status: 'active',
                current_period_ends_at: periodEnd.toISOString(),
                started_at: business.started_at || now.toISOString(),
                updated_at: now.toISOString(),
            };
            const { error: updateError } = await supabase.from('businesses').update(businessUpdate).eq('id', businessId);
            if (updateError) throw new Error(updateError.message);
        },
        onSuccess: (_, { businessId }) => {
            queryClient.invalidateQueries({ queryKey: ['businesses', businessId] });
            queryClient.invalidateQueries({ queryKey: ['businesses'] });
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
