"use client";
import { ProductForm } from "../product-form";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";

export default function NewProductPage() {
    const { user } = useAuthStore();
    const scopedBusinessId = user?.business_id?.trim() || "";
    const businessFilters = scopedBusinessId ? { id: scopedBusinessId } : {};

    const { data: businesses, isLoading: isLoadingBusinesses } = api.businesses.useGetAll(businessFilters);
    const { data: categories, isLoading: isLoadingCategories } = api.product_categories.useGetAll();

    if(isLoadingBusinesses || isLoadingCategories) {
        return (
             <div className="space-y-4">
                <PageHeader title="Nuevo Producto" />
                <div className="space-y-8 rounded-md border p-8">
                    <Skeleton className="h-96 w-full" />
                </div>
             </div>
        )
    }

  return (
    <div className="space-y-4">
      <PageHeader title="Nuevo Producto" />
      <ProductForm businesses={businesses || []} categories={categories || []} />
    </div>
  );
}
