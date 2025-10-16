
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Business, Category, Product, Rider, User, BusinessCategory, Zone, Customer, Order, Role, Plan } from "@/types";
import { createClient } from "./supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";

const supabase = createClient();
const schema = 'grupohubs';

// --- Generic Fetcher ---
async function handleSupabaseQuery<T>(query: Promise<{ data: T | null, error: PostgrestError | null }>): Promise<T> {
    const { data, error } = await query;
    if (error) {
        throw new Error(error.message || "Ocurrió un error en la base de datos.");
    }
    return data as T;
}


const entityTranslations: { [key: string]: string } = {
    "product_categories": "Categoría de Producto",
    "business_categories": "Categoría de Negocio",
    businesses: "Negocio",
    products: "Producto",
    riders: "Repartidor",
    users: "Usuario",
    zones: "Zona",
    customers: "Cliente",
    roles: "Rol",
    plans: "Plan",
}

// --- Generic CRUD Hooks ---
function createCRUDApi<T extends { id: string }>(entity: string) {
  const entityKey = [entity];
  const translatedEntity = entityTranslations[entity] || entity;

  // GET all
  const useGetAll = (params: Record<string, string> = {}) => {
    const queryKey = [entity, params];

    let query = supabase.from(entity).schema(schema).select('*', { count: 'exact' });

    Object.entries(params).forEach(([key, value]) => {
        if(value) {
            query = query.ilike(key, `%${value}%`);
        }
    });

    query = query.order('created_at', { ascending: false });

    return useQuery<T[]>({
      queryKey: queryKey,
      queryFn: () => handleSupabaseQuery(query.returns<T[]>()),
    });
  }

  // GET one
  const useGetOne = (id: string) => useQuery<T>({
    queryKey: [...entityKey, id],
    queryFn: () => handleSupabaseQuery(supabase.from(entity).schema(schema).select('*').eq('id', id).single()),
    enabled: !!id,
  });

  // CREATE
  const useCreate = <T_DTO = Omit<T, "id" | "created_at" | "updated_at">>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<T, Error, T_DTO>({
      mutationFn: async (newItem) => {
        const itemWithId = {
            id: `${entity.slice(0, 3)}-${faker.string.uuid()}`, // Generate client-side ID
            ...newItem
        }
        return handleSupabaseQuery(supabase.from(entity).schema(schema).insert(itemWithId).select().single());
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKey });
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
        // This is a placeholder. Supabase doesn't directly handle form data like this for JSON.
        // You'd typically extract files and upload to storage, then insert JSON.
        // For now, we'll convert it to an object.
        const newItem = Object.fromEntries(formData.entries());
         const itemWithId = {
            id: `${entity.slice(0, 3)}-${faker.string.uuid()}`,
            ...newItem
        }
        return handleSupabaseQuery(supabase.from(entity).schema(schema).insert(itemWithId).select().single());
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: entityKey });
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
    return useMutation<T, Error, Partial<T> & { id: string }>({
      mutationFn: (item) => {
        const { id, ...updateData } = item;
        return handleSupabaseQuery(supabase.from(entity).schema(schema).update(updateData).eq('id', id).select().single());
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
      mutationFn: (id) => handleSupabaseQuery(supabase.from(entity).schema(schema).delete().eq('id', id)),
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: entityKey });
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
};

// Custom hooks for nested resources
export const useCustomerOrders = (customerId: string) => {
    return useQuery<Order[]>({
        queryKey: ['customers', customerId, 'orders'],
        queryFn: () => handleSupabaseQuery(supabase.from('orders').schema(schema).select('*').eq('customerId', customerId)),
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
