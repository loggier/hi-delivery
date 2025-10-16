
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Business, Category, Product, Rider, User, BusinessCategory, Zone, Customer, Order, Role, Plan } from "@/types";
import { createClient } from "./supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import { hashPassword } from "./auth-utils";

const schema = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA!;


// --- Generic Fetcher ---
async function handleSupabaseQuery<T>(query: Promise<{ data: T | null, error: PostgrestError | null }>): Promise<T> {
    const { data, error } = await query;
    if (error) {
        console.error("Supabase error:", error);
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
}

// --- Generic CRUD Hooks ---
function createCRUDApi<T extends { id: string }>(entity: string) {
  const entityKey = [entity];
  const translatedEntity = entityTranslations[entity] || entity;

  // GET all
  const useGetAll = (params: Record<string, string> = {}) => {
    const queryKey = [entity, params];
    const supabase = createClient();

    let query = supabase.from(entity).select('*', { count: 'exact' });

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
  const useGetOne = (id: string) => {
    const supabase = createClient();
    return useQuery<T>({
        queryKey: [...entityKey, id],
        queryFn: () => handleSupabaseQuery(supabase.from(entity).select('*').eq('id', id).single()),
        enabled: !!id,
    });
  }

  // CREATE
  const useCreate = <T_DTO = Omit<T, "id" | "created_at" | "updated_at">>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const supabase = createClient();

    return useMutation<T, Error, T_DTO>({
      mutationFn: async (newItemDTO) => {
        const newItem = newItemDTO as any;
        // Special logic for businesses to create a user first
        if (entity === 'businesses' && newItem.password) {
          const { password, passwordConfirmation, owner_name, email, ...businessData } = newItem;
          
          // 1. Create user
          const newUserId = `user-${faker.string.uuid()}`;
          const hashedPassword = await hashPassword(password);
          const userToCreate = {
            id: newUserId,
            name: owner_name,
            email: email,
            password: hashedPassword,
            role_id: 'role-owner', // Hardcoded role for new business owners
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          };
          await handleSupabaseQuery(supabase.from('users').insert(userToCreate));

          // 2. Create business and link it to the user
          const businessToCreate = {
            id: `biz-${faker.string.uuid()}`,
            user_id: newUserId,
            ...businessData,
            name: newItem.name,
            owner_name: owner_name,
            email: email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return handleSupabaseQuery(supabase.from(entity).insert(businessToCreate).select().single());
        }

        const itemWithId = {
            id: `${entity.slice(0, 4)}-${faker.string.uuid()}`, // Generate client-side ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...newItem
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
    const supabase = createClient();
    return useMutation<T, Error, FormData>({
      mutationFn: async (formData) => {
        const newItem = Object.fromEntries(formData.entries());
         const itemWithId = {
            id: `${entity.slice(0, 3)}-${faker.string.uuid()}`,
            ...newItem
        }
        return handleSupabaseQuery(supabase.from(entity).insert(itemWithId).select().single());
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
    const supabase = createClient();
    return useMutation<T, Error, Partial<T> & { id: string }>({
      mutationFn: (item) => {
        const { id, ...updateData } = item;
        return handleSupabaseQuery(supabase.from(entity).update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single());
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
    const supabase = createClient();
    return useMutation<void, Error, string>({
      mutationFn: (id) => handleSupabaseQuery(supabase.from(entity).delete().eq('id', id)),
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
