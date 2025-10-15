"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Business, Category, Product, Rider, User, BusinessCategory, Zone } from "@/types";

const API_BASE_URL = "/api/mock";

// --- Generic Fetcher ---
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
  if (!res.ok) {
    const errorBody = await res.json();
    throw new Error(errorBody.message || "Ocurrió un error desconocido");
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

const entityTranslations: { [key: string]: string } = {
    "product-categories": "Categoría de Producto",
    "business-categories": "Categoría de Negocio",
    businesses: "Negocio",
    products: "Producto",
    riders: "Repartidor",
    users: "Usuario",
    zones: "Zona",
}

// --- Generic CRUD Hooks ---
function createCRUDApi<T extends { id: string }>(entity: string) {
  const entityKey = [entity];
  const translatedEntity = entityTranslations[entity] || entity;

  // GET all
  const useGetAll = (params: Record<string, string> = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const queryKey = queryString ? [entity, params] : [entity];
    return useQuery<T[]>({
      queryKey: queryKey,
      queryFn: () => fetchAPI<T[]>(`/${entity}?${queryString}`),
    });
  }

  // GET one
  const useGetOne = (id: string) => useQuery<T>({
    queryKey: [...entityKey, id],
    queryFn: () => fetchAPI<T>(`/${entity}/${id}`),
    enabled: !!id,
  });

  // CREATE
  const useCreate = <T_DTO = Omit<T, "id" | "createdAt" | "updatedAt">>() => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation<T, Error, T_DTO>({
      mutationFn: (newItem) => fetchAPI<T>(`/${entity}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      }),
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
      mutationFn: (formData) => fetchAPI<T>(`/${entity}`, {
        method: "POST",
        body: formData,
      }),
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
      mutationFn: (item) => fetchAPI<T>(`/${entity}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }),
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
      mutationFn: (id) => fetchAPI<void>(`/${entity}/${id}`, { method: "DELETE" }),
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
    "product-categories": createCRUDApi<Category>('product-categories'),
    "business-categories": createCRUDApi<BusinessCategory>('business-categories'),
    businesses: createCRUDApi<Business>('businesses'),
    products: createCRUDApi<Product>('products'),
    riders: createCRUDApi<Rider>('riders'),
    users: createCRUDApi<User>('users'),
    zones: createCRUDApi<Zone>('zones'),
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
    queryFn: () => fetchAPI('/dashboard-stats'),
});
